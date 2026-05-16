import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Utilisateur } from '../../models/utilisateur';
import { Authentification } from '../../services/authentification';

@Component({
  selector: 'app-utilisateurs',
  standalone: false,
  templateUrl: './utilisateurs.html',
  styleUrl: './utilisateurs.scss',
})
export class Utilisateurs implements OnInit {
  projectId: number | null = null;
  loading = true;
  errorMessage = '';
  utilisateurs: Utilisateur[] = [];

  constructor(
    private readonly authService: Authentification,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const raw = params.get('projectId');
      this.projectId = raw ? Number(raw) : null;
    });
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.getUsers().subscribe({
      next: (users) => {
        this.utilisateurs = users;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message ||
          error?.error?.error ||
          "Impossible de charger la liste des utilisateurs.";
      },
    });
  }

  getDisplayName(user: Utilisateur): string {
    if (user.fullName?.trim()) {
      return user.fullName.trim();
    }

    const fullName = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim();
    return fullName || 'Non renseigne';
  }

  getDisplayEmail(user: Utilisateur): string {
    return user.email || user.username || 'Non renseigne';
  }

  getDisplayRole(user: Utilisateur): string {
    if (Array.isArray(user.roles)) {
      return user.role || user.roles[0] || 'Aucun role';
    }

    return user.role || user.roles || 'Aucun role';
  }

}
