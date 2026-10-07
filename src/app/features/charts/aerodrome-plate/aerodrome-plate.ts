import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AirportDataService } from '../../../data/airport-data';
import { formatCoord, generateAerodromeSpec } from '../../../data/chart-procedures';
import { createPlateFrame, type GeoPoint, type PlateFrame, type Pt } from '../../../data/chart-geo';
import {
  dirVec,
  label as makeLabel,
  pathFromPoints,
  readableAngle,
  type PlateDrawing,
} from '../../../data/chart-drawing';
import { ChartCanvas } from '../../../shared/components/chart-canvas/chart-canvas';

const INK = '#1a1a1a';

@Component({
  selector: 'app-aerodrome-plate',
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
              <div class="plate-proc">AERODROME CHART</div>
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

            <div class="info-strip">
              <span><span class="i-label">ARP</span> {{ arpLabel() }}</span>
              <span><span class="i-label">ELEV</span> {{ s.elevationFt }}'</span>
            </div>

            @if (frame(); as f) {
              @if (drawing(); as d) {
                <app-chart-canvas [frame]="f" [drawing]="d" [scaleUnit]="'M'" />
              }
            }

            <div class="rwy-table">
              <div class="rw-row rw-header">
                <span>RWY</span>
                <span>HDG</span>
                <span>LENGTH × WIDTH</span>
                <span>SURFACE</span>
              </div>
              @for (r of s.runways; track r.id) {
                <div class="rw-row">
                  <span>{{ r.id }}</span>
                  <span>{{ hdg(r.headingDeg) }}° / {{ hdg(r.headingDeg + 180) }}°</span>
                  <span>{{ meters(r.lengthFt) }} × {{ meters(r.widthFt) }} M</span>
                  <span>{{ r.surface }}</span>
                </div>
              }
            </div>

            <div class="plate-footer">
              ILLUSTRATIVE LAYOUT — TAXIWAYS, APRON AND BUILDINGS ARE NOT REAL. NOT FOR NAVIGATION.
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
    }
    .plate-proc {
      font-family: var(--font-data);
      font-size: 15px;
      font-weight: bold;
      text-align: center;
    }
    .grid4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-bottom: 1px solid #1a1a1a44;
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
    .info-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1.5rem;
      padding: 0.5rem 1rem;
      font-family: var(--font-data);
      font-size: 12px;
      font-weight: bold;
      border-bottom: 2px solid #1a1a1a;
    }
    .i-label {
      font-size: 10px;
      font-weight: normal;
      letter-spacing: 0.04em;
      color: #4a4a4a;
      margin-right: 0.25rem;
    }
    .rwy-table {
      border-top: 2px solid #1a1a1a;
      border-bottom: 1px solid #1a1a1a44;
    }
    .rw-row {
      display: grid;
      grid-template-columns: 0.8fr 1.3fr 1.5fr 1.3fr;
      text-align: center;
      border-bottom: 1px solid #1a1a1a22;
    }
    .rw-row:last-child {
      border-bottom: none;
    }
    .rw-row span {
      padding: 0.45rem 0.375rem;
      font-family: var(--font-data);
      font-size: 12px;
    }
    .rw-header {
      background: #ddd7c2;
      border-bottom: 1px solid #1a1a1a;
    }
    .rw-header span {
      font-size: 10px;
      letter-spacing: 0.04em;
      font-weight: bold;
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
export class AerodromePlate {
  private route = inject(ActivatedRoute);
  private airportData = inject(AirportDataService);

  private icao$ = this.route.paramMap.pipe(map((params) => params.get('icao') ?? ''));
  private airport$ = this.icao$.pipe(
    switchMap((icao) => this.airportData.getByIcao(icao).pipe(map((a) => a ?? null)))
  );

  airport = toSignal(this.airport$, { initialValue: undefined });

  spec = computed(() => {
    const a = this.airport();
    return a ? generateAerodromeSpec(a) : undefined;
  });

  arpLabel = computed(() => {
    const s = this.spec();
    return s ? formatCoord(s.arp) : '';
  });

  hdg(deg: number): string {
    return String(Math.round(deg) % 360 || 360).padStart(3, '0');
  }

  meters(ft: number): number {
    return Math.round(ft * 0.3048);
  }

  frame = computed<PlateFrame | undefined>(() => {
    const a = this.airport();
    const s = this.spec();
    if (!a || !s) return undefined;
    const key: GeoPoint[] = [
      ...s.runways.flatMap((r) => [r.endAPoint, r.endBPoint]),
      ...s.apron,
      ...s.terminal,
      s.tower,
    ];
    return createPlateFrame(a.icao, { lat: a.lat, lon: a.lon }, key, [], {
      useTiles: false,
      minWindowNm: 2.4,
    });
  });

  drawing = computed<PlateDrawing | undefined>(() => {
    const s = this.spec();
    const f = this.frame();
    if (!s || !f) return undefined;

    const P = (g: GeoPoint): Pt => f.project(g.lat, g.lon);
    const pts = (...ps: Pt[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const main = dirVec(s.mainHeadingDeg);
    const drawing: PlateDrawing = { paths: [], polys: [], symbols: [], labels: [] };

    // Plataforma y terminal.
    const aprPts = s.apron.map(P);
    drawing.polys.push({ points: pts(...aprPts), fill: '#ddd7c2', stroke: '#7a7a6a' });
    const termPts = s.terminal.map(P);
    drawing.polys.push({ points: pts(...termPts), fill: '#bdb7a2', stroke: '#4a4a3a' });

    // Calles de rodaje.
    s.taxiways.forEach((t) => {
      drawing.paths.push({ d: pathFromPoints([P(t.from), P(t.to)]), style: 'taxi' });
      if (t.labelAt) {
        const p = P(t.labelAt);
        drawing.labels.push(
          makeLabel(p.x, p.y, t.name, { anchor: 'middle', rotate: readableAngle(s.mainHeadingDeg) })
        );
      }
    });

    // Puestos de estacionamiento.
    s.stands.forEach((g) => {
      const c = P(g);
      const h = 2.3;
      drawing.polys.push({
        points: pts(
          { x: c.x - main.u.x * h - main.r.x * h, y: c.y - main.u.y * h - main.r.y * h },
          { x: c.x + main.u.x * h - main.r.x * h, y: c.y + main.u.y * h - main.r.y * h },
          { x: c.x + main.u.x * h + main.r.x * h, y: c.y + main.u.y * h + main.r.y * h },
          { x: c.x - main.u.x * h + main.r.x * h, y: c.y - main.u.y * h + main.r.y * h }
        ),
        fill: 'none',
        stroke: '#7a7a6a',
      });
    });

    // Pistas a escala, con eje discontinuo y numeros en las cabeceras.
    s.runways.forEach((rw) => {
      const a = P(rw.endAPoint);
      const b = P(rw.endBPoint);
      const { u, r } = dirVec(rw.headingDeg);
      const half = Math.max(1.8, (rw.widthNm * f.pxPerNm) / 2);
      drawing.polys.push({
        points: pts(
          { x: a.x - r.x * half, y: a.y - r.y * half },
          { x: a.x + r.x * half, y: a.y + r.y * half },
          { x: b.x + r.x * half, y: b.y + r.y * half },
          { x: b.x - r.x * half, y: b.y - r.y * half }
        ),
        fill: INK,
        stroke: INK,
      });

      const lenPx = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 8; d + 6 < lenPx - 8; d += 11) {
        const p0 = { x: a.x + u.x * d, y: a.y + u.y * d };
        const p1 = { x: a.x + u.x * (d + 6), y: a.y + u.y * (d + 6) };
        drawing.polys.push({
          points: pts(
            { x: p0.x - r.x * 0.45, y: p0.y - r.y * 0.45 },
            { x: p0.x + r.x * 0.45, y: p0.y + r.y * 0.45 },
            { x: p1.x + r.x * 0.45, y: p1.y + r.y * 0.45 },
            { x: p1.x - r.x * 0.45, y: p1.y - r.y * 0.45 }
          ),
          fill: '#f4f1e8',
          stroke: '#f4f1e8',
        });
      }

      const rot = readableAngle(rw.headingDeg);
      drawing.labels.push(
        makeLabel(a.x - u.x * 13, a.y - u.y * 13 + 3, rw.endA, { anchor: 'middle', bold: true, rotate: rot })
      );
      drawing.labels.push(
        makeLabel(b.x + u.x * 13, b.y + u.y * 13 + 3, rw.endB, { anchor: 'middle', bold: true, rotate: rot })
      );
    });

    // Torre y rotulos de plataforma y terminal.
    const tw = P(s.tower);
    drawing.polys.push({
      points: pts({ x: tw.x, y: tw.y - 5 }, { x: tw.x - 4.3, y: tw.y + 3 }, { x: tw.x + 4.3, y: tw.y + 3 }),
      fill: INK,
      stroke: INK,
    });
    drawing.labels.push(makeLabel(tw.x + 8, tw.y + 3, 'TWR', { bold: true }));

    const center = (ps: Pt[]): Pt => ({
      x: ps.reduce((acc, p) => acc + p.x, 0) / ps.length,
      y: ps.reduce((acc, p) => acc + p.y, 0) / ps.length,
    });
    const ac = center(aprPts);
    const tc = center(termPts);
    drawing.labels.push(makeLabel(ac.x, ac.y + 3, 'APRON', { anchor: 'middle', rotate: readableAngle(s.mainHeadingDeg) }));
    drawing.labels.push(makeLabel(tc.x, tc.y + 3, 'TERMINAL', { anchor: 'middle', rotate: readableAngle(s.mainHeadingDeg) }));

    return drawing;
  });
}