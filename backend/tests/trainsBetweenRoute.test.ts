import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app } from '../src/server.js';
import { trainsBetweenResponseSchema } from '../src/schemas/trainsBetween.js';
import { config } from '../src/config.js';

describe('TrainPulse Backend Where-to-Where Search API (Milestone 11)', () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = config.RAILRADAR_API_KEY;
    config.RAILRADAR_API_KEY = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    config.RAILRADAR_API_KEY = originalKey;
  });

  describe('GET /api/v1/trains/between', () => {
    it('should return 200 with list of trains between Chandigarh (CDG) and New Delhi (NDLS)', async () => {
      const res = await app.request('/api/v1/trains/between?from=CDG&to=NDLS');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();

      const validation = trainsBetweenResponseSchema.safeParse(json.data);
      expect(validation.success).toBe(true);

      const data = json.data;
      expect(data.from.code).toBe('CDG');
      expect(data.to.code).toBe('NDLS');
      expect(data.totalTrains).toBeGreaterThanOrEqual(1);

      // Verify train fields
      const train = data.trains[0];
      expect(train.trainNumber).toBeDefined();
      expect(train.trainName).toBeDefined();
      expect(train.departure).toBeDefined();
      expect(train.arrival).toBeDefined();
      expect(train.duration).toBeDefined();
      expect(Array.isArray(train.runningDays)).toBe(true);
    });

    it('should handle case insensitivity and whitespace in station codes', async () => {
      const res = await app.request('/api/v1/trains/between?from=cdg&to=ndls');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.from.code).toBe('CDG');
      expect(json.data.to.code).toBe('NDLS');
    });

    it('should return 200 with reverse route trains between NDLS and CDG', async () => {
      const res = await app.request('/api/v1/trains/between?from=NDLS&to=CDG');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.from.code).toBe('NDLS');
      expect(json.data.to.code).toBe('CDG');
      expect(json.data.totalTrains).toBeGreaterThanOrEqual(1);
    });

    it('should return 200 with trains found along routes in MOCK_TRAIN_DATABASE (HWH to NDLS)', async () => {
      const res = await app.request('/api/v1/trains/between?from=HWH&to=NDLS');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.trains.some((t: any) => t.trainNumber === '12301')).toBe(true);
    });

    it('should return 400 when from or to query parameters are missing', async () => {
      const missingTo = await app.request('/api/v1/trains/between?from=CDG');
      expect(missingTo.status).toBe(400);
      const jsonTo = await missingTo.json();
      expect(jsonTo.success).toBe(false);
      expect(jsonTo.error.code).toBe('MISSING_STATION_QUERY');

      const missingFrom = await app.request('/api/v1/trains/between?to=NDLS');
      expect(missingFrom.status).toBe(400);
      const jsonFrom = await missingFrom.json();
      expect(jsonFrom.success).toBe(false);
      expect(jsonFrom.error.code).toBe('MISSING_STATION_QUERY');
    });

    it('should return 400 when source and destination stations are the same', async () => {
      const res = await app.request('/api/v1/trains/between?from=NDLS&to=NDLS');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('SAME_STATION');
      expect(json.error.message).toContain('cannot be the same');
    });

    it('should return 400 when station code is invalid (e.g. single letter or special chars)', async () => {
      const res = await app.request('/api/v1/trains/between?from=X&to=NDLS');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_STATION_CODE');
    });

    it('should return 200 with totalTrains: 0 when no trains run between stations', async () => {
      const res = await app.request('/api/v1/trains/between?from=XYZ1&to=XYZ2');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.totalTrains).toBe(0);
      expect(json.data.trains).toEqual([]);
    });

    it('should handle upstream API timeout gracefully when RailRadar API key is active', async () => {
      const originalKey = config.RAILRADAR_API_KEY;
      config.RAILRADAR_API_KEY = 'test_api_key_active';

      vi.spyOn(global, 'fetch').mockImplementationOnce(() => {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const res = await app.request('/api/v1/trains/between?from=CDG&to=NDLS');
      expect(res.status).toBe(504);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UPSTREAM_TIMEOUT');

      config.RAILRADAR_API_KEY = originalKey;
    });

    it('should handle upstream rate limit (429) gracefully', async () => {
      const originalKey = config.RAILRADAR_API_KEY;
      config.RAILRADAR_API_KEY = 'test_api_key_active';

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await app.request('/api/v1/trains/between?from=CDG&to=NDLS');
      expect(res.status).toBe(429);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UPSTREAM_RATE_LIMITED');

      config.RAILRADAR_API_KEY = originalKey;
    });

    it('should never expose RAILRADAR_API_KEY in error responses or body', async () => {
      const originalKey = config.RAILRADAR_API_KEY;
      const secretKey = 'rr_sec_test_secret_998811';
      config.RAILRADAR_API_KEY = secretKey;

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response('Internal Server Failure with token ' + secretKey, {
          status: 500,
        })
      );

      const res = await app.request('/api/v1/trains/between?from=CDG&to=NDLS');
      const text = await res.text();
      expect(text).not.toContain(secretKey);

      config.RAILRADAR_API_KEY = originalKey;
    });
  });
});
