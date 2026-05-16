import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing-module';
import { AuthTokenInterceptor } from './interceptors/auth-token-interceptor';
import { DashboardClient } from './components/client/dashboard-client/dashboard-client';
import { Utilisateurs } from './components/utilisateurs/utilisateurs';
import { DashboardAdmin } from './components/admin/dashboard-admin/dashboard-admin';
import { Logout } from './components/auth/logout/logout';
import { Client } from './components/client/client';
import { Admin } from './components/admin/admin';
import { Createprojetform } from './components/client/createprojetform/createprojetform';
import { Mesprojet } from './components/client/mesprojet/mesprojet';
import { VerifyCode } from './components/verify-code/verify-code';
import { Sidebar } from './components/shared/sidebar/sidebar';

@NgModule({
  declarations: [
    DashboardClient,
    Utilisateurs,
    DashboardAdmin,
    Logout,
    Client,
    Admin,
    Createprojetform,
    Mesprojet,
    VerifyCode,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    Sidebar,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthTokenInterceptor,
      multi: true,
    },
  ],
})
export class AppModule { }
