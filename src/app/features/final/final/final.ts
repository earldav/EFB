import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../../../core/game-state';

@Component({
  selector: 'app-final',
  imports: [],
  template: `
    <div class="final-screen">
      <div class="heart">❤</div>

      <div class="date-line">FELIÇ ANIVERSARI</div>

      <p class="message">
        T'estime.<br />
      </p>
    </div>
  `,
  styles: `
    .final-screen {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      padding: 2rem 1.5rem;
      text-align: center;
      background: var(--efb-bg);
    }
    .heart {
      font-size: 2rem;
      color: var(--efb-amber);
    }
    .route-line {
      font-family: var(--font-data);
      font-size: 1.125rem;
      letter-spacing: 0.05em;
      color: var(--efb-amber);
    }
    .date-line {
      font-family: var(--font-data);
      font-size: 0.9rem;
      letter-spacing: 0.15em;
      color: var(--efb-text-dim);
    }
    .message {
      max-width: 32rem;
      font-size: 1rem;
      line-height: 1.8;
      color: var(--efb-text);
      margin-top: 1rem;
    }
  `,
})
export class Final implements OnInit {
  private router = inject(Router);
  private gameState = inject(GameStateService);

  ngOnInit(): void {
    // Evita que se pueda llegar aqui por URL directa sin haber
    // completado el briefing de verdad.
    if (!this.gameState.flags().destinationIdentified) {
      this.router.navigateByUrl('/');
    }
  }
}