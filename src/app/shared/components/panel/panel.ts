import { Component, input } from '@angular/core';

@Component({
  selector: 'app-panel',
  imports: [],
  template: `
    <section class="panel">
      @if (title()) {
        <header class="panel-header">{{ title() }}</header>
      }
      <div class="panel-body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    .panel {
      background: var(--efb-panel);
      border: 1px solid var(--efb-line);
      border-radius: var(--radius-panel);
    }
    .panel-header {
      padding: 0.5rem 1rem;
      border-bottom: 1px solid var(--efb-line);
      font-size: 11px;
      letter-spacing: 0.05em;
      color: var(--efb-text-dim);
      font-family: var(--font-data);
    }
    .panel-body {
      padding: 1rem;
    }
    @media (min-width: 700px) {
      .panel-header {
        font-size: 13px;
        padding: 0.75rem 1.25rem;
      }
      .panel-body {
        padding: 1.25rem;
      }
    }
  `,
})
export class Panel {
  title = input<string>();
}