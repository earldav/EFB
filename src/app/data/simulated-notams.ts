export type NotamCategory = 'RWY' | 'TWY' | 'NAV' | 'SVC' | 'OBST';
export type NotamStatus = 'ACTIVE' | 'UPCOMING';

export interface Notam {
  id: string;
  category: NotamCategory;
  status: NotamStatus;
  from: Date;
  to: Date;
  estimated: boolean;
  schedule: string | null;
  plain: string;
  raw: string;
}

const pad = (n: number, len: number) => String(n).padStart(len, '0');
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_MS = 86_400_000;

/** FIR de la linea Q (LECB, confirmada con NOTAM publicados de LEVC) y
 *  posicion del ARP de Valencia: 39 29.4 N, 000 28.9 W. */
const FIR = 'LECB';
const ARP_Q = '3929N00029W';

interface NotamDef {
  series: string;
  number: number;
  category: NotamCategory;
  qCode: string;
  traffic: string;
  purpose: string;
  scope: string;
  radius: string;
  /** Inicio y duracion, en dias desde hoy. */
  startDays: number;
  startHhmm: string;
  durationDays: number;
  endHhmm: string;
  estimated: boolean;
  schedule?: string;
  text: string;
  plain: string;
}

/** SIMULATION DATA: avisos inventados para LEVC, con formato ICAO real. */
const DEFS: NotamDef[] = [
  {
    series: 'A',
    number: 3127,
    category: 'RWY',
    qCode: 'QMRLC',
    traffic: 'IV',
    purpose: 'NBO',
    scope: 'A',
    radius: '005',
    startDays: -2,
    startHhmm: '2230',
    durationDays: 12,
    endHhmm: '0300',
    estimated: false,
    schedule: 'DAILY 2230-0300',
    text: 'RWY 12/30 CLSD DUE TO MAINT.',
    plain: 'Runway 12/30 is closed for maintenance every night between 2230 and 0300 UTC.',
  },
  {
    series: 'A',
    number: 3144,
    category: 'NAV',
    qCode: 'QIGAS',
    traffic: 'I',
    purpose: 'NBO',
    scope: 'A',
    radius: '005',
    startDays: -1,
    startHhmm: '0730',
    durationDays: 3,
    endHhmm: '1100',
    estimated: true,
    text: 'ILS RWY 12 GP U/S.',
    plain: 'The ILS glide path for runway 12 is unserviceable. Only localizer approaches are available.',
  },
  {
    series: 'D',
    number: 2208,
    category: 'TWY',
    qCode: 'QMXLC',
    traffic: 'IV',
    purpose: 'M',
    scope: 'A',
    radius: '005',
    startDays: 0,
    startHhmm: '0600',
    durationDays: 9,
    endHhmm: '1800',
    estimated: false,
    text: 'TWY A CLSD BTN TWY A2 AND TWY A3.',
    plain: 'Taxiway A is closed between taxiways A2 and A3.',
  },
  {
    series: 'A',
    number: 3201,
    category: 'NAV',
    qCode: 'QNDAS',
    traffic: 'IV',
    purpose: 'BO',
    scope: 'AE',
    radius: '025',
    startDays: 2,
    startHhmm: '0800',
    durationDays: 6,
    endHhmm: '1600',
    estimated: true,
    text: 'DME VLC U/S.',
    plain: 'DME VLC is unserviceable.',
  },
  {
    series: 'E',
    number: 5016,
    category: 'SVC',
    qCode: 'QFFCH',
    traffic: 'IV',
    purpose: 'NBO',
    scope: 'A',
    radius: '005',
    startDays: 4,
    startHhmm: '0000',
    durationDays: 28,
    endHhmm: '2359',
    estimated: false,
    text: 'RFFS CHANGED TO CAT 8.',
    plain: 'Rescue and fire fighting category changed to CAT 8.',
  },
  {
    series: 'D',
    number: 2231,
    category: 'OBST',
    qCode: 'QOBCE',
    traffic: 'IV',
    purpose: 'M',
    scope: 'A',
    radius: '005',
    startDays: -30,
    startHhmm: '0800',
    durationDays: 200,
    endHhmm: '2159',
    estimated: true,
    text: 'OBST CRANE ERECTED. PSN 392924N 0002618W (2NM E OF ARP). ELEV 98FT AMSL. HGT 230FT AGL. LGTD.',
    plain: 'A crane 230 ft above ground has been erected 2 NM east of the aerodrome. It is lit.',
  },
];

/** AAMMDDHHMM, el formato de los campos B) y C). */
function fmtNotamTime(d: Date): string {
  return (
    pad(d.getUTCFullYear() % 100, 2) +
    pad(d.getUTCMonth() + 1, 2) +
    pad(d.getUTCDate(), 2) +
    pad(d.getUTCHours(), 2) +
    pad(d.getUTCMinutes(), 2)
  );
}

export function formatNotamDate(d: Date): string {
  return `${pad(d.getUTCDate(), 2)} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}Z`;
}

function hhmmToMs(hhmm: string): number {
  return (Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2))) * 60_000;
}

/** Avisos de Valencia. Las fechas son relativas al dia de la consulta, asi
 *  que siempre hay avisos vigentes y proximos. */
export function generateValenciaNotams(now: Date = new Date()): Notam[] {
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const yy = pad(now.getUTCFullYear() % 100, 2);

  const notams = DEFS.map((d): Notam => {
    const from = new Date(dayStart + d.startDays * DAY_MS + hhmmToMs(d.startHhmm));
    const to = new Date(dayStart + (d.startDays + d.durationDays) * DAY_MS + hhmmToMs(d.endHhmm));
    const id = `${d.series}${pad(d.number, 4)}/${yy}`;
    const q =
      `Q) ${FIR}/${d.qCode}/${d.traffic.padEnd(2)}/${d.purpose.padEnd(3)}/${d.scope.padEnd(2)}/` +
      `000/999/${ARP_Q}${d.radius}`;

    const lines = [
      `${id} NOTAMN`,
      q,
      `A) LEVC B) ${fmtNotamTime(from)} C) ${fmtNotamTime(to)}${d.estimated ? ' EST' : ''}`,
    ];
    if (d.schedule) lines.push(`D) ${d.schedule}`);
    lines.push(`E) ${d.text}`);

    return {
      id,
      category: d.category,
      status: from.getTime() <= now.getTime() ? 'ACTIVE' : 'UPCOMING',
      from,
      to,
      estimated: d.estimated,
      schedule: d.schedule ?? null,
      plain: d.plain,
      raw: lines.join('\n'),
    };
  });

  return notams.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1;
    return a.status === 'ACTIVE' ? a.to.getTime() - b.to.getTime() : a.from.getTime() - b.from.getTime();
  });
}