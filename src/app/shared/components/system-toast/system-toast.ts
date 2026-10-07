import { Component, inject } from '@angular/core';
import { GameStateService } from '../../../core/game-state';

@Component({
  selector: 'app-system-toast',
  imports: [],
  template: `
    <div class="toast-stack">
      @for (msg of gameState.systemMessages(); track msg.id) {
        <div class="toast">
          <span class="dot"></span>
          <span class="text">{{ msg.text }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack {
      position: fixed;
      top: 4.5rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--efb-panel-raised);
      border: 1px solid var(--efb-amber-dim);
      border-radius: var(--radius-chip);
      padding: 0.5rem 1rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      animation: toast-in 0.25s ease-out;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--efb-amber);
      flex-shrink: 0;
    }
    .text {
      font-family: var(--font-data);
      font-size: 12px;
      letter-spacing: 0.04em;
      color: var(--efb-text);
      white-space: nowrap;
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @media (max-width: 500px) {
      .text {
        white-space: normal;
      }
    }
  `,
})
export class SystemToast {
  gameState = inject(GameStateService);
}