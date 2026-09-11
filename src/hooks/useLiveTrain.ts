import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { fetchLiveTrain, ApiError } from '../services/api';
import { PollingManager, type PollingManagerOptions } from '../services/pollingManager';
import type { LiveTrainData } from '../types/api';

export interface UseLiveTrainOptions extends PollingManagerOptions {}

export interface ApiErrorState {
  code: string;
  message: string;
  statusCode?: number;
}

export interface UseLiveTrainResult {
  data: LiveTrainData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isPolling: boolean;
  isError: boolean;
  error: ApiErrorState | null;
  backgroundError: string | null;
  lastSuccessfulUpdate: Date | null;
  refetch: () => Promise<void>;
  clearBackgroundError: () => void;
}

/**
 * Custom hook to manage live train telemetry with lifecycle-aware auto-polling.
 * 
 * Guarantees:
 * 1. Immediate initial fetch upon mount.
 * 2. Automatic refresh every 30s by default (configurable).
 * 3. Duplicate request prevention using concurrency lock.
 * 4. Automatic pause when mobile app is backgrounded or web tab is hidden.
 * 5. Automatic resume and fresh fetch when app returns to foreground.
 * 6. Clean timer cancellation and abort on unmount (zero memory leaks).
 * 7. Graceful degradation: preserves existing data when background poll fails.
 */
export function useLiveTrain(
  trainNumber?: string,
  options?: UseLiveTrainOptions
): UseLiveTrainResult {
  const [data, setData] = useState<LiveTrainData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(options?.autoRefreshEnabled ?? true);
  const [error, setError] = useState<ApiErrorState | null>(null);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [lastSuccessfulUpdate, setLastSuccessfulUpdate] = useState<Date | null>(null);

  const managerRef = useRef<PollingManager | null>(null);

  useEffect(() => {
    if (!trainNumber) {
      setIsLoading(false);
      setError({
        code: 'MISSING_TRAIN_NUMBER',
        message: 'No train number provided to track.',
      });
      return;
    }

    const manager = new PollingManager(
      trainNumber,
      (tNum, signal) => fetchLiveTrain(tNum, { signal }),
      {
        onData: (freshData) => {
          setData(freshData);
          setLastSuccessfulUpdate(new Date());
          setError(null);
          setBackgroundError(null);
        },
        onError: (err, isBackground) => {
          const errCode = err instanceof ApiError ? err.code : 'UNKNOWN_ERROR';
          const errMessage = err.message || 'Failed to retrieve live train data.';
          const errStatus = err instanceof ApiError ? err.statusCode : undefined;

          if (isBackground) {
            setBackgroundError(errMessage);
          } else {
            setError({ code: errCode, message: errMessage, statusCode: errStatus });
          }
        },
        onLoadingChange: (loading) => setIsLoading(loading),
        onRefreshingChange: (refreshing) => setIsRefreshing(refreshing),
        onPollingChange: (polling) => setIsPolling(polling),
      },
      options
    );

    managerRef.current = manager;
    manager.start();

    // AppState listener for mobile backgrounding
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        manager.resume();
      } else {
        manager.pause();
      }
    });

    // Visibility listener for web tabs
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        manager.pause();
      } else {
        manager.resume();
      }
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      manager.stop();
      appStateSub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [trainNumber, options?.refreshIntervalSeconds, options?.autoRefreshEnabled]);

  const refetch = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.refetch();
    }
  }, []);

  const clearBackgroundError = useCallback(() => {
    setBackgroundError(null);
  }, []);

  return {
    data,
    isLoading,
    isRefreshing,
    isPolling,
    isError: error !== null,
    error,
    backgroundError,
    lastSuccessfulUpdate,
    refetch,
    clearBackgroundError,
  };
}
