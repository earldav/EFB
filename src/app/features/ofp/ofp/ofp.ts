import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { GameStateService } from '../../../core/game-state';
import { AirportDataService } from '../../../data/airport-data';
import { realFlightData } from '../../../data/aircraft-data';
import { generateOfpSummary, generateOfpDispatchData, buildRawOfpText } from '../../../data/simulated-ofp';
import { generateSimulatedRoute } from '../../../data/simulated-flightplan';
import { Panel } from '../../../shared/components/panel/panel';
import { DataRow } from '../../../shared/components/data-row/data-row';

@Component({
  selector: 'app-ofp',
  imports: [Panel, DataRow],
  template: `
    <div class="ofp-screen">
      <div class="title-row">
        <div class="title">OPERATIONAL FLIGHT PLAN</div>
        <button class="decode-btn" (click)="rawMode.set(!rawMode())">
          {{ rawMode() ? 'DECODE' : 'SHOW RAW' }}
        </button>
      </div>

      @if (rawMode()) {
        @if (rawText(); as text) {
          <app-panel>
            <pre class="raw-text">{{ text }}</pre>
          </app-panel>
        } @else {
          <div class="msg">LOADING...</div>
        }
      } @else {
        <app-panel title="FLIGHT">
          <app-data-row label="FLIGHT NUMBER" [value]="flight.flightNumber" />
          <app-data-row label="DATE" [value]="summary.dateLabel" />
          <app-data-row label="AIRCRAFT" [value]="flight.aircraftType" />
          <app-data-row label="REGISTRATION" [value]="flight.registration ?? flight.registrationStatus" />
        </app-panel>

        <app-panel title="CREW">
          <app-data-row label="PIC" value="J. PELLICER" />
          <app-data-row label="COP" value="E. ARLANDIS" />
        </app-panel>

        <app-panel title="ROUTE">
          <app-data-row label="DEP" [value]="flight.departureIcao + ' — VALENCIA'" />
          <app-data-row label="DEST" [value]="flight.arrivalIcao + ' — MILANO MALPENSA'" />
          <app-data-row label="STD" [value]="summary.std + ' UTC'" />
          <app-data-row label="STA" [value]="summary.sta + ' UTC'" />
          <app-data-row label="EET" [value]="summary.eet" />
          <app-data-row label="CRUISE ALT" [value]="summary.cruiseAltitudeFt + ' FT'" />
          <app-data-row label="ALTERNATE" [value]="summary.alternateIcao + ' — ' + summary.alternateName" />
        </app-panel>

        @if (dispatch(); as d) {
          <app-panel title="ROUTE / WIND / ETO">
            <div class="route-table">
              <div class="route-row route-row-header">
                <span>FIX</span><span>TRK</span><span>DIST</span><span>WIND</span><span>GS</span><span>ETO</span><span>FUEL REM</span>
              </div>
              @for (leg of d.routeTable; track leg.fixName) {
                <div class="route-row">
                  <span>{{ leg.fixName }}</span>
                  <span>{{ leg.magneticCourseDeg }}°</span>
                  <span>{{ leg.segmentDistanceNm }}NM</span>
                  <span [class.tail]="leg.windComponentKt > 0" [class.head]="leg.windComponentKt < 0">
                    {{ leg.windComponentKt > 0 ? '+' : '' }}{{ leg.windComponentKt }}
                  </span>
                  <span>{{ leg.groundSpeedKt }}KT</span>
                  <span>{{ leg.eto }}Z</span>
                  <span>{{ leg.fuelRemainingKg }}KG</span>
                </div>
              }
            </div>
          </app-panel>

          <app-panel title="FUEL">
            @for (line of d.fuelLines; track line.label) {
              <app-data-row
                [label]="line.label"
                [value]="(line.timeHHMM !== '—' ? line.timeHHMM + ' · ' : '') + line.weightKg + ' KG'"
              />
            }
          </app-panel>

          <app-panel title="WEIGHTS">
            <app-data-row label="DOW" [value]="d.weights.dowKg + ' KG'" />
            <app-data-row label="PAYLOAD" [value]="d.weights.payloadKg + ' KG'" />
            <app-data-row label="ZFW / MAX ZFW" [value]="d.weights.zfwKg + ' / ' + d.weights.maxZfwKg + ' KG'" />
            <app-data-row label="TAKEOFF FUEL" [value]="d.weights.takeoffFuelKg + ' KG'" />
            <app-data-row label="TOW / MAX TOW" [value]="d.weights.towKg + ' / ' + d.weights.maxTowKg + ' KG'" />
            <app-data-row label="TRIP FUEL" [value]="d.weights.tripFuelKg + ' KG'" />
            <app-data-row label="LDW / MAX LDW" [value]="d.weights.ldwKg + ' / ' + d.weights.maxLdwKg + ' KG'" />
          </app-panel>

          <app-panel title="LOAD CLOSEOUT">
            <app-data-row label="PASSENGERS" [value]="d.weights.paxCount + ' (' + d.weights.paxWeightKg + ' KG)'" />
            <app-data-row label="INFANTS (LAP)" [value]="'' + d.weights.infantCount" />
            <app-data-row label="CREW" [value]="d.weights.crewCount + ' (2 FLIGHT DECK + ' + (d.weights.crewCount - 2) + ' CABIN)'" />
            <app-data-row label="TSOB" [value]="'' + (d.weights.paxCount + d.weights.infantCount + d.weights.crewCount)" />
            <app-data-row label="CARGO / BAGS" [value]="d.weights.cargoWeightKg + ' KG'" />
            <app-data-row label="EOW" [value]="d.weights.dowKg + ' KG'" />
            <app-data-row label="CG (TAKEOFF)" [value]="d.weights.cgPercentMac.toFixed(1) + ' % MAC'" />
            <app-data-row label="TAKEOFF CONF / THS" [value]="'1+F · ' + d.weights.thsTrim" />
          </app-panel>
        }
      }

      @if (!rawMode()) {
        <button
          class="assoc-card"
          [class.loaded]="flightPlanLoaded()"
          [disabled]="flightPlanLoaded()"
          (click)="loadFlightPlan()"
        >
          <svg class="assoc-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3 3 8.5v7L12 21l9-5.5v-7L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
            <path d="M3 8.5 12 14l9-5.5M12 14v7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          </svg>
          <div class="assoc-main">
            <div class="assoc-label">FLIGHT PLAN — ROUTE DATA</div>
            <div class="assoc-status" [class.go]="flightPlanLoaded()">
              {{ flightPlanLoaded() ? 'LOADED' : 'AVAILABLE' }}
            </div>
          </div>
          @if (!flightPlanLoaded()) {
            <div class="assoc-arrow">›</div>
          }
        </button>
      }
    </div>
  `,
  styles: `
    .ofp-screen { display: flex; flex-direction: column; gap: 1rem; }
    .title-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .title { font-family: var(--font-data); font-size: 1.375rem; color: var(--efb-text); }
    .decode-btn {
      background: none; border: 1px solid var(--efb-amber-dim); border-radius: var(--radius-chip);
      color: var(--efb-amber); font-family: var(--font-data); font-size: 10px; letter-spacing: 0.04em;
      padding: 0.25rem 0.625rem; cursor: pointer; flex-shrink: 0;
    }
    .decode-btn:hover { border-color: var(--efb-amber); }
    .msg { font-family: var(--font-data); font-size: 14px; color: var(--efb-text-dim); }
    .raw-text {
      font-family: var(--font-data); font-size: 11.5px; line-height: 1.55; color: var(--efb-text);
      white-space: pre; overflow-x: auto; margin: 0;
    }
    .route-table { display: flex; flex-direction: column; overflow-x: auto; }
    .route-row {
      display: grid; grid-template-columns: 1fr 0.7fr 0.8fr 0.8fr 0.8fr 0.9fr 1fr; gap: 0.5rem;
      padding: 0.375rem 0; border-bottom: 1px solid var(--efb-line);
      font-family: var(--font-data); font-size: 11.5px; color: var(--efb-text-dim); white-space: nowrap;
    }
    .route-row:last-child { border-bottom: none; }
    .route-row-header {
      color: var(--efb-text-faint); font-size: 9.5px; letter-spacing: 0.04em;
      border-bottom: 1px solid var(--efb-line-strong);
    }
    .tail { color: var(--efb-green); }
    .head { color: var(--efb-red); }
    .assoc-card {
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
export class Ofp implements OnInit {
  private gameState = inject(GameStateService);
  private airportData = inject(AirportDataService);

  flight = realFlightData;
  summary = generateOfpSummary(realFlightData.flightNumber, realFlightData.flightTimeMinutes, realFlightData.flightDate, realFlightData.stdUtc);
  
  private airports = toSignal(
    combineLatest([
      this.airportData.getByIcao(this.flight.departureIcao),
      this.airportData.getByIcao(this.flight.arrivalIcao),
    ]).pipe(map(([dep, arr]) => ({ dep, arr }))),
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

  dispatch = computed(() => {
    const a = this.airports();
    const r = this.route();
    if (!a?.dep || !r) return undefined;

    return generateOfpDispatchData(
      this.flight.flightNumber,
      this.flight.seatCount,
      this.summary.std,
      r.waypoints,
      r.distanceNm,
      a.dep.lat,
      a.dep.lon,
      this.summary.cruiseAltitudeFt,
      this.flight.flightTimeMinutes
    );
  });

  flightPlanLoaded = () => this.gameState.flags().flightPlanUnlocked;

  rawMode = signal(true);

  rawText = computed(() => {
    const d = this.dispatch();
    const r = this.route();
    if (!d || !r) return undefined;
    return buildRawOfpText({
      flightNumber: this.flight.flightNumber,
      icaoAirlineCode: this.flight.icaoAirlineCode,
      registration: this.flight.registration,
      icaoTypeDesignator: this.flight.icaoTypeDesignator,
      depIcao: this.flight.departureIcao,
      arrIcao: this.flight.arrivalIcao,
      altnIcao: this.summary.alternateIcao,
      dateLabel: this.summary.dateLabel,
      std: this.summary.std,
      sta: this.summary.sta,
      cruiseLevel: 'F' + Math.round(this.summary.cruiseAltitudeFt / 100),
      routeString: r.routeString,
      dispatch: d,
      seatCount: this.flight.seatCount,
      flightTimeMinutes: this.flight.flightTimeMinutes,
      totalDistanceNm: r.distanceNm,
      depIata: this.flight.departureIata,
      arrIata: this.flight.arrivalIata,
    });
  });

  ngOnInit(): void {
    this.gameState.clearIllumination('ofp');

    if (!this.gameState.flags().flightAssigned) {
      this.gameState.setFlag('flightAssigned');
      this.gameState.illuminate('home', 'homeStatus');
    }
  }

  loadFlightPlan(): void {
    this.gameState.setFlag('flightPlanUnlocked');
    this.gameState.illuminate('flightPlan');
    this.gameState.notify('NEW MODULE UNLOCKED');
  }
}