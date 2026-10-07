import { CurrentConditions, ForecastPeriod } from './weather-api';

const KT_PER_KMH = 0.539957;
const pad = (n: number, len: number) => String(n).padStart(len, '0');

/** Open-Meteo devuelve las horas en UTC pero SIN la 'Z' final; sin ella el
 *  navegador las interpreta como hora local y se desplazan. */
export function asUtcDate(iso: string): Date {
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z');
}

export function kmhToKt(kmh: number): number {
  return Math.round(kmh * KT_PER_KMH);
}

/** Cobertura (%) -> grupo de nubes. La ALTURA de la base no viene de la
 *  API (Open-Meteo no da techo de nubes), se usa una estimacion fija. */
function cloudGroup(coverPercent: number): string {
  if (coverPercent <= 10) return 'SKC';
  if (coverPercent <= 37) return 'FEW020';
  if (coverPercent <= 62) return 'SCT025';
  if (coverPercent <= 87) return 'BKN018';
  return 'OVC012';
}

const SKY_LABELS: Record<string, string> = {
  SKC: 'CLEAR SKY',
  FEW020: 'FEW CLOUDS',
  SCT025: 'SCATTERED CLOUDS',
  BKN018: 'BROKEN CLOUDS',
  OVC012: 'OVERCAST',
};

export function skyLabel(coverPercent: number): string {
  return SKY_LABELS[cloudGroup(coverPercent)] ?? 'CLOUDY';
}

const WX_CODES: Record<number, string> = {
  45: 'FG', 48: 'FZFG',
  51: '-DZ', 53: 'DZ', 55: '+DZ', 56: '-FZDZ', 57: 'FZDZ',
  61: '-RA', 63: 'RA', 65: '+RA', 66: '-FZRA', 67: 'FZRA',
  71: '-SN', 73: 'SN', 75: '+SN', 77: 'SG',
  80: '-SHRA', 81: 'SHRA', 82: '+SHRA', 85: '-SHSN', 86: '+SHSN',
  95: 'TS', 96: 'TSGR', 99: 'TSGR',
};

function wxGroup(code: number): string {
  return WX_CODES[code] ?? '';
}

function wxText(code: number): string {
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return '';
}

/** Texto corto de la condicion actual: fenomeno si lo hay, si no el cielo. */
export function conditionLabel(c: CurrentConditions): string {
  return wxText(c.weatherCode).toUpperCase() || skyLabel(c.cloudCoverPercent);
}

function windGroup(directionDeg: number, speedKmh: number, gustKmh: number): string {
  const speedKt = kmhToKt(speedKmh);
  const gustKt = kmhToKt(gustKmh);
  if (speedKt === 0) return '00000KT';
  const gust = gustKt >= speedKt + 10 ? `G${pad(gustKt, 2)}` : '';
  if (speedKt <= 3) return `VRB${pad(speedKt, 2)}${gust}KT`;
  const dir10 = (Math.round(directionDeg / 10) * 10) % 360 || 360;
  return `${pad(dir10, 3)}${pad(speedKt, 2)}${gust}KT`;
}

function visibilityGroup(visibilityM: number): string {
  if (visibilityM >= 9999) return '9999';
  const step = visibilityM < 5000 ? 100 : 1000;
  const rounded = Math.max(Math.round(visibilityM / step) * step, 0);
  return rounded >= 10000 ? '9999' : pad(rounded, 4);
}

function visAndSky(visibilityM: number, coverPercent: number, weatherCode: number) {
  const vis = visibilityGroup(visibilityM);
  const sky = cloudGroup(coverPercent);
  const wx = wxGroup(weatherCode);
  const cavok = vis === '9999' && sky === 'SKC' && wx === '';
  return { vis, sky, wx, cavok };
}

function tempValue(t: number): string {
  const r = Math.round(t);
  return r < 0 ? `M${pad(Math.abs(r), 2)}` : pad(r, 2);
}

function dayTimeGroup(iso: string): string {
  const d = asUtcDate(iso);
  return `${pad(d.getUTCDate(), 2)}${pad(d.getUTCHours(), 2)}${pad(d.getUTCMinutes(), 2)}Z`;
}

/** METAR en formato real con los valores en vivo. Las nubes llevan una
 *  altura de base estimada (la API no la da). */
export function generateMetar(icao: string, c: CurrentConditions): string {
  const { vis, sky, wx, cavok } = visAndSky(c.visibilityM, c.cloudCoverPercent, c.weatherCode);
  const wind = windGroup(c.windDirectionDeg, c.windSpeedKmh, c.windGustKmh);
  const middle = cavok ? 'CAVOK' : [vis, wx, sky].filter(Boolean).join(' ');
  return `${icao} ${dayTimeGroup(c.observedAt)} ${wind} ${middle} ${tempValue(c.temperatureC)}/${tempValue(c.dewpointC)} Q${Math.round(c.qnhHpa)}`;
}

export interface TafRow {
  timeLabel: string;
  wind: string;
  visibility: string;
  sky: string;
}

/** Tabla del pronostico horario real de la API (no es un TAF oficial
 *  codificado: no tiene grupos FM/BECMG/TEMPO). */
export function generateForecastTable(periods: ForecastPeriod[]): TafRow[] {
  return periods.map((p) => {
    const d = asUtcDate(p.timeIso);
    const { vis, sky, wx, cavok } = visAndSky(p.visibilityM, p.cloudCoverPercent, p.weatherCode);
    return {
      timeLabel: `${pad(d.getUTCDate(), 2)}/${pad(d.getUTCHours(), 2)}00Z`,
      wind: windGroup(p.windDirectionDeg, p.windSpeedKmh, 0),
      visibility: vis,
      sky: cavok ? 'CAVOK' : [wx, sky].filter(Boolean).join(' '),
    };
  });
}

export function decodeForecastPeriod(p: ForecastPeriod): string {
  const dir = Math.round(p.windDirectionDeg);
  const wx = wxText(p.weatherCode);
  return `Wind ${dir}° at ${kmhToKt(p.windSpeedKmh)} kt · ${skyLabel(p.cloudCoverPercent)}${wx ? ' · ' + wx : ''}`;
}

export function formatWind(c: CurrentConditions): string {
  const kt = kmhToKt(c.windSpeedKmh);
  if (kt === 0) return 'CALM';
  const gustKt = kmhToKt(c.windGustKmh);
  const gust = gustKt >= kt + 10 ? ` · G${gustKt}` : '';
  return `${pad(Math.round(c.windDirectionDeg), 3)}° / ${kt} KT${gust}`;
}

export function formatVisibility(m: number): string {
  if (m >= 9999) return '10 KM +';
  if (m >= 5000) return `${Math.round(m / 1000)} KM`;
  return `${Math.round(m / 100) * 100} M`;
}

export function formatUtcTime(iso: string): string {
  const d = asUtcDate(iso);
  return `${pad(d.getUTCHours(), 2)}${pad(d.getUTCMinutes(), 2)}Z`;
}

export function formatLocalTime(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(asUtcDate(iso));
  } catch {
    return '';
  }
}