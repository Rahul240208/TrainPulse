import { z } from 'zod';

/**
 * Sanitizes train number input by trimming whitespace.
 */
export function sanitizeTrainNumber(input: string): string {
  return input.trim().replace(/\s+/g, '');
}

/**
 * Indian Railway train numbers are officially 5 digits (e.g., 12301, 12002, 22691).
 */
export const trainNumberSchema = z
  .string()
  .min(1, 'Train number is required')
  .transform(sanitizeTrainNumber)
  .refine((val) => /^\d{5}$/.test(val), {
    message: 'Train number must be exactly 5 digits (e.g. 12301)',
  });

export type TrainNumber = z.infer<typeof trainNumberSchema>;

