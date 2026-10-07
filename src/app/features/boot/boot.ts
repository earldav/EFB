import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/game-state';
import { EfbLogo } from '../../shared/components/efb-logo/efb-logo';

const CHECKS = ['DATABASE', 'NAVIGATION', 'WEATHER', 'CREW AUTHENTICATION'];

/** Ciclo AIRAC real: ciclos de 28 dias desde una fecha ancla conocida. */
function computeAiracCycle(date: Date): { cycle: string; validFrom: string; validTo: string } {
  const anchor = new Date(Date.UTC(2025, 0, 23)); // AIRAC 2501, ancla real
  const msPerCycle = 28 * 24 * 60 * 60 * 1000;
  const diff = date.getTime() - anchor.getTime();
  const cyclesSinceAnchor = Math.floor(diff / msPerCycle);
  const cycleStart = new Date(anchor.getTime() + cyclesSinceAnchor * msPerCycle);
  const cycleEnd = new Date(cycleStart.getTime() + msPerCycle - 24 * 60 * 60 * 1000);

  const yearTwoDigit = String(cycleStart.getUTCFullYear()).slice(2);
  const cycleNumberInYear =
    Math.floor((cycleStart.getTime() - Date.UTC(cycleStart.getUTCFullYear(), 0, 1)) / msPerCycle) + 1;
  const cycle = `${yearTwoDigit}${String(cycleNumberInYear).padStart(2, '0')}`;

  const fmt = (d: Date) =>
    `${String(d.getUTCDate()).padStart(2, '0')}${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]}${d.getUTCFullYear()}`;

  return { cycle, validFrom: fmt(cycleStart), validTo: fmt(cycleEnd) };
}

@Component({
  selector: 'app-boot',
  imports: [EfbLogo],
  template: `
    <div class="boot">
      <div class="logo-block">
        <app-efb-logo [size]="64" [wordmarkSize]="60"/>
        <div class="subtitle">SYSTEM INITIALIZING</div>
      </div>

      <div class="progress-track">
        <div class="progress-fill" [style.width.%]="progressPercent()"></div>
      </div>

      <div class="checks">
        @for (check of checks; track check; let i = $index) {
          <div class="check-row">
            <span class="check-label">{{ check }}</span>
            <span
              class="check-status"
              [class.ok]="i < passed()"
              [class.active]="i === passed()"
            >
              {{ i < passed() ? 'OK' : i === passed() ? 'CHECKING...' : 'PENDING' }}
            </span>
          </div>
        }
      </div>

      <div class="sys-info">
        <div class="sys-row">
          <span>EFB SOFTWARE</span>
          <span>v10.4.2 (BUILD 20260908)</span>
        </div>
        <div class="sys-row">
          <span>NAV DATABASE</span>
          <span>AIRAC {{ airac().cycle }} · {{ airac().validFrom }}–{{ airac().validTo }}</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    .boot {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2.5rem;
      padding: 0 1.5rem;
    }
    .logo-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .subtitle {
      color: var(--efb-text-dim);
      font-size: 15px;
      letter-spacing: 0.15em;
    }
    .progress-track {
      width: 100%;
      max-width: 32rem;
      height: 3px;
      background: var(--efb-line);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--efb-amber);
      transition: width 0.4s ease;
    }
    .checks {
      width: 100%;
      max-width: 32rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      font-family: var(--font-data);
      font-size: 18px;
    }
    .check-row {
      display: flex;
      justify-content: space-between;
    }
    .check-label {
      color: var(--efb-text-dim);
    }
    .check-status {
      color: var(--efb-text-faint);
    }
    .check-status.ok {
      color: var(--efb-green);
    }
    .check-status.active {
      color: var(--efb-amber);
    }
    .sys-info {
      width: 100%;
      max-width: 32rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding-top: 1rem;
      border-top: 1px solid var(--efb-line);
    }
    .sys-row {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-data);
      font-size: 11px;
      color: var(--efb-text-faint);
    }
  `,
})
export class Boot implements OnInit, OnDestroy {
  private router = inject(Router);
  private gameState = inject(GameStateService);
  private timer: ReturnType<typeof setTimeout> | undefined;

  checks = CHECKS;
  passed = signal(0);
  progressPercent = computed(() => (this.passed() / this.checks.length) * 100);
  airac = computed(() => computeAiracCycle(new Date()));

  ngOnInit(): void {
    this.tick();
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  private tick(): void {
    if (this.passed() >= this.checks.length) {
      this.gameState.setFlag('bootComplete');
      this.timer = setTimeout(() => this.router.navigateByUrl('/login'), 1000);
      return;
    }
    this.timer = setTimeout(() => {
      this.passed.update((p) => p + 1);
      this.tick();
    }, 1500);
  }
}