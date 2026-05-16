import { NgModule } from '@angular/core';
import { Router, RouterModule, Routes, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { map, catchError, of } from 'rxjs';
import { Login } from './components/auth/login/login';
import { Register } from './components/auth/register/register';
import { DashboardClient } from './components/client/dashboard-client/dashboard-client';
import { DashboardAdmin } from './components/admin/dashboard-admin/dashboard-admin';
import { Utilisateurs } from './components/utilisateurs/utilisateurs';
import { Authentification } from './services/authentification';
import { Createprojetform } from './components/client/createprojetform/createprojetform';
import { Header } from './components/header/header';
import { VerifyCode } from './components/verify-code/verify-code';
import { Mesprojet } from './components/client/mesprojet/mesprojet';
import { Client } from './components/client/client';
import { Modelisation } from './components/modelisation/modelisation';
import { Esquisse } from './components/modelisation/esquisse/esquisse';
import { Mod2D } from './components/modelisation/mod-2-d/mod-2-d';
import { Mod3D } from './components/modelisation/mod-3-d/mod-3-d';


const authGuard: CanActivateFn = () => {
  const authService = inject(Authentification);
  const router = inject(Router);

  return authService.validateToken().pipe(
    map(isValid => isValid || router.createUrlTree(['/login'])),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};

const guestGuard: CanActivateFn = () => {
  const authService = inject(Authentification);
  const router = inject(Router);

  return authService.validateToken().pipe(
    map(isValid => isValid ? router.createUrlTree([authService.getDefaultDashboardRoute()]) : true),
    catchError(() => of(true))
  );
};

const adminGuard: CanActivateFn = () => {
  const authService = inject(Authentification);
  const router = inject(Router);

  return authService.validateToken().pipe(
    map(isValid => {
      if (!isValid) {
        return router.createUrlTree(['/login']);
      }
      return authService.hasRole('Admin')
        ? true
        : router.createUrlTree([authService.getDefaultDashboardRoute()]);
    }),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'register', component: Register, canActivate: [guestGuard] },
  { path: 'register-architect', component: Register, canActivate: [guestGuard] },
  { path: 'verify-code', component: VerifyCode },
  { path: 'invite-architect', component: Header, canActivate: [authGuard] },
  { path: 'create-projet', component: Createprojetform, canActivate: [authGuard] },
  { path: 'projets/nouveau', redirectTo: 'create-projet' },
  { path: 'mesprojets', component: Mesprojet, canActivate: [authGuard] },
  { path: 'projets', redirectTo: 'mesprojets' },
  { path: 'parametres', component: Client, canActivate: [authGuard] },
  { path: 'accueil', redirectTo: 'dashboard-client' },
  { path: 'modelisation/:id/esquisse', component: Esquisse, canActivate: [authGuard] },
  { path: 'modelisation/:id/2d', component: Mod2D, canActivate: [authGuard] },
  { path: 'modelisation/:id/3d', component: Mod3D, canActivate: [authGuard] },
  { path: 'dashboard-client', component: DashboardClient, canActivate: [authGuard] },
  { path: 'dash-client', redirectTo: 'dashboard-client' },
  { path: 'dashboard-architecte', component: DashboardAdmin, canActivate: [adminGuard] },
  { path: 'dashboard-admin', redirectTo: 'utilisateurs' },
  { path: 'utilisateurs', component: Utilisateurs, canActivate: [adminGuard] },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
