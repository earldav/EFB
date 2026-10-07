import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameStateService } from '../game-state';
import { StatusBadge, BadgeTone } from '../../shared/components/status-badge/status-badge';
import { SideNav } from '../../shared/components/side-nav/side-nav';
import { SystemToast } from '../../shared/components/system-toast/system-toast';
import { FinalSequence } from '../../features/final/final-sequence/final-sequence';

const TONE_BY_STATUS: Record<string, BadgeTone> = {
  STANDBY: 'neutral',
  ACTIVE: 'caution',
  IN_PROGRESS: 'caution',
  COMPLETE: 'go',
};

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

function formatUtc(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hh}:${mm} UTC`;
}

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, StatusBadge, SideNav, SystemToast, FinalSequence],
  template: `
    <div class="shell">
      <app-system-toast />
      <header class="topbar">
        <div class="topbar-left">
          <button class="menu-btn" (click)="navOpen.set(true)" aria-label="Open menu">☰</button>
          <span class="crew-label">EFB · JESÚS — PIC</span>
          <span class="clock">{{ clockLabel() }}</span>
        </div>
        <div class="topbar-right">
          <app-status-badge [tone]="statusTone()">
            STATUS: {{ statusLabel() }}
          </app-status-badge>
        </div>
      </header>

      <div class="body">
        <app-side-nav [open]="navOpen()" (close)="navOpen.set(false)" />

        <main class="content">
          <router-outlet />
          <app-final-sequence />
        </main>
      </div>
    </div>
  `,
  styles: `
    .shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      padding: 0.625rem 1.25rem;
      background: var(--efb-panel);
      border-bottom: 1px solid var(--efb-line);
    }
    .topbar-left {
      display: flex;
      align-items: baseline;
      gap: 0.875rem;
      flex-wrap: wrap;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .menu-btn {
      display: none;
      background: none;
      border: 1px solid var(--efb-line-strong);
      border-radius: var(--radius-chip);
      color: var(--efb-text);
      font-size: 16px;
      padding: 0.25rem 0.625rem;
      cursor: pointer;
    }
    .crew-label {
      font-family: var(--font-data);
      font-size: 14px;
      letter-spacing: 0.03em;
      color: var(--efb-text-dim);
    }
    .clock {
      font-family: var(--font-data);
      font-size: 13px;
      color: var(--efb-text-faint);
    }
    .body {
      flex: 1;
      display: flex;
      align-items: stretch;
      min-height: 0;
    }
    .content {
      flex: 1;
      padding: 1.25rem;
      max-width: 60rem;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
    @media (min-width: 1100px) {
      .content {
        padding: 1.75rem;
      }
    }
    @media (max-width: 900px) {
      .menu-btn {
        display: inline-block;
      }
    }
  `,
})
export class AppShell {
  private gameState = inject(GameStateService);
  private destroyRef = inject(DestroyRef);

  private nowSignal = signal(new Date());
  clockLabel = computed(() => formatUtc(this.nowSignal()));

  statusLabel = computed(() => this.gameState.missionStatus().replace('_', ' '));
  statusTone = computed<BadgeTone>(() => TONE_BY_STATUS[this.gameState.missionStatus()]);

  navOpen = signal(false);

  constructor() {
    const interval = setInterval(() => this.nowSignal.set(new Date()), 15000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }
}