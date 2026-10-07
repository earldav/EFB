import { Component, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'go' | 'caution' | 'locked' | 'alert';

@Component({
  selector: 'app-status-badge',
  imports: [],
  template: `
    <span class="badge" [class]="tone()">
      <ng-content />
    </span>
  `,
  styles: `
    .badge {
      display: inline-block;
      font-family: var(--font-data);
      font-size: 11px;
      letter-spacing: 0.03em;
      padding: 0.125rem 0.5rem;
      border: 1px solid;
      border-radius: var(--radius-chip);
    }
    .neutral {
      color: var(--efb-cyan);
      border-color: var(--efb-cyan-dim);
    }
    .go {
      color: var(--efb-green);
      border-color: var(--efb-green);
    }
    .caution {
      color: var(--efb-amber);
      border-color: var(--efb-amber-dim);
    }
    .locked {
      color: var(--efb-text-faint);
      border-color: var(--efb-line-strong);
    }
    .alert {
      color: var(--efb-red);
      border-color: var(--efb-red);
    }
    @media (min-width: 700px) {
      .badge {
        font-size: 13px;
        padding: 0.1875rem 0.625rem;
      }
    }
  `,
})
export class StatusBadge {
  tone = input<BadgeTone>('neutral');
}