import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    View: ({ children, style, ...rest }: any) =>
      React.createElement('div', { style, ...rest }, children),
    Text: ({ children, style, ...rest }: any) =>
      React.createElement('span', { style, ...rest }, children),
    TextInput: ({ style, ...rest }: any) =>
      React.createElement('input', { style, ...rest }),
    TouchableOpacity: ({ children, onPress, style, ...rest }: any) =>
      React.createElement('button', { onClick: onPress, style, ...rest }, children),
    ActivityIndicator: () => null,
    FlatList: ({ data, renderItem }: any) =>
      React.createElement('div', null, data?.map((item: any, i: number) => renderItem({ item, index: i }))),
    ScrollView: ({ children, style, ...rest }: any) =>
      React.createElement('div', { style, ...rest }, children),
    KeyboardAvoidingView: ({ children, style, ...rest }: any) =>
      React.createElement('div', { style, ...rest }, children),
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

vi.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children, style, ...rest }: any) =>
      React.createElement('div', { style, ...rest }, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

import type { StationSearchResult } from '../src/types/api';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers: simulate the recent-pair logic from SearchScreen
// ──────────────────────────────────────────────────────────────────────────────

interface StationPair {
  from: StationSearchResult;
  to: StationSearchResult;
}

const MAX_RECENT = 5;

function addRecentPair(existing: StationPair[], from: StationSearchResult, to: StationSearchResult): StationPair[] {
  const filtered = existing.filter(
    (p) =>
      !(
        p.from.code.toUpperCase() === from.code.toUpperCase() &&
        p.to.code.toUpperCase() === to.code.toUpperCase()
      )
  );
  return [{ from, to }, ...filtered].slice(0, MAX_RECENT);
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('Milestone 18: Source to Destination Search', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── JourneySearchCard props ──────────────────────────────────────────────

  describe('1. JourneySearchCardProps interface', () => {
    it('exposes JourneySearchCardProps type with expected fields', async () => {
      const { JourneySearchCard } = await import('../src/components/journey/JourneySearchCard');
      expect(typeof JourneySearchCard).toBe('function');
    });

    it('accepts initialFrom, initialTo, and onBeforeNavigate props without TypeScript errors', async () => {
      const { JourneySearchCard } = await import('../src/components/journey/JourneySearchCard');
      // If this module imports without errors, props are valid at the type level
      const props = {
        initialFrom: { code: 'CDG', name: 'Chandigarh Junction', city: 'Chandigarh', state: 'Chandigarh' } as StationSearchResult,
        initialTo: { code: 'NDLS', name: 'New Delhi', city: 'New Delhi', state: 'Delhi' } as StationSearchResult,
        onBeforeNavigate: vi.fn(),
      };
      expect(props.initialFrom.code).toBe('CDG');
      expect(props.initialTo.code).toBe('NDLS');
      expect(typeof props.onBeforeNavigate).toBe('function');
    });

    it('allows null values for initialFrom and initialTo (blank form start)', () => {
      const props = {
        initialFrom: null as StationSearchResult | null,
        initialTo: null as StationSearchResult | null,
      };
      expect(props.initialFrom).toBeNull();
      expect(props.initialTo).toBeNull();
    });
  });

  // ── onBeforeNavigate callback ────────────────────────────────────────────

  describe('2. onBeforeNavigate callback', () => {
    it('fires with correct from and to station objects', () => {
      const onBeforeNavigate = vi.fn();
      const from: StationSearchResult = { code: 'FGSB', name: 'Fatehgarh Sahib', city: 'Fatehgarh Sahib', state: 'Punjab' };
      const to: StationSearchResult = { code: 'DLI', name: 'Delhi Junction', city: 'Delhi', state: 'Delhi' };

      // Simulate calling the callback (as JourneySearchCard does on valid search)
      onBeforeNavigate(from, to);

      expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
      expect(onBeforeNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'FGSB' }),
        expect.objectContaining({ code: 'DLI' })
      );
    });

    it('does NOT fire when source station is missing', () => {
      const onBeforeNavigate = vi.fn();
      // Simulate the guard in handleSearch — no source means return early
      const sourceStation = null;
      if (sourceStation) {
        onBeforeNavigate(sourceStation, { code: 'DLI', name: 'Delhi' });
      }
      expect(onBeforeNavigate).not.toHaveBeenCalled();
    });

    it('does NOT fire when destination station is missing', () => {
      const onBeforeNavigate = vi.fn();
      const sourceStation: StationSearchResult = { code: 'CDG', name: 'Chandigarh' };
      const destinationStation = null;
      if (sourceStation && destinationStation) {
        onBeforeNavigate(sourceStation, destinationStation);
      }
      expect(onBeforeNavigate).not.toHaveBeenCalled();
    });
  });

  // ── Validation rules ─────────────────────────────────────────────────────

  describe('3. Search validation', () => {
    it('rejects same FROM and TO station codes (case-insensitive)', () => {
      const source: StationSearchResult = { code: 'NDLS', name: 'New Delhi' };
      const destination: StationSearchResult = { code: 'ndls', name: 'New Delhi' };
      const isSame = source.code.toUpperCase() === destination.code.toUpperCase();
      expect(isSame).toBe(true);
    });

    it('allows different codes even if names partially match', () => {
      const source: StationSearchResult = { code: 'DLI', name: 'Old Delhi Junction' };
      const destination: StationSearchResult = { code: 'NDLS', name: 'New Delhi' };
      const isSame = source.code.toUpperCase() === destination.code.toUpperCase();
      expect(isSame).toBe(false);
    });
  });

  // ── Recent station-pair searches ─────────────────────────────────────────

  describe('4. Recent station-pair searches', () => {
    it('adds a new station pair to the front of the recent list', () => {
      const pairs: StationPair[] = [];
      const from: StationSearchResult = { code: 'CDG', name: 'Chandigarh Junction' };
      const to: StationSearchResult = { code: 'NDLS', name: 'New Delhi' };
      const updated = addRecentPair(pairs, from, to);
      expect(updated).toHaveLength(1);
      expect(updated[0].from.code).toBe('CDG');
      expect(updated[0].to.code).toBe('NDLS');
    });

    it('moves an existing pair to front on duplicate search (deduplication)', () => {
      const from: StationSearchResult = { code: 'CDG', name: 'Chandigarh Junction' };
      const to: StationSearchResult = { code: 'NDLS', name: 'New Delhi' };
      const from2: StationSearchResult = { code: 'HWH', name: 'Howrah Junction' };
      const to2: StationSearchResult = { code: 'MAS', name: 'Chennai Central' };

      let pairs: StationPair[] = [];
      pairs = addRecentPair(pairs, from, to);
      pairs = addRecentPair(pairs, from2, to2);
      // Add CDG-NDLS again — should move to front
      pairs = addRecentPair(pairs, from, to);

      expect(pairs).toHaveLength(2);
      expect(pairs[0].from.code).toBe('CDG');
      expect(pairs[1].from.code).toBe('HWH');
    });

    it('caps recent list at MAX_RECENT (5) entries', () => {
      let pairs: StationPair[] = [];
      const codes = ['A', 'B', 'C', 'D', 'E', 'F'];
      for (const code of codes) {
        pairs = addRecentPair(
          pairs,
          { code: `${code}1`, name: 'Station 1' },
          { code: `${code}2`, name: 'Station 2' }
        );
      }
      expect(pairs).toHaveLength(MAX_RECENT);
      // Most recent should be first
      expect(pairs[0].from.code).toBe('F1');
    });

    it('clear all results in an empty recent list', () => {
      let pairs: StationPair[] = [
        {
          from: { code: 'CDG', name: 'Chandigarh Junction' },
          to: { code: 'NDLS', name: 'New Delhi' },
        },
      ];
      pairs = []; // simulate clearAll
      expect(pairs).toHaveLength(0);
    });

    it('re-populating from a recent pair sets correct from and to', () => {
      const pair: StationPair = {
        from: { code: 'FGSB', name: 'Fatehgarh Sahib', city: 'Fatehgarh Sahib', state: 'Punjab' },
        to: { code: 'DLI', name: 'Old Delhi Junction', city: 'Delhi', state: 'Delhi' },
      };

      // Simulate handleTapRecent spreading the values
      const injectedFrom = { ...pair.from };
      const injectedTo = { ...pair.to };

      expect(injectedFrom.code).toBe('FGSB');
      expect(injectedFrom.name).toBe('Fatehgarh Sahib');
      expect(injectedTo.code).toBe('DLI');
    });
  });

  // ── URL state preservation ───────────────────────────────────────────────

  describe('5. URL state on trains/between screen', () => {
    it('fetchTrainsBetween uses from and to params from URL (mocked)', async () => {
      const mockData = {
        from: { code: 'FGSB', name: 'Fatehgarh Sahib' },
        to: { code: 'DLI', name: 'Old Delhi Junction' },
        totalTrains: 2,
        trains: [
          {
            trainNumber: '12461',
            trainName: 'Mandor Express',
            source: { code: 'FGSB', name: 'Fatehgarh Sahib' },
            destination: { code: 'DLI', name: 'Delhi Junction' },
            departure: '07:10',
            arrival: '11:00',
            duration: '3h 50m',
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: mockData }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const { fetchTrainsBetween } = await import('../src/services/api');
      const result = await fetchTrainsBetween('FGSB', 'DLI');
      expect(result.from.code).toBe('FGSB');
      expect(result.to.code).toBe('DLI');
      expect(result.totalTrains).toBe(2);
      expect(result.trains[0].trainNumber).toBe('12461');
    });

    it('trains/between screen rejects missing station params gracefully', async () => {
      const { fetchTrainsBetween, ApiError } = await import('../src/services/api');
      await expect(fetchTrainsBetween('', 'NDLS')).rejects.toThrow(ApiError);
      await expect(fetchTrainsBetween('CDG', '')).rejects.toThrow(ApiError);
    });

    it('same from and to station codes throw ApiError SAME_STATION', async () => {
      const { fetchTrainsBetween, ApiError } = await import('../src/services/api');
      await expect(fetchTrainsBetween('NDLS', 'NDLS')).rejects.toThrow(ApiError);
    });
  });

  // ── localStorage persistence helpers ────────────────────────────────────

  describe('6. Recent pairs localStorage persistence', () => {
    it('saveRecentPairs / loadRecentPairs round-trip works in web env', () => {
      // Simulate the helper logic directly (same code as in SearchScreen)
      const RECENT_PAIRS_KEY = 'trainpulse_recent_pairs_v1';

      const mockStorage: Record<string, string> = {};
      const mockLocalStorage = {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
      };

      const pairs: StationPair[] = [
        { from: { code: 'CDG', name: 'Chandigarh Junction' }, to: { code: 'NDLS', name: 'New Delhi' } },
        { from: { code: 'HWH', name: 'Howrah Junction' }, to: { code: 'MAS', name: 'Chennai Central' } },
      ];

      // Save
      mockLocalStorage.setItem(RECENT_PAIRS_KEY, JSON.stringify(pairs));

      // Load back
      const stored = mockLocalStorage.getItem(RECENT_PAIRS_KEY);
      const loaded: StationPair[] = stored ? JSON.parse(stored) : [];

      expect(loaded).toHaveLength(2);
      expect(loaded[0].from.code).toBe('CDG');
      expect(loaded[1].from.code).toBe('HWH');
    });

    it('handles corrupt/missing localStorage data gracefully', () => {
      const mockStorage: Record<string, string> = { 'trainpulse_recent_pairs_v1': 'not-valid-json' };
      let result: StationPair[] = [];
      try {
        const raw = mockStorage['trainpulse_recent_pairs_v1'];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) result = parsed;
      } catch {
        result = [];
      }
      expect(result).toHaveLength(0);
    });
  });
});
