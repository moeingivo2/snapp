import { Component, inject } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar, NavController } from '@ionic/angular';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-account',
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header><ion-toolbar color="primary"><ion-title>👤 حساب کاربری</ion-title><ion-button slot="start" fill="clear" color="light" (click)="back()">بازگشت</ion-button></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <section class="profile-card"><div class="avatar">{{ profile()?.role === 'driver' ? '🚗' : '👤' }}</div><div><h1>{{ profile()?.firstName }} {{ profile()?.lastName }}</h1><p>{{ profile()?.phone }}</p><span class="badge">{{ profile()?.role === 'driver' ? 'رانندهٔ اسنپ' : 'مسافر اسنپ' }}</span></div></section>
      @if (profile()?.role === 'driver') {
        <section class="info"><h2>🚘 اطلاعات خودرو</h2><p>خودرو: {{ profile()?.car || 'ثبت نشده' }}</p><p>پلاک: {{ profile()?.plate || 'ثبت نشده' }}</p></section>
        <ion-button expand="block" (click)="go('/driver')">ورود به پنل راننده</ion-button>
      } @else {
        <section class="info"><h2>🧳 پنل مسافر</h2><p>مبدأ 📍 و مقصد <span class="destination-pin">📍</span> را روی نقشه انتخاب و درخواست سفر ثبت کن.</p><p>بعد از پایان سفر، پرداخت نمایشی از پنل مسافر در دسترس است.</p></section>
        <ion-button expand="block" (click)="go('/home')">ورود به پنل مسافر</ion-button>
      }
      <ion-button expand="block" fill="outline" color="danger" (click)="logout()">خروج از حساب</ion-button>
    </ion-content>
  `,
  styles: [`:host{display:block;color:var(--sn-text)}ion-content{--background:var(--sn-background)}ion-toolbar{--background:var(--sn-surface);--color:var(--sn-text);position:relative}ion-toolbar ion-button{--color:var(--ion-color-primary);position:relative;z-index:2}ion-title{position:absolute;top:0;left:50%;height:100%;transform:translateX(-50%);width:calc(100% - 150px);max-width:calc(100% - 150px);flex:none;text-align:center;pointer-events:none}.profile-card,.info{display:flex;gap:16px;align-items:center;background:var(--sn-surface);border:1px solid var(--sn-border);border-radius:22px;padding:20px;margin:14px 0;box-shadow:var(--sn-shadow)}.avatar{display:grid;place-items:center;width:64px;height:64px;flex:none;border-radius:20px;background:var(--sn-soft);font-size:32px}.profile-card h1{font-size:19px;margin:0}.profile-card p,.info p{color:var(--sn-muted);font-size:13px;line-height:1.9;margin:7px 0}.badge{font-size:12px;color:var(--ion-color-primary);background:var(--sn-soft);padding:5px 9px;border-radius:20px}.info{display:block}.info h2{font-size:16px;margin:0 0 10px}ion-button{margin-top:12px}`],
})
export class AccountPage {
  private readonly auth = inject(AuthService);
  private readonly nav = inject(NavController);
  readonly profile = this.auth.profile;
  back() { this.nav.back(); }
  go(path: string) { this.nav.navigateRoot(path); }
  logout() { this.auth.logout(); this.nav.navigateRoot('/login'); }
}
