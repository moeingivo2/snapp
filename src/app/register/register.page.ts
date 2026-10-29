import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonButton, IonContent, IonInput, IonText, NavController } from '@ionic/angular';
import { AuthService } from '../core/auth.service';
import type { UserProfile, UserRole } from '../core/models';

@Component({
  selector: 'app-register',
  imports: [IonContent, IonInput, IonButton, IonText, ReactiveFormsModule],
  template: `
    <ion-content class="ion-padding">
      <div class="register">
        <div class="register-icon">{{ role === 'driver' ? '🚗' : '👤' }}</div>
        <h1>تکمیل ثبت‌نام</h1>
        <p class="subtitle">نوع حساب را انتخاب و اطلاعاتت را وارد کن.</p>
        <div class="role-picker">
          <button type="button" [class.active]="role === 'passenger'" (click)="role = 'passenger'">👤 مسافر</button>
          <button type="button" [class.active]="role === 'driver'" (click)="role = 'driver'">🚗 راننده</button>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <ion-input formControlName="firstName" label="نام" labelPlacement="floating" fill="outline" autocomplete="given-name"></ion-input>
          @if (form.controls.firstName.invalid && form.controls.firstName.touched) { <ion-text color="danger"><small>نام باید حداقل دو حرف داشته باشد.</small></ion-text> }
          <ion-input formControlName="lastName" label="نام خانوادگی" labelPlacement="floating" fill="outline" autocomplete="family-name"></ion-input>
          @if (form.controls.lastName.invalid && form.controls.lastName.touched) { <ion-text color="danger"><small>نام خانوادگی باید حداقل دو حرف داشته باشد.</small></ion-text> }
          @if (role === 'driver') {
            <ion-input formControlName="car" label="مدل و رنگ خودرو" labelPlacement="floating" fill="outline" placeholder="پژو ۲۰۶ سفید"></ion-input>
            <ion-input formControlName="plate" label="شماره پلاک" labelPlacement="floating" fill="outline" placeholder="۱۲ ب ۳۴۵ ایران ۷۷"></ion-input>
            @if (driverInfoMissing) { <ion-text color="danger"><small>مدل خودرو و پلاک را وارد کن.</small></ion-text> }
          }
          @if (saveError) { <ion-text color="danger"><small>ذخیره اطلاعات انجام نشد. فضای ذخیره‌سازی مرورگر را بررسی کن.</small></ion-text> }
          <ion-button expand="block" type="submit">ساخت حساب {{ role === 'driver' ? 'راننده' : 'مسافر' }}</ion-button>
        </form>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content{--background:#000;--color:#fff}
    .register{display:flex;min-height:100%;flex-direction:column;justify-content:center;gap:12px;color:#fff}
    .register-icon{display:grid;place-items:center;width:72px;height:72px;margin-bottom:8px;background:rgba(var(--ion-color-primary-rgb),.12);border-radius:22px;font-size:36px}
    h1{margin:0;font-weight:800;color:#00c878}.subtitle{margin:0 0 8px;color:#d1d5d3}
    .role-picker{display:grid;grid-template-columns:1fr 1fr;gap:8px}.role-picker button{padding:12px;border:1px solid #c9e5d5;border-radius:12px;background:#eaf6ef;color:#174b35;font:inherit;font-weight:600;cursor:pointer;transition:background .15s ease,color .15s ease,border-color .15s ease}.role-picker button.active{border-color:#008f50;background:#00a85a;color:#fff;font-weight:700}
    form{display:flex;flex-direction:column;gap:12px}ion-input{--background:#171717;--color:#fff;--border-color:#777;--highlight-color-focused:#00c878}ion-button{margin-top:8px}
  `],
})
export class RegisterPage {
  private readonly nav = inject(NavController);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly phone = this.route.snapshot.queryParamMap.get('phone') ?? this.auth.currentPhone();
  role: UserRole = 'passenger';
  saveError = false;
  driverInfoMissing = false;

  readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    car: new FormControl('', { nonNullable: true }),
    plate: new FormControl('', { nonNullable: true }),
  });

  submit() {
    const firstName = this.form.controls.firstName.value.trim();
    const lastName = this.form.controls.lastName.value.trim();
    const car = this.form.controls.car.value.trim();
    const plate = this.form.controls.plate.value.trim();
    this.form.patchValue({ firstName, lastName, car, plate });
    this.driverInfoMissing = this.role === 'driver' && (!car || !plate);
    if (this.form.invalid || this.driverInfoMissing || !this.phone) {
      this.form.markAllAsTouched();
      return;
    }

    const profile: UserProfile = {
      firstName,
      lastName,
      phone: this.phone,
      role: this.role,
      ...(this.role === 'driver' ? { car, plate } : {}),
    };

    try {
      this.auth.saveProfile(profile);
      this.saveError = false;
      this.nav.navigateRoot(profile.role === 'driver' ? '/driver' : '/home');
    } catch {
      this.saveError = true;
    }
  }
}
