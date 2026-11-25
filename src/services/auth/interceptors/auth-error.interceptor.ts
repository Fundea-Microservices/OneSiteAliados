import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth.service';

/** Endpoints donde un 401 significa "credenciales inválidas", no "sesión expirada" */
const PUBLIC_ENDPOINTS = ['/aliado/login', '/aliado/verify-token'];

/**
 * Si el backend responde 401 (token expirado, revocado o inválido) se cierra la sesión
 * local y se redirige al login, para no seguir operando con un token que ya no sirve.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isPublic = PUBLIC_ENDPOINTS.some(endpoint => req.url.includes(endpoint));
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isPublic &&
        authService.isAuthenticated()
      ) {
        authService.logout('Tu sesión ha expirado. Inicia sesión nuevamente.');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
