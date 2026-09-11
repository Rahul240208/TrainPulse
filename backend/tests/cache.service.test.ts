import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheService } from '../src/services/cache.service.js';
import type { LiveTrainData } from '../src/schemas/liveTrain.js';

const mockTrainData: LiveTrainData = {
  trainNumber: '12301',
  trainName: 'Howrah Rajdhani Express',
  trainType: 'Rajdhani Express',
  sourceStation: 'Howrah',
  sourceCode: 'HWH',
  destinationStation: 'New Delhi',
  destinationCode: 'NDLS',
  status: 'RUNNING',
  currentLocation: {
    name: 'Kanpur Central',
    latitude: 26.45,
    longitude: 80.35,
    speedKmH: 120,
    positionType: 'ACTUAL_GPS',
  },
  delayMinutes: 0,
  nextStation: {
    code: 'NDLS',
    name: 'New Delhi',
    scheduledArrival: '10:00',
    actualArrival: '10:00',
    delayMinutes: 0,
    platform: '1',
    distanceRemainingKm: 440,
  },
  lastUpdatedTime: '2026-09-11T12:00:00Z',
  stations: [],
};

describe('CacheService (Server-Side Live Train Cache)', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService(25); // 25 seconds default TTL
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cache.clear();
    vi.restoreAllMocks();
  });

  describe('Cache Miss', () => {
    it('should invoke fetchFn on initial request (cache miss) and store result', async () => {
      const fetchFn = vi.fn().mockResolvedValue(mockTrainData);

      expect(cache.has('12301')).toBe(false);
      expect(cache.get('12301')).toBeNull();

      const result = await cache.getOrFetch('12301', fetchFn);

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result.cached).toBe(false);
      expect(result.isStale).toBe(false);
      expect(result.data.trainNumber).toBe('12301');

      // Subsequent direct get returns cached data
      expect(cache.has('12301')).toBe(true);
      expect(cache.get('12301')).toEqual(mockTrainData);
    });
  });

  describe('Cache Hit', () => {
    it('should return cached data with cached: true without invoking fetchFn within TTL', async () => {
      const fetchFn = vi.fn().mockResolvedValue(mockTrainData);

      // First call (populates cache)
      await cache.getOrFetch('12301', fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Second call within TTL
      const hitResult = await cache.getOrFetch('12301', fetchFn);

      expect(hitResult.cached).toBe(true);
      expect(hitResult.isStale).toBe(false);
      expect(hitResult.data).toEqual(mockTrainData);
      // fetchFn must NOT be invoked again
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should respect manual cache.set with custom TTL', () => {
      cache.set('12919', mockTrainData, 5000); // 5s TTL
      expect(cache.has('12919')).toBe(true);
      expect(cache.get('12919')).toEqual(mockTrainData);
    });
  });

  describe('Expiration (TTL)', () => {
    it('should expire entry after TTL and never serve expired data as fresh', async () => {
      const shortTtlCache = new CacheService(1); // 1 second TTL
      const fetchFn = vi.fn().mockResolvedValue(mockTrainData);

      await shortTtlCache.getOrFetch('12301', fetchFn, 1000); // 1000ms TTL
      expect(shortTtlCache.has('12301')).toBe(true);
      expect(shortTtlCache.isExpired('12301')).toBe(false);

      // Advance clock past TTL
      const realNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(realNow() + 1500);

      // Direct get must return null (never serve expired as fresh)
      expect(shortTtlCache.get('12301')).toBeNull();
      expect(shortTtlCache.has('12301')).toBe(false);
      expect(shortTtlCache.isExpired('12301')).toBe(true);

      // getOrFetch triggers a fresh fetch when expired
      const freshData = { ...mockTrainData, lastUpdatedTime: '2026-09-11T12:05:00Z' };
      fetchFn.mockResolvedValueOnce(freshData);

      const refreshResult = await shortTtlCache.getOrFetch('12301', fetchFn, 1000);
      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(refreshResult.cached).toBe(false);
      expect(refreshResult.isStale).toBe(false);
      expect(refreshResult.data.lastUpdatedTime).toBe('2026-09-11T12:05:00Z');
    });
  });

  describe('Concurrent Requests (Single-Flight Request Coalescing)', () => {
    it('should coalesce simultaneous requests for the same train into a single upstream fetch', async () => {
      let resolveFetch!: (value: LiveTrainData) => void;
      const delayedPromise = new Promise<LiveTrainData>((resolve) => {
        resolveFetch = resolve;
      });

      const slowFetchFn = vi.fn().mockImplementation(() => delayedPromise);

      // Launch 5 concurrent requests simultaneously for the same train
      const req1 = cache.getOrFetch('12301', slowFetchFn);
      const req2 = cache.getOrFetch('12301', slowFetchFn);
      const req3 = cache.getOrFetch('12301', slowFetchFn);
      const req4 = cache.getOrFetch('12301', slowFetchFn);
      const req5 = cache.getOrFetch('12301', slowFetchFn);

      // Only 1 outbound fetch was initiated
      expect(slowFetchFn).toHaveBeenCalledTimes(1);

      // Complete the pending promise
      resolveFetch(mockTrainData);

      const [res1, res2, res3, res4, res5] = await Promise.all([
        req1,
        req2,
        req3,
        req4,
        req5,
      ]);

      // All callers receive identical telemetry
      expect(res1.data.trainNumber).toBe('12301');
      expect(res2.data.trainNumber).toBe('12301');
      expect(res3.data.trainNumber).toBe('12301');
      expect(res4.data.trainNumber).toBe('12301');
      expect(res5.data.trainNumber).toBe('12301');

      // Still only 1 outbound call occurred
      expect(slowFetchFn).toHaveBeenCalledTimes(1);
    });

    it('should clean up in-flight requests map even if fetch fails', async () => {
      const failingFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(cache.getOrFetch('12301', failingFetch)).rejects.toThrow('Network error');

      // Subsequent call should be able to attempt a new fetch
      const workingFetch = vi.fn().mockResolvedValue(mockTrainData);
      const result = await cache.getOrFetch('12301', workingFetch);
      expect(result.data.trainNumber).toBe('12301');
      expect(workingFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Graceful Fallback on Upstream Failure (Preserve Last Successful Data)', () => {
    it('should preserve and serve last successful data when expired and upstream fails', async () => {
      const fetchFn = vi.fn().mockResolvedValue(mockTrainData);

      // 1. Initial success populates cache
      await cache.getOrFetch('12301', fetchFn, 1000);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // 2. Advance time so cache entry expires
      const realNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(realNow() + 2000);
      expect(cache.isExpired('12301')).toBe(true);

      // 3. Upstream now fails (e.g., 504 Timeout or 429 Quota Exceeded)
      fetchFn.mockRejectedValueOnce(new Error('Upstream timeout after 8000ms'));

      // 4. getOrFetch gracefully falls back to preserved last successful data
      const fallbackResult = await cache.getOrFetch('12301', fetchFn, 1000);

      expect(fallbackResult.cached).toBe(true);
      expect(fallbackResult.isStale).toBe(true);
      expect(fallbackResult.data.trainNumber).toBe('12301');
      expect(fallbackResult.data.trainName).toBe('Howrah Rajdhani Express');
    });

    it('should rethrow upstream error if no previous data exists in cache', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('Upstream 502 Bad Gateway'));

      await expect(cache.getOrFetch('99999', fetchFn)).rejects.toThrow('Upstream 502 Bad Gateway');
    });
  });

  describe('Configurable TTL', () => {
    it('should default to configured TTL (25 seconds)', () => {
      const defaultCache = new CacheService();
      expect(defaultCache.ttlSeconds).toBe(25);
      expect(defaultCache.ttlMs).toBe(25000);
    });

    it('should accept custom TTL in constructor', () => {
      const customCache = new CacheService(60);
      expect(customCache.ttlSeconds).toBe(60);
      expect(customCache.ttlMs).toBe(60000);
    });
  });
});

