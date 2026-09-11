import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/server.js';
import { liveTrainDataSchema } from '../src/schemas/liveTrain.js';
import { liveTrainCache } from '../src/services/cache.service.js';

describe('TrainPulse Backend Live Tracking API', () => {
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
        { sequence: 1, stationCode: 'HWH', stationName: 'Howrah', isHalt: true, status: 'passed' },
        { sequence: 2, stationCode: 'NDLS', stationName: 'New Delhi', isHalt: true, status: 'upcoming' },
      ],
      lastUpdatedAt: '2026-09-11T12:00:00Z',
    },
  };

  beforeEach(() => {
    liveTrainCache.clear();
    vi.restoreAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 OK with health status and uptime', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe('ok');
      expect(json.timestamp).toBeDefined();
      expect(json.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /', () => {
    it('should return 200 with API metadata', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.name).toBe('TrainPulse API');
      expect(json.version).toBe('1.0.0');
      expect(json.endpoints.liveTracking).toBe('/api/v1/trains/:trainNumber/live');
    });
  });

  describe('GET /api/v1/trains/:trainNumber/live', () => {
    it('should return 200 with valid schema and X-Cache: MISS on first request', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(sampleRailRadarResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await app.request('/api/v1/trains/12301/live');
      expect(res.status).toBe(200);
      expect(res.headers.get('X-Cache')).toBe('MISS');

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.trainNumber).toBe('12301');
      expect(json.data.trainName).toBe('Howrah Rajdhani Express');
      expect(json.data.currentLocation.positionType).toBe('ACTUAL_GPS');

      // Canonical schema validation
      const schemaCheck = liveTrainDataSchema.safeParse(json.data);
      expect(schemaCheck.success).toBe(true);
    });

    it('should return X-Cache: HIT on subsequent request within TTL', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(sampleRailRadarResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Request 1: Miss
      const res1 = await app.request('/api/v1/trains/12301/live');
      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Cache')).toBe('MISS');

      // Request 2: Hit
      const res2 = await app.request('/api/v1/trains/12301/live');
      expect(res2.status).toBe(200);
      expect(res2.headers.get('X-Cache')).toBe('HIT');
    });

    it('should return X-Cache: STALE and preserve last successful data when upstream fails after expiration', async () => {
      // 1. First populate cache
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(sampleRailRadarResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      const res1 = await app.request('/api/v1/trains/12301/live');
      expect(res1.status).toBe(200);

      // 2. Advance time past 25s TTL
      const realNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(realNow() + 30000);

      // 3. Upstream times out on next fetch
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
      );

      // 4. Request returns 200 with X-Cache: STALE and Warning header
      const res2 = await app.request('/api/v1/trains/12301/live');
      expect(res2.status).toBe(200);
      expect(res2.headers.get('X-Cache')).toBe('STALE');
      expect(res2.headers.get('Warning')).toContain('Response is Stale');

      const json = await res2.json();
      expect(json.success).toBe(true);
      expect(json.data.trainNumber).toBe('12301');
    });

    it('should reject train numbers with less than 5 digits (HTTP 400)', async () => {
      const res = await app.request('/api/v1/trains/1234/live');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_TRAIN_NUMBER');
      expect(json.error.message).toContain('Train number must be exactly 5 numeric digits');
    });

    it('should reject train numbers with more than 5 digits (HTTP 400)', async () => {
      const res = await app.request('/api/v1/trains/123456/live');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_TRAIN_NUMBER');
    });

    it('should reject non-numeric train numbers (HTTP 400)', async () => {
      const res = await app.request('/api/v1/trains/abcde/live');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_TRAIN_NUMBER');
    });

    it('should return 404 when upstream reports train not found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'TRAIN_NOT_FOUND', message: 'Train 99999 not found' },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await app.request('/api/v1/trains/99999/live');
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('TRAIN_NOT_FOUND');
    });

    it('should return 429 when upstream rate limit is hit', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Quota exceeded' },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await app.request('/api/v1/trains/12301/live');
      expect(res.status).toBe(429);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UPSTREAM_RATE_LIMITED');
    });

    it('should return 504 when upstream request times out', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
      );

      const res = await app.request('/api/v1/trains/12301/live');
      expect(res.status).toBe(504);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UPSTREAM_TIMEOUT');
    });

    it('should return 404 for unknown endpoints', async () => {
      const res = await app.request('/api/v1/nonexistent');
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('should include CORS headers in responses', async () => {
      const res = await app.request('/health', {
        headers: { Origin: 'http://localhost:8081' },
      });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
