import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonContent, IonInput, IonSpinner, IonText, NavController } from '@ionic/angular';
import { AuthService } from '../core/auth.service';
import { toEnDigits } from '../core/digits';

const RESEND_SECONDS = 30;

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [IonContent, IonInput, IonButton, IonText, IonSpinner, ReactiveFormsModule],
})
export class LoginPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly nav = inject(NavController);

  readonly step = signal<'phone' | 'code'>('phone');
  readonly loading = signal(false);
  readonly codeError = signal(false);
  readonly countdown = signal(0);

  readonly phone = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      (control) => /^09\d{9}$/.test(toEnDigits(String(control.value))) ? null : { pattern: true },
    ],
  });

  readonly code = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      (control) => /^\d{5}$/.test(toEnDigits(String(control.value))) ? null : { pattern: true },
    ],
  });

  private timerId?: ReturnType<typeof setInterval>;

  sendCode() {
    if (this.phone.invalid) {
      this.phone.markAsTouched();
      return;
    }
    this.loading.set(true);
    const phone = toEnDigits(this.phone.value).trim();
    this.auth.requestOtp(phone).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('code');
        this.startCountdown();
      },
      error: () => this.loading.set(false),
    });
  }

  verify() {
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }
    this.loading.set(true);
    this.codeError.set(false);
    const phone = toEnDigits(this.phone.value).trim();
    const code = toEnDigits(this.code.value).trim();
    this.auth.verifyOtp(phone, code).subscribe({
      next: () => {
        this.loading.set(false);
        const profile = this.auth.loadProfile(phone);
        if (profile) {
          this.nav.navigateRoot(profile.role === 'driver' ? '/driver' : '/home');
        } else {
          this.nav.navigateRoot('/register', { queryParams: { phone } });
        }
      },
      error: () => {
        this.loading.set(false);
        this.codeError.set(true);
      },
    });
  }

  editPhone() {
    clearInterval(this.timerId);
    this.countdown.set(0);
    this.code.reset();
    this.codeError.set(false);
    this.step.set('phone');
  }

  private startCountdown() {
    clearInterval(this.timerId);
    this.countdown.set(RESEND_SECONDS);
    this.timerId = setInterval(() => {
      this.countdown.update((v) => v - 1);
      if (this.countdown() <= 0) {
        clearInterval(this.timerId);
      }
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.timerId);
  }
}
