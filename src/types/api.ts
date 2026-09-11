export type PositionAccuracy = 'ACTUAL_GPS' | 'ESTIMATED_SCHEDULE' | 'STATION_DEPARTURE';

export type TrainStatus = 'RUNNING' | 'NOT_STARTED' | 'ARRIVED' | 'CANCELLED' | 'DIVERTED';

export interface StationPoint {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  scheduledArrival: string | null;
  actualArrival: string | null;
  scheduledDeparture: string | null;
  actualDeparture: string | null;
  delayMinutes: number;
  platform: string | null;
  hasDeparted: boolean;
}

export interface CurrentLocation {
  name: string;
  latitude: number | null;
  longitude: number | null;
  speedKmH: number;
  positionType: PositionAccuracy;
}

export interface NextStation {
  code: string;
  name: string;
  scheduledArrival: string | null;
  actualArrival: string | null;
  delayMinutes: number;
  platform: string | null;
  distanceRemainingKm?: number | null;
}

export type PlatformStatus = 'CONFIRMED' | 'EXPECTED' | 'UNAVAILABLE' | 'UNKNOWN';

export interface PlatformInfo {
  platformNumber: string | null;
  status: PlatformStatus;
  station?: {
    code: string;
    name: string;
  } | null;
  updatedAt?: string | null;
  source?: string | null;
  isReliable?: boolean;
}

export type CoachType =
  | 'ENGINE'
  | 'GENERAL'
  | 'SLEEPER'
  | 'AC_3_TIER'
  | 'AC_2_TIER'
  | 'FIRST_AC'
  | 'CHAIR_CAR'
  | 'EXECUTIVE_CHAIR_CAR'
  | 'PANTRY'
  | 'POWER_CAR'
  | 'UNKNOWN';

export type CoachPosition = 'FRONT' | 'MIDDLE' | 'REAR';

export interface CoachInfo {
  type: CoachType;
  number?: string | null;
  sequence: number;
  position?: CoachPosition | null;
  label?: string | null;
  className?: string | null;
}

export interface CoachComposition {
  trainNumber: string;
  trainName?: string | null;
  available: boolean;
  totalCoaches: number;
  enginePosition?: 'FRONT' | 'REAR' | null;
  coaches: CoachInfo[];
  updatedAt?: string | null;
}

export interface LiveTrainData {
  trainNumber: string;
  trainName: string;
  trainType: string;
  sourceStation: string;
  sourceCode: string;
  destinationStation: string;
  destinationCode: string;
  status: TrainStatus;
  currentLocation: CurrentLocation;
  delayMinutes: number;
  nextStation: NextStation | null;
  platformInfo?: PlatformInfo | null;
  coachComposition?: CoachComposition | null;
  lastUpdatedTime: string;
  stations: StationPoint[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface StationInfo {
  code: string;
  name: string;
}

export interface StationSearchResult {
  code: string;
  name: string;
  city?: string;
  state?: string;
}


export interface TrainBetweenItem {
  trainNumber: string;
  trainName: string;
  trainType?: string;
  source: StationInfo;
  destination: StationInfo;
  departure: string | null;
  arrival: string | null;
  duration: string | null;
  runningDays?: string[];
  status?: string | null;
  delayMinutes?: number | null;
  platform?: string | null;
  distanceKm?: number | null;
}

export interface TrainsBetweenResult {
  from: StationInfo;
  to: StationInfo;
  totalTrains: number;
  trains: TrainBetweenItem[];
}


