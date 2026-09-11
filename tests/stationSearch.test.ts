import { describe, it, expect } from 'vitest';
import { searchStations, getStationByCode, POPULAR_STATIONS } from '../src/data/stations';

describe('Station Directory & Search (Milestone 11)', () => {
  it('should find Chandigarh station by code CDG', () => {
    const results = searchStations('CDG');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].code).toBe('CDG');
    expect(results[0].name).toContain('Chandigarh');
  });

  it('should find New Delhi station by code NDLS', () => {
    const results = searchStations('NDLS');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].code).toBe('NDLS');
    expect(results[0].name).toContain('New Delhi');
  });

  it('should find stations by city or name prefix (e.g. "Chandi")', () => {
    const results = searchStations('Chandi');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((s) => s.code === 'CDG')).toBe(true);
  });

  it('should handle case-insensitive query', () => {
    const results = searchStations('cdg');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].code).toBe('CDG');
  });

  it('should return popular stations when query is empty', () => {
    const results = searchStations('');
    expect(results.length).toBe(8);
    expect(results[0]).toEqual(POPULAR_STATIONS[0]);
  });

  it('should find station by exact code with getStationByCode', () => {
    const station = getStationByCode('HWH');
    expect(station).toBeDefined();
    expect(station?.name).toContain('Howrah');

    const notFound = getStationByCode('UNKNOWN99');
    expect(notFound).toBeUndefined();
  });
});
