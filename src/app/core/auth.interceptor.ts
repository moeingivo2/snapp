import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NavController } from '@ionic/angular';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const nav = inject(NavController);

  const isApi = req.url.startsWith(environment.apiUrl);
  const token = auth.accessToken();

  const authReq =
    isApi && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (isApi && err instanceof HttpErrorResponse && err.status === 401 && auth.isLoggedIn()) {
        auth.logout();
        nav.navigateRoot('/login');
      }
      return throwError(() => err);
    }),
  );
};