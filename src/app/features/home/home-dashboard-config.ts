import { ModuleId } from '../../core/types';

export interface DashboardCard {
  id: ModuleId;
  label: string;
  route: string;
  availableStatus: string;
  lockedStatus: string;
  availableDescription: string;
  lockedDescription: string;
}

/** Los 10 módulos que aparecen en el dashboard de Home, con su copy
 *  para cada uno de los dos estados posibles. Los bloqueados deben
 *  sonar secos y operacionales, nunca "amables". */
export const dashboardCards: DashboardCard[] = [
  {
    id: 'ofp',
    label: 'OFP',
    route: '/ofp',
    availableStatus: 'AVAILABLE',
    lockedStatus: 'NO ACTIVE FLIGHT',
    availableDescription: 'Operational Flight Plan.',
    lockedDescription: 'Operational Flight Plan unavailable. No active flight assignment.',
  },
  {
    id: 'flightPlan',
    label: 'FLIGHT PLAN',
    route: '/flight-plan',
    availableStatus: 'AVAILABLE',
    lockedStatus: 'NO ACTIVE FLIGHT',
    availableDescription: 'Route overview.',
    lockedDescription: 'No flight plan loaded.',
  },
  {
    id: 'charts',
    label: 'CHARTS',
    route: '/charts',
    availableStatus: 'AVAILABLE',
    lockedStatus: 'UNAVAILABLE',
    availableDescription: 'Worldwide navigation database. Database status: CURRENT.',
    lockedDescription: 'Charts unavailable.',
  },
  {
    id: 'airports',
    label: 'AIRPORT INFO',
    route: '/airports',
    availableStatus: 'AVAILABLE',
    lockedStatus: 'UNAVAILABLE',
    availableDescription: 'Airport database. Search by ICAO / IATA.',
    lockedDescription: 'Airport database unavailable.',
  },
  {
    id: 'notams',
    label: 'NOTAMS',
    route: '/notams',
    availableStatus: 'AVAILABLE',
    lockedStatus: 'NO ACTIVE FLIGHT',
    availableDescription: 'Aerodrome notices for the home base.',
    lockedDescription: 'NOTAMs unavailable. No active flight assignment.',
  },
  {
    id: 'weather',
    label: 'WEATHER',
    route: '/weather',
    availableStatus: 'AVAILABLE',
    lockedStatus: 'UNAVAILABLE',
    availableDescription: 'Weather services. Select location / airport.',
    lockedDescription: 'Weather services unavailable.',
  },
  {
    id: 'briefing',
    label: 'BRIEFING',
    route: '/briefing',
    availableStatus: 'AVAILABLE',
    lockedStatus: 'NO ACTIVE FLIGHT',
    availableDescription: 'Departure briefing.',
    lockedDescription: 'Briefing not generated. No active flight assignment.',
  },
  {
    id: 'crew',
    label: 'CREW',
    route: '/crew',
    availableStatus: 'AVAILABLE',
    lockedStatus: 'UNAVAILABLE',
    availableDescription: 'Crew manifest and profiles.',
    lockedDescription: 'Crew manifest unavailable.',
  },
  {
    id: 'aircraft',
    label: 'AIRCRAFT',
    route: '/aircraft',
    availableStatus: 'AVAILABLE',
    lockedStatus: 'NOT ASSIGNED',
    availableDescription: 'Assigned aircraft data.',
    lockedDescription: 'No aircraft currently associated with this crew member.',
  },
  {
    id: 'documents',
    label: 'DOCS',
    route: '/documents',
    availableStatus: 'AVAILABLE',
    lockedStatus: 'UNAVAILABLE',
    availableDescription: 'Company, crew and operational documentation.',
    lockedDescription: 'Documents unavailable.',
  },
];