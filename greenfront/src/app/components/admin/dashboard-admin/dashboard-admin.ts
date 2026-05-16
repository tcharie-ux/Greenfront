import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Authentification,
  AuthenticationResponse,
} from '../../../services/authentification';
import { Projet } from '../../../models/Projet';
import { Utilisateur } from '../../../models/utilisateur';
import { ProjetService } from '../../../services/projet.service';

@Component({
  selector: 'app-dashboard-admin',
  standalone: false,
  templateUrl: './dashboard-admin.html',
  styleUrl: './dashboard-admin.scss',
})
export class DashboardAdmin implements OnInit {
  readonly currentUser: AuthenticationResponse | null;
  projectId: number | null = null;
  projects: Projet[] = [];
  users: Utilisateur[] = [];
  loading = true;
  errorMessage = '';

  constructor(
    private readonly authService: Authentification,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly projetService: ProjetService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const raw = params.get('projectId');
      this.projectId = raw ? Number(raw) : null;
    });
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.projetService.listerMesProjets().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loadUsers();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || error?.error?.error || 'Impossible de charger les projets.';
      },
    });
  }

  loadUsers(): void {
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || error?.error?.error || 'Impossible de charger les utilisateurs.';
      },
    });
  }

  get clientsCount(): number {
    return this.users.filter((user) => this.getRole(user) === 'CLIENT').length;
  }

  get architectsCount(): number {
    return this.users.filter((user) => this.getRole(user) === 'ARCHITECTE').length;
  }

  get inProgressProjects(): number {
    return this.projects.filter((project) => !project.statut).length;
  }

  get completedProjects(): number {
    return this.projects.filter((project) => project.statut).length;
  }

  getRole(user: Utilisateur): string {
    const role = Array.isArray(user.roles) ? user.roles[0] : user.roles;
    return (user.role || role || '').replace(/^ROLE_/i, '').toUpperCase();
  }

  openProject(projectId: number): void {
    this.router.navigate(['/mesprojets'], { queryParams: { projectId } });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}
