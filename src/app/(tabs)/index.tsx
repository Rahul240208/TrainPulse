import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ResponsiveContainer } from '../../components/common/ResponsiveContainer';
import { trainNumberSchema } from '../../shared/trainNumber';
import {
  MOCK_TRAINS,
  INITIAL_RECENT_SEARCHES,
  type MockTrain,
} from '../../data/mockTrains';
import { TrainSummaryCard } from '../../components/train/TrainSummaryCard';
import { JourneySearchCard } from '../../components/journey/JourneySearchCard';

export default function HomeScreen() {

  const [trainNumber, setTrainNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(INITIAL_RECENT_SEARCHES);
  const router = useRouter();

  const handleInputChange = (text: string) => {
    const digitsOnly = text.replace(/[^\d]/g, '').slice(0, 5);
    setTrainNumber(digitsOnly);
    if (errorMessage && digitsOnly.length === 5) {
      setErrorMessage(null);
    }
  };

  const handleTrackTrain = (targetNumber?: string) => {
    const numToTrack = targetNumber || trainNumber;
    const result = trainNumberSchema.safeParse(numToTrack);

    if (!result.success) {
      setErrorMessage(result.error.errors[0]?.message || 'Please enter a valid 5-digit train number.');
      return;
    }

    const validatedNumber = result.data;
    setErrorMessage(null);

    // Update recent searches in state
    if (!recentSearches.includes(validatedNumber)) {
      setRecentSearches([validatedNumber, ...recentSearches.slice(0, 4)]);
    }

    router.push({ pathname: '/train/[trainNumber]', params: { trainNumber: validatedNumber } } as any);
  };

  const isValidLength = trainNumber.length === 5;

  const recentTrainsList = recentSearches
    .map((num) => MOCK_TRAINS[num])
    .filter((t): t is MockTrain => t !== undefined);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ResponsiveContainer>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo & Tagline */}
            <View style={styles.brandContainer}>
              <View style={styles.logoBadge}>
                <Ionicons name="train" size={32} color={theme.colors.accent} />
              </View>
              <Text style={styles.brandTitle}>TrainPulse</Text>
              <Text style={styles.brandTagline}>
                Live Indian Railway Tracking & Telemetry
              </Text>
              <View style={styles.modeBadge}>
                <View style={styles.modeDot} />
                <Text style={styles.modeText}>Live Telemetry & Station Search</Text>
              </View>
            </View>

            {/* Primary Journey Workflow Guide */}
            <View style={styles.journeyGuideCard} accessibilityRole="summary" accessibilityLabel="The TrainPulse Journey: Where, Find Train, Track, Platform, My Coach">
              <Text style={styles.journeyGuideTitle}>THE TRAINPULSE JOURNEY</Text>
              <View style={styles.journeyStepsRow}>
                <View style={styles.journeyStep}>
                  <View style={styles.journeyStepIconCircle}>
                    <Ionicons name="location-sharp" size={12} color={theme.colors.accent} />
                  </View>
                  <Text style={styles.journeyStepText}>Where?</Text>
                </View>

                <Ionicons name="chevron-forward" size={12} color={theme.colors.border} />

                <View style={styles.journeyStep}>
                  <View style={styles.journeyStepIconCircle}>
                    <Ionicons name="search" size={12} color={theme.colors.accent} />
                  </View>
                  <Text style={styles.journeyStepText}>Find Train</Text>
                </View>

                <Ionicons name="chevron-forward" size={12} color={theme.colors.border} />

                <View style={styles.journeyStep}>
                  <View style={styles.journeyStepIconCircle}>
                    <Ionicons name="pulse" size={12} color={theme.colors.accent} />
                  </View>
                  <Text style={styles.journeyStepText}>Track</Text>
                </View>

                <Ionicons name="chevron-forward" size={12} color={theme.colors.border} />

                <View style={styles.journeyStep}>
                  <View style={styles.journeyStepIconCircle}>
                    <Ionicons name="business" size={12} color={theme.colors.accent} />
                  </View>
                  <Text style={styles.journeyStepText}>Platform</Text>
                </View>

                <Ionicons name="chevron-forward" size={12} color={theme.colors.border} />

                <View style={styles.journeyStep}>
                  <View style={styles.journeyStepIconCircle}>
                    <Ionicons name="subway" size={12} color={theme.colors.accent} />
                  </View>
                  <Text style={styles.journeyStepText}>My Coach</Text>
                </View>
              </View>
            </View>

            {/* Journey Search (Where to Where) Card */}
            <JourneySearchCard />

            {/* Train Number Search Card */}
            <View style={styles.searchCard}>
              <Text style={styles.inputLabel}>OR TRACK BY 5-DIGIT TRAIN NUMBER</Text>

              <View
                style={[
                  styles.inputWrapper,
                  errorMessage ? styles.inputWrapperError : null,
                ]}
              >
                <Ionicons
                  name="search"
                  size={20}
                  color={theme.colors.textMuted}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 12301 or 12002"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  maxLength={5}
                  value={trainNumber}
                  onChangeText={handleInputChange}
                  onSubmitEditing={() => handleTrackTrain()}
                  returnKeyType="search"
                  accessibilityLabel="5-digit Train Number"
                />
                {trainNumber.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setTrainNumber('');
                      setErrorMessage(null);
                    }}
                    style={styles.clearButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear train number input"
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {errorMessage && (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color={theme.colors.delayed}
                  />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Track Train Button */}
              <TouchableOpacity
                style={[
                  styles.trackButton,
                  !isValidLength && styles.trackButtonDisabled,
                ]}
                onPress={() => handleTrackTrain()}
                disabled={!isValidLength}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Track Train by 5-digit number"
                accessibilityHint="Navigates to live telemetry details for the specified train number"
              >
                <Ionicons
                  name="navigate"
                  size={18}
                  color={isValidLength ? '#FFFFFF' : theme.colors.textMuted}
                  style={styles.buttonIcon}
                />
                <Text
                  style={[
                    styles.trackButtonText,
                    !isValidLength && styles.trackButtonTextDisabled,
                  ]}
                >
                  Track Train
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recent Searches Section using mock data */}
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.accent} />
                  <Text style={styles.sectionTitle}>RECENT SEARCHES</Text>
                </View>
                {recentSearches.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setRecentSearches([])}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear all recent searches"
                  >
                    <Text style={styles.clearAllText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {recentTrainsList.length > 0 ? (
                recentTrainsList.map((train) => (
                  <TrainSummaryCard key={train.trainNumber} train={train} />
                ))
              ) : (
                <View style={styles.emptyRecentBox}>
                  <Ionicons name="search-outline" size={24} color={theme.colors.textMuted} />
                  <Text style={styles.emptyRecentText}>No recent searches</Text>
                </View>
              )}
            </View>

            {/* Information Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
              <Text style={styles.infoBannerText}>
                Select any recent train or enter a 5-digit number to explore live telemetry, next station ETA, and route timeline.
              </Text>
            </View>
          </ScrollView>
        </ResponsiveContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
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
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.onTime,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  journeyGuideCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: theme.spacing.md,
  },
  journeyGuideTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 8,
  },
  journeyStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  journeyStep: {
    alignItems: 'center',
    gap: 3,
  },
  journeyStepIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  journeyStepText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  searchCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 52,
  },
  inputWrapperError: {
    borderColor: theme.colors.delayed,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.delayed,
    fontSize: 12,
    fontWeight: '500',
  },
  trackButton: {
    backgroundColor: theme.colors.accentHover,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  trackButtonDisabled: {
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonIcon: {
    marginRight: 8,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  trackButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  recentSection: {
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  clearAllText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  emptyRecentBox: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  emptyRecentText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});

