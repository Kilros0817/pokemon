// src/app/core/auth/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard - Protects routes that require authentication
 * 
 * NOTE: This is a placeholder implementation.
 * For full AWS Amplify integration, follow the Developer Guide pattern.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // TODO: Implement real authentication check with AWS Amplify
  // For now, allow all access (development mode)
  console.warn('authGuard: Not implemented. Allowing access.');
  return true;

  // Real implementation would be:
  // return authService.checkUserSession$().pipe(
  //   map(user => {
  //     if (user) return true;
  //     return router.createUrlTree(['/auth/login']);
  //   })
  // );
};
