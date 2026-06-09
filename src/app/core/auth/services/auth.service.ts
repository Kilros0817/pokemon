// src/app/core/auth/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthenticatedUser } from '../models/auth.model';

/**
 * Authentication Service
 * 
 * NOTE: This is a placeholder implementation.
 * For full AWS Amplify integration, follow the Developer Guide pattern.
 * 
 * This allows the application to run without AWS Amplify setup.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isSignedIn = signal(false);
  readonly currentUser = signal<AuthenticatedUser | null>(null);
  readonly errorMessage = signal<string | null>(null);

  /**
   * Sign in with email and password
   * TODO: Implement AWS Amplify signIn when ready
   */
  signInWithEmailAndPassword$(email: string, password: string): Observable<void> {
    console.warn('AuthService: signInWithEmailAndPassword$ not implemented. Using mock.');
    return of(undefined);
  }

  /**
   * Check current user session
   * TODO: Implement AWS Amplify fetchAuthSession when ready
   */
  checkUserSession$(): Observable<AuthenticatedUser | null> {
    console.warn('AuthService: checkUserSession$ not implemented. Using mock.');
    return of(null);
  }

  /**
   * Sign out current user
   * TODO: Implement AWS Amplify signOut when ready
   */
  signOut$(): Observable<void> {
    console.warn('AuthService: signOut$ not implemented. Using mock.');
    this.isSignedIn.set(false);
    this.currentUser.set(null);
    return of(undefined);
  }

  /**
   * Consume and clear error message
   */
  consumeErrorMessage(): string | null {
    const message = this.errorMessage();
    this.errorMessage.set(null);
    return message;
  }
}
