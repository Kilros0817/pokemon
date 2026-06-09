// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/pokedex',
    pathMatch: 'full',
  },
  {
    path: 'pokedex',
    loadComponent: () => import('./features/pokedex/pokedex-table/pokedex-table.component')
      .then(m => m.PokedexTablePage),
  },
  {
    path: 'teams',
    loadComponent: () => import('./features/team-builder/team-builder.component')
      .then(m => m.TeamBuilderPage),
  },
  {
    path: 'battles',
    loadComponent: () => import('./features/battle-log/battle-log.component')
      .then(m => m.BattleLogPage),
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/trainer-profile/trainer-profile.component')
      .then(m => m.TrainerProfilePage),
  },
  {
    path: '**',
    redirectTo: '/pokedex',
  },
];