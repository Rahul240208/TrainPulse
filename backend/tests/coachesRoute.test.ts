import { describe, it, expect, vi } from 'vitest';
import { app } from '../src/server.js';
import { coachCompositionSchema } from '../src/schemas/liveTrain.js';

describe('TrainPulse Backend Coaches API (Milestone 15)', () => {
  describe('GET /api/v1/trains/:trainNumber/coaches', () => {
    it('should return 400 for invalid train number', async () => {
      const res = await app.request('/api/v1/trains/99/coaches');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_TRAIN_NUMBER');
    });

    it('should return verified coach composition for Howrah Rajdhani (12301)', async () => {
      const res = await app.request('/api/v1/trains/12301/coaches');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      const validation = coachCompositionSchema.safeParse(json.data);
      expect(validation.success).toBe(true);

      expect(json.data.trainNumber).toBe('12301');
      expect(json.data.available).toBe(true);
      expect(json.data.totalCoaches).toBeGreaterThanOrEqual(16);

      // Verify specific coach types
      const types = json.data.coaches.map((c: any) => c.type);
      expect(types).toContain('ENGINE');
      expect(types).toContain('AC_3_TIER');
      expect(types).toContain('AC_2_TIER');
      expect(types).toContain('FIRST_AC');
      expect(types).toContain('PANTRY');
      expect(types).toContain('POWER_CAR');
    });

    it('should return verified coach composition for Bhopal Shatabdi (12002)', async () => {
      const res = await app.request('/api/v1/trains/12002/coaches');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.available).toBe(true);

      const types = json.data.coaches.map((c: any) => c.type);
      expect(types).toContain('CHAIR_CAR');
      expect(types).toContain('EXECUTIVE_CHAIR_CAR');
    });

    it('should return verified coach composition for Vande Bharat (20901)', async () => {
      const res = await app.request('/api/v1/trains/20901/coaches');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.available).toBe(true);

      // First and last coaches should be driving trailer cars (Engine)
      const coaches = json.data.coaches;
      expect(coaches[0].type).toBe('ENGINE');
      expect(coaches[coaches.length - 1].type).toBe('ENGINE');
    });

    it('should return available: false for train without verified coach data (Never invent fake coaches)', async () => {
      const res = await app.request('/api/v1/trains/99999/coaches');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.trainNumber).toBe('99999');
      expect(json.data.available).toBe(false);
      expect(json.data.totalCoaches).toBe(0);
      expect(json.data.coaches).toEqual([]);
    });

    it('should include Cache-Control header in response', async () => {
      const res = await app.request('/api/v1/trains/12301/coaches');
      expect(res.headers.get('Cache-Control')).toContain('public');
    });
  });
});
