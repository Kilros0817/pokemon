/**
 * Team Builder Component - Advanced form for creating and managing Pokémon teams
 * Implements autocomplete search, type coverage analysis, and optimistic updates
 */
import { Component, OnInit, DestroyRef, inject, signal, computed, effect, ChangeDetectionStrategy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerStore, Team } from '../../state/trainer/trainer.store';
import { PokemonStore, Pokemon } from '../../state/pokemon/pokemon.store';
import { TYPE_COLORS } from '../../common/constants/type-colors';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '../../core/services/logger.service';

interface PokemonSlot {
  id: number;
  nickname: string;
  heldItem: string;
  evSpreads?: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
}

/**
 * Common types to check team coverage for
 */
const COMMON_TYPES = ['water', 'normal', 'grass', 'flying', 'fire'];

@Component({
  selector: 'app-team-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './team-builder.component.html',
  styleUrls: ['./team-builder.component.scss']
})
export class TeamBuilderPage implements OnInit {
  private trainerStore = inject(TrainerStore);
  private pokemonStore = inject(PokemonStore);
  private elementRef = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Expose TYPE_COLORS to template
  readonly TYPE_COLORS = TYPE_COLORS;


  // Form state signals
  readonly teamName = signal('');
  readonly selectedPokemonIds = signal<number[]>([]);
  readonly competitiveMode = signal(false);
  readonly selectedTier = signal<'OU' | 'UU' | 'RU' | 'NU' | null>(null);
  readonly teamNameStatus = signal<'empty' | 'pending' | 'valid' | 'duplicate'>('empty');

  // UI state signals
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly showSuccess = signal(false);

  // Search autocomplete signals
  readonly searchTerm = signal('');
  readonly showDropdown = signal(false);

  // Edit dialog signals
  readonly editingTeam = signal<Team | null>(null);
  readonly isEditMode = signal(false);
  readonly showCreateModal = signal(false);

  // Data signals from stores
  readonly teams = signal<Team[]>([]);
  readonly allPokemon = signal<Pokemon[]>([]);
  readonly pokemonSlots = signal<PokemonSlot[]>([]);
  readonly heldItems = [
    'Leftovers',
    'Choice Band',
    'Choice Specs',
    'Choice Scarf',
    'Life Orb',
    'Focus Sash',
    'Assault Vest',
    'Rocky Helmet',
    'Sitrus Berry',
    'Light Ball'
  ];

  private teamNameValidationEffect = effect((onCleanup) => {
    const name = this.teamName().trim();
    const isEditing = this.isEditMode();
    const originalName = this.editingTeam()?.name.trim() || '';

    // If editing and name hasn't changed, skip validation
    if (isEditing && name === originalName) {
      this.teamNameStatus.set('valid');
      return;
    }

    if (!name) {
      this.teamNameStatus.set('empty');
      return;
    }

    this.teamNameStatus.set('pending');

    const timerId = window.setTimeout(() => {
      const normalizedName = name.toLowerCase();
      const isDuplicate = this.teams().some(team => {
        // When editing, exclude the current team from duplicate check
        if (isEditing && team.id === this.editingTeam()?.id) {
          return false;
        }
        return team.name.toLowerCase() === normalizedName;
      });
      this.teamNameStatus.set(isDuplicate ? 'duplicate' : 'valid');
    }, 450);

    onCleanup(() => clearTimeout(timerId));
  });

  /**
   * Host listener to close dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Get all search containers
    const searchContainers = this.elementRef.nativeElement.querySelectorAll('.search-container');
    
    // Check if click was inside any search container
    let isInsideSearchContainer = false;
    for (const container of searchContainers) {
      if (container.contains(target)) {
        // If inside search container, only keep dropdown open if clicking on input
        const searchInput = container.querySelector('.search-input');
        if (searchInput && searchInput.contains(target)) {
          return; // Keep dropdown open when clicking input
        }
        // Close dropdown if clicking anywhere else in the search container
        this.showDropdown.set(false);
        return;
      }
    }
    
    // Click was outside search container - close dropdown
    this.showDropdown.set(false);
  }

  /**
   * Computed signal for available Pokémon for selection
   * Filters out already selected Pokémon and enforces 6 Pokémon limit
   */
  availablePokemon = computed(() => {
    const selectedIds = this.selectedPokemonIds();
    if (selectedIds.length >= 6) return [];

    return this.allPokemon().filter(p => !selectedIds.includes(p.id));
  });

  /**
   * Computed signal for filtered search results
   * Shows all available Pokémon when search term is empty (on focus)
   * Shows top matches when search term is 2+ characters
   */
  searchResults = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();

    // When search term is empty (user just clicked on input), show all available Pokémon
    if (term.length === 0) {
      return this.availablePokemon().slice(0, 15);
    }

    // When search term is 1 character, wait for at least 2 characters
    if (term.length === 1) {
      return [];
    }

    // Filter by search term
    return this.availablePokemon()
      .filter(p => p.name.toLowerCase().includes(term))
      .slice(0, 10);
  });

  /**
   * Computed signal for selected Pokémon details
   * Maps selected IDs to full Pokémon objects
   */
  selectedPokemonDetails = computed(() => {
    const ids = this.selectedPokemonIds();
    return ids
      .map(id => this.allPokemon().find(p => p.id === id))
      .filter(p => p !== undefined);
  });

  /**
   * Computed signal for team name validation
   * Validates length between 3 and 30 characters
   */
  isTeamNameValid = computed(() => {
    const name = this.teamName().trim();
    return name.length >= 3 && name.length <= 30;
  });

  isTeamNameUnique = computed(() => this.teamNameStatus() === 'valid');

  /**
   * Computed signal for form submission eligibility
   * Checks all validation rules and submission state
   */
  canSubmit = computed(() => {
    const isCompetitive = this.competitiveMode();
    const hasTier = !isCompetitive || this.selectedTier() !== null;
    const allEvValid = !isCompetitive || this.pokemonSlots().every(slot => this.isEvSpreadValid(slot));

    return this.isTeamNameValid() &&
      this.isTeamNameUnique() &&
      this.selectedPokemonIds().length >= 1 &&
      this.selectedPokemonIds().length <= 6 &&
      hasTier &&
      allEvValid &&
      !this.submitting();
  });

  /**
   * Validates if a Pokémon's EV spread sums to 510 (for competitive mode)
   */
  isEvSpreadValid(slot: PokemonSlot): boolean {
    if (!slot.evSpreads) return !this.competitiveMode();
    const total = slot.evSpreads.hp + slot.evSpreads.attack + slot.evSpreads.defense +
      slot.evSpreads.spAtk + slot.evSpreads.spDef + slot.evSpreads.speed;
    return total === 510;
  }

  /**
   * Gets total EV spread for a Pokémon
   */
  getEvTotal(slot: PokemonSlot | undefined): number {
    if (!slot?.evSpreads) return 0;
    return slot.evSpreads.hp + slot.evSpreads.attack + slot.evSpreads.defense +
      slot.evSpreads.spAtk + slot.evSpreads.spDef + slot.evSpreads.speed;
  }


  /**
   * Computed signal for type coverage analysis
   * Analyzes team type diversity and provides feedback
   */
  typeCoverage = computed(() => {
    const pokemons = this.selectedPokemonDetails();
    const types = new Set<string>();
    pokemons.forEach(p => p.types.forEach((t: string) => types.add(t)));

    return {
      count: types.size,
      types: Array.from(types),
      isBalanced: types.size >= 3,
      message: types.size >= 3 ? 'Good type diversity!' : 'Consider adding more type variety'
    };
  });

  /**
   * Computed signal for type weakness gaps
   * Detects if team is missing any of the common types (Water, Normal, Grass, Flying, Psychic)
   */
  typeWeaknessGaps = computed(() => {
    const teamTypes = new Set<string>();
    this.selectedPokemonDetails().forEach(pokemon => {
      pokemon.types.forEach((type: string) => {
        teamTypes.add(type.toLowerCase());
      });
    });

    const gaps: string[] = [];

    COMMON_TYPES.forEach(commonType => {
      if (!teamTypes.has(commonType)) {
        gaps.push(commonType.charAt(0).toUpperCase() + commonType.slice(1));
      }
    });

    return {
      hasgaps: gaps.length > 0,
      gaps,
      message: gaps.length > 0 
        ? `Team missing: ${gaps.join(', ')} type coverage.`
        : undefined
    };
  });

  /**
   * Initializes component by loading data and setting up subscriptions
   */
  ngOnInit(): void {
    // Load teams from store
    this.trainerStore.teams$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (teams: Team[]) => {
          this.teams.set(teams || []);
          this.loading.set(false);
        },
        error: (err: any) => {
          this.logger.error('Error loading teams:', err);
          this.error.set('Failed to load teams');
          this.loading.set(false);
        }
      });

    // Load error from store
    this.trainerStore.error$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((error: string | null) => {
        if (error) {
          this.error.set(error);
          setTimeout(() => this.error.set(null), 3000);
        }
      });

    // Load Pokémon data
    this.pokemonStore.loadAllPokemon()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pokemon: Pokemon[]) => {
          this.allPokemon.set(pokemon || []);
        },
        error: (err: any) => {
          this.logger.error('Failed to load Pokémon:', err);
          this.error.set('Failed to load Pokémon data');
        }
      });

  }


  /**
   * Adds Pokémon to team selection
   * Enforces 6 Pokémon maximum limit
   *
   * @param pokemon - Pokémon to add
   */
  addPokemon(pokemon: Pokemon): void {
    if (this.selectedPokemonIds().length >= 6) return;

    this.selectedPokemonIds.update(ids => [...ids, pokemon.id]);
    this.pokemonSlots.update(slots => {
      if (slots.some(slot => slot.id === pokemon.id)) {
        return slots;
      }
      return [...slots, { 
        id: pokemon.id, 
        nickname: '', 
        heldItem: 'Leftovers',
        evSpreads: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 }
      }];
    });
    this.searchTerm.set('');
    this.showDropdown.set(false);
  }

  /**
   * Removes Pokémon from team selection
   *
   * @param pokemonId - Pokémon ID to remove
   */
  removePokemon(pokemonId: number): void {
    this.selectedPokemonIds.update(ids => ids.filter(id => id !== pokemonId));
    this.pokemonSlots.update(slots => slots.filter(slot => slot.id !== pokemonId));
  }

  updatePokemonSlot(pokemonId: number, changes: Partial<PokemonSlot>): void {
    this.pokemonSlots.update(slots =>
      slots.map(slot =>
        slot.id === pokemonId ? { ...slot, ...changes } : slot
      )
    );
  }

  /**
   * Updates a specific EV stat for a Pokémon
   */
  updateEvStat(pokemonId: number, stat: 'hp' | 'attack' | 'defense' | 'spAtk' | 'spDef' | 'speed', value: number): void {
    this.pokemonSlots.update(slots =>
      slots.map(slot => {
        if (slot.id === pokemonId) {
          const evSpreads = slot.evSpreads || { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 };
          return {
            ...slot,
            evSpreads: { ...evSpreads, [stat]: Math.max(0, Math.min(252, value)) }
          };
        }
        return slot;
      })
    );
  }

  getPokemonSlot(pokemonId: number): PokemonSlot | undefined {
    return this.pokemonSlots().find(slot => slot.id === pokemonId);
  }

  /**
   * Handles search input change
   * Shows dropdown when search term has at least 2 characters
   */
  onSearchChange(): void {
    this.showDropdown.set(this.searchTerm().length >= 2);
  }

  /**
   * Handles search input focus
   * Shows dropdown with all available Pokémon when input is empty
   * This helps users discover available Pokémon without knowing names
   */
  onSearchFocus(): void {
    // Show dropdown with all available Pokémon if search term is empty
    if (this.searchTerm().length === 0 && this.availablePokemon().length > 0) {
      this.showDropdown.set(true);
    }
  }

  /**
   * Prevents dropdown from closing when clicking inside the search container
   */
  onSearchContainerClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  /**
   * Creates new team or updates existing team
   * Shows success message and resets form on success
   */
  createTeam(): void {
    if (!this.canSubmit()) return;

    this.submitting.set(true);
    this.error.set(null);

    // Check if we're in edit mode
    if (this.isEditMode() && this.editingTeam()) {
      // Edit existing team
      this.trainerStore.updateTeam(this.editingTeam()!.id, {
        name: this.teamName().trim(),
        pokemonSlots: this.pokemonSlots(),
        competitiveMode: this.competitiveMode(),
        tier: this.competitiveMode() ? this.selectedTier() : null
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.showSuccess.set(true);
            this.showCreateModal.set(false);
            this.resetForm();
            this.isEditMode.set(false);
            this.editingTeam.set(null);

            setTimeout(() => this.showSuccess.set(false), 3000);
          },
          error: (err: any) => {
            this.logger.error('Update team error:', err);
            this.submitting.set(false);
            this.error.set(err.message || 'Failed to update team');
          }
        });
    } else {
      // Create new team
      this.trainerStore.createTeam({
        name: this.teamName().trim(),
        trainerId: this.trainerStore.state().currentTrainerId,
        pokemonIds: this.selectedPokemonIds(),
        pokemonSlots: this.pokemonSlots(),
        competitiveMode: this.competitiveMode(),
        tier: this.competitiveMode() ? this.selectedTier() : null
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.showSuccess.set(true);
            this.showCreateModal.set(false);
            this.resetForm();

            setTimeout(() => this.showSuccess.set(false), 3000);
          },
          error: (err: any) => {
            this.logger.error('Create team error:', err);
            this.submitting.set(false);
            this.error.set(err.message || 'Failed to create team');
          }
        });
    }
  }

  /**
   * Opens create modal in edit mode for a team
   *
   * @param team - Team to edit
   */
  editTeam(team: Team): void {
    this.isEditMode.set(true);
    this.editingTeam.set(team);
    
    // Populate form with team data
    this.teamName.set(team.name);
    this.selectedPokemonIds.set(team.pokemonIds);
    this.pokemonSlots.set(team.pokemonSlots);
    this.competitiveMode.set(team.competitiveMode);
    this.selectedTier.set(team.tier);
    
    // Open modal
    this.showCreateModal.set(true);
  }

  /**
   * Updates team with optimistic UI updates
   *
   * @param id - Team ID to update
   * @param updates - Partial team data to update
   */
  updateTeam(id: string, updates: Partial<Omit<Team, 'id' | 'createdAt' | 'trainerId' | 'pokemonIds'>>): void {
    this.trainerStore.updateTeam(id, updates)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showCreateModal.set(false);
          this.editingTeam.set(null);
        },
        error: (err: any) => {
          this.logger.error('Update failed:', err);
          this.error.set(err.message || 'Failed to update team');
          setTimeout(() => this.error.set(null), 3000);
        }
      });
  }

  /**
   * Deletes a team with confirmation dialog
   *
   * @param id - Team ID to delete
   */
  deleteTeam(id: string): void {
    if (confirm('Are you sure you want to delete this team?')) {
      this.trainerStore.deleteTeam(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: (err: any) => {
            this.logger.error('Delete failed:', err);
            this.error.set(err.message || 'Failed to delete team');
            setTimeout(() => this.error.set(null), 3000);
          }
        });
    }
  }

  /**
   * Resets the create team form to initial state
   */
  resetForm(): void {
    this.teamName.set('');
    this.selectedPokemonIds.set([]);
    this.pokemonSlots.set([]);
    this.competitiveMode.set(false);
    this.selectedTier.set(null);
    this.searchTerm.set('');
    this.showDropdown.set(false);
    this.error.set(null);
  }

  /**
   * Clears all pokemon from the team (used on hover)
   */
  clearAllPokemon(): void {
    this.selectedPokemonIds.set([]);
    this.pokemonSlots.set([]);
  }
}