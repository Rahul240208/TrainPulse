import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { ResponsiveContainer } from '../../components/common/ResponsiveContainer';

export default function AboutScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ResponsiveContainer>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Banner */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="train" size={32} color={theme.colors.accent} />
            </View>
            <Text style={styles.appName}>TrainPulse</Text>
            <Text style={styles.appTagline}>Indian Railway Live Tracking & Telemetry</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v1.0.0 • Production Release</Text>
            </View>
          </View>

          {/* Project Goal Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="compass-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>Project Goal</Text>
            </View>
            <Text style={styles.cardBody}>
              TrainPulse is a cross-platform application dedicated exclusively to real-time train tracking across Android, iOS, and Web.
            </Text>
          </View>

          {/* User Journey Architecture Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="git-commit-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>The Primary Journey</Text>
            </View>
            <Text style={styles.cardBody}>
              Every interaction is structured around a fast, intuitive 5-step flow:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: theme.colors.accent }]} />
                <View style={styles.bulletTextCol}>
                  <Text style={styles.bulletTitle}>1. Where are you going?</Text>
                  <Text style={styles.bulletDesc}>
                    Debounced station search with auto-complete and offline fallback.
                  </Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: theme.colors.accent }]} />
                <View style={styles.bulletTextCol}>
                  <Text style={styles.bulletTitle}>2. Find Train</Text>
                  <Text style={styles.bulletDesc}>
                    Available trains with duration, departure, arrival, and running days.
                  </Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: theme.colors.accent }]} />
                <View style={styles.bulletTextCol}>
                  <Text style={styles.bulletTitle}>3. Track Train</Text>
                  <Text style={styles.bulletDesc}>
                    Live telemetry with 30s auto-refresh, speed gauge, and OpenStreetMap.
                  </Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: theme.colors.accent }]} />
                <View style={styles.bulletTextCol}>
                  <Text style={styles.bulletTitle}>4. Check Platform</Text>
                  <Text style={styles.bulletDesc}>
                    Confirmed or expected platform numbers with freshness timestamps.
                  </Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: theme.colors.accent }]} />
                <View style={styles.bulletTextCol}>
                  <Text style={styles.bulletTitle}>5. Find Coach</Text>
                  <Text style={styles.bulletDesc}>
                    Coach composition sequence with local My Coach selection highlight.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Data Truthfulness Pledge */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={18} color={theme.colors.onTime} />
              <Text style={styles.cardTitle}>Telemetry Truthfulness</Text>
            </View>
            <Text style={styles.cardBody}>
              Unlike conventional tracking applications that simulate coordinates without disclosure, TrainPulse guarantees:
            </Text>

            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: theme.colors.gpsLive }]} />
                <View style={styles.bulletTextCol}>
                  <Text style={styles.bulletTitle}>Live GPS Telemetry</Text>
                  <Text style={styles.bulletDesc}>
                    Direct, confirmed GPS fix broadcasted from locomotive rake devices.
                  </Text>
                </View>
              </View>

              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: theme.colors.estimated }]} />
                <View style={styles.bulletTextCol}>
                  <Text style={styles.bulletTitle}>Estimated Position</Text>
                  <Text style={styles.bulletDesc}>
                    Estimated between stations based on departure timestamps and scheduled line speed. Never falsely presented as real-time GPS.
                  </Text>
                </View>
              </View>

              <View style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: theme.colors.stationFixed }]} />
                <View style={styles.bulletTextCol}>
                  <Text style={styles.bulletTitle}>Station Confirmed</Text>
                  <Text style={styles.bulletDesc}>
                    Fixed station stop confirmed by station departure/arrival signal logging.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Technical Specifications */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="hardware-chip-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>Production Stack & Architecture</Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specKey}>Client Framework</Text>
              <Text style={styles.specVal}>React Native 0.86 / Expo SDK 57</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Routing</Text>
              <Text style={styles.specVal}>Expo Router v57 (Typed Routes)</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Backend Engine</Text>
              <Text style={styles.specVal}>Hono / Node.js Microservice</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Data Provider</Text>
              <Text style={styles.specVal}>RailRadar Live Telemetry</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Caching & Coalescing</Text>
              <Text style={styles.specVal}>Server TTL Cache + Single-Flight</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Mapping Engine</Text>
              <Text style={styles.specVal}>OpenStreetMap / Leaflet Engine</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specKey}>TypeScript</Text>
              <Text style={styles.specVal}>Strict Mode (100% Type-Safe)</Text>
            </View>
          </View>

          {/* Strict Scope Restrictions */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="ban-outline" size={18} color={theme.colors.warning} />
              <Text style={styles.cardTitle}>Scope Restrictions</Text>
            </View>
            <Text style={styles.cardBody}>
              TrainPulse is laser-focused on tracking and will never include:
            </Text>
            <View style={styles.tagGrid}>
              {['No Ticket Booking', 'No PNR Inquiries', 'No Seat Availability', 'No Payments', 'No Food Ordering', 'No Unnecessary Auth'].map((item) => (
                <View key={item} style={styles.scopePill}>
                  <Text style={styles.scopePillText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Footer Copyright */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              TrainPulse • Built with care for Indian Railway Commuters
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
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  appTagline: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  versionBadge: {
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.xs,
  },
  versionText: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  cardBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  bulletList: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  bulletTextCol: {
    flex: 1,
  },
  bulletTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  bulletDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginTop: 1,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  specKey: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  specVal: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: theme.spacing.sm,
  },
  scopePill: {
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  scopePillText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});

