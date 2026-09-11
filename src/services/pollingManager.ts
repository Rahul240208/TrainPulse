import type { LiveTrainData } from '../types/api';
import { LIVE_REFRESH_SECONDS } from '../config/tracking';

export interface PollingManagerCallbacks {
  onData: (data: LiveTrainData) => void;
  onError: (error: Error, isBackground: boolean) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onRefreshingChange: (isRefreshing: boolean) => void;
  onPollingChange: (isPolling: boolean) => void;
}

export interface PollingManagerOptions {
  refreshIntervalSeconds?: number;
  autoRefreshEnabled?: boolean;
}

/**
 * Platform-independent Polling Engine managing:
 * - Immediate initial fetch
 * - Configurable periodic intervals (default 30s)
 * - Concurrency lock preventing duplicate requests
 * - In-flight request abortion on stop
 * - Background pause & active resume
 * - Preserving last valid data on background error
 */
export class PollingManager {
  private trainNumber: string;
  private fetchFn: (trainNumber: string, signal: AbortSignal) => Promise<LiveTrainData>;
  private callbacks: PollingManagerCallbacks;
  private refreshIntervalSeconds: number;
  private autoRefreshEnabled: boolean;

  private isFetching = false;
  private isPolling = false;
  private isPaused = false;
  private hasInitialData = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private abortController: AbortController | null = null;

  constructor(
    trainNumber: string,
    fetchFn: (trainNumber: string, signal: AbortSignal) => Promise<LiveTrainData>,
    callbacks: PollingManagerCallbacks,
    options?: PollingManagerOptions
  ) {
    this.trainNumber = trainNumber;
    this.fetchFn = fetchFn;
    this.callbacks = callbacks;
    this.refreshIntervalSeconds = options?.refreshIntervalSeconds ?? LIVE_REFRESH_SECONDS;
    this.autoRefreshEnabled = options?.autoRefreshEnabled ?? true;
  }

  /**
   * Starts the polling lifecycle: triggers immediate fetch and arms the interval timer.
   */
  public start(): void {
    if (!this.trainNumber) return;

    this.isPolling = true;
    this.callbacks.onPollingChange(true);

    // 1. Immediate initial fetch
    this.executeFetch(false);

    // 2. Arm interval timer if auto-refresh is enabled
    this.armTimer();
  }

  /**
   * Stops polling completely and aborts in-flight requests (e.g. unmount).
   */
  public stop(): void {
    this.isPolling = false;
    this.clearTimer();

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.callbacks.onPollingChange(false);
    this.callbacks.onRefreshingChange(false);
    this.callbacks.onLoadingChange(false);
  }

  /**
   * Pauses interval polling when app enters background or tab is hidden.
   */
  public pause(): void {
    this.isPaused = true;
    this.clearTimer();
    this.callbacks.onPollingChange(false);
  }

  /**
   * Resumes polling when app returns to foreground and triggers a refresh.
   */
  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.isPolling = true;
    this.callbacks.onPollingChange(true);

    // Immediate fresh fetch on returning to active
    this.executeFetch(this.hasInitialData);
    this.armTimer();
  }

  /**
   * Manual user-initiated refresh (e.g. pull-to-refresh or retry).
   */
  public async refetch(): Promise<void> {
    await this.executeFetch(this.hasInitialData);
  }

  /**
   * Dispatches the network call with concurrency guard.
   */
  public async executeFetch(isBackground = false): Promise<void> {
    // Concurrency lock: Prevent duplicate requests
    if (this.isFetching) {
      return;
    }

    if (this.abortController) {
      this.abortController.abort();
    }

    const controller = new AbortController();
    this.abortController = controller;
    this.isFetching = true;

    if (isBackground) {
      this.callbacks.onRefreshingChange(true);
    } else {
      this.callbacks.onLoadingChange(true);
    }

    try {
      const data = await this.fetchFn(this.trainNumber, controller.signal);

      if (!controller.signal.aborted) {
        this.hasInitialData = true;
        this.callbacks.onData(data);
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        this.callbacks.onError(err as Error, isBackground || this.hasInitialData);
      }
    } finally {
      this.isFetching = false;
      if (!controller.signal.aborted) {
        this.callbacks.onLoadingChange(false);
        this.callbacks.onRefreshingChange(false);
      }
    }
  }

  private armTimer(): void {
    this.clearTimer();
    if (!this.autoRefreshEnabled || this.refreshIntervalSeconds <= 0) return;

    this.timer = setInterval(() => {
      if (!this.isPaused) {
        this.executeFetch(true);
      }
    }, this.refreshIntervalSeconds * 1000);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Getters for inspection & testing
  public get isActive(): boolean {
    return this.isPolling && !this.isPaused;
  }

  public get isRequestInFlight(): boolean {
    return this.isFetching;
  }

  public get intervalSeconds(): number {
    return this.refreshIntervalSeconds;
  }
}

