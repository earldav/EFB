/**
 * REAL DATA — datos reales del vuelo, no simulados. La matricula
 * (registration) se confirma mas cerca de la fecha (ver conversacion:
 * las aerolineas no asignan aeronave fisica con meses de antelacion).
 */
export const realFlightData = {
  operator: 'WIZZ AIR MALTA',
  operatorCode: 'W4', // codigo IATA comercial
  icaoAirlineCode: 'WMT',
  flightNumber: 'W4 7997',
  aircraftType: 'AIRBUS A321NEO',
  icaoTypeDesignator: 'A21N', // designador ICAO real del tipo de aeronave
  registration: null as string | null, // se rellena mas cerca de la fecha
  registrationStatus: 'TBD — ASSIGNED CLOSER TO DEPARTURE',
  departureIcao: 'LEVC',
  arrivalIcao: 'LIMC',
  departureIata: 'VLC',
  arrivalIata: 'MXP',
  flightTimeMinutes: 120,
  seatCount: 239,
  flightDate: '05 JUN 2027', // fecha real del vuelo
  stdUtc: '04:15', // 06:15 hora de Valencia (CEST, UTC+2): salida real
};


/** REAL DATA — limites certificados por Airbus para la variante de
 *  A321neo que usa Wizz Air (la mayor operadora del tipo). Fuente:
 *  Airbus Aircraft Characteristics - Airport and Maintenance Planning. */
export const a321neoWeightLimits = {
  maxTakeoffWeightKg: 97000,
  maxLandingWeightKg: 79200,
  maxZeroFuelWeightKg: 75600,
};

/** REAL DATA — masa estandar de pasajero IATA/ICAO (adulto + equipaje
 *  de mano) usada por defecto en Europa para calculo de payload. */
export const IATA_STANDARD_PAX_WEIGHT_KG = 84;