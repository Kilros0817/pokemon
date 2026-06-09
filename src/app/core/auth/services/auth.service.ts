// src/app/core/auth/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { AuthenticatedUser, UserProfile } from '../models/auth.model';

const AUTH_STORAGE_KEY = 'pokemon_auth_user';
const API_URL = 'http://localhost:4000';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isSignedIn = signal(false);
  readonly currentUser = signal<AuthenticatedUser | null>(null);
  readonly errorMessage = signal<string | null>(null);

  constructor(private http: HttpClient) {
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
    return this.http.get<UserProfile[]>(`${API_URL}/trainers?email=${email}&password=${password}`).pipe(
      map(users => {
        if (users.length === 0) {
          throw new Error('Invalid email or password');
        }
        const user = users[0];
        const authUser: AuthenticatedUser = {
          userId: user.id,
          username: user.email,
          groups: []
        };
        
        // Update last login
        this.http.patch(`${API_URL}/trainers/${user.id}`, {
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
   * Sign up new user
   */
  signUp$(email: string, password: string, firstName: string, lastName: string, region?: string): Observable<AuthenticatedUser> {
    // Check if trainer already exists, then create if not
    return this.http.get<UserProfile[]>(`${API_URL}/trainers?email=${email}`).pipe(
      switchMap(users => {
        if (users.length > 0) {
          throw new Error('User with this email already exists');
        }
        
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
        
        return this.http.post<UserProfile>(`${API_URL}/trainers`, newTrainer);
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