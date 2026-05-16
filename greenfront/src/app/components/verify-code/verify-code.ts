import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Authentification } from '../../services/authentification';

@Component({
  selector: 'app-verify-code',
  standalone: false,
  templateUrl: './verify-code.html',
  styleUrl: './verify-code.scss',
})
export class VerifyCode {
  loading = false;
  successMessage = '';
  errorMessage = '';

  readonly verifyForm;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: Authentification,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.verifyForm = this.formBuilder.group({
      email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    const email = this.verifyForm.controls.email.value?.trim() ?? '';
    const code = this.verifyForm.controls.code.value?.trim() ?? '';

    this.loading = true;
    this.authService.verifyCode({ email, code }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Compte verifie. Vous pouvez vous connecter.';
        this.authService.logout();
        this.router.navigate(['/login'], { queryParams: { verified: 'true' } });
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || error?.error?.error || 'Code de verification invalide.';
      },
    });
  }

  resendCode(): void {
    const email = this.verifyForm.controls.email.value?.trim() ?? '';
    if (!email) {
      this.verifyForm.controls.email.markAsTouched();
      return;
    }

    this.loading = true;
    this.authService.resendVerificationCode(email).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Un nouveau code a ete envoye.';
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || error?.error?.error || 'Impossible de renvoyer le code.';
      },
    });
  }
}
