import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../theme';
import { ResponsiveContainer } from '../../components/common/ResponsiveContainer';
import { MOCK_TRAINS, type MockTrain } from '../../data/mockTrains';
import { LiveTrainMap } from '../../components/map/LiveTrainMap';
import { StatusPill } from '../../components/common/StatusPill';

export default function LiveMapScreen() {
  const router = useRouter();
  const trainList = Object.values(MOCK_TRAINS);
  const [selectedNumber, setSelectedNumber] = useState<string>(trainList[0]?.trainNumber || '12301');

  const selectedTrain: MockTrain =
    MOCK_TRAINS[selectedNumber] || trainList[0] || ({} as MockTrain);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ResponsiveContainer>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="map" size={22} color={theme.colors.accent} />
              <Text style={styles.headerTitle}>Live Railway Radar</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Schematic route tracking & telemetry monitor
            </Text>
          </View>

          {/* Train Selector Chips */}
          <View style={styles.selectorSection}>
            <Text style={styles.selectorLabel}>SELECT ACTIVE TRAIN</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectorScroll}
            >
              {trainList.map((t) => {
                const isSelected = t.trainNumber === selectedNumber;
                return (
                  <TouchableOpacity
                    key={t.trainNumber}
                    style={[styles.trainPill, isSelected && styles.trainPillActive]}
                    onPress={() => setSelectedNumber(t.trainNumber)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.trainPillNumber, isSelected && styles.trainPillNumberActive]}>
                      {t.trainNumber}
                    </Text>
                    <Text style={[styles.trainPillName, isSelected && styles.trainPillNameActive]}>
                      {t.trainName.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Live OpenStreetMap Interactive Radar Canvas */}
          <View style={styles.mapContainer}>
            <LiveTrainMap train={selectedTrain} height={340} showOverlay={true} />
          </View>

          {/* Telemetry Details Card */}
          <View style={styles.telemetryCard}>
            <View style={styles.telemetryHeader}>
              <View style={styles.trainIdentRow}>
                <Text style={styles.telemetryTrainNum}>{selectedTrain.trainNumber}</Text>
                <Text style={styles.telemetryTrainName} numberOfLines={1}>
                  {selectedTrain.trainName}
                </Text>
              </View>
              <StatusPill
                status={selectedTrain.status}
                delayMinutes={selectedTrain.delay}
                size="small"
              />
            </View>

            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryCol}>
                <Text style={styles.statLabel}>CURRENT SPEED</Text>
                <Text style={styles.statValue}>{selectedTrain.speed} km/h</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.telemetryCol}>
                <Text style={styles.statLabel}>DELAY</Text>
                <Text
                  style={[
                    styles.statValue,
                    selectedTrain.delay > 0 ? styles.lateVal : styles.onTimeVal,
                  ]}
                >
                  {selectedTrain.delay > 0 ? `+${selectedTrain.delay} mins` : 'On Time'}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.telemetryCol}>
                <Text style={styles.statLabel}>NEXT STOP</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {selectedTrain.nextStation?.code || 'Terminated'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.locationRow}>
              <Ionicons name="pin" size={14} color={theme.colors.accent} />
              <Text style={styles.locationText} numberOfLines={1}>
                {selectedTrain.currentLocation.name}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() =>
                router.push({
                  pathname: '/train/[trainNumber]',
                  params: { trainNumber: selectedTrain.trainNumber },
                } as any)
              }
              activeOpacity={0.8}
            >
              <Text style={styles.detailsBtnText}>View Complete Journey Timeline</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Live OpenStreetMap Integration Notice */}
          <View style={styles.roadmapBox}>
            <Ionicons name="map" size={20} color={theme.colors.accent} />
            <View style={styles.roadmapInfo}>
              <Text style={styles.roadmapTitle}>OpenStreetMap & Leaflet Active</Text>
              <Text style={styles.roadmapText}>
                Live railway route lines, interactive station halt popups, and truthful GPS beacons are rendered in real time.
              </Text>
            </View>
          </View>
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
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectorSection: {
    marginBottom: theme.spacing.md,
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  selectorScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  trainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  trainPillActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  trainPillNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  trainPillNumberActive: {
    color: '#070B14',
  },
  trainPillName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  trainPillNameActive: {
    color: '#070B14',
    fontWeight: '700',
  },
  mapContainer: {
    marginBottom: theme.spacing.md,
  },
  telemetryCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  trainIdentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1,
  },
  telemetryTrainNum: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  telemetryTrainName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    maxWidth: '65%',
  },
  telemetryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: 4,
  },
  telemetryCol: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  lateVal: {
    color: theme.colors.delayed,
  },
  onTimeVal: {
    color: theme.colors.onTime,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: theme.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  locationText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.accentHover,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  roadmapBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.md,
    alignItems: 'flex-start',
  },
  roadmapInfo: {
    flex: 1,
  },
  roadmapTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  roadmapText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
});

