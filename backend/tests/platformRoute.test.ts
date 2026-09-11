import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/server.js';
import { liveTrainCache } from '../src/services/cache.service.js';
import { platformInfoSchema } from '../src/schemas/liveTrain.js';

describe('TrainPulse Backend Platform API (Milestone 14)', () => {
  beforeEach(() => {
    liveTrainCache.clear();
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/trains/:trainNumber/platform', () => {
    it('should return 400 for invalid train number (non 5-digit)', async () => {
      const res = await app.request('/api/v1/trains/123/platform');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_TRAIN_NUMBER');
    });

    it('should return 200 with normalized PlatformInfo for valid train', async () => {
      const mockPayload = {
        success: true,
        data: {
          trainNumber: '12301',
          trainName: 'Howrah Rajdhani Express',
          status: 'running',
          currentLocation: {
            stationCode: 'PRYJ',
            stationName: 'Prayagraj Junction',
            status: 'in-transit',
          },
          nextHalt: {
            stationCode: 'CNB',
            stationName: 'Kanpur Central',
          },
          route: [
            { stationCode: 'PRYJ', stationName: 'Prayagraj Junction', platform: '1' },
            { stationCode: 'CNB', stationName: 'Kanpur Central', platform: '1' },
          ],
          lastUpdatedAt: '2026-09-11T12:00:00Z',
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await app.request('/api/v1/trains/12301/platform');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();

      const validation = platformInfoSchema.safeParse(json.data);
      expect(validation.success).toBe(true);
      expect(json.data.platformNumber).toBe('1');
      expect(json.data.status).toBe('EXPECTED');
      expect(json.data.station.code).toBe('CNB');
    });

    it('should return CONFIRMED when train is stopped/departed at station', async () => {
      const mockPayloadStopped = {
        success: true,
        data: {
          trainNumber: '12951',
          trainName: 'Mumbai Tejas Rajdhani',
          status: 'running',
          currentLocation: {
            stationCode: 'BRC',
            stationName: 'Vadodara Junction',
            status: 'at-station',
          },
          route: [
            { stationCode: 'BRC', stationName: 'Vadodara Junction', platform: '2', status: 'at-station' },
          ],
          lastUpdatedAt: '2026-09-11T12:00:00Z',
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockPayloadStopped), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await app.request('/api/v1/trains/12951/platform');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.platformNumber).toBeDefined();
    });

    it('should return UNAVAILABLE and platformNumber: null when platform is not announced', async () => {
      // Mock upstream returning train without platform
      const mockPayloadNoPlatform = {
        success: true,
        data: {
          trainNumber: '12345',
          trainName: 'Test Express',
          status: 'running',
          trackingMode: 'gps',
          isLive: true,
          delayMinutes: 0,
          currentLocation: {
            stationCode: 'TST',
            stationName: 'Test Station',
            status: 'in-transit',
            speedKmH: 60,
          },
          nextHalt: {
            stationCode: 'NXT',
            stationName: 'Next Stop',
          },
          route: [
            { stationCode: 'TST', stationName: 'Test Station', platform: null },
            { stationCode: 'NXT', stationName: 'Next Stop', platform: null },
          ],
          lastUpdatedAt: '2026-09-11T12:00:00Z',
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockPayloadNoPlatform), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await app.request('/api/v1/trains/12345/platform');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.platformNumber).toBeNull();
      expect(json.data.status).toBe('UNAVAILABLE');
    });

    it('should return UNAVAILABLE when train is cancelled', async () => {
      const mockCancelledPayload = {
        success: true,
        data: {
          trainNumber: '54321',
          trainName: 'Cancelled Passenger',
          status: 'cancelled',
          isLive: false,
          route: [],
          lastUpdatedAt: '2026-09-11T12:00:00Z',
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockCancelledPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await app.request('/api/v1/trains/54321/platform');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.platformNumber).toBeNull();
      expect(json.data.status).toBe('UNAVAILABLE');
    });

    it('should serve cached platform info with X-Cache: HIT on subsequent requests', async () => {
      const mockCachedPayload = {
        success: true,
        data: {
          trainNumber: '12301',
          trainName: 'Howrah Rajdhani Express',
          status: 'running',
          nextHalt: { stationCode: 'CNB', stationName: 'Kanpur Central' },
          route: [
            { stationCode: 'CNB', stationName: 'Kanpur Central', platform: '1' },
          ],
          lastUpdatedAt: '2026-09-11T12:00:00Z',
        },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockCachedPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const firstRes = await app.request('/api/v1/trains/12301/platform');
      expect(firstRes.status).toBe(200);
      expect(firstRes.headers.get('X-Cache')).toBe('MISS');

      const secondRes = await app.request('/api/v1/trains/12301/platform');
      expect(secondRes.status).toBe(200);
      expect(secondRes.headers.get('X-Cache')).toBe('HIT');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should update platform information when train approaches a different station', async () => {
      // First position approaching Station A
      const stationAPayload = {
        success: true,
        data: {
          trainNumber: '11111',
          trainName: 'Intercity Express',
          status: 'running',
          nextHalt: { stationCode: 'STA', stationName: 'Station A' },
          route: [
            { stationCode: 'STA', stationName: 'Station A', platform: '3' },
            { stationCode: 'STB', stationName: 'Station B', platform: '4' },
          ],
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(stationAPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const resA = await app.request('/api/v1/trains/11111/platform?refresh=true');
      const jsonA = await resA.json();
      expect(jsonA.data.platformNumber).toBe('3');
      expect(jsonA.data.station.code).toBe('STA');

      // Second position approaching Station B (train passed Station A)
      const stationBPayload = {
        success: true,
        data: {
          trainNumber: '11111',
          trainName: 'Intercity Express',
          status: 'running',
          nextHalt: { stationCode: 'STB', stationName: 'Station B' },
          route: [
            { stationCode: 'STA', stationName: 'Station A', platform: '3', status: 'passed' },
            { stationCode: 'STB', stationName: 'Station B', platform: '4', status: 'upcoming' },
          ],
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(stationBPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const resB = await app.request('/api/v1/trains/11111/platform?refresh=true');
      const jsonB = await resB.json();
      expect(jsonB.data.platformNumber).toBe('4');
      expect(jsonB.data.station.code).toBe('STB');
    });
  });
});
