import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, of, timeout } from 'rxjs';
import { Utilisateur } from '../models/utilisateur';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthenticationResponse {
  token: string;
  id: string | null;
  fullName: string;
  username: string;
  ministere: number | null;
  direction: string | null;
  roles: string[];
}

export interface RegisterRequest {
  fullName: string;
  username: string;
  password: string;
  roles?: string;
  enable?: boolean;
  ministere?: number | null;
  direction?: string | null;
  invitationToken?: string | null;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface InviteArchitectRequest {
  emailArchitecte: string;
  idProjet: number;
  message?: string;
}

interface UsersApiResponse {
  content?: Utilisateur[];
  users?: Utilisateur[];
  data?: Utilisateur[];
}

@Injectable({
  providedIn: 'root',
})
export class Authentification {
  private readonly apiBaseUrl = '/api';
  private readonly tokenStorageKey = 'auth_token';
  private readonly userStorageKey = 'auth_user';

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>(`${this.apiBaseUrl}/v1/login`, payload)
      .pipe(tap((response) => this.storeSession(response)));
  }

  register(payload: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.apiBaseUrl}/v1/register`, payload);
  }

  registerArchitect(payload: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.apiBaseUrl}/v1/register-architect`, payload);
  }

  verifyCode(payload: VerifyCodeRequest): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/v1/verify-code`, payload);
  }

  resendVerificationCode(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/v1/resend-verification-code`, { email });
  }

  inviteArchitect(payload: InviteArchitectRequest): Observable<unknown> {
    return this.http.post(`${this.apiBaseUrl}/v1/invite-architect`, payload);
  }

  getUsers(): Observable<Utilisateur[]> {
    return this.http
      .get<Utilisateur[] | UsersApiResponse>(`${this.apiBaseUrl}/v1/users`)
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }

          return response.content ?? response.users ?? response.data ?? [];
        })
      );
  }

  getMe(): Observable<Utilisateur> {
    return this.http.get<Utilisateur>(`${this.apiBaseUrl}/v1/me`);
  }

  logout(): void {
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.userStorageKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }

  getCurrentUser(): AuthenticationResponse | null {
    const raw = localStorage.getItem(this.userStorageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthenticationResponse;
    } catch {
      this.logout();
      return null;
    }
  }

  validateToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return of(false);
    }

    return this.http.get(`${this.apiBaseUrl}/v1/validate-token`).pipe(
      timeout(5000),
      map(() => true),
      catchError((error) => {
        if (error?.status === 404) {
          // Endpoint absent on le backend, on considère le token présent comme valide
          return of(true);
        }
        this.logout(); // Supprime le token invalide
        return of(false);
      })
    );
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.roles?.length) {
      return false;
    }

    const expectedRole = this.normalizeRole(role);
    return currentUser.roles.some((userRole) => this.normalizeRole(userRole) === expectedRole);
  }

  getDefaultDashboardRoute(): string {
    if (this.hasRole('Admin')) {
      return '/dashboard-admin';
    }
    if (this.hasRole('Architecte')) {
      return '/dashboard-architecte';
    }
    return '/dashboard-client';
  }

  private storeSession(response: AuthenticationResponse): void {
    localStorage.setItem(this.tokenStorageKey, response.token);
    localStorage.setItem(this.userStorageKey, JSON.stringify(response));
  }

  private normalizeRole(role: string): string {
    return role.replace(/^ROLE_/i, '').toUpperCase();
  }
}
