import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameStateService } from '../../core/game-state';
import { isModuleUnlocked } from '../../core/unlock-engine';
import { Panel } from '../../shared/components/panel/panel';
import { dashboardCards } from '../home/home-dashboard-config';

@Component({
  selector: 'app-more',
  imports: [RouterLink, Panel],
  template: `
    <div class="more">
      <div class="title">MORE</div>
      <app-panel>
        <div class="list">
          @for (mod of modules(); track mod.id) {
            <a [routerLink]="mod.route" class="row" [class.locked]="!mod.unlocked">
              <span class="row-label">{{ mod.label }}</span>
              <span class="row-status" [class.go]="mod.unlocked">{{ mod.status }}</span>
            </a>
          }
        </div>
      </app-panel>
    </div>
  `,
  styles: `
    .title {
      font-family: var(--font-data);
      font-size: 1.125rem;
      color: var(--efb-text);
      margin-bottom: 1rem;
    }
    .list {
      display: flex;
      flex-direction: column;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--efb-line);
      text-decoration: none;
    }
    .row:last-child {
      border-bottom: none;
    }
    .row.locked {
      pointer-events: none;
      opacity: 0.55;
    }
    .row-label {
      font-family: var(--font-data);
      font-size: 13px;
      letter-spacing: 0.03em;
      color: var(--efb-text);
    }
    .row-status {
      font-family: var(--font-data);
      font-size: 10px;
      letter-spacing: 0.03em;
      color: var(--efb-text-faint);
    }
    .row-status.go {
      color: var(--efb-green);
    }
    @media (min-width: 700px) {
      .row-label {
        font-size: 15px;
      }
      .row-status {
        font-size: 11px;
      }
    }
  `,
})
export class More {
  private gameState = inject(GameStateService);

  modules = computed(() => {
    const flags = this.gameState.flags();
    return dashboardCards.map((c) => {
      const unlocked = isModuleUnlocked(c.id, flags);
      return { ...c, unlocked, status: unlocked ? c.availableStatus : c.lockedStatus };
    });
  });
}