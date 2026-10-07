import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Panel } from '../../shared/components/panel/panel';

@Component({
  selector: 'app-module-placeholder',
  imports: [Panel],
  template: `
    <div class="placeholder">
      <div class="title">{{ label }}</div>
      <app-panel>
        <p class="msg">MODULE NOT YET DEVELOPED.</p>
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
    .msg {
      font-family: var(--font-data);
      font-size: 13px;
      color: var(--efb-text-dim);
      margin: 0;
    }
  `,
})
export class ModulePlaceholder {
  private route = inject(ActivatedRoute);
  label = this.route.snapshot.data['label'] ?? 'MODULE';
}