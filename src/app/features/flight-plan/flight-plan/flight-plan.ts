import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { GameStateService } from '../../../core/game-state';
import { AirportDataService } from '../../../data/airport-data';
import { realFlightData } from '../../../data/aircraft-data';
import {
  generateSimulatedRoute,
  generateIcaoFlightPlan,
  generateFlightProfile,
  generateOfpSummary,
  generateFirCrossings,
  generateSquawkCode,
} from '../../../data/simulated-flightplan';
import { addMinutesToTime, generateLoadFigures } from '../../../data/simulated-ofp';
import { projectToTileGrid } from '../../../data/route-map-projection';
import { Panel } from '../../../shared/components/panel/panel';
import { DataRow } from '../../../shared/components/data-row/data-row';

type TabId = 'route' | 'map' | 'profile' | 'fpl';

const MAP_ZOOM = 7;
const MAP_ORIGIN_TILE_X = 63;
const MAP_ORIGIN_TILE_Y = 45;
const MAP_TILES_X = 5; // columnas: 63..67
const MAP_TILES_Y = 4; // filas: 45..48
const MAP_IMG_WIDTH = MAP_TILES_X * 256;
const MAP_IMG_HEIGHT = MAP_TILES_Y * 256;
/** Curva suave que pasa EXACTAMENTE por todos los puntos (interpolacion
 *  cubica monotona, metodo Fritsch-Butland): no supera la altitud de
 *  crucero ni rebota entre puntos. */
function monotoneCurvePath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n < 2) return '';

  const h: number[] = [];
  const s: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x || 0.0001;
    h.push(dx);
    s.push((pts[i + 1].y - pts[i].y) / dx);
  }

  const m: number[] = new Array(n);
  m[0] = s[0];
  m[n - 1] = s[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (s[i - 1] * s[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] =
        (3 * (h[i - 1] + h[i])) /
        ((2 * h[i] + h[i - 1]) / s[i - 1] + (h[i] + 2 * h[i - 1]) / s[i]);
    }
  }

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = h[i] / 3;
    d += ` C${pts[i].x + dx},${pts[i].y + m[i] * dx} ${pts[i + 1].x - dx},${pts[i + 1].y - m[i + 1] * dx} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}
@Component({
  selector: 'app-flight-plan',
  imports: [Panel, DataRow],
  template: `
    <div class="fp-screen">
      <div class="title">FLIGHT PLAN</div>

      <div class="tabs">
        @for (tab of tabs; track tab.id) {
          <button class="tab" [class.active]="activeTab() === tab.id" (click)="activeTab.set(tab.id)">
            {{ tab.label }}
          </button>
        }
      </div>

      @if (activeTab() === 'route') {
        @if (route(); as r) {
          <app-panel title="ROUTE">
            <app-data-row label="DEP" [value]="flight.departureIcao + ' — VALENCIA'" />
            <app-data-row label="DEST" [value]="flight.arrivalIcao + ' — MILANO MALPENSA'" />
            <app-data-row label="DISTANCE" [value]="r.distanceNm + ' NM'" />
            <app-data-row label="SID" [value]="r.sid" />
            <app-data-row label="STAR" [value]="r.star" />
          </app-panel>

          <app-panel title="WAYPOINTS">
            @for (wp of r.waypoints; track wp.name) {
              <app-data-row [label]="wp.name" [value]="wp.cumulativeNm + ' NM'" />
            }
          </app-panel>
        } @else {
          <div class="msg">LOADING...</div>
        }

        <app-panel title="ATC / AIRSPACE">
          @for (fir of firCrossings(); track fir.icaoCode) {
            <app-data-row [label]="fir.name + ' FIR (' + fir.icaoCode + ')'" [value]="firEta(fir.etaOffsetMin) + 'Z'" />
          }
          <app-data-row label="SQUAWK" [value]="squawk" />
        </app-panel>
      }

      @if (activeTab() === 'map') {
        <app-panel title="ROUTE MAP">
          @if (mapData(); as m) {
            <div class="map-frame">
              <div class="tile-grid">
                @for (ty of tileRows; track ty) {
                  @for (tx of tileCols; track tx) {
                    <img class="tile-img" [src]="'/data/tiles/7/' + tx + '/' + ty + '.png'" alt="" />
                  }
                }
              </div>

              <svg class="map-overlay" [attr.viewBox]="mapViewBox" preserveAspectRatio="xMidYMid meet">
                @if (m.altPoint) {
                  <line [attr.x1]="m.arrPoint.x" [attr.y1]="m.arrPoint.y" [attr.x2]="m.altPoint.x" [attr.y2]="m.altPoint.y" stroke="#fff" stroke-width="3" stroke-dasharray="10 8" opacity="0.85" />
                  <circle [attr.cx]="m.altPoint.x" [attr.cy]="m.altPoint.y" r="8" fill="none" stroke="#fff" stroke-width="4" />
                  <text [attr.x]="m.altPoint.x + 16" [attr.y]="m.altPoint.y + 8" font-size="22" fill="#fff" font-family="monospace" style="paint-order: stroke; stroke: #000; stroke-width: 6px;">LIMF ALTN</text>
                }

                <polyline [attr.points]="m.routePolyline" fill="none" stroke="var(--efb-amber)" stroke-width="5" stroke-linejoin="round" />

                @for (wp of m.waypoints; track wp.name) {
                  <circle [attr.cx]="wp.x" [attr.cy]="wp.y" r="7" fill="var(--efb-amber)" stroke="#000" stroke-width="2" />
                  <text [attr.x]="wp.x" [attr.y]="wp.labelBelow ? wp.y + 30 : wp.y - 16" text-anchor="middle" font-size="22" font-weight="bold" fill="#fff" font-family="monospace" style="paint-order: stroke; stroke: #000; stroke-width: 6px;">{{ wp.name }}</text>
                }

                <circle [attr.cx]="m.depPoint.x" [attr.cy]="m.depPoint.y" r="10" fill="var(--efb-cyan)" stroke="#000" stroke-width="2" />
                <text [attr.x]="m.depPoint.x" [attr.y]="m.depPoint.y + 42" text-anchor="middle" font-size="26" font-weight="bold" fill="var(--efb-cyan)" font-family="monospace" style="paint-order: stroke; stroke: #000; stroke-width: 6px;">LEVC</text>

                <circle [attr.cx]="m.arrPoint.x" [attr.cy]="m.arrPoint.y" r="10" fill="var(--efb-amber)" stroke="#000" stroke-width="2" />
                <text [attr.x]="m.arrPoint.x" [attr.y]="m.arrPoint.y - 24" text-anchor="middle" font-size="26" font-weight="bold" fill="var(--efb-amber)" font-family="monospace" style="paint-order: stroke; stroke: #000; stroke-width: 6px;">LIMC</text>
              </svg>
            </div>
          } @else {
            <div class="msg">LOADING...</div>
          }
        </app-panel>
      }

      @if (activeTab() === 'profile') {
        <app-panel title="ALTITUDE PROFILE">
          @if (profileGeom(); as g) {
            <svg class="profile-svg" viewBox="0 0 340 180" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="profileFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--efb-amber)" stop-opacity="0.28" />
                  <stop offset="100%" stop-color="var(--efb-amber)" stop-opacity="0" />
                </linearGradient>
              </defs>

              @for (row of g.altGrid; track row.y) {
                <line [attr.x1]="g.marginLeft" [attr.y1]="row.y" [attr.x2]="340 - g.marginRight" [attr.y2]="row.y" stroke="var(--efb-line)" stroke-width="0.4" />
                <text [attr.x]="g.marginLeft - 4" [attr.y]="row.y + 2.5" text-anchor="end" font-size="7" fill="var(--efb-text-faint)" font-family="monospace">{{ row.label }}</text>
              }

              @for (col of g.distGrid; track col.x) {
                <line [attr.x1]="col.x" [attr.y1]="g.baseline" [attr.x2]="col.x" [attr.y2]="g.baseline + 3" stroke="var(--efb-text-faint)" stroke-width="0.6" />
                <text [attr.x]="col.x" [attr.y]="g.baseline + 12" text-anchor="middle" font-size="7" fill="var(--efb-text-faint)" font-family="monospace">{{ col.label }}</text>
              }

              <line [attr.x1]="g.marginLeft" [attr.y1]="g.baseline" [attr.x2]="340 - g.marginRight" [attr.y2]="g.baseline" stroke="var(--efb-line-strong)" stroke-width="0.75" />

              <path [attr.d]="g.areaPath" fill="url(#profileFill)" />
              <path [attr.d]="g.linePath" fill="none" stroke="var(--efb-amber)" stroke-width="0.9" />

              @for (pt of g.points; track pt.name) {
                @if (pt.phase === 'TOC' || pt.phase === 'TOD') {
                  <line [attr.x1]="pt.x" [attr.y1]="g.topMargin" [attr.x2]="pt.x" [attr.y2]="g.baseline" stroke="var(--efb-cyan)" stroke-width="0.6" stroke-dasharray="2 3" />
                }
                <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="2.5" [attr.fill]="pt.phase === 'TOC' || pt.phase === 'TOD' ? 'var(--efb-cyan)' : 'var(--efb-amber)'" />
                <text [attr.x]="pt.x" [attr.y]="g.baseline + 22" text-anchor="middle" font-size="7" fill="var(--efb-text-faint)" font-family="monospace">{{ pt.name }}</text>
              }
            </svg>

            <div class="profile-summary">
              <div class="profile-summary-item">
                <span class="ps-label">CRUISE FL</span>
                <span class="ps-value">{{ icaoFpl.cruiseLevel }}</span>
              </div>
              <div class="profile-summary-item">
                <span class="ps-label">TOTAL DIST</span>
                <span class="ps-value">{{ route()?.distanceNm }} NM</span>
              </div>
              <div class="profile-summary-item">
                <span class="ps-label">EET</span>
                <span class="ps-value">{{ icaoFpl.totalEet }}</span>
              </div>
            </div>

            <div class="profile-legend">
              <span class="legend-dot cyan"></span> TOC / TOD
              <span class="legend-dot amber"></span> ROUTE POINT
            </div>

            <div class="profile-table">
              <div class="pt-row pt-row-header">
                <span>POINT</span>
                <span>PHASE</span>
                <span>DIST (NM)</span>
                <span>ALT (FT)</span>
                <span>GRAD (FT/NM)</span>
              </div>
              @for (row of profileTable(); track row.name + row.distanceNm) {
                <div class="pt-row">
                  <span>{{ row.name }}</span>
                  <span>{{ row.phase }}</span>
                  <span>{{ row.distanceNm }}</span>
                  <span>{{ row.altitudeFt }}</span>
                  <span [class.climb]="row.gradientFtNm > 0" [class.descent]="row.gradientFtNm < 0">
                    {{ row.gradientFtNm === 0 ? '—' : (row.gradientFtNm > 0 ? '+' : '') + row.gradientFtNm }}
                  </span>
                </div>
              }
            </div>
          } @else {
            <div class="msg">LOADING...</div>
          }
        </app-panel>
      }

      @if (activeTab() === 'fpl') {
        @if (route(); as r) {
          <app-panel title="ICAO FLIGHT PLAN">
            <app-data-row label="AIRCRAFT ID" [value]="icaoFpl.aircraftId" />
            <app-data-row label="FLIGHT RULES / TYPE" [value]="icaoFpl.flightRules + '/' + icaoFpl.flightType" />
            <app-data-row label="NUMBER / TYPE / WAKE" [value]="'1/' + flight.icaoTypeDesignator + '/' + icaoFpl.wakeCategory" />
            <app-data-row label="EQUIPMENT" [value]="icaoFpl.equipment + '/' + icaoFpl.surveillanceEquipment" />
            <app-data-row label="DEP / EOBT" [value]="flight.departureIcao + '/' + icaoFpl.eobtUtc" />
            <app-data-row label="SPEED / LEVEL / ROUTE" [value]="icaoFpl.cruiseSpeed + icaoFpl.cruiseLevel + ' ' + r.routeString" />
            <app-data-row label="DEST / EET / ALTN" [value]="flight.arrivalIcao + icaoFpl.totalEet + ' ' + icaoFpl.alternateIcao" />
            <app-data-row label="OTHER INFO" [value]="icaoFpl.otherInfo" />
            <app-data-row label="ENDUR / POB / RADIO" [value]="icaoFpl.enduranceHHMM + ' · ' + icaoFpl.personsOnBoard + ' POB · ' + icaoFpl.emergencyRadio" />
            <app-data-row label="AIRCRAFT COLOR" [value]="icaoFpl.aircraftColor" />
          </app-panel>

          <button
            class="assoc-card"
            [class.loaded]="destinationTriggered()"
            [disabled]="destinationTriggered()"
            (click)="openDestinationAirport()"
          >
            <svg class="assoc-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="1.2" opacity="0.35" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
              <path d="M12 3c2.5 2.5 4 5.7 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.7-4-9s1.5-6.5 4-9Z" stroke="currentColor" stroke-width="1.5" />
            </svg>
            <div class="assoc-main">
              <div class="assoc-label">DESTINATION AIRPORT — {{ flight.arrivalIcao }}</div>
              <div class="assoc-status" [class.go]="destinationTriggered()">
                AIRPORT INFORMATION {{ destinationTriggered() ? 'LOADED' : 'AVAILABLE' }}
              </div>
            </div>
            @if (!destinationTriggered()) {
              <div class="assoc-arrow">›</div>
            }
          </button>
        } @else {
          <div class="msg">LOADING...</div>
        }
      }
    </div>
  `,
  styles: `
    .fp-screen { display: flex; flex-direction: column; gap: 1rem; }
    .title { font-family: var(--font-data); font-size: 1.375rem; color: var(--efb-text); }
    .tabs { display: flex; gap: 0.375rem; border-bottom: 1px solid var(--efb-line); padding-bottom: 0.625rem; flex-wrap: wrap; }
    .tab {
      background: none; border: 1px solid var(--efb-line-strong); border-radius: var(--radius-chip);
      color: var(--efb-text-dim); font-family: var(--font-data); font-size: 11px; letter-spacing: 0.04em;
      padding: 0.375rem 0.75rem; cursor: pointer;
    }
    .tab.active { color: var(--efb-amber); border-color: var(--efb-amber-dim); }
    .sim-tag-row { margin-bottom: 0.5rem; }
    .msg { font-family: var(--font-data); font-size: 14px; color: var(--efb-text-dim); }
    .map-frame {
      position: relative; width: 100%; aspect-ratio: ${MAP_IMG_WIDTH} / ${MAP_IMG_HEIGHT};
      border-radius: var(--radius-chip); overflow: hidden;
    }
    .tile-grid {
      position: absolute; inset: 0; display: grid;
      grid-template-columns: repeat(${MAP_TILES_X}, 1fr);
      grid-template-rows: repeat(${MAP_TILES_Y}, 1fr);
    }
    .tile-img { width: 100%; height: 100%; display: block; object-fit: cover; }
    .map-overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
    .profile-svg { width: 100%; height: auto; display: block; }
    .profile-summary {
      display: flex; gap: 1.25rem; margin-top: 0.75rem; padding-top: 0.625rem;
      border-top: 1px solid var(--efb-line); flex-wrap: wrap;
    }
    .profile-summary-item { display: flex; flex-direction: column; gap: 0.125rem; }
    .ps-label { font-family: var(--font-data); font-size: 9.5px; letter-spacing: 0.05em; color: var(--efb-text-faint); }
    .ps-value { font-family: var(--font-data); font-size: 13px; color: var(--efb-text); }
    .profile-legend {
      display: flex; align-items: center; gap: 0.375rem; margin-top: 0.625rem;
      font-size: 10.5px; color: var(--efb-text-faint); flex-wrap: wrap;
    }
    .legend-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; margin-left: 0.5rem; }
    .legend-dot:first-child { margin-left: 0; }
    .legend-dot.cyan { background: var(--efb-cyan); }
    .legend-dot.amber { background: var(--efb-amber); }
    .profile-table {
      display: flex;
      flex-direction: column;
      margin-top: 0.875rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--efb-line);
    }
    .pt-row {
      display: grid;
      grid-template-columns: 1fr 1fr 0.9fr 0.9fr 1fr;
      gap: 0.5rem;
      padding: 0.375rem 0;
      border-bottom: 1px solid var(--efb-line);
      font-family: var(--font-data);
      font-size: 11.5px;
      color: var(--efb-text-dim);
    }
    .pt-row:last-child { border-bottom: none; }
    .pt-row-header {
      color: var(--efb-text-faint);
      font-size: 9.5px;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--efb-line-strong);
    }
    .pt-row span.climb { color: var(--efb-green); }
    .pt-row span.descent { color: var(--efb-cyan); }    .assoc-card {
      display: flex; align-items: center; gap: 0.875rem; width: 100%;
      background: color-mix(in srgb, var(--efb-cyan) 8%, var(--efb-panel));
      border: 1px solid var(--efb-cyan); border-radius: var(--radius-panel);
      padding: 0.875rem 1.125rem; cursor: pointer; text-align: left;
    }
    .assoc-card:hover:not(:disabled) { background: color-mix(in srgb, var(--efb-cyan) 14%, var(--efb-panel)); }
    .assoc-card:active:not(:disabled) { transform: scale(0.99); }
    .assoc-card.loaded {
      background: color-mix(in srgb, var(--efb-green) 6%, var(--efb-panel));
      border-color: var(--efb-green); cursor: default;
    }
    .assoc-icon { width: 22px; height: 22px; flex-shrink: 0; color: var(--efb-cyan); }
    .assoc-card.loaded .assoc-icon { color: var(--efb-green); }
    .assoc-main { flex: 1; }
    .assoc-label { font-family: var(--font-data); font-size: 13px; letter-spacing: 0.02em; color: var(--efb-text); }
    .assoc-status { font-family: var(--font-data); font-size: 11px; letter-spacing: 0.03em; color: var(--efb-cyan); margin-top: 0.125rem; }
    .assoc-status.go { color: var(--efb-green); }
    .assoc-arrow { font-size: 22px; color: var(--efb-cyan); flex-shrink: 0; }
  `,
})
export class FlightPlan implements OnInit {
  private gameState = inject(GameStateService);
  private airportData = inject(AirportDataService);

  flight = realFlightData;
  ofpSummary = generateOfpSummary(realFlightData.flightNumber, realFlightData.flightTimeMinutes, realFlightData.flightDate, realFlightData.stdUtc);
  icaoFpl = generateIcaoFlightPlan(
    realFlightData.flightNumber,
    this.ofpSummary.std,
    generateLoadFigures(realFlightData.flightNumber, realFlightData.seatCount).tsob,
    realFlightData.flightDate
  );

  firCrossings = computed(() => generateFirCrossings(realFlightData.flightTimeMinutes));
  squawk = generateSquawkCode(realFlightData.flightNumber);

  tabs: { id: TabId; label: string }[] = [
    { id: 'route', label: 'ROUTE' },
    { id: 'map', label: 'MAP' },
    { id: 'profile', label: 'PROFILE' },
    { id: 'fpl', label: 'FPL' },
  ];
  activeTab = signal<TabId>('route');

  tileCols = [63, 64, 65, 66, 67];
  tileRows = [45, 46, 47, 48];
  mapViewBox = `0 0 ${MAP_IMG_WIDTH} ${MAP_IMG_HEIGHT}`;

  destinationTriggered = () => this.gameState.flags().destinationCardTriggered;

  private airports = toSignal(
    combineLatest([
      this.airportData.getByIcao(this.flight.departureIcao),
      this.airportData.getByIcao(this.flight.arrivalIcao),
      this.airportData.getByIcao(this.ofpSummary.alternateIcao),
    ]).pipe(map(([dep, arr, alt]) => ({ dep, arr, alt }))),
    { initialValue: undefined }
  );

  route = computed(() => {
    const a = this.airports();
    if (!a?.dep || !a?.arr) return undefined;
    return generateSimulatedRoute(
      this.flight.departureIcao, this.flight.arrivalIcao,
      a.dep.lat, a.dep.lon, a.arr.lat, a.arr.lon
    );
  });

  firEta(offsetMin: number): string {
    return addMinutesToTime(this.ofpSummary.std, offsetMin);
  }

  profile = computed(() => {
    const a = this.airports();
    const r = this.route();
    if (!a?.dep || !a?.arr || !r) return undefined;
    return generateFlightProfile(
      this.flight.departureIcao, this.flight.arrivalIcao,
      a.dep.elevation, a.arr.elevation,
      r.distanceNm, this.icaoFpl.cruiseAltitudeFt,
      r.waypoints
    );
  });

  profileTable = computed(() => {
    const pts = this.profile();
    if (!pts) return [];
    return pts.map((p, i) => {
      const prev = pts[i - 1];
      const distFromPrev = prev ? p.distanceNm - prev.distanceNm : 0;
      const altChange = prev ? p.altitudeFt - prev.altitudeFt : 0;
      const gradientFtNm = prev && distFromPrev > 0 ? Math.round(altChange / distFromPrev) : 0;
      return {
        name: p.label ?? '',
        phase: p.phase ?? 'CRUISE',
        distanceNm: p.distanceNm,
        altitudeFt: p.altitudeFt,
        gradientFtNm,
      };
    });
  });

  profileGeom = computed(() => {
    const pts = this.profile();
    const r = this.route();
    if (!pts || !r) return undefined;

    const marginLeft = 34;
    const marginRight = 10;
    const topMargin = 18;
    const baseline = 150;
    const width = 340;
    const maxDist = r.distanceNm;

    const maxAlt = Math.max(...pts.map((p) => p.altitudeFt));
    const minAlt = 0;
    // Margen del 18% por encima de la altitud maxima real, para que el
    // punto de crucero nunca toque el borde superior del grafico y las
    // etiquetas (TOC/TOD, altitud) tengan sitio donde dibujarse.
    const altRange = Math.max(maxAlt * 1.18 - minAlt, 1);

    const toXY = (cumulativeNm: number, altitudeFt: number) => ({
      x: marginLeft + (cumulativeNm / maxDist) * (width - marginLeft - marginRight),
      y: baseline - ((altitudeFt - minAlt) / altRange) * (baseline - topMargin),
    });

    const points = pts.map((p) => ({
      name: p.label ?? '',
      altitudeFt: p.altitudeFt,
      phase: p.phase ?? 'CRUISE',
      ...toXY(p.distanceNm, p.altitudeFt),
    }));

    const linePath = monotoneCurvePath(points);
    const last = points[points.length - 1];

    const areaPath = `${linePath} L${last.x},${baseline} L${points[0].x},${baseline} Z`;

    const altStepFt = 5000;
    const altGrid: { y: number; label: string }[] = [];
    for (let alt = 0; alt <= maxAlt + altStepFt; alt += altStepFt) {
      const y = baseline - (alt / altRange) * (baseline - topMargin);
      if (y >= topMargin - 2) altGrid.push({ y, label: `${alt / 1000}K` });
    }

    const distStepNm = 100;
    const distGrid: { x: number; label: string }[] = [];
    for (let d = 0; d <= maxDist; d += distStepNm) {
      distGrid.push({ x: toXY(d, 0).x, label: `${d}` });
    }

    return { points, linePath, areaPath, altGrid, distGrid, marginLeft, marginRight, topMargin, baseline };
  });

  mapData = computed(() => {
    const a = this.airports();
    const r = this.route();
    if (!a?.dep || !a?.arr || !r) return undefined;

    const project = (lat: number, lon: number) =>
      projectToTileGrid(lat, lon, MAP_ZOOM, MAP_ORIGIN_TILE_X, MAP_ORIGIN_TILE_Y);

    const depPoint = project(a.dep.lat, a.dep.lon);
    const arrPoint = project(a.arr.lat, a.arr.lon);
    const altPoint = a.alt ? project(a.alt.lat, a.alt.lon) : null;
    const waypoints = r.waypoints.map((wp, i) => ({
      name: wp.name,
      labelBelow: i % 2 === 1,
      ...project(wp.lat, wp.lon),
    }));
    const routePolyline = [depPoint, ...waypoints, arrPoint].map((p) => `${p.x},${p.y}`).join(' ');

    return { depPoint, arrPoint, altPoint, waypoints, routePolyline };
  });

  ngOnInit(): void {
    this.gameState.clearIllumination('flightPlan');
  }

  openDestinationAirport(): void {
    this.gameState.setFlag('destinationCardTriggered');
    this.gameState.illuminate('airports');
    this.gameState.notify('MODULE UPDATED');
  }
}