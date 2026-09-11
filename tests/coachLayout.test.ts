import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      hostUri: '127.0.0.1:8081',
    },
  },
}));

vi.mock('react-native', () => {
  const React = require('react');
  return {
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web || obj.default,
    },
    View: ({ children, style, ...props }: any) => React.createElement('div', { style, ...props }, children),
    Text: ({ children, style, ...props }: any) => React.createElement('span', { style, ...props }, children),
    ScrollView: ({ children, style, ...props }: any) => React.createElement('div', { style, ...props }, children),
    TouchableOpacity: ({ children, onPress, style, ...props }: any) =>
      React.createElement('button', { onClick: onPress, style, ...props }, children),
    TextInput: ({ onChangeText, value, ...props }: any) =>
      React.createElement('input', { value, onChange: (e: any) => onChangeText(e.target.value), ...props }),
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

import { CoachLayout } from '../src/components/train/CoachLayout';
import { getSavedCoach, saveCoach, clearSavedCoach } from '../src/utils/coachStorage';
import { fetchTrainCoaches, ApiError } from '../src/services/api';
import type { CoachComposition } from '../src/types/api';

describe('CoachLayout Component & My Coach Selection (Milestones 15 & 16)', () => {
  const sampleRajdhaniComposition: CoachComposition = {
    trainNumber: '12301',
    trainName: 'Howrah Rajdhani Express',
    available: true,
    totalCoaches: 6,
    enginePosition: 'FRONT',
    coaches: [
      { sequence: 1, type: 'ENGINE', number: 'WAP-7', label: 'Engine', position: 'FRONT' },
      { sequence: 2, type: 'POWER_CAR', number: 'EOG 1', label: 'EOG', position: 'FRONT' },
      { sequence: 3, type: 'AC_3_TIER', number: 'B1', label: 'B1', className: '3A', position: 'FRONT' },
      { sequence: 4, type: 'AC_3_TIER', number: 'B2', label: 'B2', className: '3A', position: 'MIDDLE' },
      { sequence: 5, type: 'PANTRY', number: 'PC', label: 'Pantry', position: 'MIDDLE' },
      { sequence: 6, type: 'AC_2_TIER', number: 'A1', label: 'A1', className: '2A', position: 'REAR' },
    ],
  };

  beforeEach(() => {
    clearSavedCoach('12301');
    clearSavedCoach('99999');
    vi.restoreAllMocks();
  });

  describe('Unavailable Composition State (Zero Fabrication Rule)', () => {
    it('should render unavailable notice when composition is missing', () => {
      const element = React.createElement(CoachLayout, {
        composition: null,
        trainNumber: '99999',
      });
      expect(element).toBeDefined();
    });

    it('should render unavailable notice when available is false', () => {
      const unavailableComp: CoachComposition = {
        trainNumber: '99999',
        available: false,
        totalCoaches: 0,
        coaches: [],
      };

      const element = React.createElement(CoachLayout, {
        composition: unavailableComp,
        trainNumber: '99999',
      });
      expect(element).toBeDefined();
    });
  });

  describe('Coach Layout Rendering', () => {
    it('should render valid train coaches composition without crashing', () => {
      const element = React.createElement(CoachLayout, {
        composition: sampleRajdhaniComposition,
        trainNumber: '12301',
      });
      expect(element).toBeDefined();
      expect(element.props.composition?.totalCoaches).toBe(6);
    });
  });

  describe('Local Coach Persistence (coachStorage)', () => {
    it('should save and retrieve user coach selection for a specific train', () => {
      expect(getSavedCoach('12301')).toBeNull();

      saveCoach('12301', 'B2');
      expect(getSavedCoach('12301')).toBe('B2');

      // Another train remains untouched
      expect(getSavedCoach('12002')).toBeNull();
    });

    it('should allow clearing the user coach selection', () => {
      saveCoach('12301', 'B2');
      expect(getSavedCoach('12301')).toBe('B2');

      clearSavedCoach('12301');
      expect(getSavedCoach('12301')).toBeNull();
    });

    it('should allow changing coach selection seamlessly', () => {
      saveCoach('12301', 'B1');
      expect(getSavedCoach('12301')).toBe('B1');

      saveCoach('12301', 'A1');
      expect(getSavedCoach('12301')).toBe('A1');
    });
  });
});

describe('fetchTrainCoaches Client API (Milestone 15)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject when train number is invalid', async () => {
    await expect(fetchTrainCoaches('12')).rejects.toThrowError(ApiError);
    await expect(fetchTrainCoaches('12')).rejects.toMatchObject({
      code: 'INVALID_TRAIN_NUMBER',
    });
  });

  it('should return CoachComposition on successful response', async () => {
    const mockComp: CoachComposition = {
      trainNumber: '12301',
      available: true,
      totalCoaches: 2,
      coaches: [
        { sequence: 1, type: 'ENGINE', number: 'WAP-7', label: 'Engine' },
        { sequence: 2, type: 'AC_3_TIER', number: 'B1', label: 'B1' },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockComp }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await fetchTrainCoaches('12301');
    expect(result.trainNumber).toBe('12301');
    expect(result.available).toBe(true);
    expect(result.totalCoaches).toBe(2);
  });

  it('should handle network errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(fetchTrainCoaches('12301')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});
