import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AirportDataService } from '../../../data/airport-data';
import { generateSimulatedCharts } from '../../../data/simulated-charts';
import { GameStateService } from '../../../core/game-state';
import { Panel } from '../../../shared/components/panel/panel';
import { DataRow } from '../../../shared/components/data-row/data-row';

@Component({
  selector: 'app-airport-charts',
  imports: [RouterLink, Panel, DataRow],
  template: `
    <div class="airport-charts">
      <a routerLink="/charts" class="back-link">< CHARTS</a>

      @if (airport() === undefined) {
        <div class="msg">LOADING...</div>
      } @else if (airport() === null) {
        <app-panel>
          <div class="msg">AIRPORT NOT FOUND IN DATABASE.</div>
        </app-panel>
      } @else {
        <div class="header">
          <div class="icao">{{ airport()!.icao }}</div>
          <div class="name">{{ airport()!.name }}</div>
          <div class="location">{{ airport()!.city }}, {{ airport()!.country }}</div>
        </div>

        <app-panel title="CHARTS">
          <div class="sim-tag-row">
            <span class="revision">REV. {{ charts()!.lastRevision }}</span>
          </div>
          @for (cat of charts()!.categories; track cat.label) {
            @if (chartPath(cat.label); as path) {
              <a [routerLink]="['/charts', airport()!.icao, path]" class="chart-link-row">
                <app-data-row [label]="cat.label" [value]="countLabel(cat.label, cat.count)" />
              </a>
            } @else {
              <app-data-row [label]="cat.label" [value]="countLabel(cat.label, cat.count)" />
            }
          }
        </app-panel>

        @if (isLevc()) {
          <button
            class="assoc-card"
            [class.loaded]="aircraftDataLoaded()"
            [disabled]="aircraftDataLoaded()"
            (click)="loadAircraftData()"
          >
            <div class="assoc-icon">✈</div>
            <div class="assoc-main">
              <div class="assoc-label">ASSOCIATED AIRCRAFT DATA</div>
              <div class="assoc-status" [class.go]="aircraftDataLoaded()">
                {{ aircraftDataLoaded() ? 'LOADED' : 'AVAILABLE' }}
              </div>
            </div>
            @if (!aircraftDataLoaded()) {
              <div class="assoc-arrow">›</div>
            }
          </button>
        }
      }
    </div>
  `,
  styles: `
    .airport-charts {
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .revision {
      font-family: var(--font-data);
      font-size: 12px;
      color: var(--efb-text-dim);
    }
    .chart-link-row {
      display: block;
      text-decoration: none;
      color: inherit;
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
      font-size: 20px;
      color: var(--efb-cyan);
      flex-shrink: 0;
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
export class AirportCharts {
  private route = inject(ActivatedRoute);
  private airportData = inject(AirportDataService);
  private gameState = inject(GameStateService);

  private icao$ = this.route.paramMap.pipe(map((params) => params.get('icao') ?? ''));

  private airport$ = this.icao$.pipe(
    switchMap((icao) => this.airportData.getByIcao(icao).pipe(map((a) => a ?? null)))
  );

  airport = toSignal(this.airport$, { initialValue: undefined });

  charts = computed(() => {
    const a = this.airport();
    return a ? generateSimulatedCharts(a.icao) : undefined;
  });

  countLabel(label: string, count: number): string {
    const n = this.chartPath(label) ? count : 0;
    return `${n} PROCEDURE(S)`;
  }
  
  isLevc = computed(() => this.airport()?.icao === 'LEVC');

  chartPath(label: string): string | null {
    const paths: Record<string, string> = {
      AERODROME: 'aerodrome',
      SID: 'sid',
      STAR: 'star',
      APPROACH: 'approach',
    };
    return paths[label] ?? null;
  }

  aircraftDataLoaded = computed(() => this.gameState.flags().aircraftUnlocked);

  loadAircraftData(): void {
    this.gameState.setFlag('aircraftUnlocked');
    this.gameState.illuminate('aircraft');
    this.gameState.notify('NEW MODULE UNLOCKED');
  }
}