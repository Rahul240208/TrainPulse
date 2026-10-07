import { z } from 'zod';

export const railRadarStationCoordsSchema = z.object({
  code: z.string(),
  name: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const railRadarTrainMetaSchema = z.object({
  number: z.string(),
  name: z.string(),
  type: z.string().optional(),
  category: z.string().optional(),
  source: railRadarStationCoordsSchema,
  destination: railRadarStationCoordsSchema,
  avgSpeed: z.number().optional(),
  maxSpeed: z.number().optional(),
  distance: z.number().optional(),
});

export const railRadarCurrentLocationSchema = z.object({
  stationCode: z.string().optional(),
  stationName: z.string().optional(),
  status: z.string().optional(),
  isHalt: z.boolean().optional(),
  delayMinutes: z.number().optional(),
  distanceFromOriginKm: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  speedKmH: z.number().optional(),
});

export const railRadarNextHaltSchema = z.object({
  stationCode: z.string(),
  stationName: z.string(),
  sequence: z.number().optional(),
  distance: z.number().optional(),
});

export const railRadarRouteStopSchema = z.object({
  sequence: z.number().optional(),
  stationCode: z.string(),
  stationName: z.string(),
  isHalt: z.boolean().optional(),
  status: z.string().optional(),
  scheduledArrival: z.string().nullable().optional(),
  actualArrival: z.string().nullable().optional(),
  delayArrival: z.number().nullable().optional(),
  scheduledDeparture: z.string().nullable().optional(),
  actualDeparture: z.string().nullable().optional(),
  delayDeparture: z.number().nullable().optional(),
  platform: z.string().nullable().optional(),
  distance: z.number().optional(),
  speedToNextStationKmph: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const railRadarLiveResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    trainNumber: z.string(),
    trainName: z.string(),
    status: z.string().optional(),
    trackingMode: z.string().optional(),
    isLive: z.boolean().optional(),
    delayMinutes: z.number().optional(),
    train: railRadarTrainMetaSchema.optional(),
    currentLocation: railRadarCurrentLocationSchema.optional(),
    nextHalt: railRadarNextHaltSchema.nullable().optional(),
    route: z.array(railRadarRouteStopSchema).optional(),
    lastUpdatedAt: z.string().optional(),
  }),
  meta: z.record(z.unknown()).optional(),
});

export type RailRadarLiveResponse = z.infer<typeof railRadarLiveResponseSchema>;
export type RailRadarData = RailRadarLiveResponse['data'];
export type RailRadarRouteStop = z.infer<typeof railRadarRouteStopSchema>;

