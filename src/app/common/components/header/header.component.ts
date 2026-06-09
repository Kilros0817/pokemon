import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Trainer } from '../../../state/trainer/trainer.store';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private router = inject(Router);

  // Inputs
  isDarkMode = input<boolean>(true);
  trainer = input<Trainer | null>(null);

  // Outputs
  themeToggle = output<void>();
  profileClick = output<void>();

  /**
   * Navigate to home page (Pokédex)
   */
  goToHome(): void {
    this.router.navigate(['/pokedex']);
  }

  /**
   * Handle theme toggle
   */
  onThemeToggle(): void {
    this.themeToggle.emit();
  }

  /**
   * Handle profile click
   */
  onProfileClick(): void {
    this.profileClick.emit();
  }

  /**
   * Handle avatar image loading errors
   */
  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
