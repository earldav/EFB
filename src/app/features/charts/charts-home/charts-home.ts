import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { AirportDataService } from '../../../data/airport-data';
import { Panel } from '../../../shared/components/panel/panel';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { OnInit } from '@angular/core';
import { GameStateService } from '../../../core/game-state';

@Component({
  selector: 'app-charts-home',
  imports: [RouterLink, FormsModule, Panel, StatusBadge],
  template: `
    <div class="charts-home">
      <div class="title">CHARTS</div>

      <app-panel title="WORLDWIDE NAVIGATION DATABASE">
        <div class="db-status">
          <span class="db-label">DATABASE STATUS</span>
          <app-status-badge tone="go">CURRENT</app-status-badge>
        </div>
      </app-panel>

      <app-panel title="SEARCH AIRPORT">
        <input
          type="text"
          placeholder="ICAO, IATA, name or city"
          [(ngModel)]="query"
          autocomplete="off"
        />

        @if (query().trim().length > 0) {
          <div class="results">
            @if (results() === undefined) {
              <div class="msg">SEARCHING...</div>
            } @else if (results()!.length === 0) {
              <div class="msg">NO MATCH FOUND.</div>
            } @else {
              @for (airport of results(); track airport.icao) {
                <a [routerLink]="['/charts', airport.icao]" class="result-row">
                  <div class="result-main">
                    <span class="result-code">{{ airport.icao }}</span>
                    <span class="result-name">{{ airport.name }}</span>
                  </div>
                  <div class="result-sub">{{ airport.city }}, {{ airport.country }}</div>
                </a>
              }
            }
          </div>
        }
      </app-panel>
    </div>
  `,
  styles: `
    .title {
      font-family: var(--font-data);
      font-size: 1.375rem;
      color: var(--efb-text);
      margin-bottom: 1.25rem;
    }
    .charts-home {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .db-status {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .db-label {
      font-size: 14px;
      color: var(--efb-text-dim);
    }
    input {
      width: 100%;
      background: var(--efb-panel-raised);
      border: 1px solid var(--efb-line-strong);
      border-radius: var(--radius-chip);
      padding: 0.75rem 0.875rem;
      font-family: var(--font-data);
      font-size: 16px;
      color: var(--efb-text);
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: var(--efb-cyan);
    }
    .results {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
    }
    .msg {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text-dim);
      padding: 0.5rem 0;
    }
    .result-row {
      display: block;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--efb-line);
      text-decoration: none;
    }
    .result-row:last-child {
      border-bottom: none;
    }
    .result-main {
      display: flex;
      align-items: baseline;
      gap: 0.625rem;
    }
    .result-code {
      font-family: var(--font-data);
      font-size: 16px;
      color: var(--efb-amber);
    }
    .result-name {
      font-size: 14px;
      color: var(--efb-text);
    }
    .result-sub {
      font-size: 12px;
      color: var(--efb-text-dim);
      margin-top: 0.125rem;
    }
  `,
})
export class ChartsHome implements OnInit {
  private airportData = inject(AirportDataService);
  private gameState = inject(GameStateService);

  query = signal('');

  private results$ = toObservable(this.query).pipe(
    debounceTime(200),
    distinctUntilChanged(),
    switchMap((q) => this.airportData.search(q))
  );

  results = toSignal(this.results$, { initialValue: undefined });

  ngOnInit(): void {
    this.gameState.clearIllumination('charts');
  }
}