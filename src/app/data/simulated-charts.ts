export interface ChartCategory {
  label: string;
  count: number;
}

export interface SimulatedChartSet {
  status: 'CURRENT';
  lastRevision: string;
  categories: ChartCategory[];
}

/** Hash simple y determinista de un string -> número.
 *  Mismo input = mismo output siempre, no es aleatorio real. */
export function hashCode(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const CATEGORY_LABELS = ['AERODROME', 'SID', 'STAR', 'APPROACH', 'EN-ROUTE'];

export function generateSimulatedCharts(icao: string): SimulatedChartSet {
  const seed = hashCode(icao);

  const categories: ChartCategory[] = CATEGORY_LABELS.map((label, i) => ({
    label,
    count: 1 + ((seed >> (i * 3)) % 6),
  }));

  const day = 1 + (seed % 28);
  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ];
  const month = months[(seed >> 4) % 12];
  const year = 2025 + ((seed >> 8) % 2);

  return {
    status: 'CURRENT',
    lastRevision: `${String(day).padStart(2, '0')} ${month} ${year}`,
    categories,
  };
}

// ---------------------------------------------------------------------
// APPROACH — carta completa (heading strip / plan view / profile /
// landing minimums). Todo SIMULATION DATA, determinista por ICAO.
// ---------------------------------------------------------------------

export interface ApproachFix {
  name: string;
  distanceNm: number;
}

export interface ProfileStep {
  distanceNm: number;
  altitudeFt: number;
  label?: string;
}

export interface MinimumsRow {
  category: 'A' | 'B' | 'C' | 'D';
  altitudeFt: number;
  visibilityM: number;
}

export interface SimulatedApproachFull {
  procedureType: string;
  runwayId: string;
  finalApproachCourse: number;
  minimumType: 'DA' | 'MDA';

  headingStrip: {
    atisFreq: string;
    approachFreq: string;
    towerFreq: string;
    groundFreq: string;
    locFreq: string | null;
    navId: string;
    aptElevationFt: number;
    tdzeFt: number;
    transitionLevel: string;
    transitionAltitude: number;
    msaFt: number;
    altSet: 'INCHES' | 'HPA';
    missedApproachInstruction: string;
    missedApproachAltitude: number;
  };

  planView: {
    initialFix: ApproachFix;
    intermediateFix: ApproachFix;
    finalFix: ApproachFix;
    holdingFix: string;
    holdingInboundCourse: number;
    holdingTurnDirection: 'LEFT' | 'RIGHT';
    radial1Course: number;
    radial2Course: number;
  };

  profileView: ProfileStep[];
  minimums: MinimumsRow[];
  notes: string[];
}

const PROCEDURE_TYPES_FULL = ['ILS', 'RNP (GNSS)', 'VOR', 'RNAV (GNSS)'] as const;
const FIX_NAME_POOL = [
  'NOLEN', 'FNUCH', 'RIDGE', 'PALIE', 'BREKO', 'DUNAV', 'KELSO', 'TORVA', 'MELON', 'ZIRKA',
];
const NAV_ID_POOL = ['IXYZ', 'IABC', 'IQRV', 'IMLT', 'ITRK'];

function pick<T>(pool: readonly T[], seed: number, salt: number): T {
  return pool[(seed >> salt) % pool.length];
}

/** SIMULATION DATA. No representa ningun procedimiento real publicado.
 *  Determinista por ICAO: mismo aeropuerto -> misma carta siempre. */
export function generateSimulatedApproachFull(icao: string, elevationFt: number): SimulatedApproachFull {
  const seed = hashCode(icao + '-approach-full');

  const runwayNumberRaw = 1 + (seed % 36);
  const runwayNumber = String(runwayNumberRaw).padStart(2, '0');
  const suffixOptions = ['', '', 'L', 'R'];
  const suffix = suffixOptions[(seed >> 5) % suffixOptions.length];
  const runwayId = `${runwayNumber}${suffix}`;
  const finalApproachCourse = runwayNumberRaw * 10 === 0 ? 360 : runwayNumberRaw * 10;

  const procedureType = pick(PROCEDURE_TYPES_FULL, seed, 3);
  const isPrecision = procedureType === 'ILS';
  const usesFrequency = procedureType === 'ILS' || procedureType === 'VOR';
  const locFreq = usesFrequency ? (108 + ((seed % 400) * 0.05)).toFixed(2) : null;

  const aptElevationFt = elevationFt;
  const tdzeFt = aptElevationFt - (seed % 15);
  const transitionAltitude = 4000 + ((seed >> 7) % 5) * 500;
  const msaFt = Math.round((aptElevationFt + 2500 + (seed % 1500)) / 100) * 100;

  const missedApproachAltitude = Math.round((aptElevationFt + 2000 + (seed % 1000)) / 100) * 100;
  const missedInstructions = [
    `CLIMB TO ${missedApproachAltitude} FT, TURN RIGHT, DIRECT ${pick(FIX_NAME_POOL, seed, 9)}, HOLD.`,
    `CLIMB TO ${missedApproachAltitude} FT ON RWY ${runwayId} HEADING, THEN AS DIRECTED.`,
    `CLIMB TO ${missedApproachAltitude} FT, TURN LEFT, DIRECT ${pick(FIX_NAME_POOL, seed, 11)}, HOLD.`,
  ];

  const initialFix: ApproachFix = { name: pick(FIX_NAME_POOL, seed, 13), distanceNm: 12 + (seed % 8) };
  const intermediateFix: ApproachFix = { name: pick(FIX_NAME_POOL, seed, 17), distanceNm: 6 + (seed % 4) };
  const finalFix: ApproachFix = { name: pick(FIX_NAME_POOL, seed, 19), distanceNm: 2 + (seed % 3) };
  const holdingFix = pick(FIX_NAME_POOL, seed, 23);

  const decisionHeight = isPrecision ? 200 + (seed % 150) : 350 + (seed % 450);

  const profileView: ProfileStep[] = [
    { distanceNm: initialFix.distanceNm, altitudeFt: transitionAltitude, label: initialFix.name },
    { distanceNm: intermediateFix.distanceNm, altitudeFt: Math.round((aptElevationFt + 1800) / 100) * 100, label: intermediateFix.name },
    { distanceNm: finalFix.distanceNm, altitudeFt: Math.round((aptElevationFt + 900) / 100) * 100, label: finalFix.name },
    { distanceNm: 0, altitudeFt: aptElevationFt + decisionHeight, label: 'MAPT' },
  ];

  const baseVis = isPrecision ? 550 : 1500;
  const minimums: MinimumsRow[] = (['A', 'B', 'C', 'D'] as const).map((cat, i) => ({
    category: cat,
    altitudeFt: decisionHeight + i * 40,
    visibilityM: baseVis + i * 200 + (seed % 100),
  }));

  const notes = [
    'DME required.',
    `Use local altimeter setting; if not received, use nearest available station.`,
    'VDP not authorized when using alternate altimeter setting.',
    `Rwy ${runwayId} circling south of RWY not authorized at night.`,
  ];

  return {
    procedureType,
    runwayId,
    finalApproachCourse,
    minimumType: isPrecision ? 'DA' : 'MDA',
    headingStrip: {
      atisFreq: (118 + (seed % 800) * 0.025).toFixed(3),
      approachFreq: (125 + ((seed >> 1) % 800) * 0.025).toFixed(3),
      towerFreq: (119 + ((seed >> 2) % 800) * 0.025).toFixed(3),
      groundFreq: (121 + ((seed >> 4) % 700) * 0.025).toFixed(3),
      locFreq,
      navId: pick(NAV_ID_POOL, seed, 21),
      aptElevationFt,
      tdzeFt,
      transitionLevel: `FL${100 + (seed % 100)}`,
      transitionAltitude,
      msaFt,
      altSet: (seed % 2 === 0 ? 'INCHES' : 'HPA') as 'INCHES' | 'HPA',
      missedApproachInstruction: missedInstructions[(seed >> 6) % missedInstructions.length],
      missedApproachAltitude,
    },
    planView: {
      initialFix,
      intermediateFix,
      finalFix,
      holdingFix,
      holdingInboundCourse: finalApproachCourse,
      holdingTurnDirection: (seed >> 8) % 2 === 0 ? 'RIGHT' : 'LEFT',
      radial1Course: (finalApproachCourse + 40) % 360,
      radial2Course: (finalApproachCourse + 320) % 360,
    },
    profileView,
    minimums,
    notes,
  };
}

// ---------------------------------------------------------------------
// Tabla de conversion velocidad respecto al suelo / regimen de descenso
// (estandar en cualquier carta de aproximacion: a mas rapido, mas fpm
// hace falta para mantener la misma senda de descenso de 3 grados).
// ---------------------------------------------------------------------

export interface DescentRateRow {
  groundSpeedKt: number;
  descentRateFtMin: number;
}

/** Para una senda de 3.00°, el regimen de descenso (fpm) es
 *  aproximadamente groundSpeed * 5.0 (aproximacion estandar de la industria). */
export function generateDescentRateTable(): DescentRateRow[] {
  const speeds = [70, 90, 100, 120, 140, 160];
  return speeds.map((gs) => ({
    groundSpeedKt: gs,
    descentRateFtMin: Math.round(gs * 5.0),
  }));
}