import { Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GameStateService } from '../../../core/game-state';
import { isDocumentUnlocked } from '../../../core/unlock-engine';
import { documentsRegistry } from '../../../data/documents-data';
import { Panel } from '../../../shared/components/panel/panel';
import { DataRow } from '../../../shared/components/data-row/data-row';

@Component({
  selector: 'app-document-detail',
  imports: [RouterLink, Panel, DataRow],
  template: `
    <div class="doc-screen">
      <a routerLink="/documents" class="back-link">< DOCUMENTS</a>

      @if (doc(); as d) {
        <div class="header">
          <div class="doc-id">{{ d.id }}</div>
          <div class="doc-title">{{ d.title }}</div>
          <div class="doc-meta">
            <span>{{ d.category }}</span>
            <span>{{ d.revision }}</span>
            <span>EFFECTIVE {{ d.effective }}</span>
            <span>{{ d.issuer }}</span>
          </div>
        </div>

        <app-panel>
          <div class="doc-body">
            @for (b of d.blocks; track $index) {
              @if (b.type === 'heading') {
                <div class="block-heading">{{ b.text }}</div>
              } @else if (b.type === 'paragraph') {
                <p class="block-paragraph">{{ b.text }}</p>
              } @else if (b.type === 'list') {
                <ul class="block-list">
                  @for (item of b.items ?? []; track $index) {
                    <li>{{ item }}</li>
                  }
                </ul>
              } @else if (b.type === 'table') {
                <div class="block-table">
                  @for (row of b.rows ?? []; track $index) {
                    <app-data-row [label]="row.k" [value]="row.v" />
                  }
                </div>
              } @else if (b.type === 'note') {
                <div class="block-note">{{ b.text }}</div>
              }
            }
          </div>
        </app-panel>
      } @else {
        <div class="msg">DOCUMENT NOT FOUND.</div>
      }
    </div>
  `,
  styles: `
    .doc-screen {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .back-link {
      font-family: var(--font-data);
      font-size: 13px;
      color: var(--efb-cyan);
      text-decoration: none;
      letter-spacing: 0.03em;
    }
    .msg {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text-dim);
    }
    .header {
      margin-top: 0.25rem;
    }
    .doc-id {
      font-family: var(--font-data);
      font-size: 12px;
      letter-spacing: 0.06em;
      color: var(--efb-text-faint);
    }
    .doc-title {
      font-family: var(--font-data);
      font-size: 1.25rem;
      color: var(--efb-amber);
      line-height: 1.35;
      margin-top: 0.25rem;
    }
    .doc-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      margin-top: 0.5rem;
      font-family: var(--font-data);
      font-size: 11px;
      letter-spacing: 0.04em;
      color: var(--efb-text-dim);
    }
    .doc-body {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .block-heading {
      font-family: var(--font-data);
      font-size: 12px;
      letter-spacing: 0.06em;
      color: var(--efb-text-dim);
      padding-top: 0.25rem;
      border-top: 1px solid var(--efb-line);
    }
    .doc-body > .block-heading:first-child {
      border-top: none;
      padding-top: 0;
    }
    .block-paragraph {
      font-size: 14px;
      line-height: 1.6;
      color: var(--efb-text);
      margin: 0;
    }
    .block-list {
      margin: 0;
      padding-left: 1.125rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 14px;
      line-height: 1.55;
      color: var(--efb-text);
    }
    .block-list li::marker {
      color: var(--efb-text-faint);
    }
    .block-note {
      font-family: var(--font-data);
      font-size: 13px;
      letter-spacing: 0.02em;
      line-height: 1.55;
      color: var(--efb-amber);
      background: color-mix(in srgb, var(--efb-amber) 8%, transparent);
      border: 1px solid var(--efb-amber-dim);
      border-radius: var(--radius-chip);
      padding: 0.75rem 0.875rem;
    }
  `,
})
export class DocumentDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private gameState = inject(GameStateService);

  /** Un documento `restricted` no se puede abrir por URL directa mientras
   *  su regla de desbloqueo no se cumpla: se trata como inexistente. */
  doc = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    const d = documentsRegistry.find((x) => x.id === id);
    if (!d) return undefined;
    if (d.restricted && !isDocumentUnlocked(d.id, this.gameState.flags())) return undefined;
    return d;
  });

  ngOnInit(): void {
    const d = this.doc();
    if (d?.id === 'GND-4471' && !this.gameState.flags().groundArrangementsRead) {
      this.gameState.setFlag('groundArrangementsRead');
      this.gameState.illuminate('briefing');
      this.gameState.notify('NEW MODULE UNLOCKED');
    }
  }
}