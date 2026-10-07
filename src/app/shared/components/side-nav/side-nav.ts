import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { GameStateService } from '../../../core/game-state';
import { isModuleUnlocked } from '../../../core/unlock-engine';
import { dashboardCards } from '../../../features/home/home-dashboard-config';

const EXACT = { exact: true };
const PREFIX = { exact: false };

@Component({
  selector: 'app-side-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    @if (open()) {
      <div class="backdrop" (click)="close.emit()"></div>
    }

    <nav class="side-nav" [class.open]="open()">
      <div class="brand">EFB</div>

      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="exact" class="item" (click)="close.emit()">
        <span>HOME</span>
        @if (homeIlluminated()) {
          <span class="dot illuminated"></span>
        }
      </a>

      @for (mod of modules(); track mod.id) {
        <a
          [routerLink]="mod.unlocked ? mod.route : null"
          routerLinkActive="active"
          [routerLinkActiveOptions]="prefix"
          class="item"
          [class.locked]="!mod.unlocked"
          (click)="mod.unlocked && close.emit()"
        >
          <span>{{ mod.label }}</span>
          <span class="dot" [class.go]="mod.unlocked" [class.illuminated]="mod.illuminated"></span>
        </a>
      }
    </nav>
  `,
  styles: `
    .side-nav {
      display: flex;
      flex-direction: column;
      width: 15rem;
      flex-shrink: 0;
      background: var(--efb-panel);
      border-right: 1px solid var(--efb-line);
      padding: 1rem 0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .brand {
      font-family: var(--font-data);
      color: var(--efb-amber);
      font-size: 1.25rem;
      letter-spacing: 0.15em;
      padding: 0 1.25rem 1rem;
      border-bottom: 1px solid var(--efb-line);
      margin-bottom: 0.5rem;
    }
    .item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 1.25rem;
      font-family: var(--font-data);
      font-size: 13px;
      letter-spacing: 0.03em;
      color: var(--efb-text-dim);
      text-decoration: none;
    }
    .item:hover {
      color: var(--efb-text);
      background: var(--efb-panel-raised);
    }
    .item.active {
      color: var(--efb-amber);
      background: var(--efb-panel-raised);
      border-right: 2px solid var(--efb-amber);
    }
    .item.locked {
      color: var(--efb-text-faint);
      pointer-events: none;
      cursor: default;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--efb-text-faint);
      flex-shrink: 0;
    }
    .dot.go {
      background: var(--efb-green);
    }
    .dot.illuminated {
      background: var(--efb-amber);
      box-shadow: 0 0 0 0 rgba(255, 179, 0, 0.6);
      animation: pulse-dot 1.8s ease-out infinite;
    }
    @keyframes pulse-dot {
      0% {
        box-shadow: 0 0 0 0 rgba(255, 179, 0, 0.55);
      }
      70% {
        box-shadow: 0 0 0 7px rgba(255, 179, 0, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(255, 179, 0, 0);
      }
    }
    .backdrop {
      display: none;
    }

    @media (max-width: 900px) {
      .side-nav {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        height: 100vh;
        z-index: 40;
        transform: translateX(-100%);
        transition: transform 0.2s ease;
        box-shadow: 2px 0 12px rgba(0, 0, 0, 0.4);
      }
      .side-nav.open {
        transform: translateX(0);
      }
      .backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 30;
      }
    }
  `,
})
export class SideNav {
  private gameState = inject(GameStateService);

  open = input<boolean>(false);
  close = output<void>();

  exact = EXACT;
  prefix = PREFIX;

  homeIlluminated = computed(() => this.gameState.isIlluminated('home'));

  modules = computed(() => {
    const flags = this.gameState.flags();
    // Referenciar `illuminated()` aqui (aunque no se use directamente el
    // valor) es lo que hace que este computed se re-evalue cuando cambia
    // el Set de iluminados, ya que isIlluminated() lee la misma signal.
    this.gameState.illuminated();
    return dashboardCards.map((c) => ({
      ...c,
      unlocked: isModuleUnlocked(c.id, flags),
      illuminated: this.gameState.isIlluminated(c.id),
    }));
  });
}