import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      hostUri: '127.0.0.1:8081',
    },
  },
}));

vi.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

import { fetchLiveTrain, ApiError } from '../src/services/api';
import { normalizeMapData } from '../src/components/map/types';
import { generateLeafletHtml } from '../src/components/map/leafletTemplate';
import type { LiveTrainData } from '../src/types/api';

describe('Milestone 10: Frontend Error Handling & Edge Cases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchLiveTrain API Error Handling & Sanitization', () => {
    it('1. Rejects invalid train numbers before making network requests', async () => {
      const invalidInputs = ['', '123', '123456', 'abcde', '12a45', '   '];
      for (const input of invalidInputs) {
        await expect(fetchLiveTrain(input)).rejects.toThrow(ApiError);
        try {
          await fetchLiveTrain(input);
        } catch (err: any) {
          expect(err.code).toBe('INVALID_TRAIN_NUMBER');
          expect(err.message).toMatch(/5 digits|5-digit|Train number is required/i);
        }
      }
    });

    it('2. Catches network failures and returns user-friendly message without exposing internal baseUrl', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(fetchLiveTrain('12919')).rejects.toThrow(ApiError);
      try {
        await fetchLiveTrain('12919');
      } catch (err: any) {
        expect(err.code).toBe('NETWORK_ERROR');
        expect(err.statusCode).toBe(0);
        expect(err.message).toBe(
          'Unable to reach the live tracking service. Please check your internet connection and try again.'
        );
        // Ensure no internal URLs or ports are leaked
        expect(err.message).not.toContain('http');
        expect(err.message).not.toContain('localhost');
        expect(err.message).not.toContain(':3000');
      }
    });

    it('3. Catches AbortError / timeout and returns user-friendly message', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
      );

      try {
        await fetchLiveTrain('12919');
      } catch (err: any) {
        expect(err.code).toBe('TIMEOUT');
        expect(err.statusCode).toBe(504);
        expect(err.message).toContain('timed out');
      }
    });

    it('4. Handles backend 404 Train Not Found with friendly message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'TRAIN_NOT_FOUND', message: 'Train 99999 not found on Indian Railways' },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      );

      try {
        await fetchLiveTrain('99999');
      } catch (err: any) {
        expect(err.code).toBe('TRAIN_NOT_FOUND');
        expect(err.statusCode).toBe(404);
        expect(err.message).toContain('Train 99999 not found');
      }
    });

    it('5. Handles backend 429 Quota Exceeded with friendly message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'UPSTREAM_RATE_LIMITED', message: 'Quota limit reached' },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      );

      try {
        await fetchLiveTrain('12919');
      } catch (err: any) {
        expect(err.code).toBe('UPSTREAM_RATE_LIMITED');
        expect(err.statusCode).toBe(429);
      }
    });

    it('6. Handles malformed non-JSON backend response gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('<html><body>502 Bad Gateway</body></html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        })
      );

      try {
        await fetchLiveTrain('12919');
      } catch (err: any) {
        expect(err.code).toBe('INVALID_RESPONSE');
        expect(err.statusCode).toBe(502);
      }
    });
  });

  describe('UI & Map Defensive Resilience: Missing Data & Edge Cases', () => {
    const baseTrain: LiveTrainData = {
      trainNumber: '12919',
      trainName: 'Malwa Express',
      trainType: 'Superfast Express',
      sourceStation: 'Dr. Ambedkar Nagar',
      sourceCode: 'DADN',
      destinationStation: 'SMVD Katra',
      destinationCode: 'SVDK',
      status: 'RUNNING',
      currentLocation: {
        name: 'Near Bhopal Jn',
        latitude: null,
        longitude: null,
        speedKmH: 75,
        positionType: 'ESTIMATED_SCHEDULE',
      },
      delayMinutes: 10,
      nextStation: null,
      lastUpdatedTime: '2026-09-11 16:30:00',
      stations: [],
    };

    it('7. Missing coordinates: normalizeMapData safely reports hasExactCoordinates: false', () => {
      const normalized = normalizeMapData(baseTrain);
      expect(normalized.hasExactCoordinates).toBe(false);
      expect(normalized.latitude).toBeNull();
      expect(normalized.longitude).toBeNull();
      expect(normalized.currentStationName).toBe('Near Bhopal Jn');
    });

    it('8. Missing next station: normalizeMapData returns nextStation: null without crashing', () => {
      const normalized = normalizeMapData(baseTrain);
      expect(normalized.nextStation).toBeNull();
    });

    it('9. Cancelled train: normalizeMapData reflects CANCELLED status accurately', () => {
      const cancelledTrain: LiveTrainData = {
        ...baseTrain,
        status: 'CANCELLED',
        currentLocation: {
          ...baseTrain.currentLocation,
          name: 'Service Cancelled',
          speedKmH: 0,
        },
      };

      const normalized = normalizeMapData(cancelledTrain);
      expect(normalized.status).toBe('CANCELLED');
      expect(normalized.currentStationName).toBe('Service Cancelled');
      expect(normalized.speedKmH).toBe(0);
    });

    it('10. Leaflet HTML Generator: renders truthful telemetry notice when coordinates are null', () => {
      const normalized = normalizeMapData(baseTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toBeDefined();
      expect(html).toContain('Truthful Telemetry');
      expect(html).toContain('Live GPS coordinates not provided by upstream radar');
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('undefined');
    });

    it('11. Leaflet HTML Generator: renders status-aware popup text when nextStation is null', () => {
      const cancelledTrain: LiveTrainData = {
        ...baseTrain,
        status: 'CANCELLED',
        currentLocation: {
          ...baseTrain.currentLocation,
          name: 'Service Cancelled',
          speedKmH: 0,
        },
      };

      const normalized = normalizeMapData(cancelledTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toBeDefined();
      expect(html).toContain('Service Cancelled');
    });
  });
});
