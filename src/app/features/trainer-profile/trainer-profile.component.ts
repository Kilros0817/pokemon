import { Component, OnInit, DestroyRef, inject, signal, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { TrainerStore, Trainer, Battle } from '../../state/trainer/trainer.store';
import { LoggerService } from '../../core/services/logger.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-trainer-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trainer-profile.component.html',
  styleUrls: ['./trainer-profile.component.scss']
})
export class TrainerProfilePage implements OnInit {
  private trainerStore = inject(TrainerStore);
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly trainer = signal<Trainer | null>(null);

  readonly wins = signal(0);
  readonly losses = signal(0);
  readonly totalBattles = signal(0);
  readonly winRate = signal(0);

  // Edit mode
  readonly isEditing = signal(false);
  readonly isUploading = signal(false);
  readonly saving = signal(false);

  readonly editName = signal('');
  readonly editRegion = signal('');
  readonly editRank = signal('');
  readonly editAvatarUrl = signal('');
  readonly selectedAvatarFile = signal<File | null>(null);

  // Avatar preview for newly selected file
  readonly avatarPreviewUrl = signal<string | null>(null);
  readonly originalAvatarUrl = signal<string>('');

  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  regions = [
    'Kanto', 'Johto', 'Hoenn', 'Sinnoh',
    'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'
  ];

  ranks = [
    'Trainer', 'Gym Leader', 'Elite Four',
    'Champion', 'Master', 'Legend'
  ];

  ngOnInit(): void {
    this.logger.debug('TrainerProfileComponent initialized');

    this.trainerStore.trainer$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(trainer => {
        this.logger.debug('Trainer updated:', trainer);
        this.trainer.set(trainer);
        if (trainer) {
          this.editName.set(trainer.name);
          this.editRegion.set(trainer.region);
          this.editRank.set(trainer.rank);
          this.editAvatarUrl.set(trainer.avatarUrl || '');
          this.originalAvatarUrl.set(trainer.avatarUrl || '');

          if (trainer.avatarUrl && trainer.avatarUrl.startsWith('data:image/')) {
            this.avatarPreviewUrl.set(trainer.avatarUrl);
          } else {
            this.avatarPreviewUrl.set(null);
          }
        }
      });

    this.trainerStore.battles$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((battles: Battle[]) => {
        const winsCount = battles.filter((b: Battle) => b.result === 'win').length;
        const lossesCount = battles.filter((b: Battle) => b.result === 'loss').length;
        const total = battles.length;
        const rate = total > 0 ? Math.round((winsCount / total) * 100) : 0;

        this.wins.set(winsCount);
        this.losses.set(lossesCount);
        this.totalBattles.set(total);
        this.winRate.set(rate);
      });
  }

  /**
   * Gets the initial letter from trainer name for avatar placeholder
   */
  getInitial(): string {
    const name = this.trainer()?.name;
    if (!name) return 'T';
    return name.charAt(0).toUpperCase();
  }

  /**
   * Gets the display URL for trainer avatar
   */
  getDisplayAvatarUrl(): string {
    const preview = this.avatarPreviewUrl();
    if (preview) {
      return preview;
    }
    if (this.trainer()?.avatarUrl) {
      return this.trainer()!.avatarUrl;
    }
    return '';
  }

  /**
   * Handles image loading errors - clears invalid avatar
   */
  onImageError(event: Event): void {
    this.logger.debug('Image load error, clearing avatar URL');
    const trainer = this.trainer();
    if (trainer && trainer.avatarUrl) {
      this.trainerStore.updateTrainer(trainer.id, { avatarUrl: '' })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updatedTrainer) => {
            this.trainer.set(updatedTrainer);
            this.editAvatarUrl.set('');
            this.avatarPreviewUrl.set(null);
            this.originalAvatarUrl.set('');
            this.error.set('Avatar image could not be loaded. URL has been cleared.');
            setTimeout(() => this.error.set(null), 3000);
          },
          error: (err) => {
            this.logger.error('Failed to clear avatar:', err);
          }
        });
    }
  }

  /**
   * Triggers file input click for avatar upload
   */
  triggerFileUpload(): void {
    this.fileInput?.nativeElement.click();
  }

  /**
   * Handles file selection - uploads to Supabase Storage
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.logger.debug('File selected:', file.name, file.type, (file.size / 1024).toFixed(1) + 'KB');

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.error.set('Please select an image file (JPG, PNG, GIF, WebP)');
        setTimeout(() => this.error.set(null), 3000);
        return;
      }

      this.isUploading.set(true);
      this.error.set(null);

      // Create preview for UI feedback
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.avatarPreviewUrl.set(dataUrl);
      };
      reader.readAsDataURL(file);

      // Store the file for upload during save
      this.selectedAvatarFile.set(file);
      this.isUploading.set(false);
      this.success.set('Image selected! Click Save to upload and update your avatar.');
      setTimeout(() => this.success.set(null), 3000);

      // Clear file input value so same file can be selected again
      input.value = '';
    }
  }

  /**
   * Cancel pending avatar upload
   */
  cancelUpload(): void {
    this.avatarPreviewUrl.set(null);
    this.selectedAvatarFile.set(null);
    this.editAvatarUrl.set(this.originalAvatarUrl());
    this.isUploading.set(false);
    this.error.set(null);
  }

  /**
   * Enables edit mode
   */
  startEdit(): void {
    const current = this.trainer();
    if (current) {
      this.editName.set(current.name);
      this.editRegion.set(current.region);
      this.editRank.set(current.rank);
      this.editAvatarUrl.set(current.avatarUrl || '');
      this.originalAvatarUrl.set(current.avatarUrl || '');

      if (current.avatarUrl && current.avatarUrl.startsWith('data:image/')) {
        this.avatarPreviewUrl.set(current.avatarUrl);
      } else {
        this.avatarPreviewUrl.set(null);
      }
    }
    this.isEditing.set(true);
    this.error.set(null);
    this.success.set(null);
    this.logger.debug('Edit mode started');
  }

  /**
   * Cancels edit mode
   */
  cancelEdit(): void {
    this.cancelUpload();
    this.isEditing.set(false);
    this.error.set(null);
    this.success.set(null);
    this.logger.debug('Edit mode cancelled');
  }

  /**
   * Saves profile changes (name, region, rank, and uploads avatar if selected)
   */
  saveProfile(): void {
    const trainer = this.trainer();
    if (!trainer) return;

    this.saving.set(true);
    this.error.set(null);

    const selectedFile = this.selectedAvatarFile();

    // If a new avatar file is selected, upload it first
    if (selectedFile) {
      this.supabaseService.uploadAvatar(selectedFile, trainer.id)
        .pipe(
          switchMap(avatarUrl => {
            // Avatar uploaded successfully, now update trainer with the URL
            const updates: Partial<Trainer> = {};

            if (this.editName() !== trainer.name) {
              updates.name = this.editName();
            }
            if (this.editRegion() !== trainer.region) {
              updates.region = this.editRegion();
            }
            if (this.editRank() !== trainer.rank) {
              updates.rank = this.editRank();
            }

            // Always update avatar URL with the newly uploaded one
            updates.avatarUrl = avatarUrl;

            return this.trainerStore.updateTrainer(trainer.id, updates);
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (updatedTrainer) => {
            this.saving.set(false);
            this.isEditing.set(false);
            this.selectedAvatarFile.set(null);
            this.avatarPreviewUrl.set(null);
            this.originalAvatarUrl.set(updatedTrainer.avatarUrl || '');
            this.success.set('Profile updated successfully!');
            setTimeout(() => this.success.set(null), 3000);
          },
          error: (err: Error) => {
            this.saving.set(false);
            this.logger.error('Save error:', err);
            this.error.set(err.message || 'Failed to update profile');
            this.selectedAvatarFile.set(null);
            this.avatarPreviewUrl.set(null);
            setTimeout(() => this.error.set(null), 5000);
          }
        });
    } else {
      // No new avatar file, just update other profile fields
      const updates: Partial<Trainer> = {};

      if (this.editName() !== trainer.name) {
        updates.name = this.editName();
      }
      if (this.editRegion() !== trainer.region) {
        updates.region = this.editRegion();
      }
      if (this.editRank() !== trainer.rank) {
        updates.rank = this.editRank();
      }

      if (Object.keys(updates).length === 0) {
        this.isEditing.set(false);
        this.saving.set(false);
        return;
      }

      this.trainerStore.updateTrainer(trainer.id, updates)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updatedTrainer) => {
            this.saving.set(false);
            this.isEditing.set(false);
            this.avatarPreviewUrl.set(null);
            this.originalAvatarUrl.set(updatedTrainer.avatarUrl || '');
            this.success.set('Profile updated successfully!');
            setTimeout(() => this.success.set(null), 3000);
          },
          error: (err: Error) => {
            this.saving.set(false);
            this.logger.error('Save error:', err);
            this.error.set(err.message || 'Failed to update profile');
            setTimeout(() => this.error.set(null), 5000);
          }
        });
    }
  }

  /**
   * Gets CSS class for rank badge styling
   */
  getRankClass(rank: string): string {
    const rankMap: Record<string, string> = {
      'Trainer': 'rank-trainer',
      'Gym Leader': 'rank-gym',
      'Elite Four': 'rank-elite',
      'Champion': 'rank-champion',
      'Master': 'rank-master',
      'Legend': 'rank-legend'
    };
    return rankMap[rank] || 'rank-trainer';
  }

  /**
   * Logs out the current user
   */
  logout(): void {
    this.logger.debug('User logging out');
    this.authService.signOut$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.logger.debug('Logout successful, redirecting to signin');
          this.router.navigate(['/auth/signin']);
        },
        error: (err) => {
          this.logger.error('Logout error:', err);
          this.error.set('Failed to logout');
          setTimeout(() => this.error.set(null), 3000);
        }
      });
  }
}