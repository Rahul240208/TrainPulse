import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ResponsiveContainer } from '../../components/common/ResponsiveContainer';
import { useLiveTrain } from '../../hooks/useLiveTrain';
import { LIVE_REFRESH_SECONDS } from '../../config/tracking';
import { LoadingCard } from '../../components/common/LoadingCard';
import { ErrorCard } from '../../components/common/ErrorCard';
import { LiveTelemetryBar } from '../../components/common/LiveTelemetryBar';
import { StatusPill } from '../../components/common/StatusPill';
import { PositionBadge } from '../../components/common/PositionBadge';
import { PlatformCard } from '../../components/train/PlatformCard';
import { CoachLayout } from '../../components/train/CoachLayout';
import { StationTimeline } from '../../components/train/StationTimeline';
import { LiveTrainMap } from '../../components/map/LiveTrainMap';
import { fetchTrainCoaches } from '../../services/api';
import type { CoachComposition } from '../../types/api';

export default function TrainDetailsScreen() {
  const { trainNumber, startDay } = useLocalSearchParams<{ trainNumber: string; startDay?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 768;

  // 1. Connect to live backend telemetry via useLiveTrain hook with 30s auto-refresh
  const {
    data: train,
    isLoading,
    isRefreshing,
    isPolling,
    isError,
    error,
    backgroundError,
    lastSuccessfulUpdate,
    refetch,
    clearBackgroundError,
  } = useLiveTrain(trainNumber, { startDay });

  // 2. Coach Data state (reusing existing data from train payload to avoid duplicate requests)
  const [coachData, setCoachData] = useState<CoachComposition | null>(null);

  useEffect(() => {
    if (!trainNumber) return;

    // Zero Duplicate Requests: If live train data already contains coach composition, reuse it!
    if (train?.coachComposition && train.coachComposition.available) {
      setCoachData(train.coachComposition);
      return;
    }

    let isMounted = true;
    fetchTrainCoaches(trainNumber)
      .then((comp) => {
        if (isMounted) setCoachData(comp);
      })
      .catch(() => {
        if (isMounted) {
          setCoachData({
            trainNumber,
            available: false,
            totalCoaches: 0,
            coaches: [],
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [trainNumber, train?.coachComposition]);

  const activeCoachData = train?.coachComposition ?? coachData;

  // State 1: Loading State
  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ResponsiveContainer maxWidth={isDesktopWeb ? 1120 : 640}>
          <LoadingCard trainNumber={trainNumber} />
        </ResponsiveContainer>
      </SafeAreaView>
    );
  }

  // State 2: Error State (404, 400, 429, Timeout, Network Error)
  if (isError || !train) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ResponsiveContainer maxWidth={isDesktopWeb ? 1120 : 640}>
          <ErrorCard
            code={error?.code}
            message={error?.message}
            statusCode={error?.statusCode}
            onRetry={refetch}
            onBack={() => router.back()}
          />
        </ResponsiveContainer>
      </SafeAreaView>
    );
  }

  // Defensive values for partial/missing telemetry
  const isStale =
    (lastSuccessfulUpdate ? Date.now() - lastSuccessfulUpdate.getTime() > 60000 : false) ||
    Boolean(backgroundError);
  const isLocationUnavailable = !train.currentLocation || train.status === 'CANCELLED';
  const speed =
    train.status === 'CANCELLED' || train.currentLocation?.speedKmH == null
      ? '--'
      : train.currentLocation.speedKmH;
  const speedUnit =
    train.status === 'CANCELLED' || train.currentLocation?.speedKmH == null
      ? 'N/A'
      : 'KM/H';

  const delayMinutes = train.delayMinutes;
  const statusMessage =
    train.status === 'RUNNING'
      ? delayMinutes != null && !isNaN(delayMinutes)
        ? delayMinutes > 0
          ? `Running ${delayMinutes} mins late`
          : 'Running exactly on schedule'
        : 'Running (Delay info updating)'
      : train.status === 'ARRIVED'
      ? 'Arrived at destination'
      : train.status === 'NOT_STARTED'
      ? 'Yet to depart source station'
      : train.status === 'CANCELLED'
      ? 'Train cancelled by Indian Railways'
      : train.status === 'DIVERTED'
      ? 'Operating on diverted route'
      : train.status;

  const formattedUpdatedTime = train.lastUpdatedTime?.includes('T')
    ? train.lastUpdatedTime.replace('T', ' ').substring(11, 19)
    : train.lastUpdatedTime || '--:--';

  // Render Section 1-7: Hero Telemetry Overview Card
  const renderHeroCard = () => (
    <View style={styles.heroCard}>
      {/* 1. Train Header Top Row: Number, Type, and Status/Delay */}
      <View style={styles.heroTopRow}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{train.trainNumber}</Text>
          <Text style={styles.typeText}>{train.trainType || 'Express'}</Text>
        </View>
        {/* 2. Current Status & 3. Delay */}
        <StatusPill status={train.status} delayMinutes={delayMinutes} />
      </View>

      {/* Train Name */}
      <Text style={styles.trainName}>{train.trainName}</Text>

      {/* Route: Origin to Destination */}
      <View style={styles.routeBox}>
        <View style={styles.routeStation}>
          <Text style={styles.stationCode}>{train.sourceCode}</Text>
          <Text style={styles.stationName} numberOfLines={1}>
            {train.sourceStation}
          </Text>
        </View>

        <View style={styles.routeLineContainer}>
          <View style={styles.routeDot} />
          <View style={styles.routeLine} />
          <Ionicons name="train" size={14} color={theme.colors.accent} />
          <View style={styles.routeLine} />
          <View style={[styles.routeDot, styles.routeDotDest]} />
        </View>

        <View style={[styles.routeStation, styles.routeStationRight]}>
          <Text style={styles.stationCode}>{train.destinationCode}</Text>
          <Text style={styles.stationName} numberOfLines={1}>
            {train.destinationStation}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 4. Current Location & 5. Speed */}
      <View style={styles.locationSection}>
        <View style={styles.locationCol}>
          <Text style={styles.sectionLabel}>CURRENT LOCATION</Text>
          <Text style={styles.locationName}>
            {train.status === 'CANCELLED'
              ? 'Service Cancelled'
              : train.currentLocation?.name || 'Location Unavailable'}
          </Text>
          <View style={styles.positionBadgeWrapper}>
            <PositionBadge
              positionType={train.currentLocation?.positionType || 'ESTIMATED_SCHEDULE'}
              isStale={isStale}
              isUnavailable={isLocationUnavailable}
              showExplanation
            />
          </View>
        </View>

        <View style={styles.speedCol}>
          <Text style={styles.speedNum}>{speed}</Text>
          <Text style={styles.speedUnit}>{speedUnit}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 6. Next Station */}
      <View style={styles.nextStationSection}>
        <View style={styles.nextStationHeaderRow}>
          <View style={styles.nextStationLabelRow}>
            <Ionicons name="navigate-circle-outline" size={14} color={theme.colors.accent} />
            <Text style={styles.sectionLabel}>NEXT STATION</Text>
          </View>
          {train.nextStation?.platform && (
            <View style={styles.nextStationPlatformBadge}>
              <Text style={styles.nextStationPlatformText}>
                PF {train.nextStation.platform}
              </Text>
            </View>
          )}
        </View>

        {train.nextStation ? (
          <View style={styles.nextStationBody}>
            <View style={styles.nextStationMainRow}>
              <View style={styles.nextStationNameContainer}>
                <Text style={styles.nextStationName}>{train.nextStation.name}</Text>
                <Text style={styles.nextStationCode}>({train.nextStation.code})</Text>
              </View>
              {train.nextStation.distanceRemainingKm != null && (
                <View style={styles.distanceChip}>
                  <Text style={styles.distanceChipText}>
                    {train.nextStation.distanceRemainingKm} km away
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.nextStationTimeRow}>
              <View style={styles.nextStationTimeItem}>
                <Text style={styles.nextStationTimeLabel}>Scheduled</Text>
                <Text style={styles.nextStationTimeVal}>
                  {train.nextStation.scheduledArrival || '--:--'}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={14} color={theme.colors.border} />

              <View style={styles.nextStationTimeItem}>
                <Text style={styles.nextStationTimeLabel}>Estimated ETA</Text>
                <Text
                  style={[
                    styles.nextStationTimeVal,
                    train.nextStation.delayMinutes != null && train.nextStation.delayMinutes > 5
                      ? styles.timeDelayed
                      : train.nextStation.delayMinutes != null
                      ? styles.timeOnTime
                      : undefined,
                  ]}
                >
                  {train.nextStation.actualArrival || train.nextStation.scheduledArrival || '--:--'}
                </Text>
              </View>

              <View
                style={[
                  styles.delayBadge,
                  train.nextStation.delayMinutes == null || isNaN(train.nextStation.delayMinutes)
                    ? styles.delayBadgeNeutral
                    : train.nextStation.delayMinutes > 5
                    ? styles.delayBadgeLate
                    : styles.delayBadgeOnTime,
                ]}
              >
                <Text
                  style={[
                    styles.delayBadgeText,
                    train.nextStation.delayMinutes == null || isNaN(train.nextStation.delayMinutes)
                      ? styles.delayBadgeTextNeutral
                      : train.nextStation.delayMinutes > 5
                      ? styles.delayBadgeTextLate
                      : styles.delayBadgeTextOnTime,
                  ]}
                >
                  {train.nextStation.delayMinutes == null || isNaN(train.nextStation.delayMinutes)
                    ? '--'
                    : train.nextStation.delayMinutes > 0
                    ? `+${train.nextStation.delayMinutes}m`
                    : 'On Time'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.nextStationFallbackBox}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.nextStationFallbackText}>
              {train.status === 'ARRIVED'
                ? `Train has arrived at ${train.destinationStation}.`
                : train.status === 'CANCELLED'
                ? 'Train service cancelled. No upcoming halts.'
                : train.status === 'NOT_STARTED'
                ? `Train scheduled to depart from ${train.sourceStation}.`
                : 'Next halt information temporarily updating.'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* 7. Last Updated Row */}
      <View style={styles.footerRow}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
          <Text style={styles.updateTimeText}>
            Last Updated: {formattedUpdatedTime}
          </Text>
        </View>
        <View style={styles.statusMessagePill}>
          <Text style={styles.statusMessageText} numberOfLines={1}>
            {statusMessage}
          </Text>
        </View>
      </View>
    </View>
  );

  // Render Section 9: Live Map Section with dedicated header and full map button
  const renderLiveMap = (mapHeight: number) => (
    <View style={styles.mapSectionWrapper}>
      <View style={styles.mapHeaderRow}>
        <View style={styles.mapTitleRow}>
          <Ionicons name="map" size={16} color={theme.colors.accent} />
          <Text style={styles.mapSectionTitle}>LIVE MAP</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(tabs)/map', params: { trainNumber: train.trainNumber } } as any)}
          style={styles.expandMapBtn}
          accessibilityRole="button"
          accessibilityLabel="Open full live map"
        >
          <Text style={styles.expandMapText}>Open Full Map</Text>
          <Ionicons name="chevron-forward" size={12} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      <LiveTrainMap train={train} height={mapHeight} showOverlay={true} isStale={isStale} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ResponsiveContainer maxWidth={isDesktopWeb ? 1120 : 640}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
            />
          }
        >
          {/* Real-time Telemetry & Refresh Status Bar */}
          <LiveTelemetryBar
            isRefreshing={isRefreshing}
            isPolling={isPolling}
            isStale={isStale}
            refreshIntervalSeconds={LIVE_REFRESH_SECONDS}
            lastSuccessfulUpdate={lastSuccessfulUpdate}
            backgroundError={backgroundError}
            onRetry={refetch}
            onDismissError={clearBackgroundError}
          />

          {/* Cancellation / Diversion Notice Banner */}
          {train.status === 'CANCELLED' && (
            <View style={styles.cancellationBanner}>
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.cancellationBannerText}>
                TRAIN CANCELLED: This service has been cancelled by Indian Railways.
              </Text>
            </View>
          )}

          {train.status === 'DIVERTED' && (
            <View style={styles.diversionBanner}>
              <Ionicons name="shuffle" size={20} color="#FFFFFF" />
              <Text style={styles.diversionBannerText}>
                ROUTE DIVERTED: Train is operating on an alternate route.
              </Text>
            </View>
          )}

          {/* Responsive Layout: Desktop Web 2-Column Grid vs Mobile Vertical Stack */}
          {isDesktopWeb ? (
            <View style={styles.desktopGrid}>
              {/* Left Column: Primary Telemetry (1-7), Platform (8), Coach Layout & My Coach (10-11) */}
              <View style={styles.desktopLeftCol}>
                {renderHeroCard()}

                {/* 8. Platform Information Card (Milestone 14) */}
                <PlatformCard
                  platformInfo={train.platformInfo}
                  currentStationName={train.currentLocation?.name}
                  nextStationName={train.nextStation?.name}
                />

                {/* 10. Coach Layout & 11. My Coach (Milestones 15 & 16) */}
                <CoachLayout
                  composition={activeCoachData}
                  trainNumber={train.trainNumber}
                />
              </View>

              {/* Right Column: Live Map (9) & Route Station Timeline (12) */}
              <View style={styles.desktopRightCol}>
                {renderLiveMap(380)}

                {/* 12. Route Station Stops Timeline */}
                <StationTimeline stations={train.stations} />
              </View>
            </View>
          ) : (
            /* Mobile Layout: Strict Vertical Stack 1 through 12 */
            <View style={styles.mobileStack}>
              {/* 1-7. Hero Card (Header, Status, Delay, Location, Speed, Next Station, Last Updated) */}
              {renderHeroCard()}

              {/* 8. Platform Information Card (Milestone 14) */}
              <PlatformCard
                platformInfo={train.platformInfo}
                currentStationName={train.currentLocation?.name}
                nextStationName={train.nextStation?.name}
              />

              {/* 9. Live Map */}
              {renderLiveMap(260)}

              {/* 10. Coach Layout & 11. My Coach (Milestones 15 & 16) */}
              <CoachLayout
                composition={activeCoachData}
                trainNumber={train.trainNumber}
              />

              {/* 12. Route Station Stops Timeline */}
              <StationTimeline stations={train.stations} />
            </View>
          )}
        </ScrollView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  desktopGrid: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    alignItems: 'flex-start',
    width: '100%',
  },
  desktopLeftCol: {
    flex: 1,
    minWidth: 320,
    gap: theme.spacing.md,
  },
  desktopRightCol: {
    flex: 1,
    minWidth: 320,
    gap: theme.spacing.md,
  },
  mobileStack: {
    flexDirection: 'column',
    gap: theme.spacing.md,
    width: '100%',
  },
  heroCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  numberBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  numberText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  typeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  trainName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  routeStation: {
    flex: 1,
  },
  routeStationRight: {
    alignItems: 'flex-end',
  },
  stationCode: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  stationName: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    maxWidth: 90,
  },
  routeLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.onTime,
  },
  routeDotDest: {
    backgroundColor: theme.colors.accent,
  },
  routeLine: {
    width: 24,
    height: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: theme.spacing.md,
  },
  locationSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationCol: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 4,
    marginBottom: 6,
  },
  positionBadgeWrapper: {
    marginTop: 2,
  },
  speedCol: {
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 74,
  },
  speedNum: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  speedUnit: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 0.5,
  },
  nextStationSection: {
    marginTop: 2,
  },
  nextStationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nextStationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextStationPlatformBadge: {
    backgroundColor: theme.colors.accentGlow,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nextStationPlatformText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  nextStationBody: {
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: 6,
  },
  nextStationMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextStationNameContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flex: 1,
  },
  nextStationName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  nextStationCode: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  distanceChip: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distanceChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  nextStationTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  nextStationTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextStationTimeLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  nextStationTimeVal: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  timeOnTime: {
    color: theme.colors.onTime,
  },
  timeDelayed: {
    color: theme.colors.delayed,
  },
  delayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  delayBadgeOnTime: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  delayBadgeLate: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  delayBadgeNeutral: {
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  delayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  delayBadgeTextOnTime: {
    color: theme.colors.onTime,
  },
  delayBadgeTextLate: {
    color: theme.colors.delayed,
  },
  delayBadgeTextNeutral: {
    color: theme.colors.textMuted,
  },
  nextStationFallbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  nextStationFallbackText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updateTimeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  statusMessagePill: {
    maxWidth: '55%',
  },
  statusMessageText: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  mapSectionWrapper: {
    marginTop: theme.spacing.md,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    paddingHorizontal: 2,
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  expandMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  expandMapText: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  cancellationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DC2626',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancellationBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  diversionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#D97706',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  diversionBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
