import { Routes } from '@angular/router';
import { Boot } from './features/boot/boot';
import { Login } from './features/auth/login/login';
import { AppShell } from './core/app-shell/app-shell';
import { Home } from './features/home/home';
import { More } from './features/more/more';
import { ModulePlaceholder } from './features/module-placeholder/module-placeholder';
import { authGuard } from './core/auth-guard';
import { ChartsHome } from './features/charts/charts-home/charts-home';
import { AirportCharts } from './features/charts/airport-charts/airport-charts';
import { ApproachPlate } from './features/charts/approach-plate/approach-plate';
import { AirportInfoHome } from './features/airport-info/airport-info-home/airport-info-home';
import { AirportInfoDetail } from './features/airport-info/airport-info-detail/airport-info-detail';
import { moduleGuard } from './core/module-guard';
import { Aircraft } from './features/aircraft/aircraft/aircraft';
import { Ofp } from './features/ofp/ofp/ofp';
import { Crew } from './features/crew/crew/crew';
import { FlightPlan } from './features/flight-plan/flight-plan/flight-plan';
import { DocumentsHome } from './features/documents/documents-home/documents-home';
import { DocumentDetail } from './features/documents/document-detail/document-detail';
import { Briefing } from './features/briefing/briefing/briefing';
import { Final } from './features/final/final/final';
import { WeatherHome } from './features/weather/weather-home/weather-home';
import { WeatherDetail } from './features/weather/weather-detail/weather-detail';
import { AerodromePlate } from './features/charts/aerodrome-plate/aerodrome-plate';
import { ProcedurePlate } from './features/charts/procedure-plate/procedure-plate';
import { NotamList } from './features/notams/notam-list/notam-list';
export const routes: Routes = [
  { path: 'boot', component: Boot },
  { path: 'login', component: Login },
  { path: 'final', component: Final },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      { path: '', component: Home },
      { path: 'more', component: More },
      { path: 'ofp', component: Ofp, data: { moduleId: 'ofp' }, canActivate: [moduleGuard] },
      { path: 'flight-plan', component: FlightPlan, data: { moduleId: 'flightPlan' }, canActivate: [moduleGuard] },
      { path: 'weather', component: WeatherHome },
      { path: 'weather/:icao', component: WeatherDetail },
      { path: 'documents', component: DocumentsHome },
      { path: 'documents/:id', component: DocumentDetail },
      { path: 'notams', component: NotamList },
      { path: 'charts', component: ChartsHome },
      { path: 'charts/:icao', component: AirportCharts },
      { path: 'charts/:icao/approach', component: ApproachPlate },
      { path: 'charts/:icao/aerodrome', component: AerodromePlate },
      { path: 'charts/:icao/sid', component: ProcedurePlate, data: { kind: 'SID' } },
      { path: 'charts/:icao/star', component: ProcedurePlate, data: { kind: 'STAR' } },      { path: 'airports', component: AirportInfoHome },
      { path: 'airports/:icao', component: AirportInfoDetail },      
      { path: 'briefing', component: Briefing, data: { moduleId: 'briefing' }, canActivate: [moduleGuard] },
      { path: 'aircraft', component: Aircraft, data: { moduleId: 'aircraft' }, canActivate: [moduleGuard] },
      { path: 'performance', component: ModulePlaceholder, data: { label: 'PERFORMANCE' } },
      { path: 'weight-balance', component: ModulePlaceholder, data: { label: 'WEIGHT & BALANCE' } },
      { path: 'crew', component: Crew },
      { path: 'logbook', component: ModulePlaceholder, data: { label: 'LOGBOOK' } },
      { path: 'notes', component: ModulePlaceholder, data: { label: 'NOTES' } },
      { path: 'mission', component: ModulePlaceholder, data: { label: 'MISSION' } },
      { path: 'ground-operations', component: ModulePlaceholder, data: { label: 'GROUND OPERATIONS' } },
      { path: 'vehicle', component: ModulePlaceholder, data: { label: 'VEHICLE' } },
      { path: 'settings', component: ModulePlaceholder, data: { label: 'SETTINGS' } },
    ],
  },
];