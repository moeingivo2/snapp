import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isLoggedIn()
    ? router.createUrlTree([auth.profile()?.role === 'driver' ? '/driver' : '/home'])
    : true;
};

export const roleGuard = (role: 'driver' | 'passenger'): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  if (!auth.profile()) return router.createUrlTree(['/register'], { queryParams: { phone: auth.currentPhone() } });
  return auth.profile()?.role === role
    ? true
    : router.createUrlTree([auth.profile()?.role === 'driver' ? '/driver' : '/home']);
};

