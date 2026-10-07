export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Pt {
  x: number;
  y: number;
}

export interface HoldSpec {
  fix: GeoPoint;
  /** Rumbo con el que se llega al fix por la rama de acercamiento. */
  inboundCourse: number;
  turn: 'LEFT' | 'RIGHT';
  legNm: number;
  radiusNm: number;
}

export const TILE_ZOOM = 10;
const TILE_SIZE = 256;
const WORLD_PX = TILE_SIZE * 2 ** TILE_ZOOM;
const DEG = Math.PI / 180;
const EARTH_RADIUS_NM = 3440.065;

/** Proyeccion Web Mercator (la de OpenStreetMap) a pixeles del mundo. */
export function worldPx(lat: number, lon: number): Pt {
  const sin = Math.sin(lat * DEG);
  return {
    x: ((lon + 180) / 360) * WORLD_PX,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * WORLD_PX,
  };
}

/** Pixeles de la rejilla de teselas que mide una milla nautica a esa latitud. */
export function gridPxPerNm(lat: number): number {
  const metersPerPx = (156543.03392 * Math.cos(lat * DEG)) / 2 ** TILE_ZOOM;
  return 1852 / metersPerPx;
}

/** Punto situado a una distancia y rumbo dados (gran circulo). */
export function destination(lat: number, lon: number, bearingDeg: number, distNm: number): GeoPoint {
  const br = bearingDeg * DEG;
  const d = distNm / EARTH_RADIUS_NM;
  const phi1 = lat * DEG;
  const lam1 = lon * DEG;
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(d) + Math.cos(phi1) * Math.sin(d) * Math.cos(br));
  const lam2 =
    lam1 +
    Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(phi1), Math.cos(d) - Math.sin(phi1) * Math.sin(phi2));
  return { lat: phi2 / DEG, lon: ((lam2 / DEG + 540) % 360) - 180 };
}

export interface TileSet {
  x0: number;
  y0: number;
  cols: number;
  rows: number;
}

/** Aeropuertos con teselas descargadas en public/data/tiles/10/. Los rangos
 *  deben coincidir con los del script de descarga. */
export const AIRPORT_TILESETS: Record<string, TileSet | undefined> = {
  LEVC: { x0: 509, y0: 388, cols: 4, rows: 4 },
  LIMC: { x0: 533, y0: 364, cols: 6, rows: 6 },
  LIMF: { x0: 532, y0: 366, cols: 4, rows: 4 },
};

export interface PlateTile {
  x: number;
  y: number;
  size: number;
  url: string;
}

export interface PlateFrame {
  width: number;
  height: number;
  hasTiles: boolean;
  tiles: PlateTile[];
  /** Pixeles de la carta que mide una milla nautica. */
  pxPerNm: number;
  project: (lat: number, lon: number) => Pt;
}

export const PLATE_WIDTH = 360;
const PLATE_ASPECT = 1.1;
const MIN_WINDOW_GRID_PX = 200;

/** Puntos extremos de un hipodromo de espera, en pixeles de la rejilla. */
function holdExtent(h: HoldSpec, gridPerNm: number): Pt[] {
  const f = worldPx(h.fix.lat, h.fix.lon);
  const th = h.inboundCourse * DEG;
  const u = { x: Math.sin(th), y: -Math.cos(th) };
  const r = { x: Math.cos(th), y: Math.sin(th) };
  const s = h.turn === 'RIGHT' ? 1 : -1;
  const len = h.legNm * gridPerNm;
  const rad = h.radiusNm * gridPerNm;
  const at = (a: number, b: number): Pt => ({
    x: f.x + a * u.x + s * b * r.x,
    y: f.y + a * u.y + s * b * r.y,
  });
  return [at(rad, 0), at(rad, 2 * rad), at(-len - rad, 0), at(-len - rad, 2 * rad)];
}

/** Calcula la ventana de la carta: encuadra todos los puntos clave y las
 *  esperas, y la proyeccion que usan todos los elementos dibujados. */
export interface PlateOptions {
  /** Dibujar el mapa de fondo si el aeropuerto tiene teselas. */
  useTiles?: boolean;
  /** Anchura minima de la ventana, en millas nauticas. */
  minWindowNm?: number;
}

export function createPlateFrame(
  icao: string,
  center: GeoPoint,
  keyPoints: GeoPoint[],
  holds: HoldSpec[],
  options: PlateOptions = {}
): PlateFrame {
  const tileSet = options.useTiles === false ? undefined : AIRPORT_TILESETS[icao];
  const gridPerNm = gridPxPerNm(center.lat);

  const pts: Pt[] = keyPoints.map((p) => worldPx(p.lat, p.lon));
  pts.push(worldPx(center.lat, center.lon));
  holds.forEach((h) => pts.push(...holdExtent(h, gridPerNm)));

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX;
  const spanY = maxY - minY;

  const margin = Math.max(24, 0.12 * Math.max(spanX, spanY));
  const minWindow = options.minWindowNm ? options.minWindowNm * gridPerNm : MIN_WINDOW_GRID_PX;
  const wv = Math.max(spanX + 2 * margin, (spanY + 2 * margin) * PLATE_ASPECT, minWindow);  const hv = wv / PLATE_ASPECT;
  let wx = (minX + maxX) / 2 - wv / 2;
  let wy = (minY + maxY) / 2 - hv / 2;

  // Con teselas, la ventana no debe salirse de la rejilla descargada.
  if (tileSet) {
    const gx0 = tileSet.x0 * TILE_SIZE;
    const gy0 = tileSet.y0 * TILE_SIZE;
    const gw = tileSet.cols * TILE_SIZE;
    const gh = tileSet.rows * TILE_SIZE;
    if (wv <= gw) wx = Math.min(Math.max(wx, gx0), gx0 + gw - wv);
    if (hv <= gh) wy = Math.min(Math.max(wy, gy0), gy0 + gh - hv);
  }

  const k = PLATE_WIDTH / wv;
  const height = Math.round(PLATE_WIDTH / PLATE_ASPECT);

  const project = (lat: number, lon: number): Pt => {
    const w = worldPx(lat, lon);
    return { x: (w.x - wx) * k, y: (w.y - wy) * k };
  };

  const tiles: PlateTile[] = [];
  if (tileSet) {
    const size = TILE_SIZE * k;
    for (let j = 0; j < tileSet.rows; j++) {
      for (let i = 0; i < tileSet.cols; i++) {
        const x = ((tileSet.x0 + i) * TILE_SIZE - wx) * k;
        const y = ((tileSet.y0 + j) * TILE_SIZE - wy) * k;
        if (x + size < 0 || x > PLATE_WIDTH || y + size < 0 || y > height) continue;
        tiles.push({
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          size: size + 0.8,
          url: `data/tiles/${TILE_ZOOM}/${tileSet.x0 + i}/${tileSet.y0 + j}.png`,
        });
      }
    }
  }

  return { width: PLATE_WIDTH, height, hasTiles: !!tileSet, tiles, pxPerNm: gridPerNm * k, project };
}