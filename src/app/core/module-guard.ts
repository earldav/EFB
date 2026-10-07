import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameStateService } from './game-state';
import { isModuleUnlocked } from './unlock-engine';
import { ModuleId } from './types';

/**
 * Bloquea el acceso directo (por URL) a un modulo que aun no deberia
 * estar disponible (p.ej. FLIGHT PLAN sin vuelo asignado). La ruta debe
 * declarar `data: { moduleId: 'flightPlan' }` para que este guard sepa
 * que regla de unlockEngine comprobar.
 */
export const moduleGuard: CanActivateFn = (route) => {
  const gameState = inject(GameStateService);
  const router = inject(Router);

  const moduleId = route.data['moduleId'] as ModuleId | undefined;
  if (!moduleId) return true; // ruta sin modulo asociado, no se restringe aqui

  if (isModuleUnlocked(moduleId, gameState.flags())) {
    return true;
  }

  return router.parseUrl('/');
};