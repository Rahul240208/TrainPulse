import { getApiBaseUrl } from '../config/api';
import { trainNumberSchema } from '../shared/trainNumber';
import type {
  LiveTrainData,
  ApiResponse,
  TrainsBetweenResult,
  StationSearchResult,
  PlatformInfo,
  CoachComposition,
  SearchResultItem,
} from '../types/api';
import { searchStations as searchLocalStations } from '../data/stations';
import { MOCK_TRAINS } from '../data/mockTrains';



export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'UNKNOWN_ERROR', statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface FetchLiveTrainOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Client method to fetch live train data from the TrainPulse backend.
 * The frontend NEVER communicates directly with RailRadar.
 */
export async function fetchLiveTrain(
  rawTrainNumber: string,
  options?: FetchLiveTrainOptions
): Promise<LiveTrainData> {
  // 1. Client-side train number validation
  const validation = trainNumberSchema.safeParse(rawTrainNumber);
  if (!validation.success) {
    throw new ApiError(
      validation.error.errors[0]?.message || 'Please enter a valid 5-digit train number.',
      'INVALID_TRAIN_NUMBER',
      400
    );
  }

  const trainNumber = validation.data;
  const timeoutMs = options?.timeoutMs ?? 8000;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/trains/${trainNumber}/live`;

  // 2. Setup timeout controller
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Link caller signal if provided
  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(
        'The request to the TrainPulse server timed out. Please check your connection and try again.',
        'TIMEOUT',
        504
      );
    }
    throw new ApiError(
      'Unable to reach the live tracking service. Please check your internet connection and try again.',
      'NETWORK_ERROR',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  // 3. Parse JSON response
  let json: ApiResponse<LiveTrainData>;
  try {
    json = (await response.json()) as ApiResponse<LiveTrainData>;
  } catch {
    throw new ApiError(
      'Received an invalid response format from the server. Please try again.',
      'INVALID_RESPONSE',
      response.status
    );
  }

  // 4. Handle errors from backend
  if (!response.ok || !json.success) {
    const errorInfo = !json.success ? json.error : null;
    const errorCode = errorInfo?.code || `HTTP_${response.status}`;
    let errorMessage = errorInfo?.message;

    if (!errorMessage) {
      if (response.status === 404 || errorCode === 'TRAIN_NOT_FOUND') {
        errorMessage = `Train ${trainNumber} not found on the Indian Railways network. Please verify the train number.`;
      } else if (response.status === 429 || errorCode === 'UPSTREAM_RATE_LIMITED') {
        errorMessage = 'Railway tracking quota limit reached. Please wait a minute and try again.';
      } else if (response.status === 504 || errorCode === 'UPSTREAM_TIMEOUT') {
        errorMessage = 'The railway tracking service took too long to respond. Please try again.';
      } else if (response.status === 502 || response.status === 503 || errorCode === 'UPSTREAM_UNAVAILABLE') {
        errorMessage = 'Live tracking is temporarily unavailable. Please try again shortly.';
      } else {
        errorMessage = 'An error occurred while tracking this train. Please try again.';
      }
    }

    throw new ApiError(errorMessage, errorCode, response.status);
  }

  return json.data;
}

export interface FetchTrainsBetweenOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Client method to fetch trains between two stations from the TrainPulse backend.
 * The frontend NEVER communicates directly with RailRadar.
 */
export async function fetchTrainsBetween(
  rawFrom: string,
  rawTo: string,
  options?: FetchTrainsBetweenOptions
): Promise<TrainsBetweenResult> {
  const from = (rawFrom || '').trim().toUpperCase();
  const to = (rawTo || '').trim().toUpperCase();

  // Client-side validations
  if (!from || !to) {
    throw new ApiError(
      'Both departure and destination stations are required.',
      'MISSING_STATION',
      400
    );
  }

  if (from === to) {
    throw new ApiError(
      'Departure and arrival stations cannot be the same.',
      'SAME_STATION',
      400
    );
  }

  if (from.length < 2 || from.length > 6 || to.length < 2 || to.length > 6) {
    throw new ApiError(
      'Station codes must be between 2 and 6 characters (e.g. CDG, NDLS).',
      'INVALID_STATION',
      400
    );
  }

  const timeoutMs = options?.timeoutMs ?? 8000;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/trains/between?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(
        'The search request timed out. Please check your connection and try again.',
        'TIMEOUT',
        504
      );
    }
    throw new ApiError(
      'Unable to reach the train search service. Please check your internet connection and try again.',
      'NETWORK_ERROR',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  let json: ApiResponse<TrainsBetweenResult>;
  try {
    json = (await response.json()) as ApiResponse<TrainsBetweenResult>;
  } catch {
    throw new ApiError(
      'Received an invalid response format from the server. Please try again.',
      'INVALID_RESPONSE',
      response.status
    );
  }

  if (!response.ok || !json.success) {
    const errorInfo = !json.success ? json.error : null;
    const errorCode = errorInfo?.code || `HTTP_${response.status}`;
    let errorMessage = errorInfo?.message;

    if (!errorMessage) {
      if (response.status === 429 || errorCode === 'UPSTREAM_RATE_LIMITED') {
        errorMessage = 'Railway search quota limit reached. Please wait a minute and try again.';
      } else if (response.status === 504 || errorCode === 'UPSTREAM_TIMEOUT') {
        errorMessage = 'The railway search service took too long to respond. Please try again.';
      } else if (response.status === 502 || response.status === 503 || errorCode === 'UPSTREAM_UNAVAILABLE') {
        errorMessage = 'Train search service is temporarily unavailable. Please try again shortly.';
      } else {
        errorMessage = 'An error occurred while searching for trains. Please try again.';
      }
    }

    throw new ApiError(errorMessage, errorCode, response.status);
  }

  return json.data;
}

export interface SearchStationsOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Client method to search stations with autocomplete from TrainPulse backend.
 * Minimum query length: 2 characters (returns empty array immediately if < 2).
 * Falls back to offline station catalog on network failure.
 */
export async function searchStationsApi(
  query: string,
  options?: SearchStationsOptions
): Promise<StationSearchResult[]> {
  const clean = (query || '').trim();
  if (clean.length < 2) {
    return [];
  }

  const timeoutMs = options?.timeoutMs ?? 5000;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/stations/search?q=${encodeURIComponent(clean)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    // Gracefully fallback to local station database on network failure/timeout
    return searchLocalStations(clean);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    return searchLocalStations(clean);
  }

  try {
    const json = (await response.json()) as ApiResponse<StationSearchResult[]>;
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch {
    // Fallback on JSON parse error
  }

  return searchLocalStations(clean);
}

/**
 * Client method to fetch platform info for a train (Milestone 14).
 */
export async function fetchTrainPlatform(
  rawTrainNumber: string,
  timeoutMs = 8000
): Promise<PlatformInfo> {
  const trainNumber = (rawTrainNumber || '').trim();
  const validation = trainNumberSchema.safeParse(trainNumber);
  if (!validation.success) {
    throw new ApiError(
      validation.error.errors[0]?.message || 'Train number must be exactly 5 numeric digits.',
      'INVALID_TRAIN_NUMBER',
      400
    );
  }

  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/trains/${trainNumber}/platform`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Request timed out while fetching platform info.', 'TIMEOUT', 504);
    }
    throw new ApiError('Unable to connect to TrainPulse server for platform info.', 'NETWORK_ERROR', 0);
  } finally {
    clearTimeout(timer);
  }

  const json = (await response.json()) as ApiResponse<PlatformInfo>;
  if (!response.ok || !json.success) {
    const errorInfo = !json.success ? json.error : null;
    throw new ApiError(
      errorInfo?.message || `Failed to fetch platform info (HTTP ${response.status})`,
      errorInfo?.code || 'PLATFORM_ERROR',
      response.status
    );
  }

  return json.data;
}

/**
 * Client method to fetch coach composition for a train (Milestone 15).
 */
export async function fetchTrainCoaches(
  rawTrainNumber: string,
  timeoutMs = 8000
): Promise<CoachComposition> {
  const trainNumber = (rawTrainNumber || '').trim();
  const validation = trainNumberSchema.safeParse(trainNumber);
  if (!validation.success) {
    throw new ApiError(
      validation.error.errors[0]?.message || 'Train number must be exactly 5 numeric digits.',
      'INVALID_TRAIN_NUMBER',
      400
    );
  }

  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/trains/${trainNumber}/coaches`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Request timed out while fetching coach layout.', 'TIMEOUT', 504);
    }
    throw new ApiError('Unable to connect to TrainPulse server for coach layout.', 'NETWORK_ERROR', 0);
  } finally {
    clearTimeout(timer);
  }

  const json = (await response.json()) as ApiResponse<CoachComposition>;
  if (!response.ok || !json.success) {
    const errorInfo = !json.success ? json.error : null;
    throw new ApiError(
      errorInfo?.message || `Failed to fetch coach layout (HTTP ${response.status})`,
      errorInfo?.code || 'COACH_ERROR',
      response.status
    );
  }

  return json.data;
}

/**
 * Global search across train numbers, train names, and stations (Milestone 11: Map-First Search).
 */
export async function searchGlobal(
  rawQuery: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<SearchResultItem[]> {
  const query = (rawQuery || '').trim();
  if (query.length < 2) {
    return [];
  }

  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/search?q=${encodeURIComponent(query)}`;
  const timeoutMs = options?.timeoutMs ?? 6000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (response.ok) {
      const json = (await response.json()) as ApiResponse<SearchResultItem[]>;
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err: unknown) {
    // If aborted by user, rethrow
    if (err instanceof Error && err.name === 'AbortError' && options?.signal?.aborted) {
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }

  // Graceful Offline Fallback: match local mock trains and stations
  const queryLower = query.toLowerCase();
  const queryUpper = query.toUpperCase();
  const isNumeric = /^\d+$/.test(query);

  const matchedTrains: SearchResultItem[] = [];
  for (const train of Object.values(MOCK_TRAINS)) {
    const tNum = train.trainNumber;
    const tName = train.trainName.toLowerCase();
    const srcCode = train.sourceCode.toUpperCase();
    const destCode = train.destinationCode.toUpperCase();

    if (tNum === query) {
      matchedTrains.unshift({
        type: 'TRAIN',
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        trainType: train.trainType,
        source: { code: train.sourceCode, name: train.sourceStation },
        destination: { code: train.destinationCode, name: train.destinationStation },
      });
      continue;
    }

    if (
      (isNumeric && tNum.startsWith(query)) ||
      tName.includes(queryLower) ||
      srcCode === queryUpper ||
      destCode === queryUpper
    ) {
      matchedTrains.push({
        type: 'TRAIN',
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        trainType: train.trainType,
        source: { code: train.sourceCode, name: train.sourceStation },
        destination: { code: train.destinationCode, name: train.destinationStation },
      });
    }
  }

  const localStations = searchLocalStations(query);
  const matchedStations: SearchResultItem[] = localStations.map((s) => ({
    type: 'STATION',
    stationCode: s.code,
    stationName: s.name,
    city: s.city,
    state: s.state,
  }));

  const combined = [...matchedTrains, ...matchedStations];
  const seen = new Set<string>();
  const results: SearchResultItem[] = [];

  for (const item of combined) {
    const key = item.type === 'TRAIN' ? `TRAIN_${item.trainNumber}` : `STATION_${item.stationCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(item);
      if (results.length >= 15) break;
    }
  }

  return results;
}




