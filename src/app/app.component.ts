/**
 * App Component - Main application component with navigation and theme management
 */
import { Component, ChangeDetectionStrategy, signal, effect, inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TrainerStore } from './state/trainer/trainer.store';
import { AuthService } from './core/auth/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { isBrowser } from './common/utils/browser.util';
import { HeaderComponent } from './common/components/header/header.component';
import { FooterComponent } from './common/components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private trainerStore = inject(TrainerStore);
  private authService = inject(AuthService);
  private document = inject(DOCUMENT);
  
  readonly isDarkMode = signal<boolean>(true);
  readonly isAuthRoute = signal<boolean>(false);
  
  // Trainer data from store
  trainer = toSignal(this.trainerStore.trainer$, { initialValue: null });
  
  constructor() {
    if (isBrowser()) {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(savedTheme === 'dark' || (!savedTheme && prefersDark));
    }

    this.applyTheme();

    effect(() => {
      if (isBrowser()) {
        localStorage.setItem('theme', this.isDarkMode() ? 'dark' : 'light');
      }
      this.applyTheme();
    });

    // Track route changes to determine if we're on an auth page
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      this.isAuthRoute.set(url.startsWith('/auth'));
    });

    // Check initial route
    const currentUrl = this.router.url;
    this.isAuthRoute.set(currentUrl.startsWith('/auth'));
  }
  
  ngOnInit(): void {
    // Load trainer data on component initialization (only if not on auth page)
    if (!this.isAuthRoute()) {
      const currentUser = this.authService.currentUser();
      if (currentUser) {
        // Load trainer based on authenticated user's ID
        this.trainerStore.setCurrentTrainer(currentUser.userId);
      }
    }
  }
  
  /**
   * Navigate to profile page
   */
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
  
  /**
   * Toggle between dark and light theme
   */
  toggleTheme(): void {
    this.isDarkMode.update(value => !value);
  }
  
  /**
   * Apply theme to document
   */
  private applyTheme(): void {
    const theme = this.isDarkMode() ? 'dark' : 'light';
    this.document.documentElement.setAttribute('data-theme', theme);
    this.document.body.style.backgroundColor = theme === 'dark' ? '#0a0a0a' : '#f8fafc';
  }
}