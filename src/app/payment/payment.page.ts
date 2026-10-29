import { Component, inject, signal } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar, NavController } from '@ionic/angular';
import { RideService } from '../core/ride.service';

const PAID_KEY = 'snapp_paid_rides';

@Component({
  selector: 'app-payment',
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header><ion-toolbar color="primary"><ion-title>💳 پرداخت سفر</ion-title><ion-button slot="start" fill="clear" color="light" (click)="back()">بازگشت</ion-button></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      @if (ride(); as trip) {
        @if (trip.status === 'finished') {
        <main class="checkout">
          <div class="brand"><span>زیبال</span><small>پرداخت آنلاین · حالت نمایشی</small></div>
          <div class="amount"><small>مبلغ سفر اسنپ</small><strong>{{ trip.option.price.toLocaleString('fa-IR') }} <small>تومان</small></strong></div>
          @if (paid()) {
            <div class="success"><span>✅</span><strong>پرداخت نمایشی موفق بود</strong><p>این تراکنش آزمایشی است و پولی جابه‌جا نشده است.</p><ion-button expand="block" (click)="back()">بازگشت به سفر</ion-button></div>
          } @else {
            <div class="gateway-card"><span>💳</span><strong>درگاه پرداخت زیبال</strong><small>شبیه‌سازی رابط پرداخت برای پیش‌نمایش پروژه</small></div>
            <div class="demo-note">🔒 اطلاعات کارت وارد یا ارسال نمی‌شود؛ دکمهٔ زیر فقط پرداخت را در همین مرورگر آزمایشی ثبت می‌کند.</div>
            <ion-button expand="block" (click)="complete()">پرداخت آزمایشی</ion-button>
            <ion-button expand="block" fill="clear" color="medium" (click)="back()">بازگشت به سفر</ion-button>
          }
        </main>
        } @else {
          <div class="empty"><span>🚕</span><h2>این سفر هنوز تمام نشده است</h2><p>بعد از پایان سفر، پرداخت برای شما فعال می‌شود.</p><ion-button (click)="back()">بازگشت به سفر</ion-button></div>
        }
      } @else {
        <div class="empty"><span>🧾</span><h2>سفر تمام‌شده‌ای برای پرداخت ندارید</h2><p>پس از پایان سفر از پنل مسافر وارد صفحهٔ پرداخت شوید.</p><ion-button (click)="back()">بازگشت</ion-button></div>
      }
    </ion-content>
  `,
  styles: [`:host{display:block;color:#17352d}ion-content{--background:#f6f9f7}ion-toolbar{--background:#00b96b;--color:#fff}.checkout{max-width:440px;margin:20px auto;background:#fff;border:1px solid #e5eee9;border-radius:22px;padding:20px;box-shadow:0 12px 32px #10352212}.brand{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 0 18px}.brand span{font-size:30px;color:#00a65e;font-weight:900}.brand small,.amount>small{color:#73857c}.amount{display:flex;align-items:center;justify-content:space-between;border-block:1px dashed #dce8e1;padding:16px 0}.amount strong{font-size:21px}.amount strong small{font-size:13px}.gateway-card{display:grid;justify-items:center;gap:8px;padding:24px 10px;margin:18px 0;background:linear-gradient(130deg,#00633a,#00b96b);color:white;border-radius:16px}.gateway-card span{font-size:30px}.gateway-card small{opacity:.85}.demo-note{padding:12px;margin-bottom:12px;border-radius:12px;background:#fff6df;color:#705300;font-size:12px;line-height:1.9}.success,.empty{display:grid;justify-items:center;gap:10px;text-align:center;padding:28px 4px}.success>span,.empty>span{font-size:44px}.success p,.empty p{color:#718179;font-size:13px;margin:0 0 8px}.success ion-button,.empty ion-button{width:100%}`],
})
export class PaymentPage {
  private readonly nav = inject(NavController);
  private readonly rides = inject(RideService);
  readonly ride = this.rides.current;
  readonly paid = signal(false);

  constructor() {
    const id = this.ride()?.id;
    try { this.paid.set(id ? (JSON.parse(localStorage.getItem(PAID_KEY) ?? '[]') as string[]).includes(id) : false); } catch {}
  }

  complete() {
    const ride = this.ride();
    if (!ride || ride.status !== 'finished') return;
    try {
      const paidIds = JSON.parse(localStorage.getItem(PAID_KEY) ?? '[]') as string[];
      if (!paidIds.includes(ride.id)) paidIds.push(ride.id);
      localStorage.setItem(PAID_KEY, JSON.stringify(paidIds));
      this.paid.set(true);
    } catch {}
  }

  back() { this.nav.navigateBack('/home'); }
}
