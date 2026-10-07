import { Component, OnDestroy, effect, inject, signal, untracked } from '@angular/core';
import { GameStateService } from '../../../core/game-state';

type Phase = 'idle' | 'confirm' | 'final';

@Component({
  selector: 'app-final-sequence',
  imports: [],
  template: `
    @if (phase() !== 'idle') {
      <div class="overlay" [class.solid]="solid()">
        @if (phase() === 'confirm') {
          <div class="box" [class.hide]="hideBox()">
            <div class="ok">DESTINATION CONFIRMED</div>
            <div class="dest">DOLOMITI</div>
          </div>
        }

        @if (phase() === 'final') {
          <div class="frame" [class.on]="show()">
            <span class="corner tl"></span>
            <span class="corner tr"></span>
            <span class="corner bl"></span>
            <span class="corner br"></span>
            <div class="line">FELIÇ ANIVERSARI.</div>
            <div class="line love">T'ESTIME.</div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background-color: rgba(10, 14, 19, 0.55);
      transition: background-color 0.9s ease;
    }
    .overlay.solid {
      background-color: var(--efb-bg);
    }
    .box {
      background: var(--efb-panel);
      border: 1px solid var(--efb-line-strong);
      padding: 1.5rem 1.875rem;
      text-align: center;
      animation: appear 0.4s ease both;
      transition: opacity 0.5s ease;
    }
    .box.hide {
      opacity: 0;
    }
    .ok {
      font-family: var(--font-data);
      font-size: 11px;
      letter-spacing: 0.12em;
      color: var(--efb-green);
    }
    .dest {
      font-family: var(--font-data);
      font-size: 2.125rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--efb-amber);
      margin-top: 0.875rem;
    }
    @keyframes appear {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .frame {
      position: relative;
      width: min(100%, 26rem);
      padding: 2.75rem 1.75rem;
      text-align: center;
      opacity: 0;
      transition: opacity 1.2s ease;
    }
    .frame.on {
      opacity: 1;
    }
    .corner {
      position: absolute;
      width: 1.25rem;
      height: 1.25rem;
      border: 0 solid var(--efb-amber);
    }
    .tl {
      left: 0;
      top: 0;
      border-top-width: 2px;
      border-left-width: 2px;
    }
    .tr {
      right: 0;
      top: 0;
      border-top-width: 2px;
      border-right-width: 2px;
    }
    .bl {
      left: 0;
      bottom: 0;
      border-bottom-width: 2px;
      border-left-width: 2px;
    }
    .br {
      right: 0;
      bottom: 0;
      border-bottom-width: 2px;
      border-right-width: 2px;
    }
    .line {
      font-family: var(--font-data), ui-monospace, Menlo, Consolas, monospace;
      font-size: clamp(1.125rem, 4.2vw, 1.5rem);
      font-weight: 400;
      letter-spacing: 0.16em;
      padding-left: 0.16em;
      color: var(--efb-text);
    }
    .love {
      color: var(--efb-cyan);
      margin-top: 0.875rem;
    }
  `,
})
export class FinalSequence implements OnDestroy {
  private gameState = inject(GameStateService);

  phase = signal<Phase>('idle');
  solid = signal(false);
  hideBox = signal(false);
  show = signal(false);

  private timers: ReturnType<typeof setTimeout>[] = [];
  private started = false;

  constructor() {
    // Si la mision ya estaba completa al abrir la app, se salta la
    // animacion y se muestra directamente el mensaje.
    if (this.gameState.flags().missionComplete) {
      this.started = true;
      this.phase.set('final');
      this.solid.set(true);
      this.show.set(true);
      return;
    }

    effect(() => {
      if (this.gameState.flags().missionComplete && !this.started) {
        this.started = true;
        untracked(() => this.start());
      }
    });
  }

  ngOnDestroy(): void {
    this.timers.forEach((t) => clearTimeout(t));
  }

  private at(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private start(): void {
    (document.activeElement as HTMLElement | null)?.blur();
    this.phase.set('confirm');

    // La confirmacion se queda 2,4 s; luego se apaga todo y entra el mensaje.
    this.at(1800, () => {
      this.hideBox.set(true);
      this.solid.set(true);
    });
    this.at(3300, () => this.phase.set('final'));
    this.at(3400, () => this.show.set(true));
  }
}