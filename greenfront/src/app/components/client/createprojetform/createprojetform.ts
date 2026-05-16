import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Authentification,
  AuthenticationResponse,
} from '../../../services/authentification';
import { ProjetService } from '../../../services/projet.service';

@Component({
  selector: 'app-createprojetform',
  standalone: false,
  templateUrl: './createprojetform.html',
  styleUrl: './createprojetform.scss',
})
export class Createprojetform implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly currentUser: AuthenticationResponse | null;
  projectId: number | null = null;
  isSubmitting = false;
  errorMessage = '';

  readonly projectForm = this.fb.group({
    nomProjet: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    dateCreation: ['', [Validators.required]],
  });

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authService: Authentification,
    private readonly projetService: ProjetService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const raw = params.get('projectId');
      this.projectId = raw ? Number(raw) : null;
    });
  }

  submitCreateProject(event?: Event) {
    event?.preventDefault();
    this.errorMessage = '';

    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.projectForm.getRawValue();

    this.projetService
      .creerProjet({
        nomProjet: formValue.nomProjet?.trim() ?? '',
        description: formValue.description?.trim() ?? '',
        dateCreation: formValue.dateCreation + 'T00:00:00',
      })
      .subscribe({
        next: (projet) => {
          this.isSubmitting = false;
          this.router.navigate(['/modelisation', projet.id, 'esquisse'], {
            state: { projectName: projet.nomProjet },
          });
        },
        error: () => {
          this.isSubmitting = false;
          this.errorMessage = 'Impossible de creer le projet pour le moment.';
        },
      });
  }

  cancelCreateProject() {
    this.router.navigate(['/dashboard-client']);
  }

  goBack() {
    this.router.navigate(['/dashboard-client']);
  }
}
