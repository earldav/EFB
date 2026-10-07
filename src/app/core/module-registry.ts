import { ModuleId } from './types';

export interface ModuleDef {
  id: ModuleId;
  label: string;
  route: string;
  location: 'home' | 'more';
}

export const moduleRegistry: ModuleDef[] = [
  { id: 'ofp', label: 'OFP', route: '/ofp', location: 'more' },
  { id: 'flightPlan', label: 'FLIGHT PLAN', route: '/flight-plan', location: 'more' },
  { id: 'weather', label: 'WEATHER', route: '/weather', location: 'home' },
  { id: 'notams', label: 'NOTAMS', route: '/notams', location: 'more' },
  { id: 'charts', label: 'CHARTS', route: '/charts', location: 'more' },
  { id: 'airports', label: 'AIRPORT INFO', route: '/airports', location: 'more' },
  { id: 'briefing', label: 'BRIEFING', route: '/briefing', location: 'more' },
  { id: 'aircraft', label: 'AIRCRAFT', route: '/aircraft', location: 'more' },
  { id: 'performance', label: 'PERFORMANCE', route: '/performance', location: 'more' },
  { id: 'weightBalance', label: 'WEIGHT & BALANCE', route: '/weight-balance', location: 'more' },
  { id: 'crew', label: 'CREW', route: '/crew', location: 'more' },
  { id: 'logbook', label: 'LOGBOOK', route: '/logbook', location: 'more' },
  { id: 'notes', label: 'NOTES', route: '/notes', location: 'more' },
  { id: 'mission', label: 'MISSION', route: '/mission', location: 'more' },
  { id: 'groundOperations', label: 'GROUND OPERATIONS', route: '/ground-operations', location: 'more' },
  { id: 'vehicle', label: 'VEHICLE', route: '/vehicle', location: 'more' },
  { id: 'documents', label: 'DOCS', route: '/documents', location: 'home' },
  { id: 'settings', label: 'SETTINGS', route: '/settings', location: 'more' },
];