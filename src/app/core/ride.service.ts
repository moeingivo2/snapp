import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subscription, interval, startWith, switchMap, takeWhile, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import type { Place, Ride, RideOption, RouteInfo, ServiceType } from './models';

const POLL_MS = 3000;
const FINAL: Ride['status'][] = ['finished', 'cancelled'];

@Injectable({ providedIn: 'root' })
export class RideService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  private polling?: Subscription;

  readonly current = signal<Ride | null>(null);

  estimate(route: RouteInfo): Observable<RideOption[]> {
    return this.http.post<RideOption[]>(`${this.api}/rides/estimate`, {
      distance: route.distanceMeters,
      duration: route.durationSeconds,
    });
  }

  request(origin: Place, destination: Place, type: ServiceType, price: number, passengerName: string): Observable<Ride> {
    return this.http
      .post<Ride>(`${this.api}/rides`, { origin, destination, type, price, passengerName })
      .pipe(tap((ride) => this.track(ride)));
  }

  driverRides(phone: string): Observable<Ride[]> {
    return this.http.post<Ride[]>(`${this.api}/driver/rides/list`, { phone });
  }

  acceptRide(id: string, driver: { phone: string; name: string; car: string; plate: string }): Observable<Ride> {
    return this.http.post<Ride>(`${this.api}/rides/${id}/accept`, driver);
  }

  cancel(): Observable<Ride> | null {
    const ride = this.current();
    if (!ride) return null;
    return this.http
      .post<Ride>(`${this.api}/rides/${ride.id}/cancel`, {})
      .pipe(tap((r) => this.current.set(r)));
  }

  clear() {
    this.polling?.unsubscribe();
    this.current.set(null);
  }

  private track(ride: Ride) {
    this.polling?.unsubscribe();
    this.current.set(ride);
    this.polling = interval(POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.http.get<Ride>(`${this.api}/rides/${ride.id}`)),
        takeWhile((r) => !FINAL.includes(r.status), true),
      )
      .subscribe((r) => this.current.set(r));
  }
}
