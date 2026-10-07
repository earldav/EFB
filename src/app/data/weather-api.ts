import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
export type WeatherIconType = 'clear' | 'cloud' | 'rain' | 'snow' | 'fog' | 'storm';

export interface CurrentConditions {
  observedAt: string;
  temperatureC: number;
  dewpointC: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windGustKmh: number;
  weatherCode: number;
  cloudCoverPercent: number;
  visibilityM: number;
  qnhHpa: number;
}

export interface ForecastPeriod {
  timeIso: string;
  temperatureC: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  weatherCode: number;
  cloudCoverPercent: number;
  visibilityM: number;
}

export type Freshness = 'LIVE' | 'STATIC';

export interface WeatherResult {
  current: CurrentConditions;
  forecast: ForecastPeriod[];
  freshness: Freshness;
}

/** Coordenadas reales de la base — util para el teaser de Home sin
 *  tener que esperar a que cargue el dataset completo de aeropuertos. */
export const LEVC_COORDS = { lat: 39.4893, lon: -0.4816 };

const FALLBACK_CURRENT: CurrentConditions = {
  observedAt: new Date().toISOString(),
  temperatureC: 22,
  dewpointC: 12,
  windSpeedKmh: 10,
  windDirectionDeg: 90,
  windGustKmh: 0,
  weatherCode: 1,
  cloudCoverPercent: 20,
  visibilityM: 10000,
  qnhHpa: 1015,
};

const FALLBACK_FORECAST: ForecastPeriod[] = [6, 12, 18, 24].map((h) => ({
  timeIso: new Date(Date.now() + h * 3600_000).toISOString(),
  temperatureC: 22,
  windSpeedKmh: 10,
  windDirectionDeg: 90,
  weatherCode: 1,
  cloudCoverPercent: 20,
  visibilityM: 10000,
}));

@Injectable({ providedIn: 'root' })
export class WeatherApiService {
  private http = inject(HttpClient);

  /** Un observable en cache por ICAO — igual que hicimos con los datos
   *  de aeropuerto, para no repetir la peticion si se visita dos veces. */
  private cache = new Map<string, Observable<WeatherResult>>();

  getConditions(icao: string, lat: number, lon: number): Observable<WeatherResult> {
    if (!this.cache.has(icao)) {
      this.cache.set(icao, this.fetchConditions(lat, lon));
    }
    return this.cache.get(icao)!;
  }

  /** Atajo para el teaser de Home (siempre LEVC). */
  getLevcConditions(): Observable<WeatherResult> {
    return this.getConditions('LEVC', LEVC_COORDS.lat, LEVC_COORDS.lon);
  }

  private fetchConditions(lat: number, lon: number): Observable<WeatherResult> {
    return this.http
      .get<any>(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,dew_point_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,cloud_cover,visibility,pressure_msl` +
          `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,cloud_cover,visibility` +
          `&forecast_days=2&timezone=UTC`
      )
      .pipe(
        map((res) => {
          const c = res.current;
          const current: CurrentConditions = {
            observedAt: c.time,
            temperatureC: c.temperature_2m,
            dewpointC: c.dew_point_2m,
            windSpeedKmh: c.wind_speed_10m,
            windDirectionDeg: c.wind_direction_10m,
            windGustKmh: c.wind_gusts_10m ?? 0,
            weatherCode: c.weather_code,
            cloudCoverPercent: c.cloud_cover,
            visibilityM: c.visibility ?? 10000,
            qnhHpa: c.pressure_msl ?? 1013,
          };
          const forecast = this.buildForecastPeriods(res.hourly, c.time);
          return { current, forecast, freshness: 'LIVE' as Freshness };
        }),
        shareReplay(1),
        catchError(() =>
          of({ current: FALLBACK_CURRENT, forecast: FALLBACK_FORECAST, freshness: 'STATIC' as Freshness })
        )
      );
  }

  private buildForecastPeriods(hourly: any, currentTimeIso: string): ForecastPeriod[] {
    const times: string[] = hourly.time;
    const nowIndex = times.findIndex((t) => t >= currentTimeIso);
    const baseIndex = nowIndex === -1 ? 0 : nowIndex;

    return [6, 12, 18, 24].map((offset) => {
      const i = Math.min(baseIndex + offset, times.length - 1);
      return {
        timeIso: times[i],
        temperatureC: hourly.temperature_2m[i],
        windSpeedKmh: hourly.wind_speed_10m[i],
        windDirectionDeg: hourly.wind_direction_10m[i],
        weatherCode: hourly.weather_code[i],
        cloudCoverPercent: hourly.cloud_cover[i],
        visibilityM: hourly.visibility?.[i] ?? 10000,
      };
    });
  }
}

export function classifyFlightCategory(visibilityM: number, cloudCoverPercent: number): FlightCategory {
  const visSM = visibilityM / 1609.34;
  let category: FlightCategory;
  if (visSM >= 5) category = 'VFR';
  else if (visSM >= 3) category = 'MVFR';
  else if (visSM >= 1) category = 'IFR';
  else category = 'LIFR';

  if (cloudCoverPercent >= 90 && category === 'VFR') category = 'MVFR';
  return category;
}

export function getWeatherIconType(weatherCode: number): WeatherIconType {
  if ([0].includes(weatherCode)) return 'clear';
  if ([1, 2, 3].includes(weatherCode)) return 'cloud';
  if ([45, 48].includes(weatherCode)) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snow';
  if ([95, 96, 99].includes(weatherCode)) return 'storm';
  return 'cloud';
}