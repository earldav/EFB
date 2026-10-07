import { hashCode } from './simulated-charts';
import { a321neoWeightLimits, IATA_STANDARD_PAX_WEIGHT_KG } from './aircraft-data';

export interface OfpSummary {
  dateLabel: string;
  std: string;
  sta: string;
  cruiseAltitudeFt: number;
  eet: string;
  blockFuelKg: number;
  tripFuelKg: number;
  alternateIcao: string;
  alternateName: string;
  zfwKg: number;
  towKg: number;
  ldwKg: number;
}

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/** SIMULATION DATA para las cifras operacionales (combustible, pesos,
 *  horarios) — no son reales, un OFP real lo genera el departamento de
 *  despacho de la aerolinea. Deterministas por numero de vuelo. */
export function generateOfpSummary(
  flightNumber: string,
  flightTimeMinutes: number,
  realDateLabel?: string,
  realStdUtc?: string
): OfpSummary {
  const seed = hashCode(flightNumber + '-ofp');

  const day = 1 + (seed % 28);
  const month = MONTHS[(seed >> 3) % 12];
  const year = 2026 + ((seed >> 9) % 2);
  const dateLabel = realDateLabel ?? `${String(day).padStart(2, '0')} ${month} ${year}`;

  const [realH, realM] = (realStdUtc ?? '').split(':').map(Number);
  const stdHour = realStdUtc ? realH : 6 + (seed % 14);
  const stdMin = realStdUtc ? realM : (seed >> 2) % 60;
  const std = `${String(stdHour).padStart(2, '0')}:${String(stdMin).padStart(2, '0')}`;

  const totalMinutes = stdHour * 60 + stdMin + flightTimeMinutes;
  const staHour = Math.floor(totalMinutes / 60) % 24;
  const staMin = totalMinutes % 60;
  const sta = `${String(staHour).padStart(2, '0')}:${String(staMin).padStart(2, '0')}`;

  const cruiseAltitudeFt = 34000 + ((seed >> 4) % 4) * 2000;
  const eet = `${Math.floor(flightTimeMinutes / 60)}H ${flightTimeMinutes % 60}M`;

  const tripFuelKg = 4200 + (seed % 800);
  const blockFuelKg = tripFuelKg + 1200 + ((seed >> 5) % 400);

  const zfwKg = 68000 + (seed % 3000);
  const towKg = zfwKg + blockFuelKg;
  const ldwKg = zfwKg + (blockFuelKg - tripFuelKg);

  return {
    dateLabel, std, sta, cruiseAltitudeFt, eet, blockFuelKg, tripFuelKg,
    alternateIcao: 'LIMF', alternateName: 'TORINO', zfwKg, towKg, ldwKg,
  };
}

// ---------------------------------------------------------------------
// OFP DE DESPACHO — combustible, pesos, tabla de ruta/viento/ETO.
// Los limites (MTOW/MLW/MZFW) son reales; el resto es SIMULATION DATA.
// ---------------------------------------------------------------------

export interface FuelLine {
  label: string;
  timeHHMM: string;
  weightKg: number;
}

export interface WeightsBlock {
  dowKg: number;
  payloadKg: number;
  zfwKg: number;
  maxZfwKg: number;
  takeoffFuelKg: number;
  towKg: number;
  maxTowKg: number;
  tripFuelKg: number;
  ldwKg: number;
  maxLdwKg: number;
  paxCount: number;
  paxWeightKg: number;
  cargoWeightKg: number;
  infantCount: number;
  crewCount: number;
  cgPercentMac: number;
  thsTrim: string;
}

export interface RouteLegRow {
  fixName: string;
  latLabel: string;
  lonLabel: string;
  magneticCourseDeg: number;
  magneticHeadingDeg: number;
  machNumber: number;
  terrainHundredsFt: number;
  groundSpeedKt: number;
  trueAirspeedKt: number;
  tempDeviationC: number;
  turbulenceIndex: number;
  windDirDeg: number;
  windSpeedKt: number;
  windComponentKt: number;
  segmentDistanceNm: number;
  totalDistanceRemainingNm: number;
  segmentTimeMin: number;
  totalElapsedMin: number;
  segmentFuelBurnKg: number;
  totalFuelBurnKg: number;
  eto: string;
  fuelRemainingKg: number;
  flightLevel: number;
}

export interface OfpDispatchData {
  fuelLines: FuelLine[];
  weights: WeightsBlock;
  routeTable: RouteLegRow[];
}

function minutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToTime(hhmm: string, minutesToAdd: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutesToAdd;
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(Math.round(wrapped % 60)).padStart(2, '0')}`;
}

/** Perfil vertical compartido por OFP y Flight Plan: indices (en la lista
 *  de fixes) del fin de subida (TOC), del punto medio de crucero y del
 *  inicio de descenso (TOD). Se pegan al fix mas cercano, asi nombre y
 *  distancia coinciden siempre en las dos pantallas. */
export function snapVerticalProfile(
  cumulativeNms: number[], totalNm: number
): { tocIdx: number; midIdx: number; todIdx: number } {
  const nearest = (target: number) =>
    cumulativeNms.reduce(
      (best, nm, i) => (Math.abs(nm - target) < Math.abs(cumulativeNms[best] - target) ? i : best),
      0
    );
  const last = cumulativeNms.length - 1;
  const tocIdx = nearest(totalNm * 0.2);
  let todIdx = nearest(totalNm * 0.78);
  if (todIdx <= tocIdx) todIdx = Math.min(tocIdx + 2, last);
  const midRaw = nearest((cumulativeNms[tocIdx] + cumulativeNms[todIdx]) / 2);
  const midIdx = Math.min(Math.max(midRaw, tocIdx), todIdx);
  return { tocIdx, midIdx, todIdx };
}

/** Altitud (ft) en un punto de la ruta: subida lineal hasta el TOC,
 *  crucero, y descenso lineal desde el TOD. */
export function altitudeAtDistanceFt(
  cumNm: number, totalNm: number, tocNm: number, todNm: number, cruiseFt: number
): number {
  if (cumNm <= tocNm) return cruiseFt * (cumNm / tocNm);
  if (cumNm >= todNm) return cruiseFt * ((totalNm - cumNm) / (totalNm - todNm));
  return cruiseFt;
}

export interface LoadFigures {
  paxCount: number;
  infantCount: number;
  crewCount: number;
  tsob: number;
}

/** SIMULATION DATA (ocupacion y bebes), salvo la tripulacion minima, que
 *  sale de la regla real EASA ORO.CC.100. Determinista por vuelo. */
export function generateLoadFigures(flightNumber: string, seatCount: number): LoadFigures {
  const seed = hashCode(flightNumber + '-load');
  const loadFactor = 0.88 + (seed % 11) / 100;
  const paxCount = Math.round(seatCount * loadFactor);
  const infantCount = (seed >> 4) % 4;
  const crewCount = 2 + Math.ceil(seatCount / 50);
  return { paxCount, infantCount, crewCount, tsob: paxCount + infantCount + crewCount };
}

function greatCircleBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return Math.round(((θ * 180) / Math.PI + 360) % 360);
}

function formatLat(lat: number): string {
  const val = Math.round(Math.abs(lat) * 1000);
  return `${lat >= 0 ? 'N' : 'S'}${String(val).padStart(5, '0')}`;
}
function formatLon(lon: number): string {
  const val = Math.round(Math.abs(lon) * 1000);
  return `${lon >= 0 ? 'E' : 'W'}${String(val).padStart(6, '0')}`;
}

interface RouteWaypointLike {
  name: string;
  lat: number;
  lon: number;
  cumulativeNm: number;
}

/** SIMULATION DATA (excepto MTOW/MLW/MZFW y el peso IATA, reales).
 *  La posicion/distancia/rumbo de cada fix SI son reales — vienen ya
 *  calculados en `routeWaypoints`. Determinista por vuelo. */
export function generateOfpDispatchData(
  flightNumber: string,
  seatCount: number,
  std: string,
  routeWaypoints: RouteWaypointLike[],
  totalDistanceNm: number,
  depLat: number,
  depLon: number,
  cruiseAltitudeFt: number,
  flightTimeMinutes: number
): OfpDispatchData {
  const seed = hashCode(flightNumber + '-dispatch');
  const limits = a321neoWeightLimits;

  const taxiMinutes = 15 + (seed % 8);
  const taxiFuelKg = taxiMinutes * 12;
  const tripFuelKg = 4300 + (seed % 700);
  const contingencyFuelKg = Math.round(tripFuelKg * 0.05);
  const alternateFuelKg = 900 + ((seed >> 3) % 250);
  const finalReserveFuelKg = 1100;
  const extraFuelKg = (seed >> 5) % 3 === 0 ? 200 + (seed % 150) : 0;

  const blockFuelKg =
    taxiFuelKg + tripFuelKg + contingencyFuelKg + alternateFuelKg + finalReserveFuelKg + extraFuelKg;
  const takeoffFuelKg = blockFuelKg - taxiFuelKg;

  const burnRatePerMin = tripFuelKg / flightTimeMinutes;
  const fuelLines: FuelLine[] = [
    { label: 'TAXI', timeHHMM: minutesToHHMM(taxiMinutes), weightKg: taxiFuelKg },
    { label: 'TRIP', timeHHMM: minutesToHHMM(flightTimeMinutes), weightKg: tripFuelKg },
    { label: 'CONTINGENCY (5%)', timeHHMM: minutesToHHMM(contingencyFuelKg / burnRatePerMin), weightKg: contingencyFuelKg },
    { label: 'ALTERNATE (LIMF)', timeHHMM: minutesToHHMM(alternateFuelKg / 50), weightKg: alternateFuelKg },
    { label: 'FINAL RESERVE (30MIN)', timeHHMM: '00:30', weightKg: finalReserveFuelKg },
    { label: 'EXTRA', timeHHMM: minutesToHHMM(extraFuelKg / burnRatePerMin), weightKg: extraFuelKg },
    { label: 'BLOCK FUEL', timeHHMM: '—', weightKg: blockFuelKg },
  ];

  const load = generateLoadFigures(flightNumber, seatCount);
  const dowKg = 50200 + (seed % 400);
  const paxWeightKg = load.paxCount * IATA_STANDARD_PAX_WEIGHT_KG;
  const cargoWeightKg = Math.round(load.paxCount * (9 + ((seed >> 6) % 6)));
  const payloadKg = paxWeightKg + cargoWeightKg;
  const zfwKg = dowKg + payloadKg;
  const towKg = zfwKg + takeoffFuelKg;
  const ldwKg = zfwKg + (takeoffFuelKg - tripFuelKg);

  const cgPercentMac = Math.round((26 + ((seed >> 8) % 55) / 10) * 10) / 10;
  const thsValue = (28 - cgPercentMac) * 0.5;
  const thsTrim = `${thsValue >= 0 ? 'UP' : 'DN'} ${Math.abs(thsValue).toFixed(1)}`;

  const weights: WeightsBlock = {
    dowKg, payloadKg, zfwKg, maxZfwKg: limits.maxZeroFuelWeightKg,
    takeoffFuelKg, towKg, maxTowKg: limits.maxTakeoffWeightKg,
    tripFuelKg, ldwKg, maxLdwKg: limits.maxLandingWeightKg,
    paxCount: load.paxCount, paxWeightKg, cargoWeightKg,
    infantCount: load.infantCount, crewCount: load.crewCount,
    cgPercentMac, thsTrim,
  };

  const cruiseTasKt = 450;
  const flightLevel = Math.round(cruiseAltitudeFt / 100);
  const routeTable: RouteLegRow[] = [];
  let cumulativeMinutes = 0;
  let cumulativeFuelBurn = taxiFuelKg;
  let fuelRemaining = takeoffFuelKg;
  let prevLat = depLat;
  let prevLon = depLon;
  let prevCumNm = 0;

  const cums = routeWaypoints.map((w) => w.cumulativeNm);
  const snap = snapVerticalProfile(cums, totalDistanceNm);
  const tocNm = cums[snap.tocIdx];
  const todNm = cums[snap.todIdx];

  routeWaypoints.forEach((wp, i) => {
    const legDistance = wp.cumulativeNm - prevCumNm;
    const bearing = greatCircleBearing(prevLat, prevLon, wp.lat, wp.lon);

    const windDirDeg = (bearing + 90 + ((seed >> (i * 2)) % 90)) % 360;
    const windSpeedKt = 15 + ((seed >> (i * 3)) % 45);
    const windComponentKt = -25 + ((seed >> (i * 3)) % 50);
    const groundSpeedKt = cruiseTasKt + windComponentKt;
    const legMinutes = (legDistance / groundSpeedKt) * 60;
    cumulativeMinutes += legMinutes;

    const legFuelBurn = tripFuelKg * (legDistance / totalDistanceNm);
    const altFt = altitudeAtDistanceFt(wp.cumulativeNm, totalDistanceNm, tocNm, todNm, cruiseAltitudeFt);
    const fixFlightLevel = altFt >= cruiseAltitudeFt ? flightLevel : Math.round(altFt / 1000) * 10;    cumulativeFuelBurn += legFuelBurn;
    fuelRemaining -= legFuelBurn;

    const magVariation = -3 + ((seed >> (i * 4)) % 7);
    const windCorrectionAngle = Math.round(windComponentKt / -10);

    routeTable.push({
      fixName: wp.name,
      latLabel: formatLat(wp.lat),
      lonLabel: formatLon(wp.lon),
      magneticCourseDeg: (bearing + magVariation + 360) % 360,
      magneticHeadingDeg: (bearing + magVariation + windCorrectionAngle + 360) % 360,
      machNumber: Math.round((cruiseTasKt / 573) * 1000) / 1000,
      terrainHundredsFt: 5 + ((seed >> (i * 5)) % 45),
      groundSpeedKt: Math.round(groundSpeedKt),
      trueAirspeedKt: cruiseTasKt,
      tempDeviationC: -3 + ((seed >> (i * 6)) % 10),
      turbulenceIndex: (seed >> (i * 2)) % 3,
      windDirDeg, windSpeedKt, windComponentKt,
      segmentDistanceNm: Math.round(legDistance),
      totalDistanceRemainingNm: Math.round(totalDistanceNm - wp.cumulativeNm),
      segmentTimeMin: Math.round(legMinutes),
      totalElapsedMin: Math.round(cumulativeMinutes),
      segmentFuelBurnKg: Math.round(legFuelBurn),
      totalFuelBurnKg: Math.round(cumulativeFuelBurn),
      eto: addMinutesToTime(std, cumulativeMinutes),
      fuelRemainingKg: Math.round(fuelRemaining),
      flightLevel: fixFlightLevel,
    });

    prevLat = wp.lat;
    prevLon = wp.lon;
    prevCumNm = wp.cumulativeNm;
  });

  return { fuelLines, weights, routeTable };
}

// ---------------------------------------------------------------------
// RAW OFP TEXT — helpers de formato
// ---------------------------------------------------------------------

function padR(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function padLeft(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

function findFuel(lines: FuelLine[], labelStart: string): number {
  return lines.find((l) => l.label.startsWith(labelStart))?.weightKg ?? 0;
}

function dotDate(dateLabel: string): string {
  return dateLabel.replace(/ /g, '.');
}

function minutesToHrMin(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}HR/${String(m).padStart(2, '0')}MIN`;
}

function minutesToFourDigit(totalMinutes: number): string {
  const total = Math.round(totalMinutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHDotMM(totalMinutes: number): string {
  const total = Math.round(totalMinutes);
  return `${Math.floor(total / 60)}.${String(total % 60).padStart(2, '0')}`;
}

const MONTH_IDX: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

function utcToMadridHHMM(dateLabel: string, hhmmUtc: string): string {
  const [dayStr, mon, yearStr] = dateLabel.split(' ');
  const [h, m] = hhmmUtc.split(':').map(Number);
  const date = new Date(Date.UTC(Number(yearStr), MONTH_IDX[mon], Number(dayStr), h, m));
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .replace(':', '');
}

const BODY_COL_WIDTHS = [16, 9, 10, 6, 6, 6, 6, 7, 7, 6];

function bodyRow(cells: string[]): string {
  return cells.map((c, i) => padR(c, BODY_COL_WIDTHS[i])).join('').trimEnd();
}

export interface RawOfpParams {
  flightNumber: string;
  icaoAirlineCode: string;
  registration: string | null;
  icaoTypeDesignator: string;
  depIcao: string;
  arrIcao: string;
  altnIcao: string;
  dateLabel: string;
  std: string;
  sta: string;
  cruiseLevel: string;
  routeString: string;
  dispatch: OfpDispatchData;
  seatCount: number;
  flightTimeMinutes: number;
  totalDistanceNm: number;
  depIata: string;
  arrIata: string;
}

/** Ensambla el texto RAW completo, formato generico de dispatch release
 *  (no de ningun proveedor concreto). SIMULATION DATA salvo el operador,
 *  codigo ICAO, tipo de aeronave, ruta y pesos maximos certificados. */
export function buildRawOfpText(p: RawOfpParams): string {
  const { dispatch } = p;
  const flightDigits = p.flightNumber.replace(/\D/g, '');
  const taxiFuel = findFuel(dispatch.fuelLines, 'TAXI');
  const tripFuel = findFuel(dispatch.fuelLines, 'TRIP');
  const blockFuel = findFuel(dispatch.fuelLines, 'BLOCK');
  const contFuel = findFuel(dispatch.fuelLines, 'CONTINGENCY');
  const altnFuel = findFuel(dispatch.fuelLines, 'ALTERNATE');
  const reserveFuel = findFuel(dispatch.fuelLines, 'FINAL RESERVE');

  const totalBurn = tripFuel + taxiFuel;
  const arrFuel = blockFuel - totalBurn;
  const burnRatePerMin = tripFuel / p.flightTimeMinutes;
  const arrFuelMinutes = arrFuel / burnRatePerMin;

  const [dofDayStr, dofMonStr, dofYearStr] = p.dateLabel.split(' ');
  const dofDay = dofDayStr;
  const dofYY = dofYearStr.slice(2);
  const dofMM = String(MONTH_IDX[dofMonStr] + 1).padStart(2, '0');
  const regOrTbd = p.registration ?? 'TBD';

  const eetToLfmm = minutesToFourDigit(p.flightTimeMinutes * 0.35);
  const eetToLimm = minutesToFourDigit(p.flightTimeMinutes * 0.8);
  const genTimestamp = `${dofDay}${addMinutesToTime(p.std, -90).replace(':', '')}`;

  const lines: string[] = [];

  lines.push(`${p.icaoAirlineCode} ${flightDigits.padStart(4, '0')}     ${p.depIcao}/${p.arrIcao}     ${dotDate(p.dateLabel)}/${p.std.replace(':', '')}Z`);
  lines.push('');
  lines.push(`- IFR ${p.icaoAirlineCode}${flightDigits}/${dofDay} ${p.icaoTypeDesignator}/${regOrTbd} ${p.depIcao}  ${p.arrIcao}  ALTN ${p.altnIcao}`);
  lines.push(`  MIN T/O FUEL ${dispatch.weights.takeoffFuelKg} RLS FUEL ${blockFuel}`);
  lines.push(`  TOT BRN ${totalBurn} PLAN ARR FUEL ${arrFuel} ${minutesToHrMin(arrFuelMinutes)}`);
  lines.push('');
  lines.push(`  ALTN RTE - R00 /FL140 ${p.arrIcao}.DCT.${p.altnIcao}`);
  lines.push('');
  lines.push('  RTX - PLAN 1 OF 1 - RTE 01  - CTLD CALC/RTE/FL');
  lines.push('');
  lines.push('*'.repeat(14) + ' NATIONAL ROUTE PROGRAM ' + '*'.repeat(14));
  lines.push('');
  lines.push('FF LECBZQZX LFMMZQZX LIMMZQZX');
  lines.push(`${genTimestamp} ${p.depIcao}OPSB`);
  lines.push(`*FPL-${p.icaoAirlineCode}${flightDigits}-IS`);
  lines.push(`-${p.icaoTypeDesignator}/M-SDE2E3FGHIRWY/LB1D1`);
  lines.push(`-${p.depIcao}${p.std.replace(':', '')}`);
  lines.push(`-N0450${p.cruiseLevel} ${p.routeString}`);
  lines.push(`-${p.arrIcao}0200 ${p.altnIcao}`);
  lines.push(`-PBN/A1B1C1D1O1S2 DOF/${dofYY}${dofMM}${dofDay} REG/${regOrTbd}`);
  lines.push(` EET/LFMM${eetToLfmm} LIMM${eetToLimm} SEL/CJGK RMK/NRP`);
  lines.push('');

  const kgToLb = (kg: number) => Math.round(kg * 2.20462);
  const rampWeightLb = kgToLb(dispatch.weights.towKg + taxiFuel);
  const payloadLb = kgToLb(dispatch.weights.payloadKg);
  const seedPlan = hashCode(p.flightNumber + '-planning');
  const fuelDeltaP = 45 + (seedPlan % 15);
  const costDeltaP = 20 + ((seedPlan >> 2) % 10);
  const taxiOutMin = hhmmToMinutes(dispatch.fuelLines.find((l) => l.label === 'TAXI')?.timeHHMM ?? '00:15');
  const taxiInMin = 5 + ((seedPlan >> 3) % 6);
  const qAdjust = -3 + ((seedPlan >> 5) % 7);
  const costIndex = 20 + ((seedPlan >> 7) % 20);
  const fuelBias = (0.3 + ((seedPlan >> 9) % 15) / 10).toFixed(1);
  const avgLegs = dispatch.routeTable;
  const avgWindComp = Math.round(avgLegs.reduce((s, l) => s + l.windComponentKt, 0) / avgLegs.length);
  const avgTrack = avgLegs[Math.floor(avgLegs.length / 2)]?.magneticCourseDeg ?? 0;
  const avgTd = -5 + ((seedPlan >> 11) % 15);

  lines.push(`RAMP WT P01000 TIME P00 FUEL P${String(fuelDeltaP).padStart(4, '0')} COST P${String(costDeltaP).padStart(4, '0')} FL ${p.cruiseLevel.replace('F', '')}`);
  lines.push(`RAMP WT M01000 TIME P00 FUEL M${String(fuelDeltaP - 2).padStart(4, '0')} COST M${String(costDeltaP).padStart(4, '0')} FL ${p.cruiseLevel.replace('F', '')}`);
  lines.push('');
  lines.push(`RWT ${rampWeightLb} PLD ${payloadLb}          GND${taxiOutMin}/${taxiInMin} Q${String(qAdjust).padStart(2, '0')} CI${String(costIndex).padStart(4, '0')} SKD${p.std.replace(':', '')}/${p.sta.replace(':', '')}`);
  lines.push(
    `BIAS P${fuelBias} AVG WIND DIR/COMP ${String(avgTrack).padStart(3, '0')}/${avgWindComp >= 0 ? 'P' : 'M'}${String(Math.abs(avgWindComp)).padStart(3, '0')} AVG TD ${avgTd >= 0 ? 'P' : 'M'}${String(Math.abs(avgTd)).padStart(3, '0')}`
  );
  lines.push('');
  lines.push('FLIGHT PLAN / DISPATCH RELEASE BODY');
  lines.push('');
  lines.push(bodyRow(['TO', 'LAT', 'LONG', 'MC', 'MK', 'GS', 'TD', 'SD', 'ST', 'SB']));
  lines.push(bodyRow(['IDENT' + padLeft('FL', 11), 'WIND', 'WCP', 'MH', 'TRR', 'TAS', 'I', 'TLDR', 'TTLT', 'TTLB']));
  lines.push('-'.repeat(79));
  dispatch.routeTable.forEach((leg) => {
    const windLabel = `${String(leg.windDirDeg).padStart(3, '0')}${String(leg.windSpeedKt).padStart(3, '0')}`;
    const wcpLabel = `${leg.windComponentKt >= 0 ? 'P' : 'M'}${String(Math.abs(leg.windComponentKt)).padStart(3, '0')}`;
    const machLabel = String(Math.round(leg.machNumber * 1000));
    const tdLabel = `${leg.tempDeviationC >= 0 ? 'P' : 'M'}${String(Math.abs(leg.tempDeviationC)).padStart(2, '0')}`;

    lines.push(
      bodyRow([
        leg.fixName, leg.latLabel, leg.lonLabel,
        String(leg.magneticCourseDeg).padStart(3, '0'), machLabel, String(leg.groundSpeedKt), tdLabel,
        String(leg.segmentDistanceNm).padStart(4, '0'), String(leg.segmentTimeMin).padStart(4, '0'), String(leg.segmentFuelBurnKg).padStart(4, '0'),
      ])
    );
    lines.push(
      bodyRow([
        leg.fixName.padEnd(13) + padLeft(String(leg.flightLevel), 3),
        windLabel, wcpLabel, String(leg.magneticHeadingDeg).padStart(3, '0'), String(leg.terrainHundredsFt).padStart(3, '0'),
        String(leg.trueAirspeedKt), String(leg.turbulenceIndex),
        String(leg.totalDistanceRemainingNm).padStart(4, '0'), String(leg.totalElapsedMin).padStart(4, '0'), String(leg.totalFuelBurnKg).padStart(4, '0'),
      ])
    );
    lines.push('-'.repeat(79));
  });
  lines.push('');

  const fuel6 = (n: number) => String(n).padStart(6, '0');
  const fuel5 = (n: number) => String(n).padStart(5, '0');
  const fuelRow = (label: string, arpt: string, fuel: string, time = '', dist = '', extra = '') =>
    (padR(label, 10) + padR(arpt, 8) + padLeft(fuel, 7) + (time ? ' ' + time : '') + (dist ? ' ' + dist : '') + extra).trimEnd();

  const contMinutes = contFuel / burnRatePerMin;
  const altnMinutes = altnFuel / 50;
  const rule = '-'.repeat(62);

  lines.push(`PLAN ARR FUEL   ${fuel6(arrFuel)} ${minutesToFourDigit(arrFuelMinutes)}`);
  lines.push(rule);
  lines.push(padR('', 10) + padR('ARPT', 8) + padLeft('FUEL', 7) + ' TIME DIST');
  lines.push(fuelRow('ENRT BRN', p.arrIcao, fuel6(tripFuel), minutesToFourDigit(p.flightTimeMinutes), String(Math.round(p.totalDistanceNm)).padStart(4, '0')));
  lines.push(rule);
  lines.push(fuelRow('E/RSV', '5.0PCT', fuel5(contFuel), minutesToFourDigit(contMinutes)));
  lines.push(fuelRow('RSV', '', fuel5(reserveFuel), '0030'));
  lines.push(fuelRow('ALTN', p.altnIcao, fuel5(altnFuel), minutesToFourDigit(altnMinutes), '0052', ' FL140'));
  lines.push(rule);
  lines.push(fuelRow('T/O FUEL', '', fuel6(dispatch.weights.takeoffFuelKg)) + ' '.repeat(17) + 'MIN T/O   ' + fuel6(dispatch.weights.takeoffFuelKg));
  lines.push(rule);
  lines.push(fuelRow('TAXI', p.depIcao, fuel5(taxiFuel), minutesToFourDigit(taxiOutMin)));
  lines.push(' '.repeat(19) + '------');
  lines.push(fuelRow('TOTAL', '', fuel6(blockFuel)));
  lines.push('');
  lines.push(fuelRow('RLS FUEL', p.depIcao, fuel6(blockFuel)));

  let scheduledTotalMin = hhmmToMinutes(p.sta) - hhmmToMinutes(p.std);
  if (scheduledTotalMin < 0) scheduledTotalMin += 1440;
  const scheduledAirMin = scheduledTotalMin - taxiOutMin - taxiInMin;
  const planAirMin = p.flightTimeMinutes;
  const planTotalMin = planAirMin + taxiOutMin + taxiInMin;

  const otRow = (label: string, txo: number, air: number, txi: number, total: number) =>
    padR(label, 8) +
    padLeft(String(txo).padStart(2, '0'), 3) +
    padLeft(minutesToHDotMM(air), 7) +
    padLeft(String(txi).padStart(2, '0'), 5) +
    padLeft(minutesToHDotMM(total), 8);

  lines.push('');
  lines.push('ON-TIME ANALYSIS  ' + '*'.repeat(10));
  lines.push(padR('', 8) + padLeft('TXO', 3) + padLeft('AIR', 7) + padLeft('TXI', 5) + padLeft('TOTAL', 8));
  lines.push(otRow('SKDBLK', taxiOutMin, scheduledAirMin, taxiInMin, scheduledTotalMin));
  lines.push(otRow('FLIPLN', taxiOutMin, planAirMin, taxiInMin, planTotalMin));
  lines.push('');
  lines.push(
    `ENDURNC ${minutesToFourDigit(blockFuel / burnRatePerMin)} ADJ ${(1000 / burnRatePerMin).toFixed(1)} MINS/1000 KG`
  );

  const dispatcherDesk = 'FD03';
  const dispatcherId = '4471';
  const dispatcherName = 'ANNA KOVACS';
  const dispatcherContact = 'OCC/EXT-4471';

  lines.push('REMARKS / NAT TRACKS');
  lines.push('');
  lines.push('RMKS/');
  lines.push('PLANNED OPTIMUM FLIGHT LEVEL');
  lines.push('');
  lines.push('ACFT RESTR -NONE');
  lines.push('');
  lines.push('MEL ITEMS  -NONE');
  lines.push('');
  lines.push('NEF ITEMS  -NONE');
  lines.push('');
  lines.push('SEL ITEMS  -NONE');
  lines.push('');
  lines.push(' FOR SEL ITEM DESCRIPTIONS. REFER TO OPERATIONS MANUAL');
  lines.push(' - PART B.');
  lines.push('');
  lines.push('');
  lines.push(`DISP ${dispatcherDesk} ${dispatcherId} ${dispatcherName}      ${dispatcherContact}`);

  const wt = dispatch.weights;
  const closeoutLocal = utcToMadridHHMM(p.dateLabel, addMinutesToTime(p.std, -20));
  const kv = (label: string, value: string, endCol = 11, suffix = '') =>
    label + value.padStart(endCol - label.length) + suffix;
  const tsob = wt.paxCount + wt.infantCount + wt.crewCount;

  lines.push('');
  lines.push('');
  lines.push(`- LOAD CLOSEOUT RVSN 00 ${closeoutLocal}L`);
  lines.push(`${flightDigits} ${p.depIata}-${p.arrIata} ${regOrTbd}`);
  lines.push(kv('TOW', String(wt.towKg)));
  lines.push(kv('FOB', String(wt.takeoffFuelKg), 11, 'A'));
  lines.push(kv('ZFW', String(wt.zfwKg)));
  lines.push('CONF THS');
  lines.push(`1+F  ${wt.thsTrim}`);
  lines.push('R/A F-NO  A-NO  B-NO');
  lines.push(`CG ${wt.cgPercentMac.toFixed(1)} PCT`);
  lines.push(`PSGR ${wt.paxCount} W0 X0`);
  lines.push(kv('LAP', String(wt.infantCount), 8));
  lines.push(kv('CREW', String(wt.crewCount), 8));
  lines.push('--------');
  lines.push(kv('TSOB', String(tsob), 8));
  lines.push(kv('PSGR WGT', String(wt.paxWeightKg), 14));
  lines.push(kv('CGO WGT', String(wt.cargoWeightKg), 14));
  lines.push(kv('EOW', String(wt.dowKg)));
  lines.push('SECOK');

  return lines.join('\n');
}