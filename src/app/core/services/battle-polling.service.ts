// src/app/core/services/battle-polling.service.ts
import { Injectable, inject } from '@angular/core';
import { interval, Observable, Subject, from } from 'rxjs';
import { switchMap, map, tap, takeUntil, catchError } from 'rxjs/operators';
import { LoggerService } from './logger.service';
import { SupabaseService } from './supabase.service';

export interface BattleLogEntry {
  id: string;
  battle_id: string;
  timestamp: string;
  message: string;
  severity: 'info' | 'success' | 'danger' | 'warning';
}

/**
 * Battle Log Polling Service
 * 
 * NOTE: Polling is used instead of WebSocket subscriptions because:
 * 1. Polling is simpler to implement and maintain
 * 2. 5-second polling is sufficient for battle log requirements
 * 3. In production, Supabase Realtime could be used for true WebSocket subscriptions
 * 4. PostgREST API via Supabase is used for fetching logs
 */
@Injectable({ providedIn: 'root' })
export class BattlePollingService {
  private supabaseService = inject(SupabaseService);
  private logger = inject(LoggerService);

  private lastTimestamp = new Date(0);
  private newLogsSubject = new Subject<BattleLogEntry[]>();
  private destroy$ = new Subject<void>();
  private isPollingStarted = false;
  
  public newLogs$ = this.newLogsSubject.asObservable();
  
  /**
   * Start polling for new battle logs every 5 seconds
   * Uses RxJS interval + switchMap pattern
   * Updates lastTimestamp and emits new logs through newLogsSubject
   */
  private startPollingInternal(): void {
    // Prevent multiple polling intervals
    if (this.isPollingStarted) {
      return;
    }
    
    this.isPollingStarted = true;
    
    interval(5000).pipe(
      switchMap(() => this.fetchAllLogs()),
      map(logs => logs.filter(log => new Date(log.timestamp) > this.lastTimestamp)),
      tap(logs => {
        if (logs.length > 0) {
          const maxTimestamp = Math.max(...logs.map(l => new Date(l.timestamp).getTime()));
          this.lastTimestamp = new Date(maxTimestamp);
          this.newLogsSubject.next(logs);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      error: (error) => this.logger.error('Polling error:', error)
    });
  }
  
  /**
   * Fetch all battle logs from Supabase
   * Public method for manual refresh
   * 
   * @returns Observable of all battle log entries
   */
  fetchAllLogs(): Observable<BattleLogEntry[]> {
    return from(
      (async () => {
        const { data, error } = await this.supabaseService['supabase']
          .from('battle_log')
          .select('*')
          .order('timestamp', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        return data as BattleLogEntry[];
      })()
    ).pipe(
      catchError(error => {
        this.logger.error('Error fetching battle logs from Supabase:', error);
        throw error;
      })
    );
  }
  
  /**
   * Fetch logs that are newer than last timestamp
   * Public method for initial load
   * 
   * @returns Observable of new battle log entries
   */
  fetchNewLogs(): Observable<BattleLogEntry[]> {
    return this.fetchAllLogs().pipe(
      map(logs => logs.filter(log => new Date(log.timestamp) > this.lastTimestamp))
    );
  }
  
  /**
   * Stop polling and cleanup
   */
  stopPolling(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.isPollingStarted = false;
  }
  
  /**
   * Reset last timestamp (for refresh)
   */
  resetLastTimestamp(): void {
    this.lastTimestamp = new Date(0);
  }
  
  /**
   * Set last timestamp to a specific value
   * Useful for preventing duplicate logs after initial load
   * 
   * @param timestamp - Timestamp to set
   */
  setLastTimestamp(timestamp: Date): void {
    this.lastTimestamp = timestamp;
  }
  
  /**
   * Subscribe to battle logs with automatic cleanup
   * Starts polling internally and returns subscription to newLogs$
   * 
   * @param onNewLogs - Callback for new logs
   * @returns Subscription (component should manage)
   */
  subscribeToBattleLogs(onNewLogs: (logs: BattleLogEntry[]) => void) {
    // Start polling if not already started
    this.startPollingInternal();
    
    // Subscribe to newLogs$ subject
    return this.newLogs$.subscribe({
      next: onNewLogs,
      error: (error) => this.logger.error('Battle log polling error:', error)
    });
  }
}