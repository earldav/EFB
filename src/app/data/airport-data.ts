import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

export interface AirportRecord {
  icao: string;
  iata: string;
  name: string;
  city: string;
  state: string;
  country: string;
  elevation: number;
  lat: number;
  lon: number;
  tz: string;
}

/** El JSON de origen es un objeto { "LEVC": {...}, "LIMC": {...}, ... },
 *  lo tipamos así antes de convertirlo a array para buscar. */
type RawAirportsFile = Record<string, AirportRecord>;

@Injectable({ providedIn: 'root' })
export class AirportDataService {
  private http = inject(HttpClient);

  /** shareReplay(1) = se descarga una sola vez, todas las pantallas
   *  que lo pidan después reciben el mismo dato ya en memoria. */
  private readonly all$: Observable<AirportRecord[]> = this.http
    .get<RawAirportsFile>('data/airports.json')
    .pipe(
      map((raw) => Object.values(raw)),
      shareReplay(1)
    );

  getAll(): Observable<AirportRecord[]> {
    return this.all$;
  }

  /** Busca por ICAO, IATA, nombre o ciudad (case-insensitive).
   *  Limita a 20 resultados para no reventar la lista en pantalla. */
  search(query: string): Observable<AirportRecord[]> {
    const q = query.trim().toLowerCase();
    return this.all$.pipe(
      map((airports) => {
        if (!q) return [];
        return airports
          .filter(
            (a) =>
              a.icao?.toLowerCase().includes(q) ||
              a.iata?.toLowerCase().includes(q) ||
              a.name?.toLowerCase().includes(q) ||
              a.city?.toLowerCase().includes(q)
          )
          .slice(0, 20);
      })
    );
  }

  getByIcao(icao: string): Observable<AirportRecord | undefined> {
    const code = icao.trim().toUpperCase();
    return this.all$.pipe(map((airports) => airports.find((a) => a.icao === code)));
  }
}