// src/app/core/auth/guards/home.guard.ts
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Home Guard - Redirects authenticated users away from auth pages
 * 
 * NOTE: This is a placeholder implementation.
 * For full AWS Amplify integration, follow the Developer Guide pattern.
 */
export const homeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // TODO: Implement real authentication check with AWS Amplify
  // For now, allow access to login/signup pages
  console.warn('homeGuard: Not implemented. Allowing access.');
  return true;

  // Real implementation would be:
  // return authService.checkUserSession$().pipe(
  //   map(user => {
  //     if (!user) return true;
  //     return router.createUrlTree(['/']);
  //   })
  // );
};
