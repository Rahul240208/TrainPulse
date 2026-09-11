import { z } from 'zod';

export const trainNumberSchema = z
  .string({
    required_error: 'Train number is required.',
    invalid_type_error: 'Train number must be a string.',
  })
  .trim()
  .regex(/^\d{5}$/, {
    message: 'Train number must be exactly 5 numeric digits.',
  });

export type TrainNumber = z.infer<typeof trainNumberSchema>;

/**
 * Validates a train number string and returns either { success: true, data } or { success: false, error }.
 */
export function validateTrainNumber(input: unknown): {
  success: boolean;
  data?: string;
  error?: string;
} {
  const result = trainNumberSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Invalid 5-digit train number.',
    };
  }
  return {
    success: true,
    data: result.data,
  };
}

