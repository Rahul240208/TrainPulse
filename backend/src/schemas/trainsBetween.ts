import { z } from 'zod';

export const stationCodeSchema = z
  .string()
  .trim()
  .min(2, 'Station code must be at least 2 characters')
  .max(6, 'Station code must not exceed 6 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Station code must be alphanumeric')
  .transform((val) => val.toUpperCase());

export const stationInfoSchema = z.object({
  code: z.string(),
  name: z.string(),
});
export type StationInfo = z.infer<typeof stationInfoSchema>;

export const trainBetweenItemSchema = z.object({
  trainNumber: z.string(),
  trainName: z.string(),
  trainType: z.string().optional(),
  source: stationInfoSchema,
  destination: stationInfoSchema,
  departure: z.string().nullable(),
  arrival: z.string().nullable(),
  duration: z.string().nullable(),
  runningDays: z.array(z.string()).optional(),
  status: z.string().nullable().optional(),
  delayMinutes: z.number().nullable().optional(),
  platform: z.string().nullable().optional(),
  distanceKm: z.number().nullable().optional(),
});
export type TrainBetweenItem = z.infer<typeof trainBetweenItemSchema>;

export const trainsBetweenResponseSchema = z.object({
  from: stationInfoSchema,
  to: stationInfoSchema,
  totalTrains: z.number(),
  trains: z.array(trainBetweenItemSchema),
});
export type TrainsBetweenResponse = z.infer<typeof trainsBetweenResponseSchema>;
