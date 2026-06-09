// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/pokedex',
    pathMatch: 'full',
  },
  {
    path: 'auth/signin',
    loadComponent: () => import('./features/auth/signin/signin.component')
      .then(m => m.SigninComponent),
  },
  {
    path: 'auth/signup',
    loadComponent: () => import('./features/auth/signup/signup.component')
      .then(m => m.SignupComponent),
  },
  {
    path: 'pokedex',
    loadComponent: () => import('./features/pokedex/pokedex-table/pokedex-table.component')
      .then(m => m.PokedexTablePage),
    canActivate: [authGuard]
  },
  {
    path: 'teams',
    loadComponent: () => import('./features/team-builder/team-builder.component')
      .then(m => m.TeamBuilderPage),
    canActivate: [authGuard]
  },
  {
    path: 'battles',
    loadComponent: () => import('./features/battle-log/battle-log.component')
      .then(m => m.BattleLogPage),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/trainer-profile/trainer-profile.component')
      .then(m => m.TrainerProfilePage),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/pokedex',
  },
];