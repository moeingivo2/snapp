import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  NavController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { car, locate, location, star } from 'ionicons/icons';
import { Subject, Subscription, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { GeocodingService } from '../core/geocoding.service';
import { GeoErrorCode, GeolocationService } from '../core/geolocation.service';
import type { LatLng, Place, RideOption, RideStatus, RouteInfo, ServiceType } from '../core/models';
import { RideService } from '../core/ride.service';
import { RoutingService } from '../core/routing.service';
import { MapComponent } from '../shared/map/map.component';

type Phase = 'origin' | 'destination' | 'review';

const FALLBACK_ADDRESS = 'نقطه‌ی انتخاب‌شده روی نقشه';

const GEO_MESSAGES: Record<GeoErrorCode, string> = {
  UNSUPPORTED: 'مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند.',
  PERMISSION_DENIED: 'دسترسی به موقعیت داده نشده است. از تنظیمات مرورگر اجازه بدهید.',
  UNAVAILABLE: 'موقعیت شما در دسترس نیست.',
  TIMEOUT: 'دریافت موقعیت بیش از حد طول کشید. دوباره تلاش کنید.',
};

const STATUS_LABELS: Record<RideStatus, string> = {
  searching: 'در حال یافتن راننده…',
  accepted: 'راننده در راه است',
  arrived: 'راننده رسید',
  onboard: 'در حال سفر',
  finished: 'سفر به پایان رسید',
  cancelled: 'سفر لغو شد',
};

const QUOTE_ERROR = 'محاسبه مسیر و قیمت ممکن نشد. دوباره تلاش کنید.';
const REQUEST_ERROR = 'ثبت درخواست سفر ممکن نشد.';
const CANCEL_ERROR = 'لغو سفر ممکن نشد.';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonFab,
    IonFabButton,
    IonFooter,
    IonIcon,
    IonSpinner,
    MapComponent,
  ],
})
export class HomePage {
  private readonly auth = inject(AuthService);
  private readonly nav = inject(NavController);
  private readonly geo = inject(GeolocationService);
  private readonly geocoding = inject(GeocodingService);
  private readonly routing = inject(RoutingService);
  private readonly toast = inject(ToastController);
  readonly rides = inject(RideService);

  private readonly mapRef = viewChild.required(MapComponent);
  private readonly centerChanges = new Subject<LatLng>();
  private quoteSub?: Subscription;

  readonly phase = signal<Phase>('origin');
  readonly origin = signal<Place | null>(null);
  readonly destination = signal<Place | null>(null);

  readonly center = signal<LatLng | null>(null);
  readonly address = signal<string | null>(null);
  readonly resolving = signal(false);

  readonly userPos = signal<LatLng | null>(null);
  readonly locating = signal(false);

  readonly route = signal<RouteInfo | null>(null);
  readonly options = signal<RideOption[]>([]);
  readonly selected = signal<ServiceType>('eco');
  readonly quoting = signal(false);
  readonly requesting = signal(false);
  readonly cancelling = signal(false);

  readonly selectedOption = computed(
    () => this.options().find((option) => option.type === this.selected()) ?? null,
  );
  readonly rideStatus = computed(() => this.rides.current()?.status ?? null);
  readonly statusLabel = computed(() => {
    const status = this.rideStatus();
    return status ? STATUS_LABELS[status] : null;
  });
  readonly hasActiveRide = computed(() => {
    const status = this.rideStatus();
    return status !== null && status !== 'finished' && status !== 'cancelled';
  });
  readonly showPin = computed(() => this.phase() !== 'review' && this.rideStatus() === null);

  constructor() {
    addIcons({ car, locate, location, star });

    this.centerChanges
      .pipe(
        tap(() => this.resolving.set(true)),
        debounceTime(600),
        switchMap((pos) => this.geocoding.reverse(pos).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((address) => {
        this.address.set(address);
        this.resolving.set(false);
      });
  }

  onCenterChange(pos: LatLng) {
    this.center.set(pos);
    if (this.phase() === 'review' || this.rideStatus() !== null) return;
    this.centerChanges.next(pos);
  }

  confirm() {
    const position = this.center();
    if (!position) return;

    const place: Place = { position, address: this.address() ?? FALLBACK_ADDRESS };

    if (this.phase() === 'origin') {
      this.origin.set(place);
      this.phase.set(this.destination() ? 'review' : 'destination');
    } else {
      this.destination.set(place);
      this.phase.set('review');
    }

    if (this.phase() === 'review') this.loadQuote();
  }

  editOrigin() {
    const old = this.origin();
    this.resetQuote();
    this.origin.set(null);
    this.phase.set('origin');
    if (old) this.mapRef().flyTo(old.position);
  }

  editDestination() {
    const old = this.destination();
    this.resetQuote();
    this.destination.set(null);
    this.phase.set('destination');
    if (old) this.mapRef().flyTo(old.position);
  }

  selectOption(type: ServiceType) {
    this.selected.set(type);
  }

  loadQuote() {
    const origin = this.origin();
    const destination = this.destination();
    if (!origin || !destination) return;

    this.resetQuote();
    this.quoting.set(true);

    this.quoteSub = this.routing
      .route(origin.position, destination.position)
      .pipe(
        tap((route) => this.route.set(route)),
        switchMap((route) => this.rides.estimate(route)),
      )
      .subscribe({
        next: (options) => {
          this.options.set(options);
          if (options.length && !options.some((option) => option.type === this.selected())) {
            this.selected.set(options[0].type);
          }
          this.quoting.set(false);
        },
        error: () => {
          this.quoting.set(false);
          this.showMessage(QUOTE_ERROR);
        },
      });
  }

  requestRide() {
    const origin = this.origin();
    const destination = this.destination();
    if (!origin || !destination || this.requesting() || this.hasActiveRide()) return;

    this.requesting.set(true);
    const profile = this.auth.profile();
    this.rides.request(
      origin,
      destination,
      this.selected(),
      this.selectedOption()?.price ?? 0,
      profile ? `${profile.firstName} ${profile.lastName}` : 'مسافر اسنپ',
    ).subscribe({
      next: () => this.requesting.set(false),
      error: () => {
        this.requesting.set(false);
        this.showMessage(REQUEST_ERROR);
      },
    });
  }

  cancelRide() {
    if (this.cancelling()) return;
    const request = this.rides.cancel();
    if (!request) return;

    this.cancelling.set(true);
    request.subscribe({
      next: () => this.cancelling.set(false),
      error: () => {
        this.cancelling.set(false);
        this.showMessage(CANCEL_ERROR);
      },
    });
  }

  dismissRide() {
    this.rides.clear();
  }

  newRide() {
    this.rides.clear();
    this.resetQuote();
    this.origin.set(null);
    this.destination.set(null);
    this.phase.set('origin');

    const center = this.center();
    if (center) this.centerChanges.next(center);
  }

  price(value: number) {
    return value.toLocaleString('fa-IR');
  }

  locateMe() {
    if (this.locating()) return;
    this.locating.set(true);

    this.geo.getCurrentPosition().subscribe({
      next: (pos) => {
        this.userPos.set(pos);
        this.locating.set(false);
      },
      error: (code: GeoErrorCode) => {
        this.locating.set(false);
        this.showMessage(GEO_MESSAGES[code]);
      },
    });
  }

  logout() {
    this.rides.clear();
    this.auth.logout();
    this.nav.navigateRoot('/login');
  }

  openAccount() {
    this.nav.navigateForward('/account');
  }

  pay() {
    this.nav.navigateForward('/payment');
  }


  private resetQuote() {
    this.quoteSub?.unsubscribe();
    this.quoteSub = undefined;
    this.route.set(null);
    this.options.set([]);
    this.quoting.set(false);
  }

  private async showMessage(message: string) {
    const toast = await this.toast.create({
      message,
      duration: 3500,
      position: 'top',
      color: 'dark',
    });
    await toast.present();
  }
}
