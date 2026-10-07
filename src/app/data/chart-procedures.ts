import { hashCode } from './simulated-charts';
import { generateSimulatedAirportInfo } from './simulated-airport-info';
import type { AirportRecord } from './airport-data';
import { destination, type GeoPoint, type HoldSpec } from './chart-geo';

const FIX_POOL = [
  'KELSO', 'TORVA', 'MELON', 'DUNAV', 'ZIRKA', 'BREKO', 'LAMIS',
  'VORTA', 'SEMIL', 'ARDOS', 'PIRAL', 'TUNEK', 'OLSAR', 'CADIN',
];

function pickFixNames(seed: number, count: number): string[] {
  const n = FIX_POOL.length;
  const start = seed % n;
  return Array.from({ length: count }, (_, i) => FIX_POOL[(start + i * 3) % n]);
}

export interface ApproachFix extends GeoPoint {
  name: string;
  role: 'IAF' | 'IF' | 'FAF';
  distNm: number;
  altitudeFt: number;
}

export interface MinimumsRow {
  category: string;
  altitudeFt: number;
  heightFt: number;
  visibilityM: number;
}

export interface ApproachSpec {
  procedureLabel: string;
  isIls: boolean;
  runwayEnd: string;
  runwayId: string;
  headingDeg: number;
  threshold: GeoPoint;
  runwayFarEnd: GeoPoint;
  fixes: ApproachFix[]; // IAF, IF, FAF
  iafHold: HoldSpec;
  missedTrack: GeoPoint[]; // umbral -> esquina -> MAHF
  mahf: GeoPoint & { name: string };
  mahfHold: HoldSpec;
  missedText: string;
  navLabel: string;
  navFreq: string | null;
  elevationFt: number;
  tdzeFt: number;
  tchFt: number;
  glidepathDeg: number;
  msaFt: number;
  transitionAltFt: number;
  transitionLevel: string;
  frequencies: { label: string; value: string }[];
  minimumLabel: string;
  minimums: MinimumsRow[];
}

/** SIMULATION DATA. Procedimiento de aproximacion generado sobre la pista
 *  del aeropuerto. La geometria es consistente (distancias, rumbos, pista a
 *  escala, senda de 3 grados) pero NO es un procedimiento publicado.
 *  Determinista por ICAO. */
export function generateApproachSpec(airport: AirportRecord): ApproachSpec {
  const info = generateSimulatedAirportInfo(airport.icao);
  const rwy = info.runways[0];
  const runwayEnd = rwy.id.split('/')[0];
  const seed = hashCode(airport.icao + '-approach-spec');

  const headingDeg = rwy.headingDeg;
  const back = (headingDeg + 180) % 360;
  const lenNm = rwy.lengthFt / 6076.12;

  const threshold = destination(airport.lat, airport.lon, back, lenNm / 2);
  const runwayFarEnd = destination(airport.lat, airport.lon, headingDeg, lenNm / 2);

  const fafNm = 5 + (seed % 2);
  const ifNm = fafNm + 5;
  const iafNm = ifNm + 5;
  const names = pickFixNames(seed, 4); // IAF, IF, FAF, MAHF

  const tdze = airport.elevation;
  const glidepathDeg = 3;
  const ftPerNm = 6076.12 * Math.tan((glidepathDeg * Math.PI) / 180);
  const hund = (v: number) => Math.round(v / 100) * 100;
  const fafAlt = hund(tdze + 50 + fafNm * ftPerNm);
  const ifAlt = fafAlt + 1000;
  const iafAlt = ifAlt + 1000;

  const at = (d: number): GeoPoint => destination(threshold.lat, threshold.lon, back, d);
  const fixes: ApproachFix[] = [
    { ...at(iafNm), name: names[0], role: 'IAF', distNm: iafNm, altitudeFt: iafAlt },
    { ...at(ifNm), name: names[1], role: 'IF', distNm: ifNm, altitudeFt: ifAlt },
    { ...at(fafNm), name: names[2], role: 'FAF', distNm: fafNm, altitudeFt: fafAlt },
  ];

  const holdTurn: 'LEFT' | 'RIGHT' = seed % 2 === 0 ? 'RIGHT' : 'LEFT';
  const iafHold: HoldSpec = {
    fix: fixes[0],
    inboundCourse: headingDeg,
    turn: holdTurn,
    legNm: 4,
    radiusNm: 1.1,
  };

  // Aproximacion frustrada: recto, y giro hacia el lado contrario a la espera.
  const missTurn: 'LEFT' | 'RIGHT' = holdTurn === 'RIGHT' ? 'LEFT' : 'RIGHT';
  const missCourse = (headingDeg + (missTurn === 'LEFT' ? -90 : 90) + 360) % 360;
  const missCorner = destination(threshold.lat, threshold.lon, headingDeg, lenNm + 3.5);
  const mahfGeo = destination(missCorner.lat, missCorner.lon, missCourse, 5);
  const mahf = { ...mahfGeo, name: names[3] };
  const mahfHold: HoldSpec = {
    fix: mahf,
    inboundCourse: (missCourse + 180) % 360,
    turn: (seed >> 1) % 2 === 0 ? 'RIGHT' : 'LEFT',
    legNm: 4,
    radiusNm: 1.1,
  };
  const missedAlt = hund(tdze + 2000 + ((seed >> 4) % 1000));

  const ils = info.navAids.find((n) => n.type === `ILS RWY${runwayEnd}`);
  const isIls = !!ils || seed % 5 < 3;
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const simIdent =
    'I' + letters[(seed >> 9) % letters.length] + letters[(seed >> 13) % letters.length];
  const tenths = [1, 3, 5, 7, 9][(seed >> 2) % 5];
  const hundredths = (seed >> 5) % 2 === 0 ? 0 : 5;
  const simFreq = `${108 + ((seed >> 7) % 4)}.${tenths}${hundredths}`;

  const dh = 200 + (seed % 3) * 10;
  const minimums: MinimumsRow[] = ['A', 'B', 'C', 'D'].map((category, i) => {
    const heightFt = isIls ? dh + (i >= 2 ? 10 : 0) : 280 + (seed % 4) * 20 + i * 10;
    const visibilityM = isIls ? [550, 550, 600, 650][i] : [1500, 1600, 1800, 2000][i];
    return { category, altitudeFt: tdze + heightFt, heightFt, visibilityM };
  });

  const freq = (type: string) => info.frequencies.find((f) => f.type === type)?.freqMhz ?? '---';
  const transitionAltFt = 4000 + ((seed >> 7) % 5) * 500;

  return {
    procedureLabel: `${isIls ? 'ILS' : 'RNAV (GNSS)'} RWY ${runwayEnd}`,
    isIls,
    runwayEnd,
    runwayId: rwy.id,
    headingDeg,
    threshold,
    runwayFarEnd,
    fixes,
    iafHold,
    missedTrack: [threshold, missCorner, mahfGeo],
    mahf,
    mahfHold,
    missedText: `CLIMB TO ${missedAlt} FT, TURN ${missTurn} DIRECT ${mahf.name}, HOLD.`,
    navLabel: isIls ? `LOC ${ils?.ident ?? simIdent}` : 'GNSS',
    navFreq: isIls ? (ils?.freqMhz ?? simFreq) : null,
    elevationFt: tdze,
    tdzeFt: tdze,
    tchFt: 50,
    glidepathDeg,
    msaFt: hund(tdze + 2500 + ((seed >> 3) % 1500)),
    transitionAltFt,
    transitionLevel: `FL${transitionAltFt / 100 + 20}`,
    frequencies: [
      { label: 'ATIS', value: freq('ATIS') },
      { label: 'APPROACH', value: freq('APPROACH') },
      { label: 'TOWER', value: freq('TOWER') },
      { label: 'GROUND', value: freq('GROUND') },
    ],
    minimumLabel: isIls ? 'DA(H)' : 'MDA(H)',
    minimums,
  };
}
// ---------------------------------------------------------------------
// Helpers geometricos, aerodromo, SID y STAR
// ---------------------------------------------------------------------

const DEG = Math.PI / 180;

function bearingBetween(a: GeoPoint, b: GeoPoint): number {
  const dLon = (b.lon - a.lon) * DEG;
  const y = Math.sin(dLon) * Math.cos(b.lat * DEG);
  const x =
    Math.cos(a.lat * DEG) * Math.sin(b.lat * DEG) -
    Math.sin(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.cos(dLon);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

function distanceBetweenNm(a: GeoPoint, b: GeoPoint): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLon = (b.lon - a.lon) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function angleDiff(a: number, b: number): number {
  return Math.abs((((a - b + 540) % 360) + 360) % 360 - 180);
}

function altText(altFt: number, transitionAltFt: number): string {
  return altFt > transitionAltFt
    ? `FL${Math.round(altFt / 100)}`
    : `${Math.round(altFt / 100) * 100} FT`;
}

/** Coordenada en formato de carta: N39°29.4' W000°28.9' */
export function formatCoord(p: GeoPoint): string {
  const part = (v: number, degDigits: number, pos: string, neg: string) => {
    const a = Math.abs(v);
    const d = Math.floor(a);
    const m = (a - d) * 60;
    return `${v >= 0 ? pos : neg}${String(d).padStart(degDigits, '0')}°${m.toFixed(1).padStart(4, '0')}'`;
  };
  return `${part(p.lat, 2, 'N', 'S')} ${part(p.lon, 3, 'E', 'W')}`;
}

// ---------- AERODROMO ----------

export interface AerodromeRunway {
  id: string;
  endA: string;
  endB: string;
  headingDeg: number;
  lengthFt: number;
  widthFt: number;
  lengthNm: number;
  widthNm: number;
  surface: string;
  endAPoint: GeoPoint;
  endBPoint: GeoPoint;
}

export interface AerodromeTaxiway {
  name: string;
  from: GeoPoint;
  to: GeoPoint;
  labelAt: GeoPoint | null;
}

export interface AerodromeSpec {
  arp: GeoPoint;
  elevationFt: number;
  mainHeadingDeg: number;
  runways: AerodromeRunway[];
  taxiways: AerodromeTaxiway[];
  apron: GeoPoint[];
  terminal: GeoPoint[];
  stands: GeoPoint[];
  tower: GeoPoint;
  frequencies: { label: string; value: string }[];
}

/** SIMULATION DATA en el trazado de calles, plataforma y edificios (no hay
 *  datos libres de la distribucion real). Pistas y frecuencias salen de
 *  Airport Info (reales en LEVC). Determinista por ICAO. */
export function generateAerodromeSpec(airport: AirportRecord): AerodromeSpec {
  const info = generateSimulatedAirportInfo(airport.icao);
  const seed = hashCode(airport.icao + '-aerodrome-spec');
  const arp: GeoPoint = { lat: airport.lat, lon: airport.lon };
  const side: 1 | -1 = seed % 2 === 0 ? 1 : -1;

  const mainHeading = info.runways[0].headingDeg;
  const th = mainHeading * DEG;
  // a: a lo largo de la pista principal; b: hacia su derecha. Ambos en NM desde el ARP.
  const geo = (a: number, b: number): GeoPoint => {
    const e = a * Math.sin(th) + b * Math.cos(th);
    const n = a * Math.cos(th) - b * Math.sin(th);
    return destination(arp.lat, arp.lon, (Math.atan2(e, n) / DEG + 360) % 360, Math.hypot(e, n));
  };

  const runways: AerodromeRunway[] = info.runways.map((rw, i) => {
    const [endA, endB] = rw.id.split('/');
    const lengthNm = rw.lengthFt / 6076.12;
    const center = i === 0 ? arp : geo(0, -side * 0.95 * i);
    return {
      id: rw.id,
      endA,
      endB,
      headingDeg: rw.headingDeg,
      lengthFt: rw.lengthFt,
      widthFt: rw.widthFt,
      lengthNm,
      widthNm: rw.widthFt / 6076.12,
      surface: rw.surface,
      endAPoint: destination(center.lat, center.lon, (rw.headingDeg + 180) % 360, lengthNm / 2),
      endBPoint: destination(center.lat, center.lon, rw.headingDeg, lengthNm / 2),
    };
  });

  const L = runways[0].lengthNm;
  const taxiB = side * 0.17;
  const ac = (-0.04 + (((seed >> 3) % 3) - 1) * 0.08) * L;
  const fractions = [-0.4, -0.18, 0.18, 0.4];

  const taxiways: AerodromeTaxiway[] = [
    { name: 'A', from: geo(-0.4 * L, taxiB), to: geo(0.4 * L, taxiB), labelAt: geo(0, side * 0.095) },
    ...fractions.map((fr, i) => ({
      name: `A${i + 1}`,
      from: geo(fr * L, side * 0.02),
      to: geo(fr * L, taxiB),
      labelAt: geo(fr * L + 0.05, side * 0.095) as GeoPoint | null,
    })),
    { name: 'A5', from: geo(ac, taxiB), to: geo(ac, side * 0.21), labelAt: null },
  ];

  const half = 0.17;
  const apron = [
    geo(ac - half, side * 0.21),
    geo(ac + half, side * 0.21),
    geo(ac + half, side * 0.43),
    geo(ac - half, side * 0.43),
  ];
  const terminal = [
    geo(ac - 0.15, side * 0.47),
    geo(ac + 0.15, side * 0.47),
    geo(ac + 0.15, side * 0.57),
    geo(ac - 0.15, side * 0.57),
  ];
  const stands = Array.from({ length: 6 }, (_, i) => geo(ac - 0.125 + i * 0.05, side * 0.245));
  const tower = geo(ac + 0.26, side * 0.52);

  const freq = (type: string) => info.frequencies.find((f) => f.type === type)?.freqMhz ?? '---';

  return {
    arp,
    elevationFt: airport.elevation,
    mainHeadingDeg: mainHeading,
    runways,
    taxiways,
    apron,
    terminal,
    stands,
    tower,
    frequencies: [
      { label: 'TOWER', value: freq('TOWER') },
      { label: 'GROUND', value: freq('GROUND') },
      { label: 'APPROACH', value: freq('APPROACH') },
      { label: 'ATIS', value: freq('ATIS') },
    ],
  };
}

// ---------- SID y STAR ----------

export interface ProcedureWaypoint extends GeoPoint {
  name: string;
  altText: string;
  kind: 'wpt' | 'iaf';
}

export interface ProcedureLeg {
  from: string;
  to: string;
  courseDeg: number;
  distNm: number;
  altText: string;
}

export interface ProcedureSpec {
  kind: 'SID' | 'STAR';
  designator: string;
  runwayEnd: string;
  headingDeg: number;
  threshold: GeoPoint;
  runwayFarEnd: GeoPoint;
  path: GeoPoint[];
  waypoints: ProcedureWaypoint[];
  contextTrack: GeoPoint[] | null;
  contextLabel: string | null;
  legs: ProcedureLeg[];
  notes: string[];
}

type RealFix = { name: string; lat: number; lon: number } | undefined;

/** REAL DATA: el punto de salida de la SID de Valencia y el de entrada de la
 *  STAR de Milan son los fixes reales de la ruta LEVC-LIMC. */
const REAL_SID_EXIT: Record<string, RealFix> = {
  LEVC: { name: 'SOPET', lat: 39.8338, lon: -0.00469 },
};
const REAL_STAR_ENTRY: Record<string, RealFix> = {
  LIMC: { name: 'NEDED', lat: 44.6939, lon: 8.14056 },
};

const hund = (v: number) => Math.round(v / 100) * 100;

/** SIMULATION DATA (trazado y altitudes); el fix de salida de Valencia es real. */
export function generateSidSpec(airport: AirportRecord): ProcedureSpec {
  const info = generateSimulatedAirportInfo(airport.icao);
  const rwy = info.runways[0];
  const seed = hashCode(airport.icao + '-sid-spec');
  const arp: GeoPoint = { lat: airport.lat, lon: airport.lon };
  const lenNm = rwy.lengthFt / 6076.12;
  const [endA, endB] = rwy.id.split('/');
  const transitionAlt = generateApproachSpec(airport).transitionAltFt;

  const real = REAL_SID_EXIT[airport.icao];
  const exitName = real?.name ?? pickFixNames(seed, 1)[0];
  const exitPoint: GeoPoint = real
    ? { lat: real.lat, lon: real.lon }
    : destination(arp.lat, arp.lon, seed % 360, 27);

  // Se despega por la cabecera que obliga a girar menos hacia el punto de salida.
  const toExit = bearingBetween(arp, exitPoint);
  const useA = angleDiff(rwy.headingDeg, toExit) <= angleDiff((rwy.headingDeg + 180) % 360, toExit);
  const headingDeg = useA ? rwy.headingDeg : (rwy.headingDeg + 180) % 360;
  const runwayEnd = useA ? endA : endB;

  const threshold = destination(arp.lat, arp.lon, (headingDeg + 180) % 360, lenNm / 2);
  const der = destination(arp.lat, arp.lon, headingDeg, lenNm / 2);
  const turnPoint = destination(der.lat, der.lon, headingDeg, 3);

  const course2 = Math.round(bearingBetween(turnPoint, exitPoint));
  const dist2 = distanceBetweenNm(turnPoint, exitPoint);
  const minAlt = hund(airport.elevation + 5500 + (seed % 3) * 500);

  return {
    kind: 'SID',
    designator: `${exitName}1A`,
    runwayEnd,
    headingDeg,
    threshold,
    runwayFarEnd: der,
    path: [threshold, turnPoint, exitPoint],
    waypoints: [
      {
        ...exitPoint,
        name: exitName,
        altText: `AT OR ABOVE ${altText(minAlt, transitionAlt)}`,
        kind: 'wpt',
      },
    ],
    contextTrack: null,
    contextLabel: null,
    legs: [
      {
        from: `RWY ${runwayEnd}`,
        to: 'TURN',
        courseDeg: headingDeg,
        distNm: lenNm + 3,
        altText: 'CLIMB TO 1500 FT',
      },
      {
        from: 'TURN',
        to: exitName,
        courseDeg: course2,
        distNm: dist2,
        altText: `AT OR ABOVE ${altText(minAlt, transitionAlt)}`,
      },
    ],
    notes: [
      `Initial climb: track ${String(headingDeg).padStart(3, '0')}° until 3.0 NM beyond the end of the runway, then turn direct ${exitName}.`,
      'Minimum climb gradient 4.0% up to 3000 FT.',
      'Do not turn below 1500 FT unless instructed by ATC.',
    ],
  };
}

/** SIMULATION DATA (trazado y altitudes); el fix de entrada de Milan es real
 *  y la STAR termina en el IAF del approach de la misma pista. */
export function generateStarSpec(airport: AirportRecord): ProcedureSpec {
  const ap = generateApproachSpec(airport);
  const seed = hashCode(airport.icao + '-star-spec');
  const arp: GeoPoint = { lat: airport.lat, lon: airport.lon };
  const tdze = airport.elevation;

  const taken = new Set([...ap.fixes.map((f) => f.name), ap.mahf.name]);
  const free = FIX_POOL.filter((n) => !taken.has(n));
  const entryIdx = seed % free.length;
  const midIdx = (entryIdx + 1 + ((seed >> 4) % (free.length - 1))) % free.length;

  const real = REAL_STAR_ENTRY[airport.icao];
  const entryName = real?.name ?? free[entryIdx];
  const midName = free[midIdx];
  const entryPoint: GeoPoint = real
    ? { lat: real.lat, lon: real.lon }
    : destination(arp.lat, arp.lon, (ap.headingDeg + 180 + ((seed % 91) - 45) + 360) % 360, 28);

  const iaf = ap.fixes[0];
  const toIaf = bearingBetween(entryPoint, iaf);
  const midBase = destination(
    entryPoint.lat,
    entryPoint.lon,
    toIaf,
    distanceBetweenNm(entryPoint, iaf) * 0.55
  );
  const midPoint = destination(
    midBase.lat,
    midBase.lon,
    (toIaf + (seed % 2 === 0 ? 90 : -90) + 360) % 360,
    4
  );

  // Regla 3:1 (3 NM por cada 1000 ft) para las altitudes de los puntos.
  const descent = (nm: number) => (nm / 3) * 1000 + tdze;
  const midAlt = Math.max(
    Math.round(descent(distanceBetweenNm(midPoint, ap.threshold)) / 1000) * 1000,
    iaf.altitudeFt + 1000
  );
  const entryAlt = Math.max(
    Math.min(Math.round(descent(distanceBetweenNm(entryPoint, ap.threshold)) / 1000) * 1000, 20000),
    midAlt + 1000
  );
  const ta = ap.transitionAltFt;

  return {
    kind: 'STAR',
    designator: `${entryName}1A`,
    runwayEnd: ap.runwayEnd,
    headingDeg: ap.headingDeg,
    threshold: ap.threshold,
    runwayFarEnd: ap.runwayFarEnd,
    path: [entryPoint, midPoint, iaf],
    waypoints: [
      { ...entryPoint, name: entryName, altText: `AT OR BELOW ${altText(entryAlt, ta)}`, kind: 'wpt' },
      { ...midPoint, name: midName, altText: `AT OR BELOW ${altText(midAlt, ta)}`, kind: 'wpt' },
      { lat: iaf.lat, lon: iaf.lon, name: iaf.name, altText: `AT ${iaf.altitudeFt} FT`, kind: 'iaf' },
    ],
    contextTrack: [...ap.fixes, ap.threshold],
    contextLabel: ap.procedureLabel,
    legs: [
      {
        from: entryName,
        to: midName,
        courseDeg: Math.round(bearingBetween(entryPoint, midPoint)),
        distNm: distanceBetweenNm(entryPoint, midPoint),
        altText: `DESCEND TO ${altText(midAlt, ta)}`,
      },
      {
        from: midName,
        to: iaf.name,
        courseDeg: Math.round(bearingBetween(midPoint, iaf)),
        distNm: distanceBetweenNm(midPoint, iaf),
        altText: `DESCEND TO ${iaf.altitudeFt} FT`,
      },
    ],
    notes: [
      `Descend to cross ${iaf.name} at ${iaf.altitudeFt} FT. Expect ${ap.procedureLabel}.`,
      'Speed 250 KT or less below FL100.',
      'No holding on the STAR unless instructed by ATC.',
    ],
  };
}