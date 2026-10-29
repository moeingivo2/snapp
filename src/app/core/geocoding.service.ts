import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type { LatLng } from './models';

interface NominatimReverse {
  error?: string;
  display_name?: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);

  reverse(pos: LatLng): Observable<string | null> {
    return this.http
      .get<NominatimReverse>('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'jsonv2',
          lat: pos.lat,
          lon: pos.lng,
          zoom: 18,
          'accept-language': 'fa',
        },
      })
      .pipe(map((res) => this.format(res)));
  }

  private format(res: NominatimReverse): string | null {
    if (res.error || !res.address) return null;

    const a = res.address;
    const parts = [
      a.road,
      a.neighbourhood ?? a.suburb ?? a.city_district,
      a.city ?? a.town ?? a.village,
    ].filter(Boolean);

    return parts.length ? parts.join('، ') : (res.display_name ?? null);
  }
}