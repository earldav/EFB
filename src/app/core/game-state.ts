import { Injectable, signal, computed } from '@angular/core';
import { GameFlags, IlluminatableId, initialFlags, MissionStatus } from './types';

const STORAGE_KEY = 'efb-mission-save';
const ILLUMINATION_KEY = 'efb-illuminated-modules';

export interface SystemMessage {
  id: number;
  text: string;
}

function loadFlags(): GameFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialFlags;
    return { ...initialFlags, ...JSON.parse(raw) };
  } catch {
    return initialFlags;
  }
}

function loadIlluminated(): Set<IlluminatableId> {
  try {
    const raw = localStorage.getItem(ILLUMINATION_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as IlluminatableId[]);
  } catch {
    return new Set();
  }
}

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly _flags = signal<GameFlags>(loadFlags());
  readonly flags = this._flags.asReadonly();

  private readonly _illuminated = signal<Set<IlluminatableId>>(loadIlluminated());
  readonly illuminated = this._illuminated.asReadonly();

  /** Cuanto tiempo (ms) permanece visible un grupo de avisos antes de
   *  autodescartarse. Cambia este numero para ajustar la duracion. */
  private static readonly TOAST_DURATION_MS = 3000;

  /** Avisos de sistema activos AHORA MISMO. Una llamada nueva a notify()
   *  siempre sustituye por completo al grupo anterior (aunque no le haya
   *  dado tiempo a desaparecer solo) — nunca se acumulan de una llamada
   *  a otra. Para mostrar varios a la vez desde el mismo evento, se pasan
   *  varios textos en una sola llamada: notify('A', 'B'). No se persiste. */
  private readonly _messages = signal<SystemMessage[]>([]);
  readonly systemMessages = this._messages.asReadonly();
  private nextMessageId = 0;
  private messageTimer: ReturnType<typeof setTimeout> | undefined;

  readonly missionStatus = computed<MissionStatus>(() => {
    const f = this._flags();
    if (f.missionComplete) return 'COMPLETE';
    if (f.destinationIdentified || f.vehicleProfileUnlocked) return 'IN_PROGRESS';
    if (f.investigationOpened || f.missionBriefingUnlocked) return 'ACTIVE';
    return 'STANDBY';
  });

  setFlag(key: keyof Omit<GameFlags, 'collectedValues' | 'elisaLevel'>): void {
    this._flags.update((f) => ({ ...f, [key]: true }));
    this.persistFlags();
  }

  raiseElisaLevel(level: GameFlags['elisaLevel']): void {
    this._flags.update((f) => ({
      ...f,
      elisaLevel: level > f.elisaLevel ? level : f.elisaLevel,
    }));
    this.persistFlags();
  }

  collectValue(key: string, value: string): void {
    this._flags.update((f) => ({
      ...f,
      collectedValues: { ...f.collectedValues, [key]: value },
    }));
    this.persistFlags();
  }

  illuminate(...ids: IlluminatableId[]): void {
    this._illuminated.update((set) => {
      const next = new Set(set);
      ids.forEach((id) => next.add(id));
      return next;
    });
    this.persistIlluminated();
  }

  clearIllumination(id: IlluminatableId): void {
    if (!this._illuminated().has(id)) return;
    this._illuminated.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
    this.persistIlluminated();
  }

  isIlluminated(id: IlluminatableId): boolean {
    return this._illuminated().has(id);
  }

  /** Muestra uno o varios avisos a la vez, sustituyendo cualquier grupo
   *  anterior que siga visible. Uso: notify('TEXTO') o
   *  notify('TEXTO 1', 'TEXTO 2') para que aparezcan juntos. */
  notify(...texts: string[]): void {
    clearTimeout(this.messageTimer);
    this._messages.set(texts.map((text) => ({ id: this.nextMessageId++, text })));
    this.messageTimer = setTimeout(() => {
      this._messages.set([]);
    }, GameStateService.TOAST_DURATION_MS);
  }

  dismissMessages(): void {
    clearTimeout(this.messageTimer);
    this._messages.set([]);
  }

  resetGame(): void {
    this._flags.set(initialFlags);
    this._illuminated.set(new Set());
    this._messages.set([]);
    clearTimeout(this.messageTimer);
    this.persistFlags();
    this.persistIlluminated();
  }

  private persistFlags(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._flags()));
    } catch {
      // localStorage lleno o no disponible: degradamos en silencio.
    }
  }

  private persistIlluminated(): void {
    try {
      localStorage.setItem(ILLUMINATION_KEY, JSON.stringify([...this._illuminated()]));
    } catch {
      // idem
    }
  }
}