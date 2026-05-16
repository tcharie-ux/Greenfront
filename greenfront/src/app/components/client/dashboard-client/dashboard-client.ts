import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Authentification,
  AuthenticationResponse,
} from '../../../services/authentification';
import { DashboardMetric } from '../../../models/workspace';
import { Projet } from '../../../models/Projet';
import { ProjetService } from '../../../services/projet.service';

@Component({
  selector: 'app-dashboard-client',
  standalone: false,
  templateUrl: './dashboard-client.html',
  styleUrl: './dashboard-client.scss',
})
export class DashboardClient implements OnInit {
  readonly currentUser: AuthenticationResponse | null;
  projectId: number | null = null;
  metrics: DashboardMetric[] = [];
  projects: Projet[] = [];
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

  get fallbackProjectId(): number | null {
    const fromList = this.projects[0]?.id;
    if (fromList) {
      return fromList;
    }
    const raw = localStorage.getItem('greenfront_last_project_id');
    return raw ? Number(raw) : null;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const raw = params.get('projectId');
      this.projectId = raw ? Number(raw) : null;
    });
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.errorMessage = '';

    this.projetService.listerMesProjets().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.metrics = this.buildMetrics(projects);
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || error?.error?.error || 'Impossible de charger vos projets.';
      },
    });
  }

  openProject(projectId: number): void {
    localStorage.setItem('greenfront_last_project_id', String(projectId));
    this.router.navigate(['/mesprojets'], { queryParams: { projectId } });
  }

  goToProjects(): void {
    this.router.navigate(['/mesprojets']);
  }

  createProject(): void {
    this.router.navigate(['/create-projet']);
  }

  getProjectStatus(project: Projet): string {
    return project.statut ? 'Termine' : 'En cours';
  }

  getProjectProgress(project: Projet): number {
    if (project.statut) {
      return 100;
    }

    const stepsDone = [
      project.architectures?.length > 0,
      project.modeles2D?.length > 0,
      !!project.idArchitecte || !!project.emailArchitecteInvite,
    ].filter(Boolean).length;

    return Math.max(10, Math.round((stepsDone / 3) * 90));
  }

  private buildMetrics(projects: Projet[]): DashboardMetric[] {
    const inProgress = projects.filter((project) => !project.statut).length;
    const completed = projects.filter((project) => project.statut).length;
    const withArchitect = projects.filter(
      (project) => !!project.idArchitecte || !!project.emailArchitecteInvite
    ).length;

    return [
      { label: 'Projets crees', value: `${projects.length}`, detail: 'Depuis la base', tone: 'primary' },
      { label: 'En cours', value: `${inProgress}`, detail: 'Projets non termines', tone: 'warning' },
      { label: 'Termines', value: `${completed}`, detail: 'Projets clotures', tone: 'success' },
      { label: 'Architectes', value: `${withArchitect}`, detail: 'Assignes ou invites', tone: 'neutral' },
    ];
  }
}
