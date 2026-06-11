// src/app/core/auth/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SupabaseService } from '../../services/supabase.service';
import { AuthenticatedUser, UserProfile } from '../models/auth.model';

const AUTH_STORAGE_KEY = 'pokemon_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isSignedIn = signal(false);
  readonly currentUser = signal<AuthenticatedUser | null>(null);
  readonly errorMessage = signal<string | null>(null);

  constructor(private supabaseService: SupabaseService) {
    this.checkStoredAuth();
  }

  /**
   * Check if user is already authenticated from localStorage
   */
  private checkStoredAuth(): void {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedUser) {
      try {
        const user: AuthenticatedUser = JSON.parse(storedUser);
        this.currentUser.set(user);
        this.isSignedIn.set(true);
      } catch (error) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }

  /**
   * Sign in with email and password
   */
  signInWithEmailAndPassword$(email: string, password: string): Observable<AuthenticatedUser> {
    return this.supabaseService.getAllTrainers().pipe(
      map(trainers => {
        // Find trainer by email and password
        const user = trainers.find(t => t.email === email && t.password === password);
        
        if (!user) {
          throw new Error('Invalid email or password');
        }

        const authUser: AuthenticatedUser = {
          userId: user.id,
          username: user.email,
          groups: []
        };

        // Update last login
        this.supabaseService.updateTrainer(user.id, {
          lastLogin: new Date().toISOString()
        }).subscribe();

        // Store in localStorage and state
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        this.currentUser.set(authUser);
        this.isSignedIn.set(true);
        this.errorMessage.set(null);

        return authUser;
      }),
      catchError(error => {
        this.errorMessage.set('Invalid email or password');
        return throwError(() => error);
      })
    );
  }

  /**
   * Sign up new user with avatar
   */
  signUp$(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    avatarFile?: File,
    region?: string
  ): Observable<AuthenticatedUser> {
    return this.supabaseService.getAllTrainers().pipe(
      switchMap(trainers => {
        // Check if email already exists
        if (trainers.some(t => t.email === email)) {
          throw new Error('User with this email already exists');
        }

        // Generate temporary trainer ID for storage path
        const tempTrainerId = `temp_${Date.now()}`;

        const newTrainer: Partial<UserProfile> & { password: string } = {
          email,
          password,
          firstName,
          lastName,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          badge_count: 0,
          region: region?.trim() || 'Kanto',
          avatar_url: '',
          rank: 'Trainer'
        };

        // If avatar file provided, upload it first
        if (avatarFile) {
          return this.supabaseService.uploadAvatar(avatarFile, tempTrainerId).pipe(
            switchMap(avatarUrl => {
              newTrainer.avatar_url = avatarUrl;
              return this.supabaseService.createTrainer(newTrainer);
            }),
            catchError(error => {
              // If avatar upload fails, continue without avatar
              console.warn('Avatar upload failed, continuing without avatar:', error);
              return this.supabaseService.createTrainer(newTrainer);
            })
          );
        }

        return this.supabaseService.createTrainer(newTrainer);
      }),
      map(user => {
        const authUser: AuthenticatedUser = {
          userId: user.id,
          username: user.email,
          groups: []
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        this.currentUser.set(authUser);
        this.isSignedIn.set(true);
        this.errorMessage.set(null);
        return authUser;
      }),
      catchError(error => {
        this.errorMessage.set(error.message || 'Failed to create account');
        return throwError(() => error);
      })
    );
  }

  /**
   * Check current user session
   */
  checkUserSession$(): Observable<AuthenticatedUser | null> {
    return of(this.currentUser());
  }

  /**
   * Sign out current user
   */
  signOut$(): Observable<void> {
    localStorage.removeItem(AUTH_STORAGE_KEY);
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