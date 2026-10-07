import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameStateService } from './game-state';

export const authGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);

  if (gameState.flags().authenticated) {
    return true;
  }

  // No autenticado: lo mandamos al arranque, no directamente al login,
  // para que siempre vea la secuencia de boot al entrar en frío.
  return router.parseUrl('/boot');
};