import { hashCode } from './simulated-charts';
import { generateOfpSummary, snapVerticalProfile } from './simulated-ofp';

export interface RouteWaypoint {
  name: string;
  lat: number;
  lon: number;
  cumulativeNm: number;
}

export interface SimulatedRoute {
  distanceNm: number;
  sid: string;
  star: string;
  waypoints: RouteWaypoint[];
  routeString: string;
}

const SID_POOL = ['SOPET1A'];
const STAR_POOL = ['NEDED1A'];

function pick<T>(pool: readonly T[], seed: number, salt: number): T {
  return pool[(seed >> salt) % pool.length];
}

export interface RealFix {
  name: string;
  lat: number;
  lon: number;
}

/** REAL DATA: fixes y coordenadas publicados (bases de datos publicas de
 *  navegacion). Corredor LEVC -> Barcelona -> sur de Francia -> Genova ->
 *  LIMC, por las aerovias B28, UM985, G7 y UM984. La ruta que archive la
 *  aerolinea el dia del vuelo puede variar. */
export const LEVC_LIMC_ROUTE_FIXES: RealFix[] = [
  { name: 'SOPET', lat: 39.8338, lon: -0.00469 },
  { name: 'TORDU', lat: 40.2579, lon: 0.58819 },
  { name: 'LOTOS', lat: 40.5497, lon: 1.00297 },
  { name: 'EBROX', lat: 40.70873, lon: 1.23178 },
  { name: 'PEXOT', lat: 40.8608, lon: 1.45194 },
  { name: 'RODRA', lat: 41.0515, lon: 1.73039 },
  { name: 'BCN', lat: 41.3071, lon: 2.10781 },
  { name: 'DIVKO', lat: 43.0562, lon: 4.77692 },
  { name: 'PADKO', lat: 43.2317, lon: 5.33306 },
  { name: 'GANGU', lat: 43.4631, lon: 6.08472 },
  { name: 'KOLON', lat: 43.7219, lon: 6.95333 },
  { name: 'VAMTU', lat: 44.1456, lon: 7.62528 },
  { name: 'NEDED', lat: 44.6939, lon: 8.14056 },
];

/** Item 15 del plan ICAO: solo los puntos con aerovia designada (los demas
 *  fixes estan sobre la misma aerovia y no se escriben). Sin SID/STAR
 *  nombradas: DCT al principio y al final. */
export const LEVC_LIMC_ROUTE_STRING =
  'DCT SOPET B28 TORDU UM985 BCN G7 DIVKO UM984 NEDED DCT';

export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function generateSimulatedRoute(
  depIcao: string, arrIcao: string,
  depLat: number, depLon: number, arrLat: number, arrLon: number
): SimulatedRoute {
  const seed = hashCode(depIcao + arrIcao + '-route');
  const sid = pick(SID_POOL, seed, 3); // SIMULADO
  const star = pick(STAR_POOL, seed, 5); // SIMULADO

  const chain: RealFix[] = [
    { name: depIcao, lat: depLat, lon: depLon },
    ...LEVC_LIMC_ROUTE_FIXES,
    { name: arrIcao, lat: arrLat, lon: arrLon },
  ];

  let cumulative = 0;
  const waypoints: RouteWaypoint[] = [];
  for (let i = 1; i < chain.length - 1; i++) {
    cumulative += haversineNm(chain[i - 1].lat, chain[i - 1].lon, chain[i].lat, chain[i].lon);
    waypoints.push({
      name: chain[i].name,
      lat: chain[i].lat,
      lon: chain[i].lon,
      cumulativeNm: Math.round(cumulative),
    });
  }
  cumulative += haversineNm(
    chain[chain.length - 2].lat, chain[chain.length - 2].lon,
    chain[chain.length - 1].lat, chain[chain.length - 1].lon
  );

  return {
    distanceNm: Math.round(cumulative),
    sid,
    star,
    waypoints,
    routeString: LEVC_LIMC_ROUTE_STRING,
  };
}

// ---------------------------------------------------------------------
// ICAO FLIGHT PLAN (Item 7-19)
// ---------------------------------------------------------------------

export interface IcaoFlightPlan {
  aircraftId: string;
  flightRules: string;
  flightType: string;
  wakeCategory: string;
  equipment: string;
  surveillanceEquipment: string;
  eobtUtc: string;
  cruiseSpeed: string;
  cruiseLevel: string;
  cruiseAltitudeFt: number;
  totalEet: string;
  alternateIcao: string;
  otherInfo: string;
  enduranceHHMM: string;
  personsOnBoard: number;
  emergencyRadio: string;
  survivalEquipment: string;
  jackets: string;
  dinghies: string;
  aircraftColor: string;
}

export function generateIcaoFlightPlan(
  flightNumber: string, eobtUtc: string, seatCount: number, realDateLabel?: string
): IcaoFlightPlan {
  const seed = hashCode(flightNumber + '-icao-fpl');
  const aircraftId = 'WZZ' + flightNumber.replace(/\D/g, '');
  const cruiseLevelHundreds = [350, 370, 390][seed % 3];
  const pad2 = (n: number) => String(n).padStart(2, '0');

  let dofString: string;
  if (realDateLabel) {
    const [dayStr, monStr, yearStr] = realDateLabel.split(' ');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    dofString = `${yearStr.slice(2)}${pad2(months.indexOf(monStr) + 1)}${dayStr.padStart(2, '0')}`;
  } else {
    const dofDay = 1 + (seed % 28);
    const dofMonth = 1 + ((seed >> 3) % 12);
    dofString = `26${pad2(dofMonth)}${pad2(dofDay)}`;
  }

  return {
    aircraftId,
    flightRules: 'I',
    flightType: 'S',
    wakeCategory: 'M',
    equipment: 'SDE2E3FGHIRWY',
    surveillanceEquipment: 'LB1D1',
    eobtUtc: eobtUtc.replace(':', ''),
    cruiseSpeed: 'N0450',
    cruiseLevel: `F${cruiseLevelHundreds}`,
    cruiseAltitudeFt: cruiseLevelHundreds * 100,
    totalEet: '0200',
    alternateIcao: 'LIMF',
    otherInfo: `PBN/A1B1C1D1O1S2 DOF/${dofString} REG/TBD`,
    enduranceHHMM: '0530',
    personsOnBoard: seatCount,
    emergencyRadio: 'UHF VHF ELT',
    survivalEquipment: 'POLAR DESERT MARITIME JUNGLE',
    jackets: 'LIGHT FLUORES UV',
    dinghies: 'NIL',
    aircraftColor: 'WHITE PURPLE MAGENTA',
  };
}

// ---------------------------------------------------------------------
// PERFIL DE VUELO — TOC / punto medio / TOD pegados al fix mas cercano
// ---------------------------------------------------------------------

export interface ProfileStep {
  distanceNm: number;
  altitudeFt: number;
  label?: string;
  phase?: 'DEP' | 'TOC' | 'CRUISE' | 'TOD' | 'ARR';
}

export function generateFlightProfile(
  depIcao: string, arrIcao: string,
  depElevationFt: number, arrElevationFt: number,
  totalDistanceNm: number, cruiseAltitudeFt: number,
  waypoints: RouteWaypoint[]
): ProfileStep[] {
  const cums = waypoints.map((w) => w.cumulativeNm);
  const { tocIdx, midIdx, todIdx } = snapVerticalProfile(cums, totalDistanceNm);

  return [
    { distanceNm: 0, altitudeFt: depElevationFt, label: depIcao, phase: 'DEP' },
    { distanceNm: cums[tocIdx], altitudeFt: cruiseAltitudeFt, label: waypoints[tocIdx].name, phase: 'TOC' },
    { distanceNm: cums[midIdx], altitudeFt: cruiseAltitudeFt, label: waypoints[midIdx].name, phase: 'CRUISE' },
    { distanceNm: cums[todIdx], altitudeFt: cruiseAltitudeFt, label: waypoints[todIdx].name, phase: 'TOD' },
    { distanceNm: totalDistanceNm, altitudeFt: arrElevationFt, label: arrIcao, phase: 'ARR' },
  ];
}

// ---------------------------------------------------------------------
// FIRs y squawk
// ---------------------------------------------------------------------

export interface FirCrossing {
  name: string;
  icaoCode: string;
  etaOffsetMin: number;
}

export function generateFirCrossings(flightTimeMinutes: number): FirCrossing[] {
  return [
    { name: 'BARCELONA', icaoCode: 'LECB', etaOffsetMin: Math.round(flightTimeMinutes * 0.18) },
    { name: 'MARSEILLE', icaoCode: 'LFMM', etaOffsetMin: Math.round(flightTimeMinutes * 0.35) },
    { name: 'MILANO', icaoCode: 'LIMM', etaOffsetMin: Math.round(flightTimeMinutes * 0.8) },
  ];
}

export function generateSquawkCode(flightNumber: string): string {
  const seed = hashCode(flightNumber + '-squawk');
  let code = '';
  for (let i = 0; i < 4; i++) code += String((seed >> (i * 3)) % 8);
  return code;
}

export { generateOfpSummary };