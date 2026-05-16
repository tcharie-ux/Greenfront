import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { Authentification } from '../../../services/authentification';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIf],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  loading = false;
  successMessage = '';
  errorMessage = '';
  invitationToken: string | null = null;
  isArchitectRegistration = false;

  readonly registerForm;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: Authentification,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.invitationToken = this.route.snapshot.queryParamMap.get('token');
    this.isArchitectRegistration = this.router.url.startsWith('/register-architect');
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: [this.isArchitectRegistration ? 'ARCHITECTE' : 'CLIENT', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    });
  }

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const fullName = this.registerForm.controls.fullName.value?.trim() ?? '';
    const email = this.registerForm.controls.email.value?.trim() ?? '';
    const password = this.registerForm.controls.password.value ?? '';
    const confirmPassword = this.registerForm.controls.confirmPassword.value ?? '';

    if (password !== confirmPassword) {
      this.errorMessage = 'La confirmation du mot de passe ne correspond pas.';
      return;
    }

    this.loading = true;
    const payload = {
        fullName,
        username: email,
        password,
        roles: this.isArchitectRegistration ? 'ARCHITECTE' : 'CLIENT',
        enable: false,
        invitationToken: this.invitationToken,
      };

    const request$ = this.isArchitectRegistration
      ? this.authService.registerArchitect(payload)
      : this.authService.register(payload);

    request$
      .subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Compte cree. Saisis maintenant le code recu par email.';
          this.registerForm.reset({
            fullName: '',
            email: '',
            telephone: '',
            password: '',
            confirmPassword: '',
            role: this.isArchitectRegistration ? 'ARCHITECTE' : 'CLIENT',
            acceptTerms: false,
          });
          this.router.navigate(['/verify-code'], { queryParams: { email } });
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage =
            error?.error?.message || error?.error?.error || 'Inscription impossible.';
        },
      });
  }
}
