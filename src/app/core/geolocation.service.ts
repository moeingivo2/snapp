import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { LatLng } from './models';

export type GeoErrorCode = 'UNSUPPORTED' | 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'TIMEOUT';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  getCurrentPosition(): Observable<LatLng> {
    return new Observable<LatLng>((subscriber) => {
      if (!('geolocation' in navigator)) {
        subscriber.error('UNSUPPORTED');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          subscriber.next({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          subscriber.complete();
        },
        (err) => subscriber.error(this.toErrorCode(err)),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
      );
    });
  }

  private toErrorCode(err: GeolocationPositionError): GeoErrorCode {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return 'PERMISSION_DENIED';
      case err.TIMEOUT:
        return 'TIMEOUT';
      default:
        return 'UNAVAILABLE';
    }
  }
}