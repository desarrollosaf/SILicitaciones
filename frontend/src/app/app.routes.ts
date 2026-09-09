import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'periodos', loadComponent: () => import('./pages/periods.component').then((m) => m.PeriodsComponent) },
  { path: 'dictamenes', loadComponent: () => import('./pages/dictamenes.component').then((m) => m.DictamenesComponent) },
  { path: 'licitaciones', loadComponent: () => import('./pages/licitaciones.component').then((m) => m.LicitacionesComponent) },
  { path: 'partidas', loadComponent: () => import('./pages/partidas.component').then((m) => m.PartidasComponent) },
  { path: 'bodegas', loadComponent: () => import('./pages/warehouses.component').then((m) => m.WarehousesComponent) },
  { path: 'memorandums', loadComponent: () => import('./pages/memos.component').then((m) => m.MemosComponent) },
  { path: 'personas', loadComponent: () => import('./pages/people.component').then((m) => m.PeopleComponent) },
  { path: 'alertas', loadComponent: () => import('./pages/alerts.component').then((m) => m.AlertsComponent) },
  { path: '**', redirectTo: 'dashboard' },
];
