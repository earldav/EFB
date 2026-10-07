import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../../../core/game-state';
import { Panel } from '../../../shared/components/panel/panel';
import { EfbLogo } from '../../../shared/components/efb-logo/efb-logo';

const CORRECT_TOKEN = '13362';

const FAILURE_MESSAGES: string[][] = [
  [
    'AUTHENTICATION FAILED',
    'Credential mismatch.',
    'Attempt: 01/03',
    '',
    'CREW SHOULD REVIEW PREVIOUSLY ISSUED DOCUMENTATION.',
  ],
  [
    'AUTHENTICATION FAILED',
    'Credential mismatch.',
    'Attempt: 02/03',
    '',
    'HINT:',
    'THE TOKEN WAS NOT ISSUED TODAY.',
  ],
  [
    'AUTHENTICATION FAILED',
    'Credential mismatch.',
    'Attempt: 03/03',
    '',
    'FINAL HINT:',
    'THE TOKEN WAS PROVIDED IN PREVIOUS MESSAGES.',
  ],
];

const SUCCESS_MESSAGE = [
  'AUTHENTICATION SUCCESSFUL',
  'Credential verified.',
  'ACCESS GRANTED.',
  '',
  'Welcome aboard.',
];

type Phase = 'idle' | 'error' | 'success';

@Component({
  selector: 'app-login',
  imports: [FormsModule, Panel, EfbLogo],
  template: `
    <div class="login-screen">
      <div class="brand-header">
        <app-efb-logo [size]="46" [wordmarkSize]="42" tagline="ELECTRONIC FLIGHT BAG" />
      </div>

      <form class="login-form" (ngSubmit)="authenticate()">
        <app-panel title="CREW AUTHENTICATION">
          <div class="field-static">
            <div class="field-label">CREW ID</div>
            <div class="field-value">JESÚS — PIC</div>
          </div>

          <div class="field">
            <label class="field-label" for="token">ACCESS TOKEN</label>
            <input
              id="token"
              name="token"
              [(ngModel)]="token"
              [disabled]="phase() === 'success'"
              autocomplete="off"
              inputmode="numeric"
            />
          </div>

          <button type="submit" [disabled]="phase() === 'success'">
            AUTHENTICATE
          </button>

          @if (phase() === 'error') {
            <div class="terminal error">
              @for (line of currentMessage(); track $index) {
                <div class="line">{{ line || '\u00A0' }}</div>
              }
            </div>
          }

          @if (phase() === 'success') {
            <div class="terminal success">
              @for (line of successMessage; track $index) {
                <div class="line">{{ line || '\u00A0' }}</div>
              }
            </div>
          }
        </app-panel>
      </form>
    </div>
  `,
  styles: `
    .login-screen {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0 1.5rem;
    }
    .brand-header {
      display: flex;
      justify-content: center;
      margin-bottom: 2.5rem;
    }
    .login-form {
      width: 100%;
      max-width: 30rem;
      font-size: 1.15rem;
    }
    .field-static,
    .field {
      margin-bottom: 1.25rem;
    }
    .field-label {
      font-size: 14px;
      color: var(--efb-text-dim);
      margin-bottom: 0.375rem;
      display: block;
    }
    .field-value {
      font-family: var(--font-data);
      font-size: 20px;
      color: var(--efb-text);
    }
    input {
      width: 100%;
      background: var(--efb-panel-raised);
      border: 1px solid var(--efb-line-strong);
      border-radius: var(--radius-chip);
      padding: 0.75rem 0.875rem;
      font-family: var(--font-data);
      font-size: 20px;
      color: var(--efb-text);
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: var(--efb-cyan);
    }
    input:disabled {
      opacity: 0.5;
    }
    button {
      width: 100%;
      background: var(--efb-amber);
      color: #1a1200;
      font-family: var(--font-data);
      font-size: 18px;
      letter-spacing: 0.03em;
      padding: 0.875rem;
      border: none;
      border-radius: var(--radius-chip);
      margin-top: 0.75rem;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .terminal {
      margin-top: 1.5rem;
      padding: 1rem 1.125rem;
      border-radius: var(--radius-chip);
      font-family: var(--font-data);
      font-size: 16px;
      line-height: 1.6;
    }
    .terminal.error {
      background: color-mix(in srgb, var(--efb-red) 8%, transparent);
      border: 1px solid var(--efb-red);
      color: var(--efb-red);
    }
    .terminal.success {
      background: color-mix(in srgb, var(--efb-green) 8%, transparent);
      border: 1px solid var(--efb-green);
      color: var(--efb-green);
    }
  `,
})
export class Login {
  private router = inject(Router);
  private gameState = inject(GameStateService);

  token = signal('');
  phase = signal<Phase>('idle');
  attempts = signal(0);
  successMessage = SUCCESS_MESSAGE;

  currentMessage(): string[] {
    const index = Math.min(this.attempts() - 1, FAILURE_MESSAGES.length - 1);
    return FAILURE_MESSAGES[Math.max(index, 0)];
  }

  authenticate(): void {
    if (this.phase() === 'success') return;

    const normalized = this.token().trim().replace(/\s+/g, '');

    if (normalized === CORRECT_TOKEN) {
      this.phase.set('success');
      this.gameState.setFlag('authenticated');
      this.gameState.illuminate('charts');
      setTimeout(() => this.router.navigateByUrl('/'), 1800);
      return;
    }

    this.attempts.update((a) => Math.min(a + 1, FAILURE_MESSAGES.length));
    this.phase.set('error');
  }
}