import { Component, input } from '@angular/core';

@Component({
  selector: 'app-data-row',
  imports: [],
  template: `
    <div class="row">
      <span class="label">{{ label() }}</span>
      <span class="value" [class.locked]="locked()">
        {{ locked() ? 'RESTRICTED' : value() }}
      </span>
    </div>
  `,
  styles: `
    .row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 2rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--efb-line);
    }
    .row:last-child {
      border-bottom: none;
    }
    .label {
      font-size: 13px;
      color: var(--efb-text-dim);
      flex-shrink: 0;
      max-width: 45%;
    }
    .value {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text);
      text-align: right;
      overflow-wrap: anywhere;
      min-width: 0;
    }
    .value.locked {
      color: var(--efb-text-faint);
    }
  `,
})
export class DataRow {
  label = input.required<string>();
  value = input<string>('');
  locked = input<boolean>(false);
}