import type { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'home', canActivate: [roleGuard('passenger')], loadComponent: () => import('./home/home.page').then((m) => m.HomePage) },
  { path: 'driver', canActivate: [roleGuard('driver')], loadComponent: () => import('./driver/driver.page').then((m) => m.DriverPage) },
  { path: 'account', canActivate: [authGuard], loadComponent: () => import('./account/account.page').then((m) => m.AccountPage) },
  { path: 'payment', canActivate: [roleGuard('passenger')], loadComponent: () => import('./payment/payment.page').then((m) => m.PaymentPage) },
  { path: 'register', canActivate: [authGuard], loadComponent: () => import('./register/register.page').then((m) => m.RegisterPage) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./login/login.page').then((m) => m.LoginPage) },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
