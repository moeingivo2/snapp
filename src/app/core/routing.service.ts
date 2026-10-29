import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type { LatLng, RouteInfo } from './models';

interface OsrmResponse {
  routes: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
}

@Injectable({ providedIn: 'root' })
export class RoutingService {
  private readonly http = inject(HttpClient);

  route(from: LatLng, to: LatLng): Observable<RouteInfo> {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    return this.http
      .get<OsrmResponse>(`https://router.project-osrm.org/route/v1/driving/${coords}`, {
        params: { overview: 'full', geometries: 'geojson' },
      })
      .pipe(
        map((res) => {
          const best = res.routes[0];
          return {
            coordinates: best.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
            distanceMeters: best.distance,
            durationSeconds: best.duration,
          };
        }),
      );
  }
}
