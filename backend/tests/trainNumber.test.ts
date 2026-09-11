import { describe, it, expect } from 'vitest';
import { trainNumberSchema, validateTrainNumber } from '../src/schemas/trainNumber.js';

describe('Train Number Validation Schema', () => {
  it('should accept valid 5-digit Indian Railway train numbers', () => {
    const validNumbers = ['12301', '12002', '12951', '22691', '20901', '01234', '99999'];
    for (const num of validNumbers) {
      const result = trainNumberSchema.safeParse(num);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(num);
      }
    }
  });

  it('should trim surrounding whitespace from train numbers', () => {
    const result = trainNumberSchema.safeParse('  12301  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('12301');
    }
  });

  it('should reject numbers with less than 5 digits', () => {
    const shortNumbers = ['1', '12', '123', '1234'];
    for (const num of shortNumbers) {
      const result = trainNumberSchema.safeParse(num);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('must be exactly 5 numeric digits');
      }
    }
  });

  it('should reject numbers with more than 5 digits', () => {
    const longNumbers = ['123456', '1234567', '0012301'];
    for (const num of longNumbers) {
      const result = trainNumberSchema.safeParse(num);
      expect(result.success).toBe(false);
    }
  });

  it('should reject non-numeric characters', () => {
    const invalidFormats = ['1234a', 'a1234', '12-01', '12 01', 'ABCDE', '!@#$%'];
    for (const str of invalidFormats) {
      const result = trainNumberSchema.safeParse(str);
      expect(result.success).toBe(false);
    }
  });

  it('should reject empty or blank strings', () => {
    expect(trainNumberSchema.safeParse('').success).toBe(false);
    expect(trainNumberSchema.safeParse('     ').success).toBe(false);
  });

  it('should reject non-string types gracefully', () => {
    expect(trainNumberSchema.safeParse(12301).success).toBe(false);
    expect(trainNumberSchema.safeParse(null).success).toBe(false);
    expect(trainNumberSchema.safeParse(undefined).success).toBe(false);
    expect(trainNumberSchema.safeParse({}).success).toBe(false);
  });

  it('validateTrainNumber helper should return success: true for valid input', () => {
    const res = validateTrainNumber('12301');
    expect(res.success).toBe(true);
    expect(res.data).toBe('12301');
    expect(res.error).toBeUndefined();
  });

  it('validateTrainNumber helper should return success: false and error message for invalid input', () => {
    const res = validateTrainNumber('abc');
    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error).toBeDefined();
  });
});

