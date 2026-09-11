import { z } from 'zod';

export const stationSearchResultSchema = z.object({
  code: z.string(),
  name: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
});
export type StationSearchResult = z.infer<typeof stationSearchResultSchema>;

export const stationSearchResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(stationSearchResultSchema),
});
export type StationSearchResponse = z.infer<typeof stationSearchResponseSchema>;
