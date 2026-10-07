const TILE_SIZE = 256;

function lonLatToWorldPixel(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/** Proyeccion Web Mercator estandar (identica a cualquier mapa de
 *  teselas real: OSM, Google, Bing...) situando una coordenada real
 *  dentro de la rejilla de teselas descargada, cuyo origen es la
 *  tesela superior-izquierda (originTileX/Y a ese nivel de zoom). */
export function projectToTileGrid(
  lat: number,
  lon: number,
  zoom: number,
  originTileX: number,
  originTileY: number
): { x: number; y: number } {
  const p = lonLatToWorldPixel(lat, lon, zoom);
  return { x: p.x - originTileX * TILE_SIZE, y: p.y - originTileY * TILE_SIZE };
}