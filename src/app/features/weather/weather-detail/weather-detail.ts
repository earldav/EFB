import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { AirportDataService } from '../../../data/airport-data';
import {
  WeatherApiService,
  classifyFlightCategory,
  getWeatherIconType,
  type FlightCategory,
  type WeatherIconType,
} from '../../../data/weather-api';
import {
  generateMetar,
  generateForecastTable,
  decodeForecastPeriod,
  conditionLabel,
  formatWind,
  formatVisibility,
  formatUtcTime,
  formatLocalTime,
  skyLabel,
} from '../../../data/metar-format';
import { Panel } from '../../../shared/components/panel/panel';
import { StatusBadge, type BadgeTone } from '../../../shared/components/status-badge/status-badge';

const CATEGORY_TONE: Record<FlightCategory, BadgeTone> = {
  VFR: 'go',
  MVFR: 'neutral',
  IFR: 'caution',
  LIFR: 'alert',
};

@Component({
  selector: 'app-weather-detail',
  imports: [RouterLink, Panel, StatusBadge],
  template: `
    <div class="wx-screen">
      <a routerLink="/weather" class="back-link">< WEATHER</a>

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

        @if (weather(); as w) {
          @if (w.freshness === 'STATIC') {
            <div class="offline">NO CONNECTION — SIMULATION DATA. NOT FOR FLIGHT PLANNING.</div>
          }

          <app-panel>
            <div class="hero">
              <div class="hero-icon" [attr.data-type]="iconType()">
                @switch (iconType()) {
                  @case ('clear') {
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="12" y1="1.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22.5"/><line x1="1.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22.5" y2="12"/></g></svg>
                  }
                  @case ('cloud') {
                    <svg viewBox="0 0 24 24"><path d="M6.5 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 16.4 8.06 4.5 4.5 0 0 1 17.5 17H6.5z" fill="currentColor"/></svg>
                  }
                  @case ('rain') {
                    <svg viewBox="0 0 24 24"><path d="M6.5 14a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 16.4 4.06 4.5 4.5 0 0 1 17.5 13H6.5z" fill="currentColor"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="8" y1="17" x2="7" y2="21"/><line x1="12" y1="17" x2="11" y2="21"/><line x1="16" y1="17" x2="15" y2="21"/></g></svg>
                  }
                  @case ('snow') {
                    <svg viewBox="0 0 24 24"><path d="M6.5 14a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 16.4 4.06 4.5 4.5 0 0 1 17.5 13H6.5z" fill="currentColor"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="8" y1="18" x2="8" y2="22"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="16" y1="18" x2="16" y2="22"/></g></svg>
                  }
                  @case ('fog') {
                    <svg viewBox="0 0 24 24"><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="16" x2="21" y2="16"/></g></svg>
                  }
                  @case ('storm') {
                    <svg viewBox="0 0 24 24"><path d="M6.5 13a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 16.4 3.06 4.5 4.5 0 0 1 17.5 12H6.5z" fill="currentColor"/><path d="M13 13l-3 5h2.5l-1.5 4 4-6h-2.5z" fill="var(--efb-amber)"/></svg>
                  }
                }
              </div>

              <div class="hero-main">
                <span class="hero-temp">{{ tempLabel() }}</span>
                <span class="hero-sub">{{ conditionText() }}</span>
              </div>

              <div class="hero-badges">
                <app-status-badge [tone]="categoryTone()">{{ category() }}</app-status-badge>
                <app-status-badge [tone]="w.freshness === 'LIVE' ? 'go' : 'caution'">
                  {{ w.freshness === 'LIVE' ? 'LIVE' : 'SIMULATION' }}
                </app-status-badge>
              </div>
            </div>

            <div class="hero-grid">
              @for (item of heroItems(); track item.label) {
                <div class="hero-item">
                  <span class="hi-label">{{ item.label }}</span>
                  <span class="hi-value">{{ item.value }}</span>
                </div>
              }
            </div>
          </app-panel>

          <app-panel title="METAR">
            <div class="metar-code">{{ metar() }}</div>
          </app-panel>

          <app-panel title="TAF">
            <div class="taf-toolbar">
              <span class="note-inline">DERIVED FROM LIVE FORECAST · NEXT 24 H</span>
              <button class="decode-btn" (click)="tafDecoded.set(!tafDecoded())">
                {{ tafDecoded() ? 'SHOW RAW' : 'DECODE' }}
              </button>
            </div>

            @if (!tafDecoded()) {
              <div class="taf-table">
                <div class="taf-row taf-row-header">
                  <span>TIME</span>
                  <span>WIND (KT)</span>
                  <span>VIS (M)</span>
                  <span>SKY</span>
                </div>
                @for (row of forecastTable(); track row.timeLabel) {
                  <div class="taf-row">
                    <span>{{ row.timeLabel }}</span>
                    <span>{{ row.wind }}</span>
                    <span>{{ row.visibility }}</span>
                    <span>{{ row.sky }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="taf-decoded">
                @for (line of decodedForecast(); track line.time) {
                  <div class="taf-decoded-row">
                    <span class="taf-decoded-time">{{ line.time }}</span>
                    <span class="taf-decoded-text">{{ line.text }}</span>
                  </div>
                }
              </div>
            }

            <div class="note">FORECAST HORIZON: 48 H. NO FORECAST IS AVAILABLE BEYOND IT.</div>
          </app-panel>
        } @else {
          <div class="msg">LOADING WEATHER...</div>
        }
      }
    </div>
  `,
  styles: `
    .wx-screen {
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
    .offline {
      font-family: var(--font-data);
      font-size: 12px;
      letter-spacing: 0.03em;
      color: var(--efb-amber);
      border: 1px solid var(--efb-amber-dim);
      background: color-mix(in srgb, var(--efb-amber) 8%, transparent);
      border-radius: var(--radius-chip);
      padding: 0.625rem 0.875rem;
    }
    .hero {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .hero-icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      color: var(--efb-cyan);
    }
    .hero-icon[data-type='clear'] {
      color: var(--efb-amber);
    }
    .hero-icon svg {
      width: 100%;
      height: 100%;
    }
    .hero-main {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .hero-temp {
      font-family: var(--font-data);
      font-size: 26px;
      color: var(--efb-text);
    }
    .hero-sub {
      font-family: var(--font-data);
      font-size: 12px;
      letter-spacing: 0.04em;
      color: var(--efb-text-dim);
    }
    .hero-badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.375rem;
    }
    .hero-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.75rem 1rem;
      margin-top: 1rem;
      padding-top: 0.875rem;
      border-top: 1px solid var(--efb-line);
    }
    .hero-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .hi-label {
      font-family: var(--font-data);
      font-size: 10.5px;
      letter-spacing: 0.06em;
      color: var(--efb-text-faint);
    }
    .hi-value {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text);
    }
    .metar-code {
      font-family: var(--font-data);
      font-size: 15px;
      color: var(--efb-text);
      overflow-wrap: anywhere;
      line-height: 1.55;
    }
    .note {
      font-size: 10.5px;
      color: var(--efb-text-faint);
      margin-top: 0.625rem;
    }
    .note-inline {
      font-family: var(--font-data);
      font-size: 10.5px;
      letter-spacing: 0.04em;
      color: var(--efb-text-faint);
    }
    .taf-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .decode-btn {
      background: none;
      border: 1px solid var(--efb-amber-dim);
      border-radius: var(--radius-chip);
      color: var(--efb-amber);
      font-family: var(--font-data);
      font-size: 10px;
      letter-spacing: 0.04em;
      padding: 0.25rem 0.625rem;
      cursor: pointer;
      flex-shrink: 0;
    }
    .decode-btn:hover {
      border-color: var(--efb-amber);
    }
    .taf-table {
      display: flex;
      flex-direction: column;
    }
    .taf-row {
      display: grid;
      grid-template-columns: 1.3fr 1fr 0.8fr 1.1fr;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--efb-line);
      font-family: var(--font-data);
      font-size: 13px;
      color: var(--efb-text-dim);
    }
    .taf-row:last-child {
      border-bottom: none;
    }
    .taf-row-header {
      color: var(--efb-text-faint);
      font-size: 10px;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--efb-line-strong);
    }
    .taf-decoded {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .taf-decoded-row {
      display: flex;
      gap: 0.75rem;
      font-size: 14px;
      color: var(--efb-text-dim);
    }
    .taf-decoded-time {
      font-family: var(--font-data);
      color: var(--efb-text-faint);
      flex-shrink: 0;
      min-width: 5rem;
    }
  `,
})
export class WeatherDetail {
  private route = inject(ActivatedRoute);
  private airportData = inject(AirportDataService);
  private weatherApi = inject(WeatherApiService);

  tafDecoded = signal(false);

  private icao$ = this.route.paramMap.pipe(map((params) => params.get('icao') ?? ''));

  private airport$ = this.icao$.pipe(
    switchMap((icao) => this.airportData.getByIcao(icao).pipe(map((a) => a ?? null)))
  );

  airport = toSignal(this.airport$, { initialValue: undefined });

  private weather$ = this.airport$.pipe(
    switchMap((a) => (a ? this.weatherApi.getConditions(a.icao, a.lat, a.lon) : of(null)))
  );

  weather = toSignal(this.weather$, { initialValue: undefined });

  iconType = computed<WeatherIconType>(() => {
    const w = this.weather();
    return w ? getWeatherIconType(w.current.weatherCode) : 'clear';
  });

  category = computed<FlightCategory>(() => {
    const w = this.weather();
    if (!w) return 'VFR';
    return classifyFlightCategory(w.current.visibilityM, w.current.cloudCoverPercent);
  });

  categoryTone = computed<BadgeTone>(() => CATEGORY_TONE[this.category()]);

  tempLabel = computed(() => {
    const w = this.weather();
    return w ? `${Math.round(w.current.temperatureC)}°C` : '';
  });

  conditionText = computed(() => {
    const w = this.weather();
    return w ? conditionLabel(w.current) : '';
  });

  heroItems = computed(() => {
    const w = this.weather();
    const a = this.airport();
    if (!w || !a) return [];
    const c = w.current;
    const local = formatLocalTime(c.observedAt, a.tz);
    return [
      { label: 'WIND', value: formatWind(c) },
      { label: 'VISIBILITY', value: formatVisibility(c.visibilityM) },
      { label: 'CLOUDS', value: `${skyLabel(c.cloudCoverPercent)} · ${c.cloudCoverPercent}%` },
      { label: 'TEMP / DEWPOINT', value: `${Math.round(c.temperatureC)}° / ${Math.round(c.dewpointC)}°C` },
      { label: 'QNH', value: `${Math.round(c.qnhHpa)} HPA` },
      { label: 'OBSERVED', value: `${formatUtcTime(c.observedAt)}${local ? ' · ' + local + ' LT' : ''}` },
    ];
  });

  metar = computed(() => {
    const w = this.weather();
    const a = this.airport();
    return w && a ? generateMetar(a.icao, w.current) : '';
  });

  forecastTable = computed(() => {
    const w = this.weather();
    return w ? generateForecastTable(w.forecast) : [];
  });

  decodedForecast = computed(() => {
    const w = this.weather();
    if (!w) return [];
    const table = this.forecastTable();
    return w.forecast.map((p, i) => ({
      time: table[i]?.timeLabel ?? '',
      text: decodeForecastPeriod(p),
    }));
  });
}