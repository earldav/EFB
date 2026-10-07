import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { GameStateService } from '../../core/game-state';
import { isModuleUnlocked } from '../../core/unlock-engine';
import {
  WeatherApiService,
  classifyFlightCategory,
  getWeatherIconType,
  type FlightCategory,
  type WeatherIconType,
} from '../../data/weather-api';
import { Panel } from '../../shared/components/panel/panel';
import { StatusBadge, type BadgeTone } from '../../shared/components/status-badge/status-badge';
import { dashboardCards } from './home-dashboard-config';

const CATEGORY_TONE: Record<FlightCategory, BadgeTone> = {
  VFR: 'go',
  MVFR: 'neutral',
  IFR: 'caution',
  LIFR: 'alert',
};

@Component({
  selector: 'app-home',
  imports: [RouterLink, Panel, StatusBadge],
  template: `
    <div class="home">
      <app-panel>
        <div class="welcome">
          <div class="welcome-label">WELCOME CAPTAIN</div>
          <div class="welcome-name">JESÚS</div>

          <div class="welcome-rows">
            <div class="welcome-row" [class.just-updated]="statusJustUpdated()">
              <span class="wr-label">BASE</span>
              <span class="wr-value">LEVC — VALENCIA</span>
            </div>
            <div class="welcome-row" [class.just-updated]="statusJustUpdated()">
              <span class="wr-label">STATUS</span>
              <span class="wr-value" [class.pending]="!flightAssigned()">
                {{ welcomeStatus() }}
              </span>
            </div>
            <div class="welcome-row" [class.just-updated]="crewJustUpdated()">
              <span class="wr-label">CREW</span>
              <span class="wr-value" [class.pending]="!crewConfirmed()">{{ crewLabel() }}</span>
            </div>
          </div>
        </div>
      </app-panel>

      <app-panel>
        @if (weather(); as w) {
          <div class="weather-teaser">
            <div class="weather-icon" [attr.data-type]="iconType()">
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
            <div class="weather-main">
              <span class="weather-temp">{{ w.current.temperatureC }}°C</span>
              <span class="weather-wind">WIND {{ w.current.windDirectionDeg }}°/{{ (w.current.windSpeedKmh * 0.539957).toFixed(0) }}KT</span>
            </div>
            <app-status-badge [tone]="categoryTone()">{{ category() }}</app-status-badge>
          </div>

          <a routerLink="/weather" class="weather-link">
            <span>METAR/TAF FULL REPORT</span>
            <span class="weather-link-arrow">WEATHER ›</span>
          </a>
        } @else {
          <div class="weather-loading">LOADING...</div>
        }
      </app-panel>

      <div class="grid">
        @for (card of cards(); track card.id) {
          <a [routerLink]="card.route" class="card" [class.locked]="!card.unlocked">
            <div class="card-top">
              <span class="card-title">{{ card.label }}</span>
              <span class="card-status" [class.go]="card.unlocked">{{ card.status }}</span>
            </div>
            <div class="card-desc">{{ card.description }}</div>
          </a>
        }
      </div>
    </div>
  `,
  styles: `
    .home {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .welcome {
      position: relative;
      overflow: hidden;
    }
    .welcome-label {
      font-size: 13px;
      letter-spacing: 0.1em;
      color: var(--efb-text-dim);
      position: relative;
    }
    .welcome-name {
      font-family: var(--font-data);
      font-size: 2rem;
      color: var(--efb-text);
      margin-top: 0.25rem;
      position: relative;
    }
    .welcome-rows {
      margin-top: 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      position: relative;
    }
    .welcome-row {
      display: flex;
      align-items: baseline;
      gap: 0.625rem;
      border-radius: var(--radius-chip);
      padding: 0.125rem 0.375rem;
      margin: -0.125rem -0.375rem;
    }
    .welcome-row.just-updated {
      animation: row-flash 2.2s ease-out;
    }
    @keyframes row-flash {
      0% {
        background: color-mix(in srgb, var(--efb-amber) 35%, transparent);
      }
      100% {
        background: transparent;
      }
    }
    .wr-label {
      font-family: var(--font-data);
      font-size: 11px;
      letter-spacing: 0.05em;
      color: var(--efb-text-faint);
      min-width: 4.5rem;
    }
    .wr-value {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-green);
      transition: color 0.3s ease;
    }
    .wr-value.pending {
      color: var(--efb-text-dim);
    }
    .weather-teaser {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .weather-icon {
      width: 30px;
      height: 30px;
      flex-shrink: 0;
      color: var(--efb-cyan);
    }
    .weather-icon[data-type='clear'] {
      color: var(--efb-amber);
    }
    .weather-icon svg {
      width: 100%;
      height: 100%;
    }
    .weather-main {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .weather-temp {
      font-family: var(--font-data);
      font-size: 17px;
      color: var(--efb-text);
    }
    .weather-wind {
      font-family: var(--font-data);
      font-size: 11px;
      color: var(--efb-text-dim);
    }
    .weather-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--efb-line);
      text-decoration: none;
    }
    .weather-link span:first-child {
      font-family: var(--font-data);
      font-size: 10.5px;
      letter-spacing: 0.04em;
      color: var(--efb-text-faint);
    }
    .weather-link-arrow {
      font-family: var(--font-data);
      font-size: 11px;
      letter-spacing: 0.03em;
      color: var(--efb-cyan);
    }
    .weather-loading {
      font-family: var(--font-data);
      font-size: 13px;
      color: var(--efb-text-dim);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 0.875rem;
    }
    .card {
      display: block;
      border: 1px solid var(--efb-line);
      border-radius: var(--radius-chip);
      padding: 1.125rem;
      text-decoration: none;
      background: var(--efb-panel);
    }
    .card:hover:not(.locked) {
      border-color: var(--efb-cyan);
    }
    .card.locked {
      pointer-events: none;
      opacity: 0.55;
    }
    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      gap: 0.5rem;
    }
    .card-title {
      font-family: var(--font-data);
      font-size: 15px;
      letter-spacing: 0.03em;
      color: var(--efb-text);
    }
    .card-status {
      font-family: var(--font-data);
      font-size: 11px;
      letter-spacing: 0.03em;
      color: var(--efb-text-faint);
      white-space: nowrap;
    }
    .card-status.go {
      color: var(--efb-green);
    }
    .card-desc {
      font-size: 13px;
      line-height: 1.45;
      color: var(--efb-text-dim);
    }
  `,
})
export class Home implements OnInit {
  private gameState = inject(GameStateService);
  private weatherApi = inject(WeatherApiService);

  flightAssigned = computed(() => this.gameState.flags().flightAssigned);
  crewConfirmed = computed(() => this.gameState.flags().crewConfirmed);
  crewLabel = computed(() =>
    this.crewConfirmed() ? '2/2 (COP CONFIRMED)' : '1/2 (COP NOT YET CONFIRMED)'
  );
  welcomeStatus = computed(() =>
    this.flightAssigned() ? 'READY FOR DEPARTURE' : 'NO ACTIVE FLIGHT ASSIGNED'
  );

  statusJustUpdated = signal(false);
  crewJustUpdated = signal(false);

  weather = toSignal(this.weatherApi.getLevcConditions(), { initialValue: undefined });

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

  cards = computed(() => {
    const flags = this.gameState.flags();
    return dashboardCards.map((c) => {
      const unlocked = isModuleUnlocked(c.id, flags);
      return {
        ...c,
        unlocked,
        status: unlocked ? c.availableStatus : c.lockedStatus,
        description: unlocked ? c.availableDescription : c.lockedDescription,
      };
    });
  });

  ngOnInit(): void {
    if (this.gameState.isIlluminated('homeStatus')) {
      this.statusJustUpdated.set(true);
      this.gameState.clearIllumination('homeStatus');
      setTimeout(() => this.statusJustUpdated.set(false), 2200);
    }
    if (this.gameState.isIlluminated('homeCrew')) {
      this.crewJustUpdated.set(true);
      this.gameState.clearIllumination('homeCrew');
      setTimeout(() => this.crewJustUpdated.set(false), 2200);
    }
    this.gameState.clearIllumination('home');
  }
}