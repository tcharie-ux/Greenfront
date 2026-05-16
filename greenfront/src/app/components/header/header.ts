import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { Authentification } from '../../services/authentification';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Sidebar } from '../shared/sidebar/sidebar';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, NgIf, Sidebar],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly currentUser;
  projectId: number | null = null;
  currentTitle = 'Dashboard';
  loading = false;
  successMessage = '';
  errorMessage = '';
  readonly inviteForm;

  constructor(
    private readonly authService: Authentification,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly formBuilder: FormBuilder
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.inviteForm = this.formBuilder.group({
      emailArchitecte: ['', [Validators.required, Validators.email]],
      idProjet: [this.activatedRoute.snapshot.queryParamMap.get('projectId') ?? '', [Validators.required]],
      message: [''],
    });
    this.updateTitle();

    this.syncProjectId();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateTitle();
        this.syncProjectId();
      });
  }

  private syncProjectId(): void {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const raw = route.snapshot.queryParamMap.get('projectId');
    this.projectId = raw ? Number(raw) : null;
  }

  get displayName(): string {
    return this.currentUser?.fullName || this.currentUser?.username || 'Utilisateur';
  }

  get initials(): string {
    const source = this.displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase() ?? '');

    return source.join('') || 'U';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  sendInvitation(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    const emailArchitecte = this.inviteForm.controls.emailArchitecte.value?.trim() ?? '';
    const idProjet = Number(this.inviteForm.controls.idProjet.value);
    const message = this.inviteForm.controls.message.value?.trim() ?? '';

    this.loading = true;
    this.authService.inviteArchitect({ emailArchitecte, idProjet, message }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = "Invitation envoyee. L'architecte recevra le lien par email.";
        this.inviteForm.patchValue({ emailArchitecte: '', message: '' });
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || error?.error?.error || "Impossible d'envoyer l'invitation.";
      },
    });
  }

  private updateTitle(): void {
    let route = this.activatedRoute.firstChild;

    while (route?.firstChild) {
      route = route.firstChild;
    }

    this.currentTitle = route?.snapshot.data['title'] ?? 'Dashboard';
  }
}
