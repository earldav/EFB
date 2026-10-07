import { Component, OnInit, inject } from '@angular/core';
import { GameStateService } from '../../../core/game-state';
import { realFlightData } from '../../../data/aircraft-data';
import { Panel } from '../../../shared/components/panel/panel';
import { DataRow } from '../../../shared/components/data-row/data-row';

@Component({
  selector: 'app-aircraft',
  imports: [Panel, DataRow],
  template: `
    <div class="aircraft-screen">
      <div class="title">AIRCRAFT</div>

      <app-panel title="ASSIGNED AIRCRAFT">
        <app-data-row label="OPERATOR" [value]="data.operator + ' (' + data.operatorCode + ')'" />
        <app-data-row label="TYPE" [value]="data.aircraftType" />
        <app-data-row label="FLIGHT" [value]="data.flightNumber" />
        <app-data-row
          label="REGISTRATION"
          [value]="data.registration ?? data.registrationStatus"
          [locked]="false"
        />
        <app-data-row label="SEATING" [value]="data.seatCount + ' PAX'" />
        <app-data-row label="STATUS" value="IN SERVICE" />
      </app-panel>

      <button
        class="assoc-card"
        [class.loaded]="ofpLoaded()"
        [disabled]="ofpLoaded()"
        (click)="loadOfp()"
      >
        <svg class="assoc-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M14 2v5h5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M8 12h8M8 15.5h8M8 9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <div class="assoc-main">
          <div class="assoc-label">ASSOCIATED FLIGHT DOCUMENTS</div>
          <div class="assoc-status" [class.go]="ofpLoaded()">
            OFP — {{ ofpLoaded() ? 'LOADED' : 'AVAILABLE' }}
          </div>
        </div>
        @if (!ofpLoaded()) {
          <div class="assoc-arrow">›</div>
        }
      </button>
    </div>
  `,
  styles: `
    .aircraft-screen {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .title {
      font-family: var(--font-data);
      font-size: 1.375rem;
      color: var(--efb-text);
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
export class Aircraft implements OnInit {
  private gameState = inject(GameStateService);

  data = realFlightData;
  blockTimeLabel = `${Math.floor(this.data.flightTimeMinutes / 60)}H ${this.data.flightTimeMinutes % 60}M`;

  ofpLoaded = () => this.gameState.flags().ofpUnlocked;

  ngOnInit(): void {
    // El jugador ya ha visto este modulo: apagamos el indicador de
    // "contenido nuevo" que se encendio desde Charts.
    this.gameState.clearIllumination('aircraft');
  }

  loadOfp(): void {
    this.gameState.setFlag('ofpUnlocked');
    this.gameState.setFlag('crewProfileUnlocked');
    this.gameState.illuminate('ofp', 'crew');
    this.gameState.notify('NEW MODULE UNLOCKED', 'MODULE UPDATED'); // OFP + CREW, a la vez
  }
}