import { describe, it, expect } from 'vitest';
import { app } from '../src/server.js';
import { searchGlobal } from '../src/services/search.service.js';

describe('Global Search API (Milestone 11: Map-First Train Search)', () => {
  describe('GET /api/v1/search', () => {
    it('1. should return empty array when query is less than 2 characters', async () => {
      const res = await app.request('/api/v1/search?q=1');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });

    it('2. should find exact train by 5-digit train number (12046)', async () => {
      const res = await app.request('/api/v1/search?q=12046');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);

      const first = json.data[0];
      expect(first.type).toBe('TRAIN');
      expect(first.trainNumber).toBe('12046');
      expect(first.trainName).toBe('Chandigarh Shatabdi Express');
      expect(first.source.code).toBe('CDG');
      expect(first.destination.code).toBe('NDLS');
    });

    it('3. should find trains by name substring ("Shatabdi")', async () => {
      const res = await app.request('/api/v1/search?q=Shatabdi');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);

      const trainResults = json.data.filter((item: any) => item.type === 'TRAIN');
      expect(trainResults.length).toBeGreaterThan(0);
      expect(trainResults.some((t: any) => t.trainName.includes('Shatabdi'))).toBe(true);
    });

    it('4. should find station and relevant trains by station code ("CDG")', async () => {
      const res = await app.request('/api/v1/search?q=CDG');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);

      const stationItem = json.data.find((item: any) => item.type === 'STATION');
      expect(stationItem).toBeDefined();
      expect(stationItem.stationCode).toBe('CDG');
      expect(stationItem.stationName).toBe('Chandigarh Junction');
    });

    it('5. should find stations by name ("New Delhi")', async () => {
      const res = await app.request('/api/v1/search?q=New%20Delhi');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);

      const hasStation = json.data.some((item: any) => item.type === 'STATION' && item.stationCode === 'NDLS');
      expect(hasStation).toBe(true);
    });

    it('6. should return empty array when query has zero matches', async () => {
      const res = await app.request('/api/v1/search?q=ZZZZZZZZ');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });

    it('7. should trim whitespace and be case-insensitive', async () => {
      const res = await app.request('/api/v1/search?q=%20%20rajdhani%20%20');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].type).toBe('TRAIN');
    });
  });

  describe('searchGlobal Service Unit Tests', () => {
    it('should prioritize exact train number matches at the top', async () => {
      const results = await searchGlobal('12301');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].trainNumber).toBe('12301');
      expect(results[0].type).toBe('TRAIN');
    });

    it('should return max 15 results', async () => {
      const results = await searchGlobal('Express');
      expect(results.length).toBeLessThanOrEqual(15);
    });
  });
});

