/**
 * PUZZLE ENGINE (esqueleto)
 * ---------------------------
 * Deliberadamente pequeño y genérico por ahora. Define la forma común
 * (Puzzle) y el comportamiento de comprobar respuesta + revelar pistas,
 * para que la UX de "intenta una respuesta / pide una pista" sea
 * consistente en toda la app sin que cada módulo la reinvente.
 */

export interface Puzzle {
  id: string;
  /** Comparación normalizada: recortada, sin mayúsculas, espacios colapsados. */
  answer: string;
  hints: [string, string, string]; // HINT 1 / HINT 2 / HINT 3 (doc §18)
  /** Flags a activar al resolverse — las resuelve quien llama, no este motor. */
  onSolveFlags: string[];
}

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function checkAnswer(puzzle: Puzzle, attempt: string): boolean {
  return normalize(attempt) === normalize(puzzle.answer);
}

export interface HintState {
  revealed: 0 | 1 | 2 | 3;
}

export function nextHint(puzzle: Puzzle, state: HintState): string | null {
  if (state.revealed === 3) return null;
  return puzzle.hints[state.revealed] ?? null;
}