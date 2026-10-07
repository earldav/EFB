import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AirportDataService } from '../../../data/airport-data';
import { generateApproachSpec } from '../../../data/chart-procedures';
import { createPlateFrame, type GeoPoint, type PlateFrame, type Pt } from '../../../data/chart-geo';
import {
  arrowPoly,
  dirVec,
  holdShape,
  label as makeLabel,
  pathFromPoints,
  readableAngle,
  roundedPath,
  type PlateDrawing,
} from '../../../data/chart-drawing';
import { ChartCanvas } from '../../../shared/components/chart-canvas/chart-canvas';

const INK = '#1a1a1a';

@Component({
  selector: 'app-approach-plate',
  imports: [RouterLink, ChartCanvas],
  template: `
    <div class="approach-screen">
      @if (airport() === undefined) {
        <div class="msg">LOADING...</div>
      } @else if (airport() === null) {
        <div class="msg">AIRPORT NOT FOUND IN DATABASE.</div>
      } @else {
        <a [routerLink]="['/charts', airport()!.icao]" class="back-link">< {{ airport()!.icao }} CHARTS</a>

        @if (spec(); as s) {
          <div class="plate">
            <div class="plate-title-row">
              <div>
                <div class="plate-airport">{{ airport()!.icao }} / {{ airport()!.iata }}</div>
                <div class="plate-city">{{ airport()!.city }}</div>
              </div>
              <div class="plate-proc">{{ s.procedureLabel }}</div>
              <div class="plate-country">{{ airport()!.country }}</div>
            </div>

            <div class="grid4">
              @for (b of s.frequencies; track b.label) {
                <div class="box">
                  <div class="b-label">{{ b.label }}</div>
                  <div class="b-value">{{ b.value }}</div>
                </div>
              }
            </div>

            <div class="grid4">
              @for (b of navBoxes(); track b.label) {
                <div class="box">
                  <div class="b-label">{{ b.label }}</div>
                  <div class="b-value">{{ b.value }}</div>
                </div>
              }
            </div>

            <div class="missed-strip">
              <span class="missed-label">MISSED APCH:</span>
              {{ s.missedText }}
            </div>

            <div class="grid4 grid-last">
              @for (b of miniBoxes(); track b.label) {
                <div class="box">
                  <div class="b-label">{{ b.label }}</div>
                  <div class="b-value">{{ b.value }}</div>
                </div>
              }
            </div>

            @if (frame(); as f) {
              @if (drawing(); as d) {
                <app-chart-canvas [frame]="f" [drawing]="d" [msaFt]="s.msaFt" />
              }
            }

            @if (profile(); as pr) {
              <svg class="profile-view" [attr.viewBox]="'0 0 ' + pr.W + ' ' + pr.H" role="img" aria-label="Approach profile view">
                <rect x="0" y="0" [attr.width]="pr.W" [attr.height]="pr.H" fill="#f4f1e8" />

                @for (g of pr.gridAlt; track g.y) {
                  <line [attr.x1]="pr.ml" [attr.y1]="g.y" [attr.x2]="pr.W - pr.mr" [attr.y2]="g.y" stroke="#1a1a1a" stroke-opacity="0.18" stroke-width="0.6" />
                  <text [attr.x]="pr.ml - 4" [attr.y]="g.y + 3" text-anchor="end" font-size="8" fill="#4a4a3a" font-family="monospace">{{ g.label }}</text>
                }
                @for (g of pr.gridDist; track g.x) {
                  <line [attr.x1]="g.x" [attr.y1]="pr.baseY" [attr.x2]="g.x" [attr.y2]="pr.baseY + 4" stroke="#1a1a1a" stroke-width="0.8" />
                  <text [attr.x]="g.x" [attr.y]="pr.baseY + 14" text-anchor="middle" font-size="8" fill="#4a4a3a" font-family="monospace">{{ g.label }}</text>
                }
                <text [attr.x]="pr.W - pr.mr" [attr.y]="pr.baseY + 26" text-anchor="end" font-size="8" fill="#4a4a3a" font-family="monospace">NM TO THRESHOLD</text>

                <line [attr.x1]="pr.ml" [attr.y1]="pr.groundY" [attr.x2]="pr.W - pr.mr" [attr.y2]="pr.groundY" stroke="#1a1a1a" stroke-width="1" />
                <path [attr.d]="pr.line" fill="none" stroke="#1a1a1a" stroke-width="1.6" stroke-linejoin="round" />
                <line [attr.x1]="pr.gp.x1" [attr.y1]="pr.gp.y1" [attr.x2]="pr.gp.x2" [attr.y2]="pr.gp.y2" stroke="#1a1a1a" stroke-width="2.4" />

                @for (m of pr.marks; track m.name) {
                  <circle [attr.cx]="m.x" [attr.cy]="m.y" r="2.6" fill="#1a1a1a" />
                  <text [attr.x]="m.x" [attr.y]="m.y - 16" [attr.text-anchor]="m.anchor" font-size="8.5" font-weight="bold" fill="#1a1a1a" font-family="monospace">{{ m.name }}</text>
                  <text [attr.x]="m.x" [attr.y]="m.y - 7" [attr.text-anchor]="m.anchor" font-size="8" fill="#4a4a3a" font-family="monospace">{{ m.alt }}</text>
                }
                <text [attr.x]="pr.gpLabel.x" [attr.y]="pr.gpLabel.y" text-anchor="middle" font-size="8" fill="#1a1a1a" font-family="monospace">GS {{ s.glidepathDeg.toFixed(2) }}° · TCH {{ s.tchFt }}</text>
              </svg>
            }

            <div class="descent-table">
              <div class="dt-row dt-header">
                <span class="dt-label">GS (KT)</span>
                @for (r of descent(); track r.gs) {
                  <span class="dt-cell">{{ r.gs }}</span>
                }
              </div>
              <div class="dt-row">
                <span class="dt-label">V/S (FPM)</span>
                @for (r of descent(); track r.gs) {
                  <span class="dt-cell">{{ r.fpm }}</span>
                }
              </div>
            </div>

            <div class="minimums-table">
              <div class="mn-row mn-header">
                <span>CAT</span>
                <span>{{ s.minimumLabel }}</span>
                <span>HEIGHT</span>
                <span>VIS</span>
              </div>
              @for (m of s.minimums; track m.category) {
                <div class="mn-row">
                  <span>{{ m.category }}</span>
                  <span>{{ m.altitudeFt }}'</span>
                  <span>{{ m.heightFt }}'</span>
                  <span>{{ m.visibilityM }} M</span>
                </div>
              }
            </div>

            <div class="notes-box">
              @for (n of notes; track n; let i = $index) {
                <div class="note-line">{{ i + 1 }}. {{ n }}</div>
              }
            </div>

            <div class="plate-footer">
              SIMULATED PROCEDURE — GENERATED FOR GAME PURPOSES ONLY. NOT FOR REAL NAVIGATION.
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .approach-screen {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .msg {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text-dim);
    }
    .back-link {
      font-family: var(--font-data);
      font-size: 13px;
      color: var(--efb-cyan);
      text-decoration: none;
      letter-spacing: 0.03em;
    }
    .plate {
      background: #f4f1e8;
      border-radius: var(--radius-panel);
      overflow: hidden;
      color: #1a1a1a;
    }
    .plate-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 1rem 0.5rem;
      border-bottom: 2px solid #1a1a1a;
    }
    .plate-airport {
      font-family: var(--font-data);
      font-size: 16px;
      font-weight: bold;
    }
    .plate-city {
      font-size: 11px;
      margin-top: 0.125rem;
      text-transform: uppercase;
    }
    .plate-proc {
      font-family: var(--font-data);
      font-size: 15px;
      font-weight: bold;
      text-align: center;
    }
    .plate-country {
      font-size: 11px;
      text-align: right;
      text-transform: uppercase;
    }
    .grid4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-bottom: 1px solid #1a1a1a44;
    }
    .grid-last {
      border-bottom: 2px solid #1a1a1a;
    }
    .box {
      padding: 0.5rem;
      border-right: 1px solid #1a1a1a44;
      text-align: center;
    }
    .box:last-child {
      border-right: none;
    }
    .b-label {
      font-size: 9px;
      letter-spacing: 0.04em;
      color: #4a4a4a;
    }
    .b-value {
      font-family: var(--font-data);
      font-size: 13px;
      font-weight: bold;
      margin-top: 0.2rem;
    }
    .missed-strip {
      padding: 0.5rem 1rem;
      font-family: var(--font-data);
      font-size: 11.5px;
      line-height: 1.5;
      border-bottom: 1px solid #1a1a1a44;
    }
    .missed-label {
      font-weight: bold;
      margin-right: 0.375rem;
    }
    .profile-view {
      display: block;
      width: 100%;
      height: auto;
      border-top: 2px solid #1a1a1a;
      border-bottom: 1px solid #1a1a1a44;
    }
    .descent-table {
      border-bottom: 1px solid #1a1a1a44;
    }
    .dt-row {
      display: grid;
      grid-template-columns: 1.4fr repeat(6, 1fr);
      text-align: center;
    }
    .dt-header {
      background: #ddd7c2;
      border-bottom: 1px solid #1a1a1a;
    }
    .dt-cell {
      padding: 0.375rem 0.25rem;
      font-family: var(--font-data);
      font-size: 11px;
      border-right: 1px solid #1a1a1a22;
    }
    .dt-cell:last-child {
      border-right: none;
    }
    .dt-label {
      padding: 0.375rem 0.25rem;
      font-size: 9px;
      font-weight: bold;
      letter-spacing: 0.03em;
      text-align: left;
      padding-left: 0.75rem;
    }
    .minimums-table {
      border-bottom: 2px solid #1a1a1a;
    }
    .mn-row {
      display: grid;
      grid-template-columns: 0.6fr 1fr 1fr 1fr;
      text-align: center;
      border-bottom: 1px solid #1a1a1a22;
    }
    .mn-row:last-child {
      border-bottom: none;
    }
    .mn-row span {
      padding: 0.45rem 0.375rem;
      font-family: var(--font-data);
      font-size: 13px;
    }
    .mn-header {
      background: #ddd7c2;
      border-bottom: 1px solid #1a1a1a;
    }
    .mn-header span {
      font-size: 10px;
      letter-spacing: 0.04em;
      font-weight: bold;
    }
    .notes-box {
      padding: 0.625rem 1rem;
      border-bottom: 1px solid #1a1a1a44;
    }
    .note-line {
      font-size: 11px;
      line-height: 1.6;
      color: #3a3a2a;
    }
    .plate-footer {
      padding: 0.5rem 1rem;
      font-size: 9.5px;
      color: #6a6a5a;
      text-align: center;
      letter-spacing: 0.02em;
    }
  `,
})
export class ApproachPlate {
  private route = inject(ActivatedRoute);
  private airportData = inject(AirportDataService);

  private icao$ = this.route.paramMap.pipe(map((params) => params.get('icao') ?? ''));
  private airport$ = this.icao$.pipe(
    switchMap((icao) => this.airportData.getByIcao(icao).pipe(map((a) => a ?? null)))
  );

  airport = toSignal(this.airport$, { initialValue: undefined });

  notes = [
    'Use local altimeter setting; if not received, use the nearest available station.',
    'Missed approach climb gradient and holding speeds per Operations Manual.',
    'Distances in nautical miles, altitudes in feet. North is up.',
  ];

  spec = computed(() => {
    const a = this.airport();
    return a ? generateApproachSpec(a) : undefined;
  });

  navBoxes = computed(() => {
    const s = this.spec();
    if (!s) return [];
    return [
      { label: s.navLabel, value: s.navFreq ?? 'RNAV' },
      { label: 'FINAL APCH CRS', value: `${String(s.headingDeg).padStart(3, '0')}°` },
      { label: 'APT ELEV', value: `${s.elevationFt}'` },
      { label: 'TDZE', value: `${s.tdzeFt}'` },
    ];
  });

  miniBoxes = computed(() => {
    const s = this.spec();
    if (!s) return [];
    return [
      { label: 'ALT SET', value: 'HPA' },
      { label: 'TRANS LEVEL', value: s.transitionLevel },
      { label: 'TRANS ALT', value: `${s.transitionAltFt}'` },
      { label: 'MSA', value: `${s.msaFt}'` },
    ];
  });

  descent = computed(() => {
    const s = this.spec();
    if (!s) return [];
    const ftPerNm = 6076.12 * Math.tan((s.glidepathDeg * Math.PI) / 180);
    return [70, 90, 100, 120, 140, 160].map((gs) => ({
      gs,
      fpm: Math.round((gs * ftPerNm) / 60 / 5) * 5,
    }));
  });

  frame = computed<PlateFrame | undefined>(() => {
    const a = this.airport();
    const s = this.spec();
    if (!a || !s) return undefined;
    const keyPoints: GeoPoint[] = [s.threshold, s.runwayFarEnd, ...s.fixes, ...s.missedTrack];
    return createPlateFrame(a.icao, { lat: a.lat, lon: a.lon }, keyPoints, [s.iafHold, s.mahfHold]);
  });

  drawing = computed<PlateDrawing | undefined>(() => {
    const s = this.spec();
    const f = this.frame();
    if (!s || !f) return undefined;

    const P = (g: GeoPoint): Pt => f.project(g.lat, g.lon);
    const pts = (...ps: Pt[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const heading = s.headingDeg;
    const { r } = dirVec(heading);
    const holdSide = s.iafHold.turn === 'RIGHT' ? 1 : -1;
    // Los rotulos van al lado contrario de la espera.
    const lat = { x: r.x * -holdSide, y: r.y * -holdSide };

    const drawing: PlateDrawing = { paths: [], polys: [], symbols: [], labels: [] };

    // Pista a escala (con la anchura exagerada para que se vea).
    const thr = P(s.threshold);
    const far = P(s.runwayFarEnd);
    const w = 2.2;
    drawing.polys.push({
      points: pts(
        { x: thr.x - r.x * w, y: thr.y - r.y * w },
        { x: thr.x + r.x * w, y: thr.y + r.y * w },
        { x: far.x + r.x * w, y: far.y + r.y * w },
        { x: far.x - r.x * w, y: far.y - r.y * w }
      ),
      fill: INK,
      stroke: INK,
    });
    const rwyAnchor: 'start' | 'end' = r.x * holdSide >= 0 ? 'start' : 'end';
    drawing.labels.push(
      makeLabel(far.x + r.x * holdSide * 14, far.y + r.y * holdSide * 14, `RWY ${s.runwayEnd}`, {
        anchor: rwyAnchor,
        bold: true,
      })
    );

    // Tramo final: IAF -> IF -> FAF -> umbral.
    const pFix = s.fixes.map(P);
    drawing.paths.push({ d: pathFromPoints([...pFix, thr]), style: 'track' });
    const pFaf = pFix[2];
    drawing.polys.push({
      points: arrowPoly(
        { x: pFaf.x + (thr.x - pFaf.x) * 0.62, y: pFaf.y + (thr.y - pFaf.y) * 0.62 },
        heading,
        7
      ),
      fill: INK,
      stroke: INK,
    });
    drawing.labels.push(
      makeLabel(
        (pFaf.x + thr.x) / 2 + lat.x * 9,
        (pFaf.y + thr.y) / 2 + lat.y * 9,
        `${String(heading).padStart(3, '0')}°`,
        { anchor: 'middle', bold: true, rotate: readableAngle(heading) }
      )
    );

    // Simbolos y rotulos de los fixes.
    const kindOf = { IAF: 'iaf', IF: 'if', FAF: 'faf' } as const;
    s.fixes.forEach((fx, i) => {
      const p = pFix[i];
      drawing.symbols.push({ x: p.x, y: p.y, kind: kindOf[fx.role] });
      const lx = p.x + lat.x * 13;
      const ly = p.y + lat.y * 13;
      const anchor: 'start' | 'end' = lat.x >= 0 ? 'start' : 'end';
      const top = lat.y < 0 ? ly - 18 : ly + 9;
      drawing.labels.push(makeLabel(lx, top, fx.name, { anchor, bold: true }));
      drawing.labels.push(makeLabel(lx, top + 9, `D${fx.distNm.toFixed(1)}`, { anchor }));
      drawing.labels.push(makeLabel(lx, top + 18, `${fx.altitudeFt}`, { anchor }));
    });

    // Espera en el IAF.
    const hold = holdShape(
      pFix[0],
      s.iafHold.inboundCourse,
      s.iafHold.turn,
      s.iafHold.legNm,
      s.iafHold.radiusNm,
      f.pxPerNm
    );
    drawing.paths.push({ d: hold.d, style: 'thin' });
    drawing.polys.push({ points: hold.arrow, fill: INK, stroke: INK });

    // Aproximacion frustrada y espera en el MAHF.
    const miss = s.missedTrack.map(P);
    drawing.paths.push({ d: roundedPath(miss, 16), style: 'missed' });
    const last = miss[miss.length - 1];
    const prev = miss[miss.length - 2];
    const missHeading = ((Math.atan2(last.x - prev.x, -(last.y - prev.y)) * 180) / Math.PI + 360) % 360;
    drawing.polys.push({ points: arrowPoly(last, missHeading, 7), fill: INK, stroke: INK });

    const pM = P(s.mahf);
    const mHold = holdShape(
      pM,
      s.mahfHold.inboundCourse,
      s.mahfHold.turn,
      s.mahfHold.legNm,
      s.mahfHold.radiusNm,
      f.pxPerNm
    );
    drawing.paths.push({ d: mHold.d, style: 'dash' });
    drawing.polys.push({ points: mHold.arrow, fill: INK, stroke: INK });
    drawing.symbols.push({ x: pM.x, y: pM.y, kind: 'mahf' });
    drawing.labels.push(makeLabel(pM.x + 9, pM.y - 8, s.mahf.name, { bold: true }));

    const seg = { x: last.x - prev.x, y: last.y - prev.y };
    const segLen = Math.hypot(seg.x, seg.y) || 1;
    drawing.labels.push(
      makeLabel(
        (last.x + prev.x) / 2 + (seg.y / segLen) * 9,
        (last.y + prev.y) / 2 - (seg.x / segLen) * 9,
        'MISSED APCH',
        { anchor: 'middle', rotate: readableAngle(missHeading) }
      )
    );

    return drawing;
  });

  /** Vista de perfil: distancia al umbral contra altitud. */
  profile = computed(() => {
    const s = this.spec();
    if (!s) return undefined;
    const [iaf, ifx, faf] = s.fixes;
    const W = 340;
    const H = 170;
    const ml = 38;
    const mr = 16;
    const mt = 34;
    const baseY = 134;
    const maxD = Math.ceil(iaf.distNm) + 1;
    const maxAlt = Math.ceil((iaf.altitudeFt + 300) / 1000) * 1000;
    const x = (d: number) => ml + (1 - d / maxD) * (W - ml - mr);
    const y = (a: number) => baseY - (a / maxAlt) * (baseY - mt);
    const thrAlt = s.tdzeFt + s.tchFt;

    const points = [
      { name: iaf.name, d: iaf.distNm, a: iaf.altitudeFt, anchor: 'start' },
      { name: ifx.name, d: ifx.distNm, a: ifx.altitudeFt, anchor: 'middle' },
      { name: faf.name, d: faf.distNm, a: faf.altitudeFt, anchor: 'middle' },
      { name: 'THR', d: 0, a: thrAlt, anchor: 'end' },
    ];

    const gridAlt: { y: number; label: string }[] = [];
    for (let a = 0; a <= maxAlt; a += 1000) gridAlt.push({ y: y(a), label: `${a / 1000}K` });
    const gridDist: { x: number; label: string }[] = [];
    for (let d = 0; d <= maxD; d += 5) gridDist.push({ x: x(d), label: `${d}` });

    const gp = { x1: x(faf.distNm), y1: y(faf.altitudeFt), x2: x(0), y2: y(thrAlt) };

    return {
      W,
      H,
      ml,
      mr,
      baseY,
      groundY: y(s.tdzeFt),
      gridAlt,
      gridDist,
      gp,
      gpLabel: { x: (gp.x1 + gp.x2) / 2, y: (gp.y1 + gp.y2) / 2 - 8 },
      line: points
        .slice(0, 3)
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.d).toFixed(1)},${y(p.a).toFixed(1)}`)
        .join(' '),
      marks: points.map((p) => ({
        name: p.name,
        alt: Math.round(p.a),
        anchor: p.anchor,
        x: x(p.d),
        y: y(p.a),
      })),
    };
  });
}