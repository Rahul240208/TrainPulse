import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PollingManager, PollingManagerCallbacks } from '../src/services/pollingManager';
import type { LiveTrainData } from '../src/types/api';

const mockTrainData: LiveTrainData = {
  trainNumber: '12919',
  trainName: 'MALWA EXPRESS',
  trainType: 'SUPERFAST',
  sourceStation: 'Dr. Ambedkar Nagar',
  sourceCode: 'DADN',
  destinationStation: 'Shri Mata Vaishno Devi Katra',
  destinationCode: 'SVDK',
  status: 'RUNNING',
  currentLocation: {
    name: 'Bhopal Junction',
    latitude: 23.2599,
    longitude: 77.4126,
    speedKmH: 72,
    positionType: 'ACTUAL_GPS',
  },
  delayMinutes: 0,
  nextStation: {
    code: 'BHS',
    name: 'Vidisha',
    scheduledArrival: '16:45',
    actualArrival: '16:45',
    delayMinutes: 0,
    platform: '2',
    distanceRemainingKm: 54,
  },
  lastUpdatedTime: '16:15:00',
  stations: [],
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('PollingManager', () => {
  let callbacks: PollingManagerCallbacks;
  let mockFetchFn: ReturnType<typeof vi.fn<(trainNumber: string, signal: AbortSignal) => Promise<LiveTrainData>>>;

  beforeEach(() => {
    vi.useFakeTimers();
    callbacks = {
      onData: vi.fn(),
      onError: vi.fn(),
      onLoadingChange: vi.fn(),
      onRefreshingChange: vi.fn(),
      onPollingChange: vi.fn(),
    };
    mockFetchFn = vi.fn<(trainNumber: string, signal: AbortSignal) => Promise<LiveTrainData>>().mockResolvedValue(mockTrainData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Fetches immediately when polling starts', async () => {
    const manager = new PollingManager('12919', mockFetchFn, callbacks);

    expect(mockFetchFn).not.toHaveBeenCalled();

    manager.start();

    expect(callbacks.onPollingChange).toHaveBeenCalledWith(true);
    expect(callbacks.onLoadingChange).toHaveBeenCalledWith(true);
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(mockFetchFn).toHaveBeenCalledWith('12919', expect.any(AbortSignal));

    await flushMicrotasks();

    expect(callbacks.onData).toHaveBeenCalledWith(mockTrainData);
    expect(callbacks.onLoadingChange).toHaveBeenCalledWith(false);

    manager.stop();
  });

  it('2. Refreshes automatically every 30 seconds by default', async () => {
    const manager = new PollingManager('12919', mockFetchFn, callbacks);
    manager.start();

    await flushMicrotasks();
    expect(mockFetchFn).toHaveBeenCalledTimes(1);

    // Advance 30 seconds
    await vi.advanceTimersByTimeAsync(30000);
    await flushMicrotasks();

    expect(mockFetchFn).toHaveBeenCalledTimes(2);
    expect(callbacks.onData).toHaveBeenCalledTimes(2);
    expect(callbacks.onRefreshingChange).toHaveBeenCalledWith(false);

    // Advance another 30 seconds
    await vi.advanceTimersByTimeAsync(30000);
    await flushMicrotasks();

    expect(mockFetchFn).toHaveBeenCalledTimes(3);

    manager.stop();
  });

  it('3. Supports configurable refresh interval', async () => {
    const manager = new PollingManager('12919', mockFetchFn, callbacks, {
      refreshIntervalSeconds: 15,
    });

    expect(manager.intervalSeconds).toBe(15);
    manager.start();

    await flushMicrotasks();
    expect(mockFetchFn).toHaveBeenCalledTimes(1);

    // 15 seconds should trigger the next fetch
    await vi.advanceTimersByTimeAsync(15000);
    await flushMicrotasks();

    expect(mockFetchFn).toHaveBeenCalledTimes(2);

    manager.stop();
  });

  it('4. Prevents duplicate / concurrent requests with lock', async () => {
    let resolveSlowFetch: (data: LiveTrainData) => void = () => {};
    const slowFetchPromise = new Promise<LiveTrainData>((resolve) => {
      resolveSlowFetch = resolve;
    });

    mockFetchFn.mockImplementation(() => slowFetchPromise);

    const manager = new PollingManager('12919', mockFetchFn, callbacks, {
      refreshIntervalSeconds: 10,
    });
    manager.start();

    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(manager.isRequestInFlight).toBe(true);

    // Attempt concurrent manual fetch while first is still pending
    manager.executeFetch();
    expect(mockFetchFn).toHaveBeenCalledTimes(1);

    // Timer tick fires while first request is still in flight
    await vi.advanceTimersByTimeAsync(10000);
    expect(mockFetchFn).toHaveBeenCalledTimes(1); // Still locked!

    // Now complete the slow fetch
    resolveSlowFetch(mockTrainData);
    await flushMicrotasks();

    expect(manager.isRequestInFlight).toBe(false);
    expect(callbacks.onData).toHaveBeenCalledTimes(1);

    // Subsequent tick after completion now succeeds
    mockFetchFn.mockResolvedValue(mockTrainData);
    await vi.advanceTimersByTimeAsync(10000);
    await flushMicrotasks();

    expect(mockFetchFn).toHaveBeenCalledTimes(2);

    manager.stop();
  });

  it('5. Stops polling when leaving screen and aborts pending in-flight request', async () => {
    let capturedSignal: AbortSignal | null = null;
    mockFetchFn.mockImplementation((_num: string, signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise(() => {}); // never resolves
    });

    const manager = new PollingManager('12919', mockFetchFn, callbacks);
    manager.start();

    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(capturedSignal).not.toBeNull();
    expect((capturedSignal as unknown as AbortSignal).aborted).toBe(false);

    // Stop tracking (simulate unmount)
    manager.stop();

    expect((capturedSignal as unknown as AbortSignal).aborted).toBe(true);
    expect(callbacks.onPollingChange).toHaveBeenCalledWith(false);
    expect(callbacks.onLoadingChange).toHaveBeenCalledWith(false);

    // Advance time after stop - should never fire again
    await vi.advanceTimersByTimeAsync(60000);
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
  });

  it('6. Pauses on background and resumes on active state', async () => {
    const manager = new PollingManager('12919', mockFetchFn, callbacks, {
      refreshIntervalSeconds: 30,
    });
    manager.start();
    await flushMicrotasks();
    expect(mockFetchFn).toHaveBeenCalledTimes(1);

    // App goes to background
    manager.pause();
    expect(manager.isActive).toBe(false);
    expect(callbacks.onPollingChange).toHaveBeenCalledWith(false);

    // Advance timer while in background - should NOT fetch
    await vi.advanceTimersByTimeAsync(60000);
    expect(mockFetchFn).toHaveBeenCalledTimes(1);

    // App returns to foreground
    manager.resume();
    expect(manager.isActive).toBe(true);
    expect(callbacks.onPollingChange).toHaveBeenCalledWith(true);

    // Resuming immediately triggers a fresh fetch
    expect(mockFetchFn).toHaveBeenCalledTimes(2);

    await flushMicrotasks();

    // And timer resumes
    await vi.advanceTimersByTimeAsync(30000);
    await flushMicrotasks();

    expect(mockFetchFn).toHaveBeenCalledTimes(3);

    manager.stop();
  });

  it('7. Preserves existing valid data and flags isBackground on background poll errors', async () => {
    const manager = new PollingManager('12919', mockFetchFn, callbacks);
    manager.start();

    await flushMicrotasks();
    expect(callbacks.onData).toHaveBeenCalledWith(mockTrainData);

    // Next background poll fails
    const networkError = new Error('503 Service Unavailable');
    mockFetchFn.mockRejectedValueOnce(networkError);

    await vi.advanceTimersByTimeAsync(30000);
    await flushMicrotasks();

    // onError called with isBackground = true
    expect(callbacks.onError).toHaveBeenCalledWith(networkError, true);
    // onData was not cleared
    expect(callbacks.onData).toHaveBeenCalledTimes(1);

    // Recovery on next poll
    mockFetchFn.mockResolvedValueOnce(mockTrainData);
    await vi.advanceTimersByTimeAsync(30000);
    await flushMicrotasks();

    expect(callbacks.onData).toHaveBeenCalledTimes(2);

    manager.stop();
  });

  it('8. Supports manual refetch', async () => {
    const manager = new PollingManager('12919', mockFetchFn, callbacks);
    manager.start();
    await flushMicrotasks();
    expect(mockFetchFn).toHaveBeenCalledTimes(1);

    const refetchPromise = manager.refetch();
    await flushMicrotasks();
    await refetchPromise;

    expect(mockFetchFn).toHaveBeenCalledTimes(2);

    manager.stop();
  });
});

