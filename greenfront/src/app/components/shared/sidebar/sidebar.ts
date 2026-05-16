import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Authentification } from '../../../services/authentification';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  @Input() activeItem = 'dashboard';
  @Input() projectId: number | string | null = null;
  /** Projet par défaut (ex. dernier ouvert ou premier de la liste). */
  @Input() fallbackProjectId: number | null = null;

  constructor(private readonly authService: Authentification) {}

  get navProjectId(): number | null {
    const fromInput = this.toPositiveId(this.projectId);
    if (fromInput) {
      return fromInput;
    }
    return this.toPositiveId(this.fallbackProjectId);
  }

  get initials(): string {
    const user = this.authService.getCurrentUser();
    if (!user?.fullName) {
      return 'U';
    }
    return user.fullName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  get userName(): string {
    return this.authService.getCurrentUser()?.fullName || 'Client';
  }

  esquisseLink(): (string | number)[] | string {
    return this.navProjectId
      ? ['/modelisation', this.navProjectId, 'esquisse']
      : '/mesprojets';
  }

  plan2dLink(): (string | number)[] | string {
    return this.navProjectId
      ? ['/modelisation', this.navProjectId, '2d']
      : '/mesprojets';
  }

  plan3dLink(): (string | number)[] | string {
    return this.navProjectId
      ? ['/modelisation', this.navProjectId, '3d']
      : '/mesprojets';
  }

  private toPositiveId(value: number | string | null | undefined): number | null {
    if (value == null || value === '') {
      return null;
    }
    const n = Number(value);
    return !Number.isNaN(n) && n > 0 ? n : null;
  }
}
