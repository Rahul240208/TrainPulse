import { config } from '../config.js';
import { railRadarLiveResponseSchema } from '../schemas/railradar.js';
import { transformRailRadarToTrainPulse } from './transformer.service.js';
import { getLiveTrainData as getMockTrainData, getMockTrainsBetween } from './mockData.service.js';
import { liveTrainCache } from './cache.service.js';
import type { TrainsBetweenResponse, TrainBetweenItem } from '../schemas/trainsBetween.js';

import {
  TrainNotFoundError,
  RateLimitError,
  UpstreamTimeoutError,
  UpstreamAuthError,
  InvalidUpstreamResponseError,
  UpstreamError,
  UpstreamUnavailableError,
} from './errors.js';
import type { LiveTrainData } from '../schemas/liveTrain.js';

export interface FetchLiveTrainOptions {
  bypassCache?: boolean;
  timeoutMs?: number;
}

/**
 * Fetches raw live telemetry from RailRadar API and transforms it into canonical LiveTrainData.
 * Implements 8s timeout abort, Bearer auth, status code classification, and raw schema validation.
 */
export async function fetchFromRailRadarDirect(
  trainNumber: string,
  timeoutMs = 8000
): Promise<LiveTrainData> {
  const apiKey = config.RAILRADAR_API_KEY;
  const baseUrl = config.RAILRADAR_BASE_URL;

  // Fallback to offline mock database if no API key is provided
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_railradar_api_key_here') {
    return getMockTrainData(trainNumber);
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/v1/trains/${trainNumber}/live`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new UpstreamTimeoutError(
        `RailRadar request for train ${trainNumber} timed out after ${timeoutMs}ms.`
      );
    }
    throw new UpstreamUnavailableError(
      'Network connection failure while querying RailRadar railway telemetry.'
    );
  } finally {
    clearTimeout(timer);
  }

  // Handle HTTP status codes
  if (!response.ok) {
    let errorBody: any = null;
    try {
      errorBody = await response.json();
    } catch {
      // Ignored if non-JSON error
    }

    const upstreamMessage = errorBody?.error?.message || errorBody?.message;

    switch (response.status) {
      case 404:
        throw new TrainNotFoundError(trainNumber, upstreamMessage);
      case 429:
        throw new RateLimitError(
          upstreamMessage || 'RailRadar upstream quota exceeded. Try again in a few moments.'
        );
      case 401:
      case 403:
        throw new UpstreamAuthError(
          upstreamMessage || 'RailRadar authentication failed. Verify RAILRADAR_API_KEY.'
        );
      case 502:
      case 503:
        throw new UpstreamUnavailableError(
          upstreamMessage || 'RailRadar upstream service is temporarily unavailable.'
        );
      default:
        throw new UpstreamError(
          upstreamMessage || `RailRadar upstream returned HTTP ${response.status}`,
          502
        );
    }
  }

  // Parse and validate raw JSON structure
  let rawJson: unknown;
  try {
    rawJson = await response.json();
  } catch (err) {
    throw new InvalidUpstreamResponseError('RailRadar returned non-JSON response payload.');
  }

  const validation = railRadarLiveResponseSchema.safeParse(rawJson);
  if (!validation.success) {
    throw new InvalidUpstreamResponseError(
      'RailRadar response failed schema validation.'
    );
  }

  // Transform into canonical TrainPulse DTO
  return transformRailRadarToTrainPulse(validation.data.data);
}

/**
 * Public service interface: Fetches live train telemetry with in-memory TTL caching
 * and single-flight request coalescing to conserve upstream quota.
 */
export async function getLiveTrainTelemetry(
  trainNumber: string,
  options?: FetchLiveTrainOptions
): Promise<{ data: LiveTrainData; cached: boolean; isStale?: boolean }> {
  if (options?.bypassCache) {
    try {
      const data = await fetchFromRailRadarDirect(trainNumber, options.timeoutMs);
      liveTrainCache.set(trainNumber, data);
      return { data, cached: false, isStale: false };
    } catch (err) {
      const lastData = liveTrainCache.getLastSuccessful(trainNumber);
      if (lastData) {
        return { data: lastData, cached: true, isStale: true };
      }
      throw err;
    }
  }

  return liveTrainCache.getOrFetch(trainNumber, () =>
    fetchFromRailRadarDirect(trainNumber, options?.timeoutMs)
  );
}

/**
 * Transforms raw RailRadar trains-between response into canonical TrainsBetweenResponse DTO.
 */
export function transformRailRadarBetween(
  raw: any,
  fromCode: string,
  toCode: string
): TrainsBetweenResponse {
  if (!raw) {
    return {
      from: { code: fromCode, name: fromCode },
      to: { code: toCode, name: toCode },
      totalTrains: 0,
      trains: [],
    };
  }

  const payload = raw.data || raw;
  const fromInfo = {
    code: payload.from?.code || fromCode,
    name: payload.from?.name || fromCode,
  };
  const toInfo = {
    code: payload.to?.code || toCode,
    name: payload.to?.name || toCode,
  };

  const rawTrains: any[] = Array.isArray(payload.trains)
    ? payload.trains
    : Array.isArray(payload)
    ? payload
    : [];

  const trains: TrainBetweenItem[] = [];

  for (const item of rawTrains) {
    const t = item.train || item;
    const fromStop = item.from || {};
    const toStop = item.to || {};
    const live = item.live || {};

    const trainNum = String(t.number || t.trainNumber || '').trim();
    if (!trainNum) continue;

    // Normalize duration: can be minutes (number) or formatted string
    let formattedDuration: string | null = null;
    if (typeof item.duration === 'string') {
      formattedDuration = item.duration;
    } else if (typeof item.duration === 'number') {
      const h = Math.floor(item.duration / 60);
      const m = item.duration % 60;
      formattedDuration = `${h}h ${m.toString().padStart(2, '0')}m`;
    }

    // Normalize running days
    let formattedRunningDays: string[] | undefined = undefined;
    const rawDays = t.runDays || t.runningDays || item.runDays || item.runningDays;
    if (Array.isArray(rawDays)) {
      formattedRunningDays = rawDays.map(String);
    } else if (typeof rawDays === 'string' && rawDays.length === 7) {
      const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      formattedRunningDays = dayNames.filter((_, idx) => rawDays[idx] === '1' || rawDays[idx] === 'Y');
    }

    const parsedPlatform =
      live.platform != null
        ? String(live.platform)
        : fromStop.platform != null
        ? String(fromStop.platform)
        : item.platform != null
        ? String(item.platform)
        : null;

    const parsedDelay =
      typeof live.delayMinutes === 'number'
        ? live.delayMinutes
        : typeof item.delayMinutes === 'number'
        ? item.delayMinutes
        : typeof live.delay === 'number'
        ? live.delay
        : null;

    trains.push({
      trainNumber: trainNum,
      trainName: String(t.name || t.trainName || `Express ${trainNum}`),
      trainType: t.type ? String(t.type) : t.trainType ? String(t.trainType) : undefined,
      source: {
        code: fromStop.code || fromInfo.code,
        name: fromStop.name || fromInfo.name,
      },
      destination: {
        code: toStop.code || toInfo.code,
        name: toStop.name || toInfo.name,
      },
      departure: fromStop.departure || fromStop.scheduledDeparture || item.departure || null,
      arrival: toStop.arrival || toStop.scheduledArrival || item.arrival || null,
      duration: formattedDuration,
      runningDays: formattedRunningDays,
      status: live.status || item.status || 'SCHEDULED',
      delayMinutes: parsedDelay,
      platform: parsedPlatform,
      distanceKm:
        typeof item.distance === 'number'
          ? item.distance
          : typeof item.distanceKm === 'number'
          ? item.distanceKm
          : null,
    });
  }



  return {
    from: fromInfo,
    to: toInfo,
    totalTrains: trains.length,
    trains,
  };
}

/**
 * Public service interface: Fetches trains between two stations.
 * Queries upstream RailRadar API if configured, or falls back to offline mock database.
 */
export async function fetchTrainsBetween(
  fromCode: string,
  toCode: string,
  timeoutMs = 8000
): Promise<TrainsBetweenResponse> {
  const apiKey = config.RAILRADAR_API_KEY;
  const baseUrl = config.RAILRADAR_BASE_URL;

  // Fallback to offline mock database if no API key is provided
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_railradar_api_key_here') {
    return getMockTrainsBetween(fromCode, toCode);
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/v1/trains/between/${fromCode}/${toCode}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new UpstreamTimeoutError(
        `RailRadar request for trains between ${fromCode} and ${toCode} timed out after ${timeoutMs}ms.`
      );
    }
    throw new UpstreamUnavailableError(
      'Network connection failure while querying RailRadar trains between stations.'
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 404) {
      return {
        from: { code: fromCode, name: fromCode },
        to: { code: toCode, name: toCode },
        totalTrains: 0,
        trains: [],
      };
    }
    if (response.status === 429) {
      throw new RateLimitError('RailRadar upstream quota exceeded. Try again in a few moments.');
    }
    if (response.status === 502 || response.status === 503) {
      throw new UpstreamUnavailableError('RailRadar upstream service is temporarily unavailable.');
    }
    throw new UpstreamError(`RailRadar upstream returned HTTP ${response.status}`, 502);
  }

  let rawJson: any;
  try {
    rawJson = await response.json();
  } catch {
    throw new InvalidUpstreamResponseError('RailRadar returned non-JSON response payload.');
  }

  return transformRailRadarBetween(rawJson, fromCode, toCode);
}


