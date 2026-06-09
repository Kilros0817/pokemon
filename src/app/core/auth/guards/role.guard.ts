// src/app/core/auth/guards/role.guard.ts
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Role Guard - Checks if user has required role/feature access
 * 
 * NOTE: This is a placeholder implementation.
 * For full AWS Amplify integration, follow the Developer Guide pattern.
 * 
 * Usage in routes:
 * {
 *   path: 'admin',
 *   canActivate: [roleGuard],
 *   data: { requiredRoles: ['admin'] }
 * }
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // TODO: Implement real role check with AWS Amplify
  // For now, allow all access (development mode)
  console.warn('roleGuard: Not implemented. Allowing access.');
  return true;

  // Real implementation would be:
  // const requiredRoles = route.data['requiredRoles'] as string[] | undefined;
  // 
  // return authService.checkUserSession$().pipe(
  //   map(user => {
  //     if (!user) return router.createUrlTree(['/auth/login']);
  //     if (!requiredRoles || requiredRoles.length === 0) return true;
  //     const hasRole = user.groups.some(group => requiredRoles.includes(group));
  //     if (hasRole) return true;
  //     return router.createUrlTree(['/']);
  //   })
  // );
};
