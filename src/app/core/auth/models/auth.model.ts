// src/app/core/auth/models/auth.model.ts

export interface AuthenticatedUser {
  userId: string;
  username: string; // email
  groups: string[]; // user roles/groups
}

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  role: 'admin' | 'user' | 'viewer';
  createdAt: string; // ISO 8601 timestamp
  lastLogin?: string | null;
}

export type AuthErrorType = 'InvalidCredentials' | 'NetworkError' | 'UnknownError';

export interface AuthError {
  type: AuthErrorType;
  message: string;
}
