import { Component, OnDestroy, inject, signal } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar, NavController, ToastController } from '@ionic/angular';
import { Subscription, catchError, interval, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../core/auth.service';
import type { Ride } from '../core/models';
import { RideService } from '../core/ride.service';

@Component({
  selector: 'app-driver',
  imports: [IonButton, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar],
  template: `
    <ion-header><ion-toolbar color="primary"><ion-title>🚗 پنل راننده</ion-title><ion-button slot="end" fill="clear" color="light" (click)="account()">👤 حساب</ion-button></ion-toolbar></ion-header>
    <ion-content class="ion-padding driver-content">
      <section class="welcome"><span>🚘</span><div><h1>سلام {{ auth.profile()?.firstName || 'راننده' }}!</h1><p>درخواست‌های سفر را ببین و یکی را بپذیر.</p></div></section>
      @if (loading() && !requests().length && !active().length) { <div class="loading"><ion-spinner name="crescent"></ion-spinner> در حال بارگذاری سفرها…</div> }
      @if (active().length) {
        <div class="heading"><h2>سفرهای پذیرفته‌شده</h2></div>
        @for (ride of active(); track ride.id) {
          <article class="ride active"><div class="status">🟢 {{ statusText(ride.status) }}</div><h2>🧍 مسافر: {{ ride.passengerName || 'مسافر اسنپ' }}</h2><p>📍 مبدأ: {{ ride.origin.address }}</p><p><span class="destination-pin">📍</span> مقصد: {{ ride.destination.address }}</p><strong>💵 {{ price(ride.option.price) }} تومان</strong></article>
        }
      }
      <div class="heading"><h2>درخواست‌های سفر</h2><span>{{ requests().length.toLocaleString('fa-IR') }} درخواست</span></div>
      @for (ride of requests(); track ride.id) {
        <article class="ride"><div class="trip-line"><span>📍</span><p>{{ ride.origin.address }}</p></div><div class="trip-line"><span class="destination-pin">📍</span><p>{{ ride.destination.address }}</p></div><div class="ride-bottom"><strong>💵 {{ price(ride.option.price) }} تومان</strong><ion-button size="small" [disabled]="accepting()" (click)="accept(ride)">پذیرش سفر</ion-button></div></article>
      } @empty {
        @if (!active().length && !loading()) { <div class="empty"><span>🚕</span><strong>درخواست تازه‌ای نیست</strong><p>درخواست‌های جدید هر چند ثانیه بررسی می‌شوند.</p></div> }
      }
      <ion-button expand="block" fill="outline" (click)="refresh()">🔄 تازه‌سازی</ion-button>
    </ion-content>
  `,
  styles: [`
    :host{display:block;color:#fff}
    ion-content{--background:#000;--color:#fff}
    ion-toolbar{--background:#00b96b;--color:#fff}
    ion-title{font-weight:800}
    .driver-content{--padding-top:20px;--padding-bottom:28px;--padding-start:18px;--padding-end:18px}
    .welcome{display:flex;align-items:center;gap:16px;padding:20px;margin:2px 0 28px;background:#111;border:1px solid #303030;border-radius:20px}
    .welcome>span{display:grid;place-items:center;width:58px;height:58px;flex:none;background:#202720;border-radius:17px;font-size:34px}
    .welcome h1{margin:0;font-size:22px;color:#fff}
    .welcome p{margin:7px 0 0;color:#d0d0d0;font-size:14px;line-height:1.7}
    .heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:26px 0 14px;padding-bottom:11px;border-bottom:1px solid #383838}
    .heading h2{margin:0;color:#fff;font-size:17px;font-weight:750}
    .heading span{padding:5px 9px;color:#d0d0d0;background:#191919;border-radius:20px;font-size:12px;white-space:nowrap}
    .ride{margin:0 0 14px;padding:19px;background:#171717;color:#fff;border:1px solid #414141;border-radius:18px;box-shadow:0 7px 20px #0008}
    .ride.active{border-color:#00b96b;box-shadow:0 0 0 1px #00b96b33,0 7px 20px #0008}
    .status{margin-bottom:14px;padding-bottom:12px;color:#43d895;border-bottom:1px solid #343434;font-weight:700}
    .ride h2{margin:12px 0;color:#fff;font-size:16px;line-height:1.7}
    .ride p{margin:12px 0;color:#dedede;font-size:14px;line-height:1.8}
    .ride-bottom{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;padding-top:14px;border-top:1px solid #343434}
    .ride-bottom strong,.ride>strong{color:#43d895;white-space:nowrap}
    .trip-line{display:flex;align-items:flex-start;gap:12px;padding:4px 0}
    .trip-line span{width:24px;flex:none;text-align:center;font-size:18px}
    .destination-pin{filter:hue-rotate(115deg)}
    .trip-line p{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .empty{display:grid;justify-items:center;gap:10px;margin:16px 0;padding:30px 18px;text-align:center;color:#e1e1e1;background:#111;border:1px dashed #494949;border-radius:18px}
    .empty span{font-size:44px}
    .empty strong{font-size:15px}
    .empty p{margin:0;color:#ccc;font-size:13px;line-height:1.7}
    .loading{display:flex;align-items:center;justify-content:center;gap:12px;margin:16px 0;padding:22px;color:#ddd;background:#111;border-radius:16px}
    ion-content > ion-button{margin-top:12px;--border-radius:12px}
  `],
})
export class DriverPage implements OnDestroy {
  readonly auth = inject(AuthService);
  private readonly ridesService = inject(RideService);
  private readonly nav = inject(NavController);
  private readonly toast = inject(ToastController);
  readonly requests = signal<Ride[]>([]);
  readonly active = signal<Ride[]>([]);
  readonly loading = signal(true);
  readonly accepting = signal(false);
  private readonly polling: Subscription;

  constructor() {
    this.polling = interval(4000).pipe(
      startWith(0),
      switchMap(() => this.ridesService.driverRides(this.auth.profile()?.phone ?? '').pipe(catchError(() => of([] as Ride[])))),
    ).subscribe((rides) => {
      this.requests.set(rides.filter((ride) => ride.status === 'searching'));
      this.active.set(rides.filter((ride) => ride.status !== 'searching' && ride.status !== 'finished' && ride.status !== 'cancelled'));
      this.loading.set(false);
    });
  }

  refresh() {
    this.loading.set(true);
    this.ridesService.driverRides(this.auth.profile()?.phone ?? '').subscribe({
      next: (rides) => {
        this.requests.set(rides.filter((ride) => ride.status === 'searching'));
        this.active.set(rides.filter((ride) => ride.status !== 'searching' && ride.status !== 'finished' && ride.status !== 'cancelled'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  accept(ride: Ride) {
    const profile = this.auth.profile();
    if (!profile || this.accepting()) return;
    this.accepting.set(true);
    this.ridesService.acceptRide(ride.id, {
      phone: profile.phone,
      name: `${profile.firstName} ${profile.lastName}`,
      car: profile.car ?? 'خودروی شهری',
      plate: profile.plate ?? 'پلاک ثبت نشده',
    }).subscribe({
      next: (accepted) => {
        this.active.update((items) => [accepted, ...items]);
        this.requests.update((items) => items.filter((item) => item.id !== ride.id));
        this.accepting.set(false);
      },
      error: () => {
        this.accepting.set(false);
        void this.showMessage('این سفر دیگر در دسترس نیست. فهرست را تازه می‌کنم.');
        this.refresh();
      },
    });
  }

  account() { this.nav.navigateForward('/account'); }
  price(value: number) { return value.toLocaleString('fa-IR'); }
  statusText(status: Ride['status']) { return ({ accepted: 'در مسیر مبدأ', arrived: 'رسیدن به مبدأ', onboard: 'سفر در حال انجام' } as Partial<Record<Ride['status'], string>>)[status] ?? 'سفر فعال'; }
  private async showMessage(message: string) { const toast = await this.toast.create({ message, duration: 3000, position: 'top' }); await toast.present(); }
  ngOnDestroy() { this.polling.unsubscribe(); }
}
