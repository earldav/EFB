import { hashCode } from './simulated-charts';

export interface RunwayInfo {
  id: string; // "07/25"
  lengthFt: number;
  widthFt: number;
  surface: string;
  headingDeg: number;
}

export interface FrequencyInfo {
  type: string;
  freqMhz: string;
}

export interface NavAidInfo {
  type: string;
  ident: string;
  freqMhz: string;
}

export interface SimulatedAirportInfo {
  runways: RunwayInfo[];
  frequencies: FrequencyInfo[];
  navAids: NavAidInfo[];
}

/** REAL DATA: aeropuertos con datos publicados. El resto se genera
 *  (SIMULATION DATA). LEVC: pista 12/30 de 3.215 x 45 m, frecuencias y
 *  radioayudas segun bases de datos publicas. */
const REAL_AIRPORT_INFO: Record<string, SimulatedAirportInfo> = {
  LEVC: {
    runways: [{ id: '12/30', lengthFt: 10548, widthFt: 148, surface: 'ASPHALT', headingDeg: 120 }],
    frequencies: [
      { type: 'TOWER', freqMhz: '118.550' },
      { type: 'GROUND', freqMhz: '121.875' },
      { type: 'APPROACH', freqMhz: '124.750' },
      { type: 'ATIS', freqMhz: '121.075' },
    ],
    navAids: [
      { type: 'VOR/DME', ident: 'VLC', freqMhz: '116.10' },
      { type: 'ILS RWY12', ident: 'VLN', freqMhz: '111.50' },
      { type: 'ILS RWY30', ident: 'IVC', freqMhz: '110.10' },
    ],
  },
};

const SURFACES = ['ASPHALT', 'CONCRETE', 'ASPHALT/CONCRETE'];
const NAV_TYPES = ['VOR', 'NDB', 'VOR/DME'];
const NAV_IDENTS = ['ABC', 'XYZ', 'QRV', 'MLT', 'TRK', 'ZKA'];

function pick<T>(pool: readonly T[], seed: number, salt: number): T {
  return pool[(seed >> salt) % pool.length];
}

/** SIMULATION DATA salvo los aeropuertos de REAL_AIRPORT_INFO. Genera
 *  pistas/frecuencias/navaids con pinta creible, deterministas por ICAO
 *  (mismo aeropuerto = mismos datos siempre). */
export function generateSimulatedAirportInfo(icao: string): SimulatedAirportInfo {
  const real = REAL_AIRPORT_INFO[icao];
  if (real) return real;

  const seed = hashCode(icao + '-airport-info');

  const runwayCount = 1 + (seed % 3);
  const runways: RunwayInfo[] = [];
  for (let i = 0; i < runwayCount; i++) {
    const heading1 = 1 + ((seed >> (i * 4)) % 36);
    const heading2raw = heading1 + 18;
    const heading2 = heading2raw > 36 ? heading2raw - 36 : heading2raw;
    runways.push({
      id: `${String(heading1).padStart(2, '0')}/${String(heading2).padStart(2, '0')}`,
      lengthFt: 5000 + ((seed >> (i * 5)) % 8) * 1000,
      widthFt: 100 + ((seed >> (i * 3)) % 5) * 10,
      surface: pick(SURFACES, seed, i * 7),
      headingDeg: heading1 * 10,
    });
  }

  const frequencies: FrequencyInfo[] = [
    { type: 'TOWER', freqMhz: (118 + (seed % 700) * 0.025).toFixed(3) },
    { type: 'GROUND', freqMhz: (121 + ((seed >> 2) % 700) * 0.025).toFixed(3) },
    { type: 'APPROACH', freqMhz: (125 + ((seed >> 4) % 700) * 0.025).toFixed(3) },
    { type: 'ATIS', freqMhz: (118 + ((seed >> 6) % 700) * 0.025).toFixed(3) },
  ];

  const navAidCount = 1 + (seed % 2);
  const navAids: NavAidInfo[] = [];
  for (let i = 0; i < navAidCount; i++) {
    navAids.push({
      type: pick(NAV_TYPES, seed, i * 9),
      ident: pick(NAV_IDENTS, seed, i * 11),
      freqMhz: (108 + ((seed >> (i * 6)) % 400) * 0.05).toFixed(2),
    });
  }

  return { runways, frequencies, navAids };
}