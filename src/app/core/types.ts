export type MissionStatus = 'STANDBY' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETE';

export interface GameFlags {
  // --- boot / auth ---
  bootComplete: boolean;
  authenticated: boolean;

  // --- exploracion ---
  homeVisited: boolean;
  flightPlanViewed: boolean;
  weatherViewed: boolean;
  airportLEVCViewed: boolean;
  airportLIMCViewed: boolean;
  crewProfileElisaViewed: boolean;

  // --- operacion: hay vuelo asignado o no ---
  flightAssigned: boolean;

  // --- cadena de descubrimiento (ver documento de diseño Charts->Aircraft->...) ---
  aircraftUnlocked: boolean;
  ofpUnlocked: boolean;
  flightPlanUnlocked: boolean;
  crewProfileUnlocked: boolean; // se activa al pulsar el enlace en Aircraft
  crewConfirmed: boolean;
  destinationCardTriggered: boolean; // se activa al pulsar la tarjeta de destino en Flight Plan
  groundArrangementsTriggered: boolean; // se activa al pulsar la referencia GND en Airport Info (LIMC)
  groundArrangementsRead: boolean; // se activa al ABRIR el documento GND-4471 y verlo

  // --- anomalias / investigacion ---
  anomalyFound_flightPlan: boolean;
  anomalyFound_documents: boolean;
  anomalyFound_crew: boolean;
  investigationOpened: boolean;

  // --- mision ---
  missionBriefingUnlocked: boolean;
  restrictedDocument_CREW_NOTE_003_unlocked: boolean;

  // --- tierra / vehiculo ---
  groundOperationsUnlocked: boolean;
  vehicleProfileUnlocked: boolean;
  northernItalyUnlocked: boolean;

  // --- puzzle de destino ---
  geographicPuzzleSolved: boolean;
  destinationIdentified: boolean;

  // --- hilo emocional de elisa (niveles 1-6, doc §13) ---
  elisaLevel: 1 | 2 | 3 | 4 | 5 | 6;

  // --- final ---
  finalMessageViewed: boolean;
  missionComplete: boolean;

  collectedValues: Record<string, string>;
}

export const initialFlags: GameFlags = {
  bootComplete: false,
  authenticated: false,
  homeVisited: false,
  flightPlanViewed: false,
  weatherViewed: false,
  airportLEVCViewed: false,
  airportLIMCViewed: false,
  crewProfileElisaViewed: false,
  flightAssigned: false,
  aircraftUnlocked: false,
  ofpUnlocked: false,
  flightPlanUnlocked: false,
  crewProfileUnlocked: false,
  crewConfirmed: false,
  destinationCardTriggered: false,
  groundArrangementsTriggered: false,
  groundArrangementsRead: false,
  anomalyFound_flightPlan: false,
  anomalyFound_documents: false,
  anomalyFound_crew: false,
  investigationOpened: false,
  missionBriefingUnlocked: false,
  restrictedDocument_CREW_NOTE_003_unlocked: false,
  groundOperationsUnlocked: false,
  vehicleProfileUnlocked: false,
  northernItalyUnlocked: false,
  geographicPuzzleSolved: false,
  destinationIdentified: false,
  elisaLevel: 1,
  finalMessageViewed: false,
  missionComplete: false,
  collectedValues: {},
};

export type ModuleId =
  | 'ofp'
  | 'flightPlan'
  | 'weather'
  | 'notams'
  | 'charts'
  | 'map'
  | 'airports'
  | 'briefing'
  | 'aircraft'
  | 'performance'
  | 'weightBalance'
  | 'documents'
  | 'crew'
  | 'logbook'
  | 'notes'
  | 'mission'
  | 'groundOperations'
  | 'vehicle'
  | 'settings';

  /** Modulos que pueden "iluminarse" cuando aparece contenido nuevo que el
 *  jugador aun no ha visto (ver documento de diseño: Aircraft, Crew,
 *  Flight Plan, Airport Info, Docs, Briefing... e incluso Home). Es un
 *  superset de ModuleId porque Home no es un "modulo" en el registry
 *  pero tambien necesita poder iluminarse. */
export type IlluminatableId = ModuleId | 'home' | 'homeStatus' | 'homeCrew';