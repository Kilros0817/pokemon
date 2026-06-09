// src/app/core/auth/models/auth.model.ts

export interface AuthenticatedUser {
  userId: string;
  username: string; // email
  groups: string[]; // user roles/groups
}

export interface UserProfile {
  id: string;
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: string; // ISO 8601 timestamp
  lastLogin?: string | null;
  badge_count?: number;
  region?: string;
  avatar_url?: string;
  rank?: string;
}

export type AuthErrorType = 'InvalidCredentials' | 'NetworkError' | 'UnknownError';

export interface AuthError {
  type: AuthErrorType;
  message: string;
}
