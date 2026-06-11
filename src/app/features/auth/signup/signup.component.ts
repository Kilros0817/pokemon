import { Component, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatSnackBarModule
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  signupForm: FormGroup;
  isLoading = signal(false);
  avatarFile = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  avatarInput = viewChild<ElementRef>('avatarInput');

  private readonly ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.signupForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    // Validate file type
    if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
      return;
    }

    // Set file and create preview
    this.avatarFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarFile.set(null);
    this.avatarPreview.set(null);
    const input = this.avatarInput();
    if (input) {
      input.nativeElement.value = '';
    }
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    const { email, password, firstName, lastName } = this.signupForm.value;
    const avatarFile = this.avatarFile() || undefined;

    this.authService.signUp$(email, password, firstName, lastName, avatarFile).subscribe({
      next: () => {
        this.snackBar.open('Account created successfully!', '✕', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/pokedex']);
      },
      error: (error) => {
        this.isLoading.set(false);
        const errorMsg = this.authService.consumeErrorMessage() || 'Failed to create account';
        this.snackBar.open(errorMsg, '✕', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }
}
