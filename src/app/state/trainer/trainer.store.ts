/**
 * Trainer Store - BehaviorSubject-based state management for trainer, teams, and battles
 * Handles optimistic updates, error handling, and Supabase integration
 */
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, finalize, switchMap } from 'rxjs/operators';
import { SupabaseService } from '../../core/services/supabase.service';
import { LoggerService } from '../../core/services/logger.service';

/**
 * Represents a Pokémon trainer
 */
export interface Trainer {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  badgeCount: number;
  region: string;
  avatarUrl: string;
  rank: string;
}

/**
 * Represents a trainer's Pokémon team
 */
export interface PokemonSlot {
  id: number;
  nickname: string;
  heldItem: string;
  evSpreads?: { hp: number; attack: number; defense: number; spAtk: number; spDef: number; speed: number };
}

export interface Team {
  id: string;
  name: string;
  trainerId: string;
  pokemonSlots: PokemonSlot[];
  createdAt: string;
  competitiveMode: boolean;
  tier: 'OU' | 'UU' | 'RU' | 'NU' | null;
}

/**
 * Represents a battle record
 */
export interface Battle {
  id: string;
  trainerId: string;
  opponentName: string;
  teamId: string;
  result: 'win' | 'loss';
  date: string;
  scoreTrainer: number;
  scoreOpponent: number;
}

/**
 * Input for creating a new team
 */
export interface CreateTeamInput {
  name: string;
  trainerId: string;
  pokemonSlots: PokemonSlot[];
  competitiveMode: boolean;
  tier: 'OU' | 'UU' | 'RU' | 'NU' | null;
}

/**
 * State interface for trainer store
 */
export interface TrainerState {
  currentTrainerId: string;
  trainer: Trainer | null;
  teams: Team[];
  battles: Battle[];
  loading: boolean;
  error: string | null;
}

/**
 * Initial state for trainer store
 */
const INITIAL_STATE: TrainerState = {
  currentTrainerId: '',
  trainer: null,
  teams: [],
  battles: [],
  loading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class TrainerStore {
  private supabaseService = inject(SupabaseService);
  private logger = inject(LoggerService);

  private stateSubject = new BehaviorSubject<TrainerState>(INITIAL_STATE);
  public state$ = this.stateSubject.asObservable();

  /**
   * Observable stream of current trainer
   */
  public readonly trainer$ = this.state$.pipe(map(state => state.trainer));
  
  /**
   * Observable stream of trainer's teams
   */
  public readonly teams$ = this.state$.pipe(map(state => state.teams));
  
  /**
   * Observable stream of trainer's battles
   */
  public readonly battles$ = this.state$.pipe(map(state => state.battles));
  
  /**
   * Observable stream of loading state
   */
  public readonly loading$ = this.state$.pipe(map(state => state.loading));
  
  /**
   * Observable stream of error state
   */
  public readonly error$ = this.state$.pipe(map(state => state.error));

  constructor() {
    this.logger.debug('TrainerStore: initialized');
  }

  /**
   * Get current state synchronously
   * Used for accessing currentTrainerId in synchronous contexts
   */
  state(): TrainerState {
    return this.stateSubject.getValue();
  }

  /**
   * Loads trainer profile by ID from Supabase
   *
   * @param trainerId - Trainer ID to load
   * @returns Observable<Trainer | null> - Stream of trainer data
   */
  loadTrainer(trainerId: string): Observable<Trainer | null> {
    this.setLoading(true);

    return this.supabaseService.getTrainerById(trainerId).pipe(
      map((rawTrainer) => (rawTrainer ? this.transformTrainer(rawTrainer) : null)),
      tap((trainer: Trainer | null) => {
        this.stateSubject.next({
          ...this.stateSubject.value,
          trainer,
          currentTrainerId: trainerId,
          loading: false,
        });
      }),
      finalize(() => this.setLoading(false)),
      catchError((error) => {
        this.logger.error('Load trainer error:', error);
        this.setError(error.message || 'Failed to load trainer');
        return of(null);
      })
    );
  }

  /**
   * Loads teams for current trainer from Supabase
   *
   * @returns Observable<Team[]> - Stream of team data
   */
  loadTeams(): Observable<Team[]> {
    this.setLoading(true);
    const trainerId = this.stateSubject.value.currentTrainerId;

    if (!trainerId) {
      this.setLoading(false);
      this.setError('No trainer selected');
      return of([]);
    }

    return this.supabaseService.getTrainerTeams(trainerId).pipe(
      map((teams) => teams.map((team: any) => this.transformTeam(team))),
      tap((teams: Team[]) => {
        this.stateSubject.next({
          ...this.stateSubject.value,
          teams,
        });
      }),
      finalize(() => this.setLoading(false)),
      catchError((error) => {
        this.logger.error('Load teams error:', error);
        this.setError(error.message || 'Failed to load teams');
        return of([]);
      })
    );
  }

  /**
   * Loads battles for current trainer from Supabase
   *
   * @returns Observable<Battle[]> - Stream of battle data
   */
  loadBattles(): Observable<Battle[]> {
    this.setLoading(true);
    const trainerId = this.stateSubject.value.currentTrainerId;

    if (!trainerId) {
      this.setLoading(false);
      this.setError('No trainer selected');
      return of([]);
    }

    return this.supabaseService.getTrainerBattles(trainerId).pipe(
      map((battles) => battles.map((battle: any) => this.transformBattle(battle))),
      tap((battles: Battle[]) => {
        this.stateSubject.next({
          ...this.stateSubject.value,
          battles,
        });
      }),
      finalize(() => this.setLoading(false)),
      catchError((error) => {
        this.logger.error('Load battles error:', error);
        this.setError(error.message || 'Failed to load battles');
        return of([]);
      })
    );
  }

  /**
   * Creates a new team with optimistic UI updates
   * Shows team immediately in UI, rolls back on error
   *
   * @param teamData - Team creation data
   * @returns Observable<Team> - Stream of created team
   */
  createTeam(teamData: CreateTeamInput): Observable<Team> {
    const currentState = this.stateSubject.value;
    const teamId = crypto.randomUUID();

    // Create optimistic team for immediate UI update
    const optimisticTeam: Team = {
      id: teamId,
      name: teamData.name,
      trainerId: teamData.trainerId,
      pokemonSlots: teamData.pokemonSlots,
      createdAt: new Date().toISOString(),
      competitiveMode: teamData.competitiveMode,
      tier: teamData.tier,
    };

    // Optimistic update - show team immediately
    this.stateSubject.next({
      ...currentState,
      teams: [...currentState.teams, optimisticTeam],
    });

    // Prepare payload for Supabase with UUID
    const newTeam = {
      id: teamId,
      name: teamData.name,
      trainer_id: teamData.trainerId,
      pokemon_slots: teamData.pokemonSlots.map(slot => ({
        id: slot.id,
        nickname: slot.nickname,
        held_item: slot.heldItem || 'None',
        ev_spread: slot.evSpreads || { hp: 0, attack: 0, defense: 0, sp_attack: 0, sp_defense: 0, speed: 0 },
      })),
      competitive_mode: teamData.competitiveMode,
      tier: teamData.tier,
    };

    return this.supabaseService.createTeam(newTeam).pipe(
      map((realTeam) => {
        this.logger.debug('Team created:', realTeam);
        return this.transformTeam(realTeam);
      }),
      tap((realTeam: Team) => {
        // Replace optimistic team with real team from server
        const updatedTeams = this.stateSubject.value.teams.map((team: Team) =>
          team.id === teamId ? realTeam : team
        );

        this.stateSubject.next({
          ...this.stateSubject.value,
          teams: updatedTeams,
        });
      }),
      catchError((error) => {
        this.logger.error('Create team error:', error);

        // Rollback optimistic update on error
        const rolledBackTeams = this.stateSubject.value.teams.filter(
          (team: Team) => team.id !== teamId
        );

        this.stateSubject.next({
          ...this.stateSubject.value,
          teams: rolledBackTeams,
          error: error.message || 'Failed to create team',
        });

        return throwError(() => error);
      })
    );
  }

  /**
   * Updates an existing team with optimistic UI updates
   *
   * @param id - Team ID to update
   * @param updates - Partial team data to update
   * @returns Observable<Team> - Stream of updated team
   */
  updateTeam(
    id: string,
    updates: Partial<Omit<Team, 'id' | 'createdAt' | 'trainerId'>>
  ): Observable<Team> {
    const currentState = this.stateSubject.value;
    const originalTeam = currentState.teams.find((t: Team) => t.id === id);

    if (!originalTeam) {
      return throwError(() => new Error('Team not found'));
    }

    // Create optimistic update
    const optimisticTeam = { ...originalTeam, ...updates };

    // Optimistic update - show changes immediately
    this.stateSubject.next({
      ...currentState,
      teams: currentState.teams.map((team: Team) =>
        team.id === id ? optimisticTeam : team
      ),
    });

    // Prepare payload for Supabase
    const updatePayload: any = {};
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.competitiveMode !== undefined) updatePayload.competitive_mode = updates.competitiveMode;
    if (updates.tier !== undefined) updatePayload.tier = updates.tier;
    if (updates.pokemonSlots !== undefined) {
      updatePayload.pokemon_slots = updates.pokemonSlots.map(slot => ({
        id: slot.id,
        nickname: slot.nickname,
        held_item: slot.heldItem || 'None',
        ev_spread: slot.evSpreads || { hp: 0, attack: 0, defense: 0, sp_attack: 0, sp_defense: 0, speed: 0 },
      }));
    }

    return this.supabaseService.updateTeam(id, updatePayload).pipe(
      map((updatedTeam: any) => {
        this.logger.debug('Team updated:', updatedTeam);
        return this.transformTeam(updatedTeam);
      }),
      tap((realTeam: Team) => {
        // Update with server response
        const updatedTeams = this.stateSubject.value.teams.map((team: Team) =>
          team.id === id ? realTeam : team
        );

        this.stateSubject.next({
          ...this.stateSubject.value,
          teams: updatedTeams,
        });
      }),
      catchError((error) => {
        this.logger.error('Update team error:', error);

        // Rollback optimistic update on error
        this.stateSubject.next({
          ...this.stateSubject.value,
          teams: this.stateSubject.value.teams.map((team: Team) =>
            team.id === id ? originalTeam : team
          ),
          error: error.message || 'Failed to update team',
        });

        return throwError(() => error);
      })
    );
  }

  /**
   * Deletes a team with optimistic UI updates
   *
   * @param id - Team ID to delete
   * @returns Observable<void> - Empty stream on success
   */
  deleteTeam(id: string): Observable<void> {
    const currentState = this.stateSubject.value;
    const deletedTeam = currentState.teams.find((t: Team) => t.id === id);

    if (!deletedTeam) {
      return throwError(() => new Error('Team not found'));
    }

    // Optimistic update - remove team immediately
    this.stateSubject.next({
      ...currentState,
      teams: currentState.teams.filter((team: Team) => team.id !== id),
    });

    return this.supabaseService.deleteTeam(id).pipe(
      map(() => {
        this.logger.debug('Team deleted:', id);
        return void 0;
      }),
      catchError((error) => {
        this.logger.error('Delete team error:', error);

        // Rollback optimistic update on error
        this.stateSubject.next({
          ...this.stateSubject.value,
          teams: [...this.stateSubject.value.teams, deletedTeam],
          error: error.message || 'Failed to delete team',
        });

        return throwError(() => error);
      })
    );
  }

  /**
   * Updates trainer avatar with image file upload to Supabase Storage
   *
   * @param trainerId - Trainer ID to update
   * @param avatarFile - Image file to upload
   * @returns Observable<Trainer> - Stream of updated trainer
   */
  updateTrainerAvatar(trainerId: string, avatarFile: File): Observable<Trainer> {
    // Optimistic update with placeholder while uploading
    const currentState = this.stateSubject.value;
    const optimisticTrainer = currentState.trainer 
      ? { ...currentState.trainer, avatarUrl: 'uploading...' }
      : null;

    if (optimisticTrainer) {
      this.stateSubject.next({
        ...currentState,
        trainer: optimisticTrainer as Trainer,
      });
    }

    // Upload avatar to storage
    return this.supabaseService.uploadAvatar(avatarFile, trainerId).pipe(
      switchMap(avatarUrl => {
        // Update trainer with new avatar URL
        return this.supabaseService.updateTrainer(trainerId, {
          avatar_url: avatarUrl
        });
      }),
      map((updatedTrainer: any) => {
        this.logger.debug('Trainer avatar updated successfully');
        return this.transformTrainer(updatedTrainer);
      }),
      tap((realTrainer: Trainer) => {
        this.stateSubject.next({
          ...this.stateSubject.value,
          trainer: realTrainer,
          error: null,
        });
      }),
      catchError((error) => {
        this.logger.error('Update trainer avatar error:', error);

        // Restore previous trainer state on error
        this.stateSubject.next({
          ...this.stateSubject.value,
          trainer: currentState.trainer,
          error: error.message || 'Failed to update avatar',
        });

        return throwError(() => error);
      })
    );
  }

  /**
   * Updates trainer profile
   *
   * @param id - Trainer ID to update
   * @param updates - Partial trainer data to update
   * @returns Observable<Trainer> - Stream of updated trainer
   */
  updateTrainer(
    id: string,
    updates: Partial<Omit<Trainer, 'id'>>
  ): Observable<Trainer> {
    const currentState = this.stateSubject.value;
    const optimisticTrainer = currentState.trainer ? { ...currentState.trainer, ...updates } : null;

    if (optimisticTrainer && updates.name !== undefined) {
      const [firstName, ...lastParts] = updates.name.trim().split(' ');
      optimisticTrainer.firstName = firstName || '';
      optimisticTrainer.lastName = lastParts.join(' ') || '';
    }

    // Optimistic update - show changes immediately
    if (optimisticTrainer) {
      this.stateSubject.next({
        ...currentState,
        trainer: optimisticTrainer as Trainer,
      });
    }

    // Build payload with correct field names for Supabase
    const updatePayload: any = {};
    if (updates.name !== undefined) {
      const [firstName, ...lastParts] = updates.name.trim().split(' ');
      updatePayload.firstName = firstName || '';
      updatePayload.lastName = lastParts.join(' ') || '';
    }
    if (updates.region !== undefined) updatePayload.region = updates.region;
    if (updates.rank !== undefined) updatePayload.rank = updates.rank;
    if (updates.badgeCount !== undefined) updatePayload.badge_count = updates.badgeCount;
    if (updates.avatarUrl !== undefined) updatePayload.avatar_url = updates.avatarUrl;

    return this.supabaseService.updateTrainer(id, updatePayload).pipe(
      map((updatedTrainer: any) => {
        this.logger.debug('Trainer updated successfully');
        return this.transformTrainer(updatedTrainer);
      }),
      tap((realTrainer: Trainer) => {
        this.stateSubject.next({
          ...this.stateSubject.value,
          trainer: realTrainer,
          error: null,
        });
      }),
      catchError((error) => {
        this.logger.error('Update trainer error:', error);

        // Restore previous trainer state on error
        this.stateSubject.next({
          ...this.stateSubject.value,
          trainer: currentState.trainer,
          error: error.message || 'Failed to update trainer',
        });

        return throwError(() => error);
      })
    );
  }

  /**
   * Sets current trainer and loads all related data
   *
   * @param trainerId - Trainer ID to set as current
   */
  setCurrentTrainer(trainerId: string): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      currentTrainerId: trainerId,
    });

    // Load all related data for the new trainer
    this.loadTrainer(trainerId).subscribe();
    this.loadTeams().subscribe();
    this.loadBattles().subscribe();
  }

  /**
   * Clears current error state
   */
  clearError(): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      error: null,
    });
  }

  /**
   * Gets count of teams for current trainer
   *
   * @returns Number of teams
   */
  getTeamCount(): number {
    return this.stateSubject.value.teams.length;
  }

  /**
   * Resets store to initial state
   */
  reset(): void {
    this.stateSubject.next(INITIAL_STATE);
  }

  /**
   * Sets loading state
   *
   * @param loading - Loading state to set
   */
  private setLoading(loading: boolean): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      loading,
    });
  }

  /**
   * Sets error state
   *
   * @param error - Error message or null
   */
  private setError(error: string | null): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      error,
    });
  }

  /**
   * Transforms raw trainer data from API to internal model
   *
   * @param raw - Raw trainer data from API
   * @returns Transformed Trainer object
   */
  private transformTrainer(raw: any): Trainer {
    this.logger.debug('Transforming raw trainer data:', raw);
    const firstName = raw.firstName || '';
    const lastName = raw.lastName || '';
    return {
      id: String(raw.id),
      name: `${firstName} ${lastName}`.trim() || 'Unknown Trainer',
      firstName,
      lastName,
      badgeCount: raw.badge_count || 0,
      region: raw.region || 'Kanto',
      avatarUrl: raw.avatar_url || '',
      rank: raw.rank || 'Trainer',
    };
  }

  /**
   * Transforms raw team data from API to internal model
   *
   * @param raw - Raw team data from API
   * @returns Transformed Team object
   */
  private transformTeam(raw: any): Team {
    return {
      id: String(raw.id),
      name: raw.name || 'Unnamed Team',
      trainerId: String(raw.trainer_id),
      pokemonSlots: (raw.pokemon_slots || []).map((slot: any) => ({
        id: slot.id,
        nickname: slot.nickname || '',
        heldItem: slot.held_item || 'None',
        evSpreads: this.transformEvSpread(slot.ev_spread),
      })),
      createdAt: raw.created_at || new Date().toISOString(),
      competitiveMode: raw.competitive_mode || false,
      tier: raw.tier || null,
    };
  }

  /**
   * Transforms EV spread from database format to application format
   * Database stores: { hp, attack, defense, sp_attack, sp_defense, speed }
   * Application uses: { hp, attack, defense, spAtk, spDef, speed }
   */
  private transformEvSpread(raw: any): any {
    if (!raw) {
      return { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 };
    }
    return {
      hp: raw.hp || 0,
      attack: raw.attack || 0,
      defense: raw.defense || 0,
      spAtk: raw.sp_attack || 0,
      spDef: raw.sp_defense || 0,
      speed: raw.speed || 0,
    };
  }

  /**
   * Transforms raw battle data from API to internal model
   *
   * @param raw - Raw battle data from API
   * @returns Transformed Battle object
   */
  private transformBattle(raw: any): Battle {
    return {
      id: String(raw.id),
      trainerId: String(raw.trainer_id),
      opponentName: raw.opponent_name || 'Unknown',
      teamId: String(raw.team_id),
      result: raw.result === 'win' ? 'win' : 'loss',
      date: raw.date || new Date().toISOString(),
      scoreTrainer: raw.score_trainer || 0,
      scoreOpponent: raw.score_opponent || 0,
    };
  }
}
