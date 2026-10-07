import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AirportDataService } from '../../../data/airport-data';
import { formatCoord, generateSidSpec, generateStarSpec } from '../../../data/chart-procedures';
import { createPlateFrame, type GeoPoint, type PlateFrame, type Pt } from '../../../data/chart-geo';
import {
  arrowPoly,
  dirVec,
  label as makeLabel,
  pathFromPoints,
  readableAngle,
  roundedPath,
  type PlateDrawing,
} from '../../../data/chart-drawing';
import { ChartCanvas } from '../../../shared/components/chart-canvas/chart-canvas';

const INK = '#1a1a1a';

function headingOf(a: Pt, b: Pt): number {
  return ((Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI + 360) % 360;
}

@Component({
  selector: 'app-procedure-plate',
  imports: [RouterLink, ChartCanvas],
  template: `
    <div class="plate-screen">
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
              <div class="plate-proc">
                {{ s.designator }}
                <span class="plate-sub">{{ kindLabel() }}</span>
              </div>
              <div class="plate-country">RWY {{ s.runwayEnd }}</div>
            </div>

            @if (frame(); as f) {
              @if (drawing(); as d) {
                <app-chart-canvas [frame]="f" [drawing]="d" />
              }
            }

            <div class="table">
              <div class="t-row t-header">
                <span>FROM → TO</span>
                <span>COURSE</span>
                <span>DIST</span>
                <span>ALTITUDE</span>
              </div>
              @for (l of s.legs; track l.from + l.to) {
                <div class="t-row">
                  <span class="t-left">{{ l.from }} → {{ l.to }}</span>
                  <span>{{ course(l.courseDeg) }}°</span>
                  <span>{{ l.distNm.toFixed(1) }} NM</span>
                  <span>{{ l.altText }}</span>
                </div>
              }
            </div>

            <div class="table">
              <div class="w-row t-header">
                <span>WAYPOINT</span>
                <span>COORDINATES</span>
              </div>
              @for (w of s.waypoints; track w.name) {
                <div class="w-row">
                  <span class="t-left">{{ w.name }}</span>
                  <span>{{ coord(w) }}</span>
                </div>
              }
            </div>

            <div class="notes-box">
              @for (n of s.notes; track n; let i = $index) {
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
    .plate-screen {
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
    .plate-city,
    .plate-country {
      font-size: 11px;
      text-transform: uppercase;
    }
    .plate-city {
      margin-top: 0.125rem;
    }
    .plate-country {
      text-align: right;
      font-family: var(--font-data);
      font-weight: bold;
    }
    .plate-proc {
      font-family: var(--font-data);
      font-size: 15px;
      font-weight: bold;
      text-align: center;
      line-height: 1.3;
    }
    .plate-sub {
      display: block;
      font-size: 10px;
      font-weight: normal;
      letter-spacing: 0.08em;
      color: #4a4a4a;
    }
    .table {
      border-top: 2px solid #1a1a1a;
    }
    .table + .table {
      border-top: 1px solid #1a1a1a44;
    }
    .t-row {
      display: grid;
      grid-template-columns: 1.6fr 0.8fr 0.9fr 1.7fr;
      text-align: center;
      border-bottom: 1px solid #1a1a1a22;
    }
    .w-row {
      display: grid;
      grid-template-columns: 1fr 2fr;
      text-align: center;
      border-bottom: 1px solid #1a1a1a22;
    }
    .t-row:last-child,
    .w-row:last-child {
      border-bottom: none;
    }
    .t-row span,
    .w-row span {
      padding: 0.45rem 0.375rem;
      font-family: var(--font-data);
      font-size: 12px;
    }
    .t-row span.t-left,
    .w-row span.t-left {
      text-align: left;
      padding-left: 0.75rem;
      font-weight: bold;
    }
    .t-header {
      background: #ddd7c2;
      border-bottom: 1px solid #1a1a1a;
    }
    .t-header span {
      font-size: 10px;
      letter-spacing: 0.04em;
      font-weight: bold;
      text-align: center;
    }
    .notes-box {
      padding: 0.625rem 1rem;
      border-top: 2px solid #1a1a1a;
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
export class ProcedurePlate {
  private route = inject(ActivatedRoute);
  private airportData = inject(AirportDataService);

  private kind: 'SID' | 'STAR' = this.route.snapshot.data['kind'] === 'STAR' ? 'STAR' : 'SID';

  private icao$ = this.route.paramMap.pipe(map((params) => params.get('icao') ?? ''));
  private airport$ = this.icao$.pipe(
    switchMap((icao) => this.airportData.getByIcao(icao).pipe(map((a) => a ?? null)))
  );

  airport = toSignal(this.airport$, { initialValue: undefined });

  spec = computed(() => {
    const a = this.airport();
    if (!a) return undefined;
    return this.kind === 'STAR' ? generateStarSpec(a) : generateSidSpec(a);
  });

  kindLabel = computed(() => (this.kind === 'STAR' ? 'STANDARD ARRIVAL' : 'STANDARD DEPARTURE'));

  course(deg: number): string {
    return String(Math.round(deg) % 360 || 360).padStart(3, '0');
  }

  coord(g: GeoPoint): string {
    return formatCoord(g);
  }

  frame = computed<PlateFrame | undefined>(() => {
    const a = this.airport();
    const s = this.spec();
    if (!a || !s) return undefined;
    const key: GeoPoint[] = [s.threshold, s.runwayFarEnd, ...s.path, ...(s.contextTrack ?? [])];
    return createPlateFrame(a.icao, { lat: a.lat, lon: a.lon }, key, []);
  });

  drawing = computed<PlateDrawing | undefined>(() => {
    const s = this.spec();
    const f = this.frame();
    if (!s || !f) return undefined;

    const P = (g: GeoPoint): Pt => f.project(g.lat, g.lon);
    const pts = (...ps: Pt[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const { r } = dirVec(s.headingDeg);
    const drawing: PlateDrawing = { paths: [], polys: [], symbols: [], labels: [] };

    // Pista a escala.
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
    drawing.labels.push(
      makeLabel(far.x + r.x * 14, far.y + r.y * 14, `RWY ${s.runwayEnd}`, {
        anchor: r.x >= 0 ? 'start' : 'end',
        bold: true,
      })
    );

    // Contexto de la STAR: el tramo final del approach, en discontinua.
    if (s.contextTrack && s.contextLabel) {
      const ctx = s.contextTrack.map(P);
      drawing.paths.push({ d: pathFromPoints(ctx), style: 'dash' });
      const a = ctx[ctx.length - 2];
      const b = ctx[ctx.length - 1];
      drawing.labels.push(
        makeLabel((a.x + b.x) / 2 + 9, (a.y + b.y) / 2 + 12, s.contextLabel, {
          anchor: 'middle',
          rotate: readableAngle(headingOf(a, b)),
        })
      );
    }

    // Trazado del procedimiento, con flechas y rumbo/distancia de cada tramo.
    const path = s.path.map(P);
    drawing.paths.push({ d: roundedPath(path, 18), style: 'track' });
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const hd = headingOf(a, b);
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      drawing.polys.push({
        points: arrowPoly({ x: a.x + (b.x - a.x) * 0.6, y: a.y + (b.y - a.y) * 0.6 }, hd, 7),
        fill: INK,
        stroke: INK,
      });
      const leg = s.legs[i];
      if (leg) {
        drawing.labels.push(
          makeLabel(
            (a.x + b.x) / 2 + ((b.y - a.y) / len) * 9,
            (a.y + b.y) / 2 - ((b.x - a.x) / len) * 9,
            `${this.course(leg.courseDeg)}° ${leg.distNm.toFixed(1)}`,
            { anchor: 'middle', rotate: readableAngle(hd) }
          )
        );
      }
    }

    // Waypoints con su nombre y su restriccion de altitud.
    s.waypoints.forEach((wp) => {
      const p = P(wp);
      drawing.symbols.push({ x: p.x, y: p.y, kind: wp.kind });
      const toRight = p.x < f.width * 0.6;
      const lx = p.x + (toRight ? 9 : -9);
      const top = p.y < 36 ? p.y + 16 : p.y - 9;
      const anchor: 'start' | 'end' = toRight ? 'start' : 'end';
      drawing.labels.push(makeLabel(lx, top, wp.name, { anchor, bold: true }));
      drawing.labels.push(makeLabel(lx, top + 9, wp.altText, { anchor }));
    });

    return drawing;
  });
}