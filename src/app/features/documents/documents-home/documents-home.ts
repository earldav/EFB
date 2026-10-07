import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../../../core/game-state';
import { isDocumentUnlocked } from '../../../core/unlock-engine';
import { CATEGORY_ORDER, documentsRegistry } from '../../../data/documents-data';
import { Panel } from '../../../shared/components/panel/panel';

@Component({
  selector: 'app-documents-home',
  imports: [RouterLink, FormsModule, Panel],
  template: `
    <div class="docs-screen">
      <div class="title">DOCUMENTS</div>

      <input
        class="search"
        type="text"
        placeholder="Search by title or document ID"
        [(ngModel)]="query"
        autocomplete="off"
      />

      @for (g of groups(); track g.category) {
        <app-panel [title]="g.category">
          <div class="list">
            @for (doc of g.docs; track doc.id) {
              <a [routerLink]="['/documents', doc.id]" class="row">
                <div class="row-main">
                  <span class="row-title">{{ doc.title }}</span>
                  <span class="row-meta">{{ doc.id }} · {{ doc.revision }} · {{ doc.effective }}</span>
                </div>
                <span class="row-arrow">›</span>
              </a>
            }
          </div>
        </app-panel>
      } @empty {
        <div class="msg">NO DOCUMENTS FOUND.</div>
      }
    </div>
  `,
  styles: `
    .docs-screen {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .title {
      font-family: var(--font-data);
      font-size: 1.375rem;
      color: var(--efb-text);
    }
    .search {
      width: 100%;
      background: var(--efb-panel-raised);
      border: 1px solid var(--efb-line-strong);
      border-radius: var(--radius-chip);
      padding: 0.75rem 0.875rem;
      font-family: var(--font-data);
      font-size: 15px;
      color: var(--efb-text);
      box-sizing: border-box;
    }
    .search:focus {
      outline: none;
      border-color: var(--efb-cyan);
    }
    .msg {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text-dim);
    }
    .list {
      display: flex;
      flex-direction: column;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--efb-line);
      text-decoration: none;
    }
    .row:last-child {
      border-bottom: none;
    }
    .row-main {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }
    .row-title {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text);
      line-height: 1.35;
    }
    .row-meta {
      font-family: var(--font-data);
      font-size: 11px;
      letter-spacing: 0.03em;
      color: var(--efb-text-faint);
    }
    .row-arrow {
      font-size: 20px;
      color: var(--efb-cyan);
      flex-shrink: 0;
    }
  `,
})
export class DocumentsHome implements OnInit {
  private gameState = inject(GameStateService);

  query = signal('');

  /** Los documentos marcados como `restricted` no aparecen (ni siquiera
   *  bloqueados) hasta que su regla de desbloqueo se cumple. Las categorias
   *  sin documentos visibles tampoco se muestran. */
  groups = computed(() => {
    const flags = this.gameState.flags();
    const q = this.query().trim().toLowerCase();

    const visible = documentsRegistry.filter(
      (d) =>
        (!d.restricted || isDocumentUnlocked(d.id, flags)) &&
        (!q || d.title.toLowerCase().includes(q) || d.id.toLowerCase().includes(q))
    );

    return CATEGORY_ORDER.map((category) => ({
      category,
      docs: visible.filter((d) => d.category === category),
    })).filter((g) => g.docs.length > 0);
  });

  ngOnInit(): void {
    this.gameState.clearIllumination('documents');
  }
}