/**
 * TrainPulse Telemetry & Polling Configuration
 */

// Default refresh interval in seconds per Milestone 6 requirement
const DEFAULT_REFRESH_SECONDS = 30;

// Read optional environment override
const parsedEnvRefresh = process.env.EXPO_PUBLIC_LIVE_REFRESH_SECONDS
  ? parseInt(process.env.EXPO_PUBLIC_LIVE_REFRESH_SECONDS, 10)
  : NaN;

export const LIVE_REFRESH_SECONDS =
  !isNaN(parsedEnvRefresh) && parsedEnvRefresh > 0
    ? parsedEnvRefresh
    : DEFAULT_REFRESH_SECONDS;

export const LIVE_REFRESH_INTERVAL_MS = LIVE_REFRESH_SECONDS * 1000;

