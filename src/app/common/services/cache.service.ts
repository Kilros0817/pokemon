import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type StorageType = 'local' | 'session';

export const PRODUCT_IMAGE_CACHE_KEY = 'productImageCache';
export const USER_PROFILE_CACHE_KEY = 'userProfileCache';
export const POKEMON_CACHE_KEY = 'pokemonCache';
export const TEAM_CACHE_KEY = 'teamCache';

interface CacheEntry<T> {
  value: T;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  public inAppCache: Record<string, { value: unknown }> = {};
  private readonly platformId = inject(PLATFORM_ID);

  // ─────────────────────────────────────────────────────────
  // Browser Storage (localStorage/sessionStorage)
  // ─────────────────────────────────────────────────────────

  private getStorage(storageType: StorageType): Storage | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return storageType === 'local' ? localStorage : sessionStorage;
  }

  get<T>(key: string, storageType: StorageType = 'local'): T | null {
    const storage = this.getStorage(storageType);
    if (!storage) return null;

    const cachedRaw = storage.getItem(key);
    if (cachedRaw) {
      try {
        const cached: CacheEntry<T> = JSON.parse(cachedRaw);
        return cached.value;
      } catch {
        this.remove(key, storageType);
      }
    }
    return null;
  }

  set<T>(key: string, value: T, storageType: StorageType = 'local'): void {
    const storage = this.getStorage(storageType);
    if (!storage) return;

    const entry: CacheEntry<T> = { value };
    try {
      storage.setItem(key, JSON.stringify(entry));
    } catch {
      // Ignore storage write failures (quota exceeded, private mode, etc.)
    }
  }

  remove(key: string, storageType: StorageType = 'local'): void {
    const storage = this.getStorage(storageType);
    if (!storage) return;
    storage.removeItem(key);
  }

  // ─────────────────────────────────────────────────────────
  // In-App Memory Cache (survives navigation, lost on refresh)
  // ─────────────────────────────────────────────────────────

  getInApp<T>(key: string): T | null {
    const entry = this.inAppCache[key];
    if (!entry) return null;
    return entry.value as T;
  }

  setInApp<T>(key: string, value: T): void {
    this.inAppCache[key] = { value };
  }

  removeInApp(key: string): void {
    delete this.inAppCache[key];
  }
}
