import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProfilePreferences } from '../../models/workspace';
import { Authentification } from '../../services/authentification';
import { WorkspaceData } from '../../services/workspace-data';

type UserRole = 'ADMIN' | 'ARCHITECTE' | 'CLIENT';

@Component({
  selector: 'app-client',
  standalone: false,
  templateUrl: './client.html',
  styleUrl: './client.scss',
})
export class Client implements OnInit {
  successMessage = '';
  profile: ProfilePreferences;
  projectId: number | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private readonly authService: Authentification,
    private readonly workspaceData: WorkspaceData,
    private readonly route: ActivatedRoute
  ) {
    const currentUser = this.authService.getCurrentUser();
    const role: UserRole = this.authService.hasRole('ADMIN')
      ? 'ADMIN'
      : this.authService.hasRole('ARCHITECTE')
        ? 'ARCHITECTE'
        : 'CLIENT';

    this.profile = this.workspaceData.getProfile(
      role,
      currentUser?.fullName || 'Utilisateur',
      currentUser?.username || 'utilisateur@example.com'
    );

    this.authService.getMe().subscribe({
      next: (user) => {
        this.profile.fullName = user.fullName || user.nom || this.profile.fullName;
        this.profile.email = user.email || user.username || this.profile.email;
        this.profile.company = user.directionName || user.direction || this.profile.company;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Profil charge depuis la session locale, endpoint /me indisponible.';
      },
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const raw = params.get('projectId');
      this.projectId = raw ? Number(raw) : null;
    });
  }

  saveProfile(): void {
    this.successMessage = 'Les donnees affichees viennent du compte connecte. La sauvegarde profil reste a exposer cote backend.';
  }
}
