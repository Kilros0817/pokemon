import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Supabase Service - Handles all database operations
 * Schema mapping:
 * - TypeScript uses camelCase (firstName, lastName, badgeCount, avatarUrl, etc)
 * - Database uses snake_case (first_name, last_name, badge_count, avatar_url, etc)
 * - Supabase automatically handles the conversion based on the schema
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  /**
   * Fetch all Pokémon from the database
   * @returns Observable with { data: any[], error: any }
   */
  getAllPokemon(): Observable<any[]> {
    return from(
      this.supabase
        .from('pokemon')
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(result => result.data || []),
      catchError(error => {
        console.error('Error fetching Pokémon:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetch Pokémon with pagination
   * @param limit - Number of items per page
   * @param offset - Starting position
   * @returns Observable<any[]>
   */
  getPokemonPaginated(limit: number = 20, offset: number = 0): Observable<any[]> {
    return from(
      this.supabase
        .from('pokemon')
        .select('*')
        .order('id', { ascending: true })
        .range(offset, offset + limit - 1)
    ).pipe(
      map(result => result.data || []),
      catchError(error => {
        console.error('Error fetching Pokémon (paginated):', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get total count of Pokémon
   * @returns Observable<number>
   */
  getPokemonCount(): Observable<number> {
    return from(
      this.supabase
        .from('pokemon')
        .select('*', { count: 'exact', head: true })
    ).pipe(
      map(result => result.count || 0),
      catchError(error => {
        console.error('Error fetching Pokémon count:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get Pokémon by ID
   * @param id - Pokémon ID
   * @returns Observable<any>
   */
  getPokemonById(id: number): Observable<any> {
    return from(
      this.supabase
        .from('pokemon')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(result => result.data),
      catchError(error => {
        console.error(`Error fetching Pokémon with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get Pokémon by type
   * @param type - Pokémon type
   * @returns Observable<any[]>
   */
  getPokemonByType(type: string): Observable<any[]> {
    return from(
      this.supabase
        .from('pokemon')
        .select('*')
        .contains('types', [type])
    ).pipe(
      map(result => result.data || []),
      catchError(error => {
        console.error(`Error fetching Pokémon of type ${type}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all trainers
   * @returns Observable<any[]>
   */
  getAllTrainers(): Observable<any[]> {
    return from(
      this.supabase
        .from('trainers')
        .select('*')
        .order('createdAt', { ascending: false })
    ).pipe(
      map(result => result.data || []),
      catchError(error => {
        console.error('Error fetching trainers:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get trainer by ID
   * @param id - Trainer ID
   * @returns Observable<any>
   */
  getTrainerById(id: string): Observable<any> {
    return from(
      this.supabase
        .from('trainers')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(result => result.data),
      catchError(error => {
        console.error(`Error fetching trainer with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create new trainer
   * @param trainer - Trainer object with required fields: email, password, firstName, lastName
   * @returns Observable<any>
   */
  createTrainer(trainer: any): Observable<any> {
    return from(
      this.supabase
        .from('trainers')
        .insert([trainer])
        .select()
    ).pipe(
      map(result => result.data?.[0]),
      catchError(error => {
        console.error('Error creating trainer:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update trainer
   * @param id - Trainer ID
   * @param trainer - Partial trainer object with fields to update
   * @returns Observable<any>
   */
  updateTrainer(id: string, trainer: any): Observable<any> {
    return from(
      this.supabase
        .from('trainers')
        .update(trainer)
        .eq('id', id)
        .select()
    ).pipe(
      map(result => result.data?.[0]),
      catchError(error => {
        console.error(`Error updating trainer with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete trainer
   * @param id - Trainer ID
   * @returns Observable<any>
   */
  deleteTrainer(id: string): Observable<any> {
    return from(
      this.supabase
        .from('trainers')
        .delete()
        .eq('id', id)
    ).pipe(
      catchError(error => {
        console.error(`Error deleting trainer with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all teams for a trainer
   * @param trainerId - Trainer ID
   * @returns Observable<any[]>
   */
  getTrainerTeams(trainerId: string): Observable<any[]> {
    return from(
      this.supabase
        .from('teams')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(result => result.data || []),
      catchError(error => {
        console.error(`Error fetching teams for trainer ${trainerId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get team by ID
   * @param teamId - Team ID
   * @returns Observable<any>
   */
  getTeamById(teamId: string): Observable<any> {
    return from(
      this.supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()
    ).pipe(
      map(result => result.data),
      catchError(error => {
        console.error(`Error fetching team with ID ${teamId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create team
   * @param team - Team object with trainer_id, name, pokemon_slots (JSONB), competitive_mode, tier
   * @returns Observable<any>
   */
  createTeam(team: any): Observable<any> {
    return from(
      this.supabase
        .from('teams')
        .insert([team])
        .select()
    ).pipe(
      map(result => result.data?.[0]),
      catchError(error => {
        console.error('Error creating team:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update team
   * @param teamId - Team ID
   * @param updates - Partial team object to update
   * @returns Observable<any>
   */
  updateTeam(teamId: string, updates: any): Observable<any> {
    return from(
      this.supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
    ).pipe(
      map(result => result.data?.[0]),
      catchError(error => {
        console.error(`Error updating team with ID ${teamId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete team
   * @param teamId - Team ID
   * @returns Observable<any>
   */
  deleteTeam(teamId: string): Observable<any> {
    return from(
      this.supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
    ).pipe(
      catchError(error => {
        console.error(`Error deleting team with ID ${teamId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all battles for a trainer
   * @param trainerId - Trainer ID
   * @returns Observable<any[]>
   */
  getTrainerBattles(trainerId: string): Observable<any[]> {
    return from(
      this.supabase
        .from('battles')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('date', { ascending: false })
    ).pipe(
      map(result => result.data || []),
      catchError(error => {
        console.error(`Error fetching battles for trainer ${trainerId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create battle
   * @param battle - Battle object
   * @returns Observable<any>
   */
  createBattle(battle: any): Observable<any> {
    return from(
      this.supabase
        .from('battles')
        .insert([battle])
        .select()
    ).pipe(
      map(result => result.data?.[0]),
      catchError(error => {
        console.error('Error creating battle:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get battle logs
   * @param battleId - Battle ID
   * @returns Observable<any[]>
   */
  getBattleLogs(battleId: string): Observable<any[]> {
    return from(
      this.supabase
        .from('battle_log')
        .select('*')
        .eq('battle_id', battleId)
        .order('timestamp', { ascending: true })
    ).pipe(
      map(result => result.data || []),
      catchError(error => {
        console.error(`Error fetching battle logs for battle ${battleId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Add battle log entry
   * @param logEntry - Battle log entry object
   * @returns Observable<any>
   */
  addBattleLog(logEntry: any): Observable<any> {
    return from(
      this.supabase
        .from('battle_log')
        .insert([logEntry])
        .select()
    ).pipe(
      map(result => result.data?.[0]),
      catchError(error => {
        console.error('Error adding battle log:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Upload avatar image to Supabase Storage
   * @param file - Image file to upload
   * @param trainerId - Trainer ID to create unique path
   * @returns Observable with public URL
   */
  uploadAvatar(file: File, trainerId: string): Observable<string> {
    return from(
      (async () => {
        // Create unique file name
        const fileName = `${trainerId}_${Date.now()}_${file.name}`;
        const filePath = `avatars/${fileName}`;

        // Upload file to storage
        const { error: uploadError } = await this.supabase.storage
          .from('pokemon')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data } = this.supabase.storage
          .from('pokemon')
          .getPublicUrl(filePath);

        return data.publicUrl;
      })()
    ).pipe(
      catchError(error => {
        console.error('Error uploading avatar:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete avatar image from Supabase Storage
   * @param avatarUrl - Public URL of the avatar to delete
   * @returns Observable<void>
   */
  deleteAvatar(avatarUrl: string): Observable<void> {
    return from(
      (async () => {
        // Extract file path from URL
        const urlParts = avatarUrl.split('/');
        const filePath = urlParts.slice(urlParts.indexOf('avatars')).join('/');

        // Delete file from storage
        const { error } = await this.supabase.storage
          .from('pokemon')
          .remove([filePath]);

        if (error) {
          throw error;
        }
      })()
    ).pipe(
      catchError(error => {
        console.error('Error deleting avatar:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get public URL for avatar without uploading
   * @param filePath - File path in storage
   * @returns Public URL string
   */
  getAvatarPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage
      .from('pokemon')
      .getPublicUrl(filePath);
    return data.publicUrl;
  }
}
