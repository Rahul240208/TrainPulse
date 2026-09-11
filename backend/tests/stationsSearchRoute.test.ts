import { describe, it, expect, vi, beforeEach } from 'vitest';
import { app } from '../src/server.js';
import { stationSearchResponseSchema } from '../src/schemas/stations.js';
import { config } from '../src/config.js';

describe('Station Search API (Milestone 12)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return matching stations when searching by code "CDG"', async () => {
    const res = await app.request('/api/v1/stations/search?q=CDG');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);

    const validation = stationSearchResponseSchema.safeParse(json);
    expect(validation.success).toBe(true);

    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0].code).toBe('CDG');
    expect(json.data[0].name).toContain('Chandigarh');
  });

  it('should return matching stations when searching by full name "Chandigarh"', async () => {
    const res = await app.request('/api/v1/stations/search?q=Chandigarh');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.some((s: any) => s.code === 'CDG')).toBe(true);
  });

  it('should return matching stations when searching by partial name "Chandi"', async () => {
    const res = await app.request('/api/v1/stations/search?q=Chandi');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.some((s: any) => s.code === 'CDG')).toBe(true);
  });

  it('should handle case-insensitivity (e.g. "chandi" or "cdg")', async () => {
    const res = await app.request('/api/v1/stations/search?q=cdg');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data[0].code).toBe('CDG');
  });

  it('should return empty list when query is shorter than 2 characters (performance optimization)', async () => {
    const resEmpty = await app.request('/api/v1/stations/search?q=');
    expect(resEmpty.status).toBe(200);
    const jsonEmpty = await resEmpty.json();
    expect(jsonEmpty.data).toEqual([]);

    const resSingle = await app.request('/api/v1/stations/search?q=C');
    expect(resSingle.status).toBe(200);
    const jsonSingle = await resSingle.json();
    expect(jsonSingle.data).toEqual([]);
  });

  it('should return empty list when query produces no matches', async () => {
    const res = await app.request('/api/v1/stations/search?q=NONEXISTENTSTATIONXYZ');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
  });

  it('should never expose RAILRADAR_API_KEY in search responses', async () => {
    const secretKey = 'rr_sec_station_test_key_8877';
    const originalKey = config.RAILRADAR_API_KEY;
    config.RAILRADAR_API_KEY = secretKey;

    const res = await app.request('/api/v1/stations/search?q=CDG');
    const text = await res.text();
    expect(text).not.toContain(secretKey);

    config.RAILRADAR_API_KEY = originalKey;
  });
});
