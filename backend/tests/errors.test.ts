import { describe, it, expect, vi, beforeEach } from 'vitest';
import { app } from '../src/server.js';
import { liveTrainCache } from '../src/services/cache.service.js';
import { transformRailRadarToTrainPulse } from '../src/services/transformer.service.js';
import { liveTrainDataSchema } from '../src/schemas/liveTrain.js';
import type { RailRadarData } from '../src/schemas/railradar.js';

describe('Milestone 10: Backend Error Handling & Security Sanitization', () => {
  beforeEach(() => {
    liveTrainCache.clear();
    vi.restoreAllMocks();
  });

  describe('Security Sanitization & Zero Leakage', () => {
    it('1. Never exposes API keys in error messages', async () => {
      // Mock upstream returning an error that includes an API key pattern
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: `Unauthorized for key rg_3ba82a757562434b9eb25982eb9e925f and token Bearer mysecrettoken123`,
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await app.request('/api/v1/trains/12301/live');
      expect(res.status).toBe(502);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();

      const responseString = JSON.stringify(json);
      // Key must be redacted
      expect(responseString).not.toContain('rg_3ba82a757562434b9eb25982eb9e925f');
      expect(responseString).not.toContain('mysecrettoken123');
      expect(responseString).toContain('[REDACTED]');
    });

    it('2. Never exposes stack traces or internal server paths on unhandled errors', async () => {
      // Force an unexpected internal error inside cache service
      vi.spyOn(liveTrainCache, 'getOrFetch').mockImplementationOnce(() => {
        const err = new Error('Unexpected crash at C:\\Users\\Sagar\\TrainPulse\\backend\\server.ts:42:15');
        err.stack = 'Error: Unexpected crash\n  at Object.<anonymous> (C:\\Users\\Sagar\\TrainPulse\\backend\\server.ts:42:15)';
        throw err;
      });

      const res = await app.request('/api/v1/trains/12301/live');
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(json.error.message).toBe('An internal error occurred while processing your request. Please try again later.');

      const responseString = JSON.stringify(json);
      expect(responseString).not.toContain('C:\\Users');
      expect(responseString).not.toContain('server.ts');
      expect(responseString).not.toContain('at Object.<anonymous>');
    });
  });

  describe('HTTP Error Responses & User-Friendly Messages', () => {
    it('3. Returns 400 with user-friendly message for invalid train numbers', async () => {
      const cases = ['12', '1234', '123456', 'abcde', '12a45', '  '];
      for (const invalidNumber of cases) {
        const res = await app.request(`/api/v1/trains/${encodeURIComponent(invalidNumber)}/live`);
        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_TRAIN_NUMBER');
        expect(json.error.message).toContain('5 numeric digits');
      }
    });

    it('4. Returns 404 with friendly message when train is not found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            message: 'No train record found for 99999',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await app.request('/api/v1/trains/99999/live');
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('TRAIN_NOT_FOUND');
      expect(json.error.message).toContain('99999');
    });

    it('5. Returns 429 when upstream rate limit is encountered', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            message: 'Rate limit exceeded: 1000 requests / month used',
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

    it('6. Returns 504 when upstream request times out after 8s limit', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
      );

      const res = await app.request('/api/v1/trains/12301/live');
      expect(res.status).toBe(504);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UPSTREAM_TIMEOUT');
    });

    it('7. Returns 503 when upstream service returns 502 or 503', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Service Unavailable', { status: 503 })
      );

      const res = await app.request('/api/v1/trains/12301/live');
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UPSTREAM_UNAVAILABLE');
    });

    it('8. Returns 502 when upstream returns malformed non-JSON payload', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('<html><body>502 Bad Gateway</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      );

      const res = await app.request('/api/v1/trains/12301/live');
      expect(res.status).toBe(502);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_UPSTREAM_RESPONSE');
    });

    it('9. Returns 502 when upstream payload fails Zod schema validation', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              // Missing required trainNumber, trainName, etc.
              unexpectedKey: 'unexpected',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await app.request('/api/v1/trains/12301/live');
      expect(res.status).toBe(502);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_UPSTREAM_RESPONSE');
    });
  });

  describe('Transformer Defensive Data Handling & Zero Invented Coordinates', () => {
    it('10. Missing coordinates: Sets latitude and longitude to null instead of inventing coordinates', () => {
      const dataWithoutCoords: RailRadarData = {
        trainNumber: '12919',
        trainName: 'Malwa Express',
        status: 'running',
        currentLocation: {
          stationCode: 'BPL',
          stationName: 'Bhopal Jn',
          status: 'in-transit',
          // No lat/lng
        },
      };

      const result = transformRailRadarToTrainPulse(dataWithoutCoords);
      expect(result.currentLocation.latitude).toBeNull();
      expect(result.currentLocation.longitude).toBeNull();
      expect(result.currentLocation.name).toBe('Near Bhopal Jn');

      const validation = liveTrainDataSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('11. Missing next station: Gracefully sets nextStation to null without crashing', () => {
      const dataWithoutNextHalt: RailRadarData = {
        trainNumber: '12919',
        trainName: 'Malwa Express',
        status: 'running',
        // No nextHalt, no route
      };

      const result = transformRailRadarToTrainPulse(dataWithoutNextHalt);
      expect(result.nextStation).toBeNull();

      const validation = liveTrainDataSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('12. Cancelled train: Normalizes status to CANCELLED, sets speed to 0, nextStation to null', () => {
      const cancelledData: RailRadarData = {
        trainNumber: '12919',
        trainName: 'Malwa Express',
        status: 'cancelled',
        currentLocation: {
          speedKmH: 80, // Upstream stale speed
        },
        nextHalt: {
          stationCode: 'BPL',
          stationName: 'Bhopal',
        },
      };

      const result = transformRailRadarToTrainPulse(cancelledData);
      expect(result.status).toBe('CANCELLED');
      expect(result.currentLocation.speedKmH).toBe(0);
      expect(result.currentLocation.name).toBe('Service Cancelled');
      expect(result.nextStation).toBeNull();

      const validation = liveTrainDataSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('13. Diverted train: Normalizes status to DIVERTED and preserves speed/telemetry', () => {
      const divertedData: RailRadarData = {
        trainNumber: '12919',
        trainName: 'Malwa Express',
        status: 'diverted via loop',
        currentLocation: {
          speedKmH: 65,
          stationName: 'Itarsi Bypass',
        },
      };

      const result = transformRailRadarToTrainPulse(divertedData);
      expect(result.status).toBe('DIVERTED');
      expect(result.currentLocation.speedKmH).toBe(65);

      const validation = liveTrainDataSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('14. Train not started: Normalizes status to NOT_STARTED, sets speed to 0', () => {
      const notStartedData: RailRadarData = {
        trainNumber: '12919',
        trainName: 'Malwa Express',
        status: 'not started yet',
        train: {
          number: '12919',
          name: 'Malwa Express',
          source: { code: 'DADN', name: 'Dr. Ambedkar Nagar' },
          destination: { code: 'SVDK', name: 'SMVD Katra' },
        },
        currentLocation: {
          speedKmH: 50,
        },
      };

      const result = transformRailRadarToTrainPulse(notStartedData);
      expect(result.status).toBe('NOT_STARTED');
      expect(result.currentLocation.speedKmH).toBe(0);
      expect(result.currentLocation.name).toBe('At Dr. Ambedkar Nagar');

      const validation = liveTrainDataSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('15. Arrived train: Normalizes status to ARRIVED, sets speed to 0, nextStation to null', () => {
      const arrivedData: RailRadarData = {
        trainNumber: '12919',
        trainName: 'Malwa Express',
        status: 'arrived at destination',
        train: {
          number: '12919',
          name: 'Malwa Express',
          source: { code: 'DADN', name: 'Dr. Ambedkar Nagar' },
          destination: { code: 'SVDK', name: 'SMVD Katra' },
        },
        currentLocation: {
          speedKmH: 30,
        },
      };

      const result = transformRailRadarToTrainPulse(arrivedData);
      expect(result.status).toBe('ARRIVED');
      expect(result.currentLocation.speedKmH).toBe(0);
      expect(result.currentLocation.name).toBe('At SMVD Katra');
      expect(result.nextStation).toBeNull();

      const validation = liveTrainDataSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });
  });
});
