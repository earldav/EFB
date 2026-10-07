import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../../../core/game-state';
import { realFlightData } from '../../../data/aircraft-data';
import { Panel } from '../../../shared/components/panel/panel';
import { DataRow } from '../../../shared/components/data-row/data-row';

const VALID_ANSWERS = ['dolomitas', 'dolomiti', 'dolomites'];

function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita acentos
}

interface ItineraryStop {
  name: string;
}

const ITINERARY: ItineraryStop[] = [
  { name: 'MILAN' },
  { name: 'BOLZANO' },
  { name: 'LAGO DI CAREZZA' },
  { name: 'ALPE DI SIUSI' },
  { name: 'VAL GARDENA' },
  { name: 'SECEDA' },
  { name: 'PASSO SELLA' },
  { name: 'PASSO PORDOI' },
  { name: 'PASSO FALZAREGO' },
  { name: 'CINQUE TORRI' },
  { name: 'PASSO GIAU' },
  { name: "CORTINA D'AMPEZZO" },
  { name: 'LAGO DI SORAPIS' },
  { name: 'LAGO DI MISURINA' },
  { name: 'TRE CIME DI LAVAREDO' },
  { name: 'LAGO DI BRAIES' },
  { name: 'SANTA MADDALENA (VAL DI FUNES)' },
  { name: 'MILAN' },
];

@Component({
  selector: 'app-briefing',
  imports: [FormsModule, Panel, DataRow],
  template: `
    <div class="briefing-screen">
      <div class="title">BRIEFING</div>

      <app-panel title="FLIGHT">
        <app-data-row label="DEPARTURE" [value]="flight.departureIcao + ' — VALENCIA'" />
        <app-data-row label="DESTINATION" [value]="flight.arrivalIcao + ' — MILANO MALPENSA'" />
        <app-data-row label="AIRCRAFT" [value]="flight.aircraftType" />
        <app-data-row label="PIC" value="JESÚS" />
        <app-data-row label="COP" value="ELISA" />
      </app-panel>

      <app-panel title="GROUND">
        <app-data-row label="GROUND VEHICLE" value="CAMPERVAN" />
        <app-data-row label="COLLECTION" value="MILAN MALPENSA" />
        <app-data-row label="DURATION" value="7 DAYS" />
        <app-data-row label="RETURN" value="MILAN MALPENSA" />
      </app-panel>

      <app-panel title="ITINERARY">
        <div class="itinerary">
          @for (stop of itinerary; track $index) {
            <div class="stop">
              <span class="stop-dot"></span>
              <span class="stop-name">{{ stop.name }}</span>
            </div>
          }
        </div>
      </app-panel>

      <app-panel title="RETURN FLIGHT">
        <app-data-row label="ROUTE" [value]="flight.arrivalIcao + ' → ' + flight.departureIcao" />
      </app-panel>

      <app-panel title="DESTINATION IDENTIFICATION">
        <p class="prompt">WHERE ARE YOU GOING?</p>
        <input
          type="text"
          [(ngModel)]="answer"
          (keyup.enter)="confirm()"
          autocomplete="off"
          placeholder="TYPE YOUR ANSWER"
        />
        <button (click)="confirm()">CONFIRM</button>

        @if (showError()) {
          <div class="error-msg">IDENTIFICATION NOT CONFIRMED.</div>
        }
      </app-panel>
    </div>
  `,
  styles: `
    .briefing-screen {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .title {
      font-family: var(--font-data);
      font-size: 1.375rem;
      color: var(--efb-text);
    }
    .itinerary {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .stop {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    .stop-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--efb-cyan);
      flex-shrink: 0;
    }
    .stop-name {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text);
    }
    .prompt {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text-dim);
      margin: 0 0 0.75rem;
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
      text-transform: uppercase;
    }
    input:focus {
      outline: none;
      border-color: var(--efb-cyan);
    }
    button {
      width: 100%;
      background: var(--efb-amber);
      color: #1a1200;
      font-family: var(--font-data);
      font-size: 14px;
      letter-spacing: 0.03em;
      padding: 0.625rem;
      border: none;
      border-radius: var(--radius-chip);
      margin-top: 0.75rem;
      cursor: pointer;
    }
    .error-msg {
      margin-top: 0.75rem;
      font-family: var(--font-data);
      font-size: 12px;
      color: var(--efb-red);
    }
  `,
})
export class Briefing {
  private router = inject(Router);
  private gameState = inject(GameStateService);

  flight = realFlightData;
  itinerary = ITINERARY;

  answer = signal('');
  showError = signal(false);

  confirm(): void {
    if (VALID_ANSWERS.includes(normalizeAnswer(this.answer()))) {
      this.gameState.setFlag('destinationIdentified');
      this.gameState.setFlag('missionComplete');
      return;
    }
    this.showError.set(true);
  }
}