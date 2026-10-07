import { z } from 'zod';

export const positionAccuracySchema = z.enum([
  'ACTUAL_GPS',
  'ESTIMATED_SCHEDULE',
  'STATION_DEPARTURE',
]);
export type PositionAccuracy = z.infer<typeof positionAccuracySchema>;

export const trainStatusSchema = z.enum([
  'RUNNING',
  'NOT_STARTED',
  'ARRIVED',
  'CANCELLED',
  'DIVERTED',
]);
export type TrainStatus = z.infer<typeof trainStatusSchema>;

export const stationPointSchema = z.object({
  code: z.string(),
  name: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  scheduledArrival: z.string().nullable(),
  actualArrival: z.string().nullable(),
  scheduledDeparture: z.string().nullable(),
  actualDeparture: z.string().nullable(),
  delayMinutes: z.number(),
  platform: z.string().nullable(),
  hasDeparted: z.boolean(),
});
export type StationPoint = z.infer<typeof stationPointSchema>;

export const currentLocationSchema = z.object({
  name: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  speedKmH: z.number(),
  positionType: positionAccuracySchema,
});
export type CurrentLocation = z.infer<typeof currentLocationSchema>;

export const nextStationSchema = z.object({
  code: z.string(),
  name: z.string(),
  scheduledArrival: z.string().nullable(),
  actualArrival: z.string().nullable(),
  delayMinutes: z.number(),
  platform: z.string().nullable(),
  distanceRemainingKm: z.number().nullable().optional(),
});
export type NextStation = z.infer<typeof nextStationSchema>;

export const platformStatusSchema = z.enum([
  'CONFIRMED',
  'EXPECTED',
  'UNAVAILABLE',
  'UNKNOWN',
]);
export type PlatformStatus = z.infer<typeof platformStatusSchema>;

export const platformInfoSchema = z.object({
  platformNumber: z.string().nullable(),
  status: platformStatusSchema,
  station: z
    .object({
      code: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  updatedAt: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});
export type PlatformInfo = z.infer<typeof platformInfoSchema>;

export const coachTypeSchema = z.enum([
  'ENGINE',
  'GENERAL',
  'SLEEPER',
  'AC_3_TIER',
  'AC_2_TIER',
  'FIRST_AC',
  'CHAIR_CAR',
  'EXECUTIVE_CHAIR_CAR',
  'PANTRY',
  'POWER_CAR',
  'UNKNOWN',
]);
export type CoachType = z.infer<typeof coachTypeSchema>;

export const coachPositionSchema = z.enum(['FRONT', 'MIDDLE', 'REAR']);
export type CoachPosition = z.infer<typeof coachPositionSchema>;

export const coachInfoSchema = z.object({
  type: coachTypeSchema,
  number: z.string().nullable().optional(),
  sequence: z.number(),
  position: coachPositionSchema.nullable().optional(),
  label: z.string().nullable().optional(),
  className: z.string().nullable().optional(),
});
export type CoachInfo = z.infer<typeof coachInfoSchema>;

export const coachCompositionSchema = z.object({
  trainNumber: z.string(),
  trainName: z.string().nullable().optional(),
  available: z.boolean(),
  totalCoaches: z.number(),
  enginePosition: z.enum(['FRONT', 'REAR']).nullable().optional(),
  coaches: z.array(coachInfoSchema),
  updatedAt: z.string().nullable().optional(),
});
export type CoachComposition = z.infer<typeof coachCompositionSchema>;

export const liveTrainDataSchema = z.object({
  trainNumber: z.string().regex(/^\d{5}$/),
  trainName: z.string(),
  trainType: z.string(),
  sourceStation: z.string(),
  sourceCode: z.string(),
  destinationStation: z.string(),
  destinationCode: z.string(),
  status: trainStatusSchema,
  currentLocation: currentLocationSchema,
  delayMinutes: z.number(),
  nextStation: nextStationSchema.nullable(),
  platformInfo: platformInfoSchema.nullable().optional(),
  coachComposition: coachCompositionSchema.nullable().optional(),
  lastUpdatedTime: z.string(),
  stations: z.array(stationPointSchema),
});
export type LiveTrainData = z.infer<typeof liveTrainDataSchema>;

export const apiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

