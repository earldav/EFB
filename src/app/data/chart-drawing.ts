import type { Pt } from './chart-geo';

export type PathStyle = 'track' | 'missed' | 'thin' | 'dash' | 'taxi';
export interface DrawPath {
  d: string;
  style: PathStyle;
}

export interface DrawPoly {
  points: string;
  fill: string;
  stroke: string;
}

export type SymbolKind = 'iaf' | 'if' | 'faf' | 'mahf' | 'wpt';
export interface DrawSymbol {
  x: number;
  y: number;
  kind: SymbolKind;
}

export interface DrawLabel {
  x: number;
  y: number;
  text: string;
  anchor: 'start' | 'middle' | 'end';
  weight: number;
  transform: string;
}

/** Todo lo que una carta dibuja encima del mapa. Cada tipo de carta
 *  (approach, SID, STAR...) construye uno de estos y lo pasa al lienzo. */
export interface PlateDrawing {
  paths: DrawPath[];
  polys: DrawPoly[];
  symbols: DrawSymbol[];
  labels: DrawLabel[];
}

const RAD = Math.PI / 180;
const f1 = (n: number) => n.toFixed(1);

/** Vectores de pantalla (y hacia abajo) para un rumbo: u = hacia delante,
 *  r = hacia la derecha. */
export function dirVec(headingDeg: number): { u: Pt; r: Pt } {
  const th = headingDeg * RAD;
  return {
    u: { x: Math.sin(th), y: -Math.cos(th) },
    r: { x: Math.cos(th), y: Math.sin(th) },
  };
}

export function label(
  x: number,
  y: number,
  text: string,
  opts: { anchor?: 'start' | 'middle' | 'end'; bold?: boolean; rotate?: number } = {}
): DrawLabel {
  return {
    x,
    y,
    text,
    anchor: opts.anchor ?? 'start',
    weight: opts.bold ? 700 : 400,
    transform: `rotate(${f1(opts.rotate ?? 0)} ${f1(x)} ${f1(y)})`,
  };
}

/** Angulo de giro para un rotulo alineado con un rumbo, sin quedar boca abajo. */
export function readableAngle(headingDeg: number): number {
  let a = headingDeg - 90;
  a = ((((a + 180) % 360) + 360) % 360) - 180;
  if (a > 90) a -= 180;
  if (a < -90) a += 180;
  return a;
}

export function pathFromPoints(pts: Pt[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${f1(p.x)},${f1(p.y)}`).join(' ');
}

/** Polilinea con las esquinas redondeadas (radio en pixeles). */
export function roundedPath(pts: Pt[], radius: number): string {
  if (pts.length < 3) return pathFromPoints(pts);
  const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let d = `M${f1(pts[0].x)},${f1(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const l1 = dist(a, b);
    const l2 = dist(b, c);
    const v1 = { x: (b.x - a.x) / l1, y: (b.y - a.y) / l1 };
    const v2 = { x: (c.x - b.x) / l2, y: (c.y - b.y) / l2 };
    const r = Math.min(radius, l1 * 0.45, l2 * 0.45);
    d += ` L${f1(b.x - v1.x * r)},${f1(b.y - v1.y * r)} Q${f1(b.x)},${f1(b.y)} ${f1(b.x + v2.x * r)},${f1(b.y + v2.y * r)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${f1(last.x)},${f1(last.y)}`;
}

/** Punta de flecha con la punta en `tip`, apuntando al rumbo dado. */
export function arrowPoly(tip: Pt, headingDeg: number, size = 6): string {
  const { u, r } = dirVec(headingDeg);
  const bx = tip.x - u.x * size;
  const by = tip.y - u.y * size;
  const w = size * 0.45;
  return `${f1(tip.x)},${f1(tip.y)} ${f1(bx + r.x * w)},${f1(by + r.y * w)} ${f1(bx - r.x * w)},${f1(by - r.y * w)}`;
}

/** Hipodromo de espera: el fix queda en el extremo de la rama de
 *  acercamiento y el circuito se extiende por detras. */
export function holdShape(
  fix: Pt,
  inboundCourse: number,
  turn: 'LEFT' | 'RIGHT',
  legNm: number,
  radiusNm: number,
  pxPerNm: number
): { d: string; arrow: string } {
  const { u, r } = dirVec(inboundCourse);
  const s = turn === 'RIGHT' ? 1 : -1;
  const sweep = turn === 'RIGHT' ? 1 : 0;
  const len = legNm * pxPerNm;
  const rad = radiusNm * pxPerNm;
  const at = (a: number, b: number): Pt => ({
    x: fix.x + a * u.x + s * b * r.x,
    y: fix.y + a * u.y + s * b * r.y,
  });
  const p0 = at(-len, 0);
  const p1 = at(0, 0);
  const p2 = at(0, 2 * rad);
  const p3 = at(-len, 2 * rad);
  const q = (p: Pt) => `${f1(p.x)},${f1(p.y)}`;
  const d =
    `M${q(p0)} L${q(p1)} A${f1(rad)},${f1(rad)} 0 0 ${sweep} ${q(p2)} ` +
    `L${q(p3)} A${f1(rad)},${f1(rad)} 0 0 ${sweep} ${q(p0)}`;
  const mid = at(-len * 0.5, 0);
  return { d, arrow: arrowPoly({ x: mid.x + u.x * 4, y: mid.y + u.y * 4 }, inboundCourse, 6) };
}