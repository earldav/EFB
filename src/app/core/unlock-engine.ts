import { GameFlags, ModuleId } from './types';

const ALWAYS_UNLOCKED: ModuleId[] = [
  'charts',
  'airports',
  'weather',
  'notams',
  'crew',
  'documents',
  'performance',
  'weightBalance',
  'logbook',
  'notes',
  'settings',
];

export function isModuleUnlocked(moduleId: ModuleId, flags: GameFlags): boolean {
  if (ALWAYS_UNLOCKED.includes(moduleId)) return true;

  switch (moduleId) {
    case 'aircraft':
      return flags.aircraftUnlocked;
    case 'ofp':
      return flags.ofpUnlocked;
    case 'flightPlan':
      return flags.flightPlanUnlocked;
    case 'briefing':
      return flags.groundArrangementsRead;
    case 'mission':
      return flags.investigationOpened;
    case 'groundOperations':
      return flags.airportLIMCViewed && flags.anomalyFound_flightPlan;
    case 'vehicle':
      return flags.groundOperationsUnlocked;
    default:
      return false;
  }
}

const documentUnlockRules: Record<string, (flags: GameFlags) => boolean> = {
  'OPS-CREW-001': () => true,
  'OPS-NOTICE-002': () => true,
  'GND-4471': (flags) => flags.groundArrangementsTriggered,
};

export function isDocumentUnlocked(documentId: string, flags: GameFlags): boolean {
  return documentUnlockRules[documentId]?.(flags) ?? false;
}