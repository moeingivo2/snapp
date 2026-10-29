import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, map, mergeMap, throwError, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import type { Driver, Place, Ride, RideOption, RideStatus, ServiceType } from './models';

const FAKE_CODE = '12345';
const LATENCY_MS = 450;
const RIDE_STORAGE_KEY = 'snapp_demo_rides';
const SERVICES: { type: ServiceType; title: string; factor: number }[] = [
  { type: 'eco', title: 'اسنپ اکو', factor: 1 },
  { type: 'plus', title: 'اسنپ پلاس', factor: 1.35 },
  { type: 'bike', title: 'اسنپ موتور', factor: 0.7 },
];
interface RideEntry { ride: Ride; createdAt: number; acceptedAt?: number }

function loadRides(): Map<string, RideEntry> {
  try {
    const list = JSON.parse(localStorage.getItem(RIDE_STORAGE_KEY) ?? '[]') as RideEntry[];
    return new Map(list.map((entry) => [entry.ride.id, entry]));
  } catch { return new Map(); }
}
function saveRides(rides: Map<string, RideEntry>): void {
  try { localStorage.setItem(RIDE_STORAGE_KEY, JSON.stringify([...rides.values()])); } catch {}
}
function ok(body: unknown): Observable<HttpEvent<unknown>> {
  return timer(LATENCY_MS).pipe(map(() => new HttpResponse({ status: 200, body })));
}
function fail(status: number, error: unknown): Observable<HttpEvent<unknown>> {
  return timer(LATENCY_MS).pipe(mergeMap(() => throwError(() => new HttpErrorResponse({ status, error }))));
}
function estimatePrices(distance: number, duration: number): RideOption[] {
  const base = 15000 + (distance / 1000) * 4000 + (duration / 60) * 500;
  return SERVICES.map((service) => ({
    type: service.type,
    title: service.title,
    price: Math.round((base * service.factor) / 500) * 500,
    etaMinutes: 2 + Math.floor(Math.random() * 6),
  }));
}
function statusByTime(entry: RideEntry): RideStatus {
  if (!entry.acceptedAt) return 'searching';
  const seconds = (Date.now() - entry.acceptedAt) / 1000;
  if (seconds < 4) return 'accepted';
  if (seconds < 8) return 'arrived';
  if (seconds < 28) return 'onboard';
  return 'finished';
}
function driverFor(ride: Ride, details: { name: string; car: string; plate: string }): Driver {
  return { ...details, rating: 4.9, position: { lat: ride.origin.position.lat + 0.002, lng: ride.origin.position.lng + 0.002 } };
}

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMock || !req.url.startsWith(environment.apiUrl)) return next(req);

  const path = req.url.slice(environment.apiUrl.length);
  const key = `${req.method} ${path}`;
  const rides = loadRides();

  if (req.method === 'POST' && path === '/driver/rides/list') {
    const { phone } = req.body as { phone: string };
    const results: Ride[] = [];
    for (const entry of rides.values()) {
      if (entry.ride.status === 'cancelled' || entry.ride.status === 'finished') continue;
      if (!entry.acceptedAt) results.push(entry.ride);
      else if (entry.ride.driverPhone === phone) {
        entry.ride = { ...entry.ride, status: statusByTime(entry) };
        results.push(entry.ride);
      }
    }
    saveRides(rides);
    return ok(results);
  }

  const acceptMatch = path.match(/^\/rides\/([\w-]+)\/accept$/);
  if (acceptMatch && req.method === 'POST') {
    const entry = rides.get(acceptMatch[1]);
    if (!entry || entry.ride.status !== 'searching' || entry.acceptedAt) return fail(409, { message: 'RIDE_UNAVAILABLE' });
    const driver = req.body as { phone: string; name: string; car: string; plate: string };
    entry.acceptedAt = Date.now();
    entry.ride = { ...entry.ride, status: 'accepted', driverPhone: driver.phone, driver: driverFor(entry.ride, driver) };
    rides.set(entry.ride.id, entry);
    saveRides(rides);
    return ok(entry.ride);
  }

  const rideMatch = path.match(/^\/rides\/([\w-]+)(\/cancel)?$/);
  if (rideMatch && path !== '/rides/estimate') {
    const entry = rides.get(rideMatch[1]);
    if (!entry) return fail(404, { message: 'RIDE_NOT_FOUND' });
    if (rideMatch[2] && req.method === 'POST') entry.ride = { ...entry.ride, status: 'cancelled' };
    else if (entry.ride.status !== 'cancelled') entry.ride = { ...entry.ride, status: statusByTime(entry) };
    rides.set(entry.ride.id, entry);
    saveRides(rides);
    return ok(entry.ride);
  }

  switch (key) {
    case 'POST /auth/otp': return ok({});
    case 'POST /auth/verify': {
      const { phone, code } = req.body as { phone: string; code: string };
      return code === FAKE_CODE ? ok({ token: `fake-token-${phone}` }) : fail(400, { message: 'INVALID_CODE' });
    }
    case 'POST /rides/estimate': {
      const { distance, duration } = req.body as { distance: number; duration: number };
      return ok(estimatePrices(distance, duration));
    }
    case 'POST /rides': {
      const { origin, destination, type, price, passengerName } = req.body as {
        origin: Place; destination: Place; type: ServiceType; price: number; passengerName: string;
      };
      const service = SERVICES.find((item) => item.type === type) ?? SERVICES[0];
      const ride: Ride = {
        id: crypto.randomUUID(), status: 'searching', origin, destination, passengerName,
        option: { type: service.type, title: service.title, price, etaMinutes: 0 },
      };
      rides.set(ride.id, { ride, createdAt: Date.now() });
      saveRides(rides);
      return ok(ride);
    }
    default:
      console.warn('[MOCK] مسیر تعریف نشده:', key);
      return fail(404, { message: 'MOCK_NOT_FOUND' });
  }
};
