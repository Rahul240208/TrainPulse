import { config } from '../config.js';
import type { LiveTrainData } from '../schemas/liveTrain.js';

export interface CacheEntry {
  data: LiveTrainData;
  expiresAt: number;
  cachedAt: number;
}

export interface CacheResult {
  data: LiveTrainData;
  cached: boolean;
  isStale?: boolean;
}

/**
 * Server-Side Cache Service for live train responses:
 * - Caches responses by train number
 * - Configurable TTL (default CACHE_TTL_SECONDS from config, default 25s)
 * - Single-flight request coalescing for concurrent requests
 * - Never serves expired data as fresh
 * - Preserves last successful data on upstream failures (stale fallback)
 */
export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private inflightRequests = new Map<string, Promise<CacheResult>>();
  private defaultTtlMs: number;

  constructor(defaultTtlSeconds = config.CACHE_TTL_SECONDS) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  /**
   * Retrieves an item from cache if present and not expired.
   * Returns null if not present or expired (do not serve expired data as fresh).
   */
  public get(trainNumber: string): LiveTrainData | null {
    const entry = this.cache.get(trainNumber);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      return null;
    }

    return entry.data;
  }

  /**
   * Retrieves the raw cache entry including metadata (cachedAt, expiresAt).
   */
  public getEntry(trainNumber: string): CacheEntry | null {
    return this.cache.get(trainNumber) ?? null;
  }

  /**
   * Retrieves the last successful data for a train, even if expired.
   * Used for graceful degradation when upstream is unavailable.
   */
  public getLastSuccessful(trainNumber: string): LiveTrainData | null {
    const entry = this.cache.get(trainNumber);
    return entry ? entry.data : null;
  }

  /**
   * Checks if an entry for the train number is expired or missing.
   */
  public isExpired(trainNumber: string): boolean {
    const entry = this.cache.get(trainNumber);
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  }

  /**
   * Checks if a fresh, non-expired cache entry exists for this train number.
   */
  public has(trainNumber: string): boolean {
    return this.get(trainNumber) !== null;
  }

  /**
   * Stores an item in cache with TTL.
   */
  public set(trainNumber: string, data: LiveTrainData, ttlMs = this.defaultTtlMs): void {
    const now = Date.now();
    this.cache.set(trainNumber, {
      data,
      expiresAt: now + ttlMs,
      cachedAt: now,
    });
  }

  /**
   * Single-flight request coalescing and stale fallback:
   * 1. If fresh cache entry exists: returns immediately (cached: true, isStale: false).
   * 2. If an outbound request for this train is already in-flight: shares that Promise.
   * 3. Otherwise, initiates single outbound fetch:
   *    - On success: caches fresh data and returns (cached: false, isStale: false).
   *    - On failure: if last successful data exists in cache, preserves it and returns (cached: true, isStale: true).
   *    - If no previous data exists: re-throws the error.
   */
  public async getOrFetch(
    trainNumber: string,
    fetchFn: () => Promise<LiveTrainData>,
    ttlMs = this.defaultTtlMs
  ): Promise<CacheResult> {
    // 1. Check for fresh (unexpired) cache hit
    const freshData = this.get(trainNumber);
    if (freshData) {
      return { data: freshData, cached: true, isStale: false };
    }

    // 2. Check for in-flight request for the same train (request coalescing)
    const existingPromise = this.inflightRequests.get(trainNumber);
    if (existingPromise) {
      return await existingPromise;
    }

    // 3. Initiate single outbound flight
    const fetchPromise = (async (): Promise<CacheResult> => {
      try {
        const freshData = await fetchFn();
        this.set(trainNumber, freshData, ttlMs);
        return { data: freshData, cached: false, isStale: false };
      } catch (err: unknown) {
        // Upstream failure: Graceful fallback to preserved last successful data
        const lastData = this.getLastSuccessful(trainNumber);
        if (lastData) {
          console.warn(
            `⚠️ [Cache Fallback]: Upstream error for train ${trainNumber} (${(err as Error).message}). Preserving and serving last successful data.`
          );
          return { data: lastData, cached: true, isStale: true };
        }
        // No prior data: re-throw upstream error
        throw err;
      } finally {
        this.inflightRequests.delete(trainNumber);
      }
    })();

    this.inflightRequests.set(trainNumber, fetchPromise);
    return await fetchPromise;
  }

  /**
   * Deletes a specific train from cache.
   */
  public delete(trainNumber: string): boolean {
    return this.cache.delete(trainNumber);
  }

  /**
   * Clear all cache entries and pending requests.
   */
  public clear(): void {
    this.cache.clear();
    this.inflightRequests.clear();
  }

  /**
   * Number of items currently stored in cache (fresh + preserved).
   */
  public get size(): number {
    return this.cache.size;
  }

  /**
   * Configured default TTL in milliseconds.
   */
  public get ttlMs(): number {
    return this.defaultTtlMs;
  }

  /**
   * Configured default TTL in seconds.
   */
  public get ttlSeconds(): number {
    return Math.round(this.defaultTtlMs / 1000);
  }
}

export const liveTrainCache = new CacheService();
