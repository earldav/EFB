import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AirportDataService } from '../../../data/airport-data';
import { generateSimulatedAirportInfo } from '../../../data/simulated-airport-info';
import { GameStateService } from '../../../core/game-state';
import { Panel } from '../../../shared/components/panel/panel';
import { DataRow } from '../../../shared/components/data-row/data-row';

@Component({
  selector: 'app-airport-info-detail',
  imports: [RouterLink, Panel, DataRow],
  template: `
    <div class="airport-detail">
      <a routerLink="/airports" class="back-link">< AIRPORT INFO</a>

      @if (airport() === undefined) {
        <div class="msg">LOADING...</div>
      } @else if (airport() === null) {
        <app-panel>
          <div class="msg">AIRPORT NOT FOUND IN DATABASE.</div>
        </app-panel>
      } @else {
        <div class="header">
          <div class="icao">{{ airport()!.icao }} / {{ airport()!.iata }}</div>
          <div class="name">{{ airport()!.name }}</div>
          <div class="location">{{ airport()!.city }}, {{ airport()!.country }}</div>
        </div>

        <app-panel title="GENERAL">
          <app-data-row label="ELEVATION" [value]="airport()!.elevation + ' FT'" />
          <app-data-row label="LATITUDE" [value]="airport()!.lat.toFixed(4)" />
          <app-data-row label="LONGITUDE" [value]="airport()!.lon.toFixed(4)" />
          <app-data-row label="TIMEZONE" [value]="airport()!.tz" />
        </app-panel>

        <app-panel title="RUNWAYS">
          @for (rwy of info()!.runways; track rwy.id) {
            <app-data-row
              [label]="'RWY ' + rwy.id"
              [value]="rwy.lengthFt + ' x ' + rwy.widthFt + ' FT · ' + rwy.surface"
            />
          }
        </app-panel>

        <app-panel title="FREQUENCIES">
          @for (freq of info()!.frequencies; track freq.type) {
            <app-data-row [label]="freq.type" [value]="freq.freqMhz" />
          }
        </app-panel>

        <app-panel title="NAV AIDS">
          @for (nav of info()!.navAids; track nav.ident) {
            <app-data-row [label]="nav.type + ' ' + nav.ident" [value]="nav.freqMhz" />
          }
        </app-panel>

        @if (showArrivalSection()) {
          <app-panel title="ARRIVAL / GROUND OPERATIONS">
            <app-data-row label="ARRIVAL AIRPORT" [value]="airport()!.icao + ' — ' + airport()!.name" />
            <app-data-row label="GROUND HANDLING" value="CONFIRMED" />
          </app-panel>

          <button
            class="assoc-card"
            [class.loaded]="groundTriggered()"
            [disabled]="groundTriggered()"
            (click)="openGroundArrangements()"
          >
            <svg class="assoc-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M14 2v5h5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M8 12h8M8 15.5h8M8 9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <div class="assoc-main">
              <div class="assoc-label">POST-FLIGHT GROUND ARRANGEMENTS</div>
              <div class="assoc-status" [class.go]="groundTriggered()">
                DOCUMENT REF: {{ groundDocRef() }} — {{ groundTriggered() ? 'LOADED' : 'AVAILABLE' }}
              </div>
            </div>
            @if (!groundTriggered()) {
              <div class="assoc-arrow">›</div>
            }
          </button>
        }
      }
    </div>
  `,
  styles: `
    .airport-detail {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .back-link {
      font-family: var(--font-data);
      font-size: 13px;
      color: var(--efb-cyan);
      text-decoration: none;
      letter-spacing: 0.03em;
    }
    .msg {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text-dim);
    }
    .header {
      margin-top: 0.25rem;
    }
    .icao {
      font-family: var(--font-data);
      font-size: 2rem;
      color: var(--efb-amber);
    }
    .name {
      font-size: 16px;
      color: var(--efb-text);
      margin-top: 0.25rem;
    }
    .location {
      font-size: 13px;
      color: var(--efb-text-dim);
      margin-top: 0.125rem;
    }
    .sim-tag-row {
      margin-bottom: 0.5rem;
    }
    .assoc-card {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      width: 100%;
      background: color-mix(in srgb, var(--efb-cyan) 8%, var(--efb-panel));
      border: 1px solid var(--efb-cyan);
      border-radius: var(--radius-panel);
      padding: 0.875rem 1.125rem;
      cursor: pointer;
      text-align: left;
    }
    .assoc-card:hover:not(:disabled) {
      background: color-mix(in srgb, var(--efb-cyan) 14%, var(--efb-panel));
    }
    .assoc-card:active:not(:disabled) {
      transform: scale(0.99);
    }
    .assoc-card.loaded {
      background: color-mix(in srgb, var(--efb-green) 6%, var(--efb-panel));
      border-color: var(--efb-green);
      cursor: default;
    }
    .assoc-icon {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      color: var(--efb-cyan);
    }
    .assoc-card.loaded .assoc-icon {
      color: var(--efb-green);
    }
    .assoc-main {
      flex: 1;
    }
    .assoc-label {
      font-family: var(--font-data);
      font-size: 13px;
      letter-spacing: 0.02em;
      color: var(--efb-text);
    }
    .assoc-status {
      font-family: var(--font-data);
      font-size: 11px;
      letter-spacing: 0.03em;
      color: var(--efb-cyan);
      margin-top: 0.125rem;
    }
    .assoc-status.go {
      color: var(--efb-green);
    }
    .assoc-arrow {
      font-size: 22px;
      color: var(--efb-cyan);
      flex-shrink: 0;
    }
  `,
})
export class AirportInfoDetail {
  private route = inject(ActivatedRoute);
  private airportData = inject(AirportDataService);
  private gameState = inject(GameStateService);

  private icao$ = this.route.paramMap.pipe(map((params) => params.get('icao') ?? ''));

  private airport$ = this.icao$.pipe(
    switchMap((icao) => this.airportData.getByIcao(icao).pipe(map((a) => a ?? null)))
  );

  airport = toSignal(this.airport$, { initialValue: undefined });

  info = computed(() => {
    const a = this.airport();
    return a ? generateSimulatedAirportInfo(a.icao) : undefined;
  });

  /** La seccion de operaciones en tierra solo aparece si:
   *  1) es LIMC, y 2) ya hemos pasado por Flight Plan (destino confirmado). */
  showArrivalSection = computed(() => {
    const a = this.airport();
    return a?.icao === 'LIMC' && this.gameState.flags().destinationCardTriggered;
  });

  groundTriggered = () => this.gameState.flags().groundArrangementsTriggered;
  groundDocRef = () => 'GND-4471';

  openGroundArrangements(): void {
    this.gameState.setFlag('groundArrangementsTriggered');
    // Docs YA esta disponible desde el principio — no es un modulo
    // nuevo, solo recibe contenido nuevo (el documento GND-4471).
    this.gameState.illuminate('documents');
    this.gameState.notify('MODULE UPDATED');
  }
}