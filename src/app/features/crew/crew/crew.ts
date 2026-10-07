import { Component, OnInit, computed, inject } from '@angular/core';
import { GameStateService } from '../../../core/game-state';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

interface CrewMember {
  position: 'PIC' | 'COP';
  name: string;
  initials: string;
  role: string;
  seat: string;
  accent: 'amber' | 'cyan';
}

const PIC_MEMBER: CrewMember = {
  position: 'PIC',
  name: 'J. PELLICER',
  initials: 'JP',
  role: 'PILOT IN COMMAND',
  seat: 'LEFT',
  accent: 'amber',
};

const COP_MEMBER: CrewMember = {
  position: 'COP',
  name: 'E. ARLANDIS',
  initials: 'EA',
  role: 'COPILOT',
  seat: 'RIGHT',
  accent: 'cyan',
};

@Component({
  selector: 'app-crew',
  imports: [StatusBadge],
  template: `
    <div class="crew-screen">
      <div class="title">CREW MANIFEST</div>

      <div class="cards">
        @for (m of members(); track m.position) {
          <div class="card">
            <div class="card-head">
              <div class="avatar" [class.cyan]="m.accent === 'cyan'">{{ m.initials }}</div>
              <div class="who">
                <div class="name">{{ m.name }}</div>
                <div class="role">{{ m.role }}</div>
              </div>
            </div>
            <div class="card-rows">
              <div class="kv">
                <span class="k">POSITION</span>
                <span class="v">{{ m.position }}</span>
              </div>
              <div class="kv">
                <span class="k">SEAT</span>
                <span class="v">{{ m.seat }}</span>
              </div>
              <div class="kv">
                <span class="k">STATUS</span>
                <span class="v ok"><span class="dot"></span>ACTIVE</span>
              </div>
            </div>
          </div>
        }

        @if (!profileUnlocked()) {
          <div class="card locked">
            <svg class="lock-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span class="locked-text">COP — RESTRICTED</span>
          </div>
        }
      </div>

      @if (profileUnlocked()) {
        <div class="pairing">
          <div class="pairing-head">
            <span class="pairing-label">PAIRING</span>
            <app-status-badge tone="go">CONFIRMED</app-status-badge>
          </div>

          <div class="compat">
            <span class="compat-label">PIC/COP COMPATIBILITY</span>
            <span class="compat-meter">
              <span class="segments">
                @for (s of segments; track s) {
                  <span class="seg"></span>
                }
              </span>
              <span class="compat-value">EXCELLENT</span>
            </span>
          </div>

          <div class="remarks">REMARKS: {{ easterEgg }}</div>
        </div>
      }
    </div>
  `,
  styles: `
    .crew-screen {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .title {
      font-family: var(--font-data);
      font-size: 1.375rem;
      color: var(--efb-text);
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.875rem;
    }
    .card {
      background: var(--efb-panel);
      border: 1px solid var(--efb-line);
      border-radius: var(--radius-panel);
      padding: 1.125rem;
    }
    .card-head {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .avatar {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      border: 1.5px solid var(--efb-amber);
      color: var(--efb-amber);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-data);
      font-size: 15px;
      flex-shrink: 0;
    }
    .avatar.cyan {
      border-color: var(--efb-cyan);
      color: var(--efb-cyan);
    }
    .who {
      min-width: 0;
    }
    .name {
      font-family: var(--font-data);
      font-size: 17px;
      color: var(--efb-text);
    }
    .role {
      font-family: var(--font-data);
      font-size: 12px;
      letter-spacing: 0.04em;
      color: var(--efb-text-dim);
      margin-top: 0.125rem;
    }
    .card-rows {
      margin-top: 0.875rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--efb-line);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .kv {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: var(--font-data);
      font-size: 13px;
    }
    .k {
      color: var(--efb-text-faint);
    }
    .v {
      color: var(--efb-text);
    }
    .v.ok {
      color: var(--efb-green);
    }
    .dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--efb-green);
      margin-right: 0.375rem;
    }
    .card.locked {
      background: transparent;
      border: 1px dashed var(--efb-line-strong);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-height: 7rem;
      color: var(--efb-text-faint);
    }
    .lock-icon {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }
    .locked-text {
      font-family: var(--font-data);
      font-size: 15px;
      letter-spacing: 0.03em;
    }
    .pairing {
      background: var(--efb-panel);
      border: 1px solid var(--efb-line);
      border-radius: var(--radius-panel);
      padding: 1.125rem;
    }
    .pairing-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.875rem;
    }
    .pairing-label {
      font-family: var(--font-data);
      font-size: 12px;
      letter-spacing: 0.05em;
      color: var(--efb-text-dim);
    }
    .compat {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1rem;
      flex-wrap: wrap;
    }
    .compat-label {
      font-family: var(--font-data);
      font-size: 13px;
      color: var(--efb-text-dim);
    }
    .compat-meter {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    .segments {
      display: flex;
      gap: 3px;
    }
    .seg {
      width: 1.375rem;
      height: 6px;
      background: var(--efb-amber);
    }
    .compat-value {
      font-family: var(--font-data);
      font-size: 14px;
      color: var(--efb-text);
    }
    .remarks {
      margin-top: 0.875rem;
      font-family: var(--font-data);
      font-size: 13px;
      color: var(--efb-text-dim);
    }
  `,
})
export class Crew implements OnInit {
  private gameState = inject(GameStateService);

  profileUnlocked = computed(() => this.gameState.flags().crewProfileUnlocked);

  members = computed<CrewMember[]>(() =>
    this.profileUnlocked() ? [PIC_MEMBER, COP_MEMBER] : [PIC_MEMBER]
  );

  segments = [1, 2, 3, 4, 5];

  // TODO: sustituir por el guiño personal que me des — de momento
  // placeholder neutro para no bloquear el desarrollo.
  easterEgg = 'BEST CREW SINCE 2024.';

  ngOnInit(): void {
    this.gameState.clearIllumination('crew');

    if (this.profileUnlocked() && !this.gameState.flags().crewConfirmed) {
      this.gameState.setFlag('crewConfirmed');
      this.gameState.illuminate('home', 'homeCrew');
    }
  }
}