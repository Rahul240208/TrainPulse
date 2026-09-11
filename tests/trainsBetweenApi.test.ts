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

import { fetchTrainsBetween, ApiError } from '../src/services/api';


describe('fetchTrainsBetween Client API (Milestone 11)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject when departure station is missing', async () => {
    await expect(fetchTrainsBetween('', 'NDLS')).rejects.toThrowError(ApiError);
    await expect(fetchTrainsBetween('', 'NDLS')).rejects.toMatchObject({
      code: 'MISSING_STATION',
    });
  });

  it('should reject when arrival station is missing', async () => {
    await expect(fetchTrainsBetween('CDG', '')).rejects.toThrowError(ApiError);
    await expect(fetchTrainsBetween('CDG', '')).rejects.toMatchObject({
      code: 'MISSING_STATION',
    });
  });

  it('should reject when departure and arrival stations are identical', async () => {
    await expect(fetchTrainsBetween('NDLS', 'NDLS')).rejects.toThrowError(ApiError);
    await expect(fetchTrainsBetween('NDLS', 'ndls')).rejects.toMatchObject({
      code: 'SAME_STATION',
    });
  });

  it('should reject when station code length is invalid', async () => {
    await expect(fetchTrainsBetween('A', 'NDLS')).rejects.toThrowError(ApiError);
    await expect(fetchTrainsBetween('A', 'NDLS')).rejects.toMatchObject({
      code: 'INVALID_STATION',
    });
  });

  it('should return normalized TrainsBetweenResult on successful server response', async () => {
    const mockData = {
      from: { code: 'CDG', name: 'Chandigarh Junction' },
      to: { code: 'NDLS', name: 'New Delhi' },
      totalTrains: 1,
      trains: [
        {
          trainNumber: '12012',
          trainName: 'Kalka Shatabdi Express',
          trainType: 'Shatabdi Express',
          source: { code: 'KLK', name: 'Kalka' },
          destination: { code: 'NDLS', name: 'New Delhi' },
          departure: '06:53',
          arrival: '10:15',
          duration: '3h 22m',
          runningDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
          status: 'ON_TIME',
          delayMinutes: 0,
          platform: '1',
          distanceKm: 244,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await fetchTrainsBetween('CDG', 'NDLS');
    expect(result.from.code).toBe('CDG');
    expect(result.to.code).toBe('NDLS');
    expect(result.totalTrains).toBe(1);
    expect(result.trains[0].trainNumber).toBe('12012');
  });

  it('should handle network connection errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(fetchTrainsBetween('CDG', 'NDLS')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('should handle request timeouts gracefully', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

    await expect(fetchTrainsBetween('CDG', 'NDLS')).rejects.toMatchObject({
      code: 'TIMEOUT',
      statusCode: 504,
    });
  });
});
