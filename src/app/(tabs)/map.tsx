import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { ResponsiveContainer } from '../../components/common/ResponsiveContainer';
import { MOCK_TRAINS, type MockTrain } from '../../data/mockTrains';
import { LiveTrainMap } from '../../components/map/LiveTrainMap';
import { MapSearchBar } from '../../components/map/MapSearchBar';
import { MapStatusPanel } from '../../components/map/MapStatusPanel';
import { JourneySearchCard } from '../../components/journey/JourneySearchCard';
import { PlatformCard } from '../../components/train/PlatformCard';
import { CoachLayout } from '../../components/train/CoachLayout';
import { StationTimeline } from '../../components/train/StationTimeline';
import { fetchTrainCoaches } from '../../services/api';
import { useLiveTrain } from '../../hooks/useLiveTrain';
import type { LiveTrainData, PlatformInfo, CoachComposition, StationPoint } from '../../types/api';

const RECENT_SEARCHES_STORAGE_KEY = 'trainpulse_recent_searches_v1';

export default function LiveMapScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { trainNumber: paramTrainNumber } = useLocalSearchParams<{ trainNumber?: string }>();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 768;

  // Search mode state: 'train' for direct train/station search, 'route' for Where-to-Where search
  const [searchMode, setSearchMode] = useState<'train' | 'route'>('train');

  // Selected train number state
  const [selectedTrainNumber, setSelectedTrainNumber] = useState<string>(
    paramTrainNumber && /^\d{5}$/.test(paramTrainNumber) ? paramTrainNumber : '12046'
  );

  // Selected station state for map exploration
  const [selectedStation, setSelectedStation] = useState<{ code: string; name: string } | null>(
    null
  );
  const [focusStationCode, setFocusStationCode] = useState<string | null>(null);

  // Sync param if it changes
  useEffect(() => {
    if (paramTrainNumber && /^\d{5}$/.test(paramTrainNumber)) {
      setSelectedTrainNumber(paramTrainNumber);
      setSelectedStation(null);
      setFocusStationCode(null);
      setSearchMode('train');
    }
  }, [paramTrainNumber]);

  // Recent searches list with local persistence
  const [recentSearches, setRecentSearches] = useState<string[]>([
    '12046',
    '12301',
    '12002',
    'NDLS',
    'CDG',
  ]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecentSearches(parsed);
          }
        }
      } catch {
        // Fallback to default recent searches
      }
    }
  }, []);

  const saveRecentSearch = useCallback((item: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toUpperCase() !== item.toUpperCase());
      const updated = [item, ...filtered].slice(0, 6);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore write error
        }
      }
      return updated;
    });
  }, []);

  // Live polling via existing useLiveTrain hook (30s auto-refresh, non-blocking)
  const {
    data: liveTrainData,
    isLoading,
    isRefreshing,
    backgroundError,
    lastSuccessfulUpdate,
    refetch,
  } = useLiveTrain(selectedTrainNumber, {
    autoRefreshEnabled: true,
    refreshIntervalSeconds: 30,
  });

  // Stale check: if last successful update was more than 90s ago
  const isStale =
    !!lastSuccessfulUpdate && Date.now() - lastSuccessfulUpdate.getTime() > 90000;

  // Fallback train model if live data is not yet resolved
  const fallbackMock: MockTrain | null =
    MOCK_TRAINS[selectedTrainNumber] || Object.values(MOCK_TRAINS)[0] || null;

  const activeTrain = liveTrainData || fallbackMock;

  // Coach Data state (reusing existing data from live payload to avoid duplicate requests)
  const [coachData, setCoachData] = useState<CoachComposition | null>(null);

  useEffect(() => {
    if (!selectedTrainNumber || !/^\d{5}$/.test(selectedTrainNumber)) {
      setCoachData(null);
      return;
    }

    // Zero Duplicate Requests: If live train data already contains coach composition, reuse it!
    if (liveTrainData?.coachComposition && liveTrainData.coachComposition.available) {
      setCoachData(liveTrainData.coachComposition);
      return;
    }

    let isMounted = true;
    fetchTrainCoaches(selectedTrainNumber)
      .then((comp) => {
        if (isMounted) setCoachData(comp);
      })
      .catch(() => {
        if (isMounted) {
          setCoachData({
            trainNumber: selectedTrainNumber,
            available: false,
            totalCoaches: 0,
            coaches: [],
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [selectedTrainNumber, liveTrainData?.coachComposition]);

  const activeCoachData = liveTrainData?.coachComposition ?? coachData;

  // Platform Info derivation (truthful telemetry with fallback to nextStation platform)
  const platformInfo: PlatformInfo = useMemo(() => {
    if (liveTrainData?.platformInfo) {
      return liveTrainData.platformInfo;
    }
    if (activeTrain?.nextStation?.platform) {
      return {
        platformNumber: activeTrain.nextStation.platform,
        status: 'EXPECTED',
        station: {
          code: activeTrain.nextStation.code,
          name: activeTrain.nextStation.name,
        },
        updatedAt: activeTrain.lastUpdatedTime || new Date().toISOString(),
      };
    }
    return {
      platformNumber: null,
      status: 'UNAVAILABLE',
      station: null,
    };
  }, [liveTrainData?.platformInfo, activeTrain]);

  // Route Stations normalization for StationTimeline (strict StationPoint[] compatibility)
  const routeStations: StationPoint[] = useMemo(() => {
    if (!activeTrain?.stations) return [];
    return activeTrain.stations.map((s) => ({
      code: s.code,
      name: s.name,
      latitude: 'latitude' in s && typeof s.latitude === 'number' ? s.latitude : 0,
      longitude: 'longitude' in s && typeof s.longitude === 'number' ? s.longitude : 0,
      scheduledArrival: s.scheduledArrival,
      actualArrival: s.actualArrival,
      scheduledDeparture: s.scheduledDeparture,
      actualDeparture: s.actualDeparture,
      delayMinutes: s.delayMinutes,
      platform: s.platform,
      hasDeparted: s.hasDeparted,
    }));
  }, [activeTrain]);

  // Find trains associated with the selected station
  const associatedTrains = useMemo(() => {
    if (!selectedStation) return [];
    const code = selectedStation.code.toUpperCase();
    const matched: { trainNumber: string; trainName: string }[] = [];

    // Check mock trains
    for (const [tNum, mTrain] of Object.entries(MOCK_TRAINS)) {
      const hasStation =
        mTrain.sourceCode.toUpperCase() === code ||
        mTrain.destinationCode.toUpperCase() === code ||
        mTrain.stations?.some((s) => s.code.toUpperCase() === code);
      if (hasStation) {
        matched.push({ trainNumber: mTrain.trainNumber, trainName: mTrain.trainName });
      }
    }

    // Check currently active live train
    if (liveTrainData?.stations?.some((s) => s.code.toUpperCase() === code)) {
      if (!matched.some((t) => t.trainNumber === liveTrainData.trainNumber)) {
        matched.unshift({
          trainNumber: liveTrainData.trainNumber,
          trainName: liveTrainData.trainName,
        });
      }
    }

    return matched;
  }, [selectedStation, liveTrainData]);

  const handleSelectTrain = useCallback(
    (trainNum: string) => {
      setSelectedTrainNumber(trainNum);
      setSelectedStation(null);
      setFocusStationCode(null);
      saveRecentSearch(trainNum);
    },
    [saveRecentSearch]
  );

  const handleSelectStation = useCallback(
    (code: string, name: string) => {
      setSelectedStation({ code, name });
      setFocusStationCode(code);
      saveRecentSearch(code);

      // Auto-switch to an associated train if current train doesn't serve this station
      const codeUpper = code.toUpperCase();
      const currentServesStation =
        activeTrain?.stations?.some((s) => s.code.toUpperCase() === codeUpper) ||
        activeTrain?.sourceCode?.toUpperCase() === codeUpper ||
        activeTrain?.destinationCode?.toUpperCase() === codeUpper;

      if (!currentServesStation) {
        // Find first train that serves this station
        for (const [tNum, mTrain] of Object.entries(MOCK_TRAINS)) {
          if (
            mTrain.sourceCode.toUpperCase() === codeUpper ||
            mTrain.destinationCode.toUpperCase() === codeUpper ||
            mTrain.stations?.some((s) => s.code.toUpperCase() === codeUpper)
          ) {
            setSelectedTrainNumber(tNum);
            break;
          }
        }
      }
    },
    [activeTrain, saveRecentSearch]
  );

  const handleClear = useCallback(() => {
    setSelectedStation(null);
    setFocusStationCode(null);
    setSelectedTrainNumber('12046');
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ResponsiveContainer maxWidth={isDesktopWeb ? 1080 : 640}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Title & Map Radar Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.radarIconWrapper}>
                <Ionicons name="map" size={20} color={theme.colors.accent} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Live Railway Radar</Text>
                <Text style={styles.headerSubtitle}>
                  Map-First telemetry, GPS tracking & route monitor
                </Text>
              </View>
            </View>
          </View>

          {/* 1. Map: Top Central Visual Radar */}
          <View style={styles.mapWrapper}>
            {activeTrain ? (
              <LiveTrainMap
                train={activeTrain}
                height={isDesktopWeb ? 460 : 380}
                showOverlay={true}
                onRefresh={refetch}
                focusStationCode={focusStationCode}
                isStale={isStale}
              />
            ) : (
              <View style={[styles.mapPlaceholder, { height: isDesktopWeb ? 460 : 380 }]}>
                <Ionicons name="map-outline" size={32} color={theme.colors.textMuted} />
                <Text style={styles.mapPlaceholderText}>No train selected for mapping</Text>
              </View>
            )}
          </View>

          {/* 2. Search: Segmented Search Toggle & Search Input Bar */}
          <View style={styles.searchSection}>
            <View style={styles.searchModeContainer}>
              <TouchableOpacity
                style={[
                  styles.searchModeTab,
                  searchMode === 'train' && styles.searchModeTabActive,
                ]}
                onPress={() => setSearchMode('train')}
                accessibilityRole="tab"
                accessibilityLabel="Direct train or station search"
              >
                <Ionicons
                  name="search"
                  size={13}
                  color={searchMode === 'train' ? theme.colors.accent : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.searchModeText,
                    searchMode === 'train' && styles.searchModeTextActive,
                  ]}
                >
                  Train / Station
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.searchModeTab,
                  searchMode === 'route' && styles.searchModeTabActive,
                ]}
                onPress={() => setSearchMode('route')}
                accessibilityRole="tab"
                accessibilityLabel="Where to Where route search"
              >
                <Ionicons
                  name="swap-horizontal"
                  size={14}
                  color={searchMode === 'route' ? theme.colors.accent : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.searchModeText,
                    searchMode === 'route' && styles.searchModeTextActive,
                  ]}
                >
                  Where to Where
                </Text>
              </TouchableOpacity>
            </View>

            {searchMode === 'train' ? (
              <MapSearchBar
                onSelectTrain={handleSelectTrain}
                onSelectStation={handleSelectStation}
                onClear={handleClear}
                recentSearches={recentSearches}
                placeholder="Search train (e.g. 12046, Shatabdi) or station (e.g. UMB, Ambala)..."
              />
            ) : (
              <JourneySearchCard />
            )}

            {/* Station Exploration Banner (When Station is Selected) */}
            {selectedStation && (
              <View style={styles.stationBanner}>
                <View style={styles.stationBannerHeader}>
                  <View style={styles.stationBadge}>
                    <Text style={styles.stationBadgeCode}>{selectedStation.code}</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.stationBannerTitle}>{selectedStation.name}</Text>
                    <Text style={styles.stationBannerSubtext}>
                      {associatedTrains.length > 0
                        ? `${associatedTrains.length} train${
                            associatedTrains.length > 1 ? 's' : ''
                          } serving this station`
                        : 'Station focused on map'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedStation(null);
                      setFocusStationCode(null);
                    }}
                    style={styles.stationBannerClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Dismiss station exploration banner"
                  >
                    <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {associatedTrains.length > 0 && (
                  <View style={styles.associatedTrainsRow}>
                    <Text style={styles.associatedTrainsLabel}>TRACK TRAIN:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.associatedChipsWrapper}>
                        {associatedTrains.map((t) => (
                          <TouchableOpacity
                            key={t.trainNumber}
                            style={[
                              styles.associatedTrainChip,
                              selectedTrainNumber === t.trainNumber &&
                                styles.associatedTrainChipActive,
                            ]}
                            onPress={() => {
                              setSelectedTrainNumber(t.trainNumber);
                              setFocusStationCode(selectedStation.code);
                            }}
                            accessibilityLabel={`Track train ${t.trainNumber} ${t.trainName}`}
                          >
                            <Ionicons
                              name="train"
                              size={12}
                              color={
                                selectedTrainNumber === t.trainNumber
                                  ? '#0B0F19'
                                  : theme.colors.accent
                              }
                            />
                            <Text
                              style={[
                                styles.associatedTrainChipText,
                                selectedTrainNumber === t.trainNumber &&
                                  styles.associatedTrainChipTextActive,
                              ]}
                            >
                              {t.trainNumber} {t.trainName.split(' ')[0]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 3. Route -> 4. Live status -> 5. Platform -> 6. Coach */}
          {isDesktopWeb ? (
            <View style={styles.desktopContentGrid}>
              {/* Left Column: 3. Route */}
              <View style={styles.desktopLeftCol}>
                <StationTimeline stations={routeStations} />
              </View>

              {/* Right Column: 4. Live status -> 5. Platform -> 6. Coach */}
              <View style={styles.desktopRightCol}>
                <MapStatusPanel
                  train={activeTrain}
                  isLoading={isLoading && !activeTrain}
                  isStale={isStale}
                  backgroundError={backgroundError}
                  lastSuccessfulUpdate={lastSuccessfulUpdate}
                  onRefresh={refetch}
                />
                <PlatformCard
                  platformInfo={platformInfo}
                  currentStationName={activeTrain?.currentLocation?.name}
                  nextStationName={activeTrain?.nextStation?.name}
                />
                <CoachLayout
                  composition={activeCoachData}
                  trainNumber={selectedTrainNumber}
                />
              </View>
            </View>
          ) : (
            /* Mobile Layout: Strict Vertical Stack: 3. Route -> 4. Live status -> 5. Platform -> 6. Coach */
            <View style={styles.mobileStack}>
              {/* 3. Route */}
              <StationTimeline stations={routeStations} />

              {/* 4. Live status */}
              <MapStatusPanel
                train={activeTrain}
                isLoading={isLoading && !activeTrain}
                isStale={isStale}
                backgroundError={backgroundError}
                lastSuccessfulUpdate={lastSuccessfulUpdate}
                onRefresh={refetch}
              />

              {/* 5. Platform */}
              <PlatformCard
                platformInfo={platformInfo}
                currentStationName={activeTrain?.currentLocation?.name}
                nextStationName={activeTrain?.nextStation?.name}
              />

              {/* 6. Coach */}
              <CoachLayout
                composition={activeCoachData}
                trainNumber={selectedTrainNumber}
              />
            </View>
          )}

          {/* Helpful Navigation & Architecture Note */}
          <View style={styles.infoNoticeBox}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={theme.colors.accent}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.infoNoticeText}>
              Search any train or station to track live on the map. Telemetry refreshes every 30s
              and auto-pauses when backgrounded.
            </Text>
          </View>
        </ScrollView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radarIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  mapWrapper: {
    width: '100%',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mapPlaceholder: {
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  searchSection: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  searchModeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 3,
    marginBottom: theme.spacing.sm,
    gap: 4,
  },
  searchModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
  },
  searchModeTabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  searchModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  searchModeTextActive: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  stationBanner: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
      },
      default: {
        elevation: 3,
      },
    }),
  },
  stationBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  stationBadgeCode: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.5,
  },
  stationBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  stationBannerSubtext: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  stationBannerClose: {
    padding: 4,
  },
  associatedTrainsRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  associatedTrainsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  associatedChipsWrapper: {
    flexDirection: 'row',
    gap: 6,
  },
  associatedTrainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  associatedTrainChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  associatedTrainChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  associatedTrainChipTextActive: {
    color: '#0B0F19',
  },
  desktopContentGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  desktopLeftCol: {
    flex: 1,
    minWidth: 320,
  },
  desktopRightCol: {
    flex: 1,
    minWidth: 320,
    gap: theme.spacing.sm,
  },
  mobileStack: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  infoNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  infoNoticeText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});
