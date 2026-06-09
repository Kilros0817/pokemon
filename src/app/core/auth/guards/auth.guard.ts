// src/app/core/auth/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard - Protects routes that require authentication
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkUserSession$().pipe(
    map(user => {
      if (user) return true;
      return router.createUrlTree(['/auth/signin']);
    })
  );
};
