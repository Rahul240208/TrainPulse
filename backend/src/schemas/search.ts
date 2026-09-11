import { z } from 'zod';

export const searchStationRefSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export const searchResultItemSchema = z.object({
  type: z.enum(['TRAIN', 'STATION']),
  trainNumber: z.string().optional(),
  trainName: z.string().optional(),
  trainType: z.string().optional(),
  stationCode: z.string().optional(),
  stationName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  source: searchStationRefSchema.optional(),
  destination: searchStationRefSchema.optional(),
});

export const searchResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(searchResultItemSchema),
});

export type SearchResultItem = z.infer<typeof searchResultItemSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;

