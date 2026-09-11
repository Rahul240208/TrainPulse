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

import { searchStationsApi } from '../src/services/api';
import type { StationSearchResult } from '../src/types/api';

describe('searchStationsApi & Autocomplete Logic (Milestone 12)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty array immediately when query is less than 2 characters (performance optimization)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const resultEmpty = await searchStationsApi('');
    expect(resultEmpty).toEqual([]);

    const resultSingle = await searchStationsApi('C');
    expect(resultSingle).toEqual([]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should return matching stations from backend when query is "Chandi"', async () => {
    const mockResults: StationSearchResult[] = [
      { code: 'CDG', name: 'Chandigarh Junction', city: 'Chandigarh', state: 'Chandigarh' },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockResults }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const results = await searchStationsApi('Chandi');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].code).toBe('CDG');
    expect(results[0].name).toContain('Chandigarh');
  });

  it('should return matching stations from backend when query is "CDG"', async () => {
    const mockResults: StationSearchResult[] = [
      { code: 'CDG', name: 'Chandigarh Junction', city: 'Chandigarh', state: 'Chandigarh' },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockResults }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const results = await searchStationsApi('CDG');
    expect(results[0].code).toBe('CDG');
  });

  it('should fall back gracefully to local station database on network failure without throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const results = await searchStationsApi('Chandigarh');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((s) => s.code === 'CDG')).toBe(true);
  });

  it('should simulate swapping source and destination stations cleanly', () => {
    let source = { code: 'CDG', name: 'Chandigarh Junction' };
    let destination = { code: 'NDLS', name: 'New Delhi' };
    let sourceText = 'Chandigarh Junction (CDG)';
    let destText = 'New Delhi (NDLS)';

    // Swap action
    const tempStation = source;
    source = destination;
    destination = tempStation;

    const tempText = sourceText;
    sourceText = destText;
    destText = tempText;

    expect(source.code).toBe('NDLS');
    expect(destination.code).toBe('CDG');
    expect(sourceText).toBe('New Delhi (NDLS)');
    expect(destText).toBe('Chandigarh Junction (CDG)');
  });
});
