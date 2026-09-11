import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchFromRailRadarDirect,
  getLiveTrainTelemetry,
} from '../src/services/railradar.service.js';
import { liveTrainCache, CacheService } from '../src/services/cache.service.js';
import {
  TrainNotFoundError,
  RateLimitError,
  UpstreamTimeoutError,
  UpstreamAuthError,
  InvalidUpstreamResponseError,
  UpstreamError,
} from '../src/services/errors.js';

describe('RailRadar Service & Caching Integration', () => {
  const sampleRailRadarResponse = {
    success: true,
    data: {
      trainNumber: '12301',
      trainName: 'Howrah Rajdhani Express',
      status: 'running',
      trackingMode: 'gps',
      isLive: true,
      delayMinutes: 0,
      train: {
        number: '12301',
        name: 'Howrah Rajdhani Express',
        type: 'Rajdhani Express',
        source: { code: 'HWH', name: 'Howrah', lat: 22.58, lng: 88.34 },
        destination: { code: 'NDLS', name: 'New Delhi', lat: 28.64, lng: 77.22 },
        avgSpeed: 85,
      },
      currentLocation: {
        stationCode: 'CNB',
        stationName: 'Kanpur Central',
        status: 'in-transit',
        isHalt: true,
        delayMinutes: 0,
        lat: 26.45,
        lng: 80.35,
        speedKmH: 120,
      },
      nextHalt: {
        stationCode: 'NDLS',
        stationName: 'New Delhi',
        distance: 440,
      },
      route: [
        {
          sequence: 1,
          stationCode: 'HWH',
          stationName: 'Howrah',
          isHalt: true,
          status: 'passed',
        },
        {
          sequence: 2,
          stationCode: 'NDLS',
          stationName: 'New Delhi',
          isHalt: true,
          status: 'upcoming',
        },
      ],
      lastUpdatedAt: '2026-09-11T12:00:00Z',
    },
  };

  beforeEach(() => {
    liveTrainCache.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchFromRailRadarDirect HTTP Handling', () => {
    it('should successfully fetch, validate, and transform upstream data', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(sampleRailRadarResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await fetchFromRailRadarDirect('12301');
      expect(result.trainNumber).toBe('12301');
      expect(result.trainName).toBe('Howrah Rajdhani Express');
      expect(result.currentLocation.positionType).toBe('ACTUAL_GPS');
    });

    it('should throw TrainNotFoundError on 404 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'TRAIN_NOT_FOUND', message: 'Train 99999 not found' },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(fetchFromRailRadarDirect('99999')).rejects.toThrow(TrainNotFoundError);
    });

    it('should throw RateLimitError on 429 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Quota exceeded' },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(fetchFromRailRadarDirect('12301')).rejects.toThrow(RateLimitError);
    });

    it('should throw UpstreamAuthError on 401 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid API Key' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(fetchFromRailRadarDirect('12301')).rejects.toThrow(UpstreamAuthError);
    });

    it('should throw UpstreamError on 500 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, message: 'Internal upstream crash' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(fetchFromRailRadarDirect('12301')).rejects.toThrow(UpstreamError);
    });

    it('should throw UpstreamTimeoutError on fetch AbortError', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
      );

      await expect(fetchFromRailRadarDirect('12301', 50)).rejects.toThrow(UpstreamTimeoutError);
    });

    it('should throw InvalidUpstreamResponseError on malformed JSON schema', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { invalidKey: 123 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(fetchFromRailRadarDirect('12301')).rejects.toThrow(
        InvalidUpstreamResponseError
      );
    });
  });

  describe('Cache TTL & Single-Flight Request Coalescing', () => {
    it('should serve second request from in-memory cache with cached: true', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(sampleRailRadarResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // First call -> Cache Miss
      const first = await getLiveTrainTelemetry('12301');
      expect(first.cached).toBe(false);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call within 30s -> Cache Hit
      const second = await getLiveTrainTelemetry('12301');
      expect(second.cached).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // No new network call!
    });

    it('should coalesce concurrent requests into a single outbound flight', async () => {
      let resolvePromise: (value: Response) => void;
      const deferredResponse = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => deferredResponse);

      // Launch two concurrent queries for the same train number
      const req1 = getLiveTrainTelemetry('12301');
      const req2 = getLiveTrainTelemetry('12301');

      // Resolve the single fetch promise
      resolvePromise!(
        new Response(JSON.stringify(sampleRailRadarResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const [res1, res2] = await Promise.all([req1, req2]);

      expect(res1.data.trainNumber).toBe('12301');
      expect(res2.data.trainNumber).toBe('12301');
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Only 1 outbound fetch!
    });

    it('should expire cache after TTL', () => {
      const customCache = new CacheService(1); // 1 second TTL
      const mockData: any = { trainNumber: '12301' };

      customCache.set('12301', mockData, 50); // 50ms TTL
      expect(customCache.get('12301')).toEqual(mockData);

      // Simulate time passage
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 100);
      expect(customCache.get('12301')).toBeNull();
    });
  });
});

