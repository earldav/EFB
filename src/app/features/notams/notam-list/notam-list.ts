import { Component, computed, signal } from '@angular/core';
import { generateValenciaNotams, formatNotamDate, type Notam } from '../../../data/simulated-notams';
import { Panel } from '../../../shared/components/panel/panel';
import { StatusBadge, type BadgeTone } from '../../../shared/components/status-badge/status-badge';

interface NotamRow extends Notam {
  tone: BadgeTone;
  fromLabel: string;
  toLabel: string;
}

@Component({
  selector: 'app-notam-list',
  imports: [Panel, StatusBadge],
  template: `
    <div class="notam-screen">
      <div class="title">NOTAMS</div>

      <div class="header">
        <div class="icao">LEVC / VLC</div>
        <div class="name">Valencia Airport</div>
        <div class="location">Valencia, Spain</div>
      </div>

      <div class="toolbar">
        <span class="summary">
          {{ notams.length }} NOTAMS · {{ activeCount }} ACTIVE · {{ upcomingCount }} UPCOMING
        </span>
        <button class="decode-btn" (click)="rawMode.set(!rawMode())">
          {{ rawMode() ? 'DECODE' : 'SHOW RAW' }}
        </button>
      </div>

      <div class="chips">
        @for (c of chips; track c) {
          <button class="chip" [class.active]="filter() === c" (click)="filter.set(c)">{{ c }}</button>
        }
      </div>

      @for (n of rows(); track n.id) {
        <app-panel>
          <div class="card-head">
            <span class="cat">{{ n.category }}</span>
            <app-status-badge [tone]="n.tone">{{ n.status }}</app-status-badge>
          </div>

          @if (rawMode()) {
            <pre class="raw-text">{{ n.raw }}</pre>
          } @else {
            <div class="notam-id">{{ n.id }}</div>
            <p class="plain">{{ n.plain }}</p>
            <div class="validity">
              <div class="v-row"><span class="v-label">FROM</span><span class="v-value">{{ n.fromLabel }}</span></div>
              <div class="v-row"><span class="v-label">TO</span><span class="v-value">{{ n.toLabel }}</span></div>
              @if (n.schedule) {
                <div class="v-row"><span class="v-label">SCHEDULE</span><span class="v-value">{{ n.schedule }}</span></div>
              }
            </div>
          }
        </app-panel>
      } @empty {
        <div class="msg">NO NOTAMS FOR THIS FILTER.</div>
      }

      <div class="note">ALL TIMES UTC. VALIDITY PER FIELDS B) AND C) OF EACH NOTAM.</div>
    </div>
  `,
  styles: `
    .notam-screen {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .title {
      font-family: var(--font-data);
      font-size: 1.375rem;
      color: var(--efb-text);
    }
    .msg {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text-dim);
    }
    .icao {
      font-family: var(--font-data);
      font-size: 2rem;
      color: var(--efb-amber);
    }
    .name {
      font-size: 16px;
      color: var(--efb-text);
      margin-top: 0.25rem;
    }
    .location {
      font-size: 13px;
      color: var(--efb-text-dim);
      margin-top: 0.125rem;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .summary {
      font-family: var(--font-data);
      font-size: 12px;
      letter-spacing: 0.04em;
      color: var(--efb-text-dim);
    }
    .decode-btn {
      background: none;
      border: 1px solid var(--efb-amber-dim);
      border-radius: var(--radius-chip);
      color: var(--efb-amber);
      font-family: var(--font-data);
      font-size: 10px;
      letter-spacing: 0.04em;
      padding: 0.25rem 0.625rem;
      cursor: pointer;
      flex-shrink: 0;
    }
    .decode-btn:hover {
      border-color: var(--efb-amber);
    }
    .chips {
      display: flex;
      gap: 0.375rem;
      flex-wrap: wrap;
    }
    .chip {
      background: none;
      border: 1px solid var(--efb-line-strong);
      border-radius: var(--radius-chip);
      color: var(--efb-text-dim);
      font-family: var(--font-data);
      font-size: 11px;
      letter-spacing: 0.04em;
      padding: 0.3125rem 0.625rem;
      cursor: pointer;
    }
    .chip.active {
      color: var(--efb-amber);
      border-color: var(--efb-amber-dim);
    }
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }
    .cat {
      font-family: var(--font-data);
      font-size: 11px;
      letter-spacing: 0.06em;
      color: var(--efb-text-faint);
    }
    .raw-text {
      font-family: var(--font-data);
      font-size: 13px;
      line-height: 1.55;
      color: var(--efb-text);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      margin: 0;
    }
    .notam-id {
      font-family: var(--font-data);
      font-size: 12px;
      letter-spacing: 0.05em;
      color: var(--efb-amber);
    }
    .plain {
      font-size: 15px;
      line-height: 1.55;
      color: var(--efb-text);
      margin: 0.375rem 0 0.875rem;
    }
    .validity {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--efb-line);
    }
    .v-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      font-family: var(--font-data);
      font-size: 13px;
    }
    .v-label {
      color: var(--efb-text-faint);
    }
    .v-value {
      color: var(--efb-text);
      text-align: right;
    }
    .note {
      font-size: 10.5px;
      color: var(--efb-text-faint);
    }
  `,
})
export class NotamList {
  /** Arranca en RAW, como el OFP; el boton DECODE da la version legible. */
  rawMode = signal(true);
  filter = signal<string>('ALL');

  notams = generateValenciaNotams();
  activeCount = this.notams.filter((n) => n.status === 'ACTIVE').length;
  upcomingCount = this.notams.filter((n) => n.status === 'UPCOMING').length;
  chips = ['ALL', ...Array.from(new Set(this.notams.map((n) => n.category)))];

  rows = computed<NotamRow[]>(() => {
    const f = this.filter();
    return this.notams
      .filter((n) => f === 'ALL' || n.category === f)
      .map((n) => ({
        ...n,
        tone: (n.status === 'ACTIVE' ? 'go' : 'neutral') as BadgeTone,
        fromLabel: formatNotamDate(n.from),
        toLabel: formatNotamDate(n.to) + (n.estimated ? ' (EST)' : ''),
      }));
  });
}