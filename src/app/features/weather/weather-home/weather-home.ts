import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { AirportDataService } from '../../../data/airport-data';
import { Panel } from '../../../shared/components/panel/panel';

@Component({
  selector: 'app-weather-home',
  imports: [RouterLink, FormsModule, Panel],
  template: `
    <div class="wx-home">
      <div class="title">WEATHER</div>

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
                <a [routerLink]="['/weather', airport.icao]" class="result-row">
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

      <app-panel title="HOME BASE">
        <a [routerLink]="['/weather', 'LEVC']" class="result-row">
          <div class="result-main">
            <span class="result-code">LEVC</span>
            <span class="result-name">Valencia Airport</span>
          </div>
          <div class="result-sub">Valencia, Spain</div>
        </a>
      </app-panel>
    </div>
  `,
  styles: `
    .wx-home {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .title {
      font-family: var(--font-data);
      font-size: 1.375rem;
      color: var(--efb-text);
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
export class WeatherHome {
  private airportData = inject(AirportDataService);

  query = signal('');

  private results$ = toObservable(this.query).pipe(
    debounceTime(200),
    distinctUntilChanged(),
    switchMap((q) => this.airportData.search(q))
  );

  results = toSignal(this.results$, { initialValue: undefined });
}