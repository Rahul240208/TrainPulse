import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import type { CoachComposition, CoachType } from '../../types/api';
import { getSavedCoach, saveCoach, clearSavedCoach } from '../../utils/coachStorage';

export interface CoachLayoutProps {
  composition?: CoachComposition | null;
  trainNumber: string;
}

/**
 * Returns color tokens according to the verified coach category.
 */
function getCoachColor(type: CoachType) {
  switch (type) {
    case 'ENGINE':
      return { bg: '#1E293B', border: '#475569', text: '#F8FAFC', tag: 'Loco' };
    case 'POWER_CAR':
      return { bg: '#1F2937', border: '#374151', text: '#9CA3AF', tag: 'Power' };
    case 'FIRST_AC':
      return { bg: 'rgba(234, 179, 8, 0.16)', border: '#EAB308', text: '#FACC15', tag: '1st AC' };
    case 'AC_2_TIER':
      return { bg: 'rgba(20, 184, 166, 0.16)', border: '#14B8A6', text: '#2DD4BF', tag: '2-Tier' };
    case 'AC_3_TIER':
      return { bg: 'rgba(56, 189, 248, 0.16)', border: '#38BDF8', text: '#38BDF8', tag: '3-Tier' };
    case 'CHAIR_CAR':
      return { bg: 'rgba(168, 85, 247, 0.16)', border: '#A855F7', text: '#C084FC', tag: 'CC' };
    case 'EXECUTIVE_CHAIR_CAR':
      return { bg: 'rgba(236, 72, 153, 0.16)', border: '#EC4899', text: '#F472B6', tag: 'Exec' };
    case 'SLEEPER':
      return { bg: 'rgba(245, 158, 11, 0.16)', border: '#F59E0B', text: '#FBBF24', tag: 'Sleeper' };
    case 'GENERAL':
      return { bg: 'rgba(100, 116, 139, 0.16)', border: '#64748B', text: '#94A3B8', tag: 'Gen' };
    case 'PANTRY':
      return { bg: 'rgba(239, 68, 68, 0.16)', border: '#EF4444', text: '#F87171', tag: 'Pantry' };
    default:
      return { bg: '#1E293B', border: '#334155', text: '#94A3B8', tag: 'Coach' };
  }
}

export const CoachLayout: React.FC<CoachLayoutProps> = ({ composition, trainNumber }) => {
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [inputQuery, setInputQuery] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load saved coach on mount or train change
  useEffect(() => {
    const saved = getSavedCoach(trainNumber);
    if (saved) {
      setSelectedCoach(saved);
    } else {
      setSelectedCoach(null);
    }
    setInputQuery('');
    setInputError(null);
  }, [trainNumber]);

  // Unavailable state guard
  if (!composition || !composition.available || !composition.coaches || composition.coaches.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Ionicons name="train-outline" size={16} color={theme.colors.accent} />
            <Text style={styles.titleText}>COACH COMPOSITION</Text>
          </View>
        </View>
        <View style={styles.unavailableBox}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.textMuted} />
          <Text style={styles.unavailableText}>Coach layout unavailable for this train.</Text>
        </View>
      </View>
    );
  }

  const passengerCoaches = composition.coaches.filter(
    (c) => c.type !== 'ENGINE' && c.type !== 'POWER_CAR' && c.type !== 'PANTRY' && c.number
  );

  const handleSelectCoach = (coachNum: string) => {
    const target = coachNum.trim().toUpperCase();
    const exists = composition.coaches.some(
      (c) => c.number?.toUpperCase() === target || c.label?.toUpperCase() === target
    );

    if (!exists) {
      setInputError(`Coach "${coachNum}" does not exist on this train.`);
      return;
    }

    setInputError(null);
    if (selectedCoach === target) {
      // Toggle off
      setSelectedCoach(null);
      clearSavedCoach(trainNumber);
    } else {
      setSelectedCoach(target);
      saveCoach(trainNumber, target);
    }
  };

  const handleClearCoach = () => {
    setSelectedCoach(null);
    setInputQuery('');
    setInputError(null);
    clearSavedCoach(trainNumber);
  };

  const handleInputSubmit = () => {
    if (!inputQuery.trim()) return;
    handleSelectCoach(inputQuery);
  };

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Ionicons name="subway" size={16} color={theme.colors.accent} />
          <Text style={styles.titleText}>COACH COMPOSITION</Text>
        </View>
        <Text style={styles.totalBadge}>{composition.totalCoaches} Coaches</Text>
      </View>

      {/* Direction of Travel Indicator */}
      <View style={styles.directionBar}>
        <Ionicons name="arrow-forward-circle" size={14} color={theme.colors.accent} />
        <Text style={styles.directionText}>Direction of Movement (Engine at Front)</Text>
      </View>

      {/* Horizontal Scrollable Coach Train Composition */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trainTrack}
      >
        {composition.coaches.map((coach, index) => {
          const coachNum = coach.number || coach.label || `C${coach.sequence}`;
          const isSelected = selectedCoach?.toUpperCase() === coachNum.toUpperCase();
          const styling = getCoachColor(coach.type);

          return (
            <React.Fragment key={`${coach.sequence}-${coachNum}`}>
              {/* Coach Box */}
              <TouchableOpacity
                style={[
                  styles.coachBox,
                  { backgroundColor: styling.bg, borderColor: styling.border },
                  isSelected && styles.selectedCoachBox,
                ]}
                onPress={() => handleSelectCoach(coachNum)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Coach ${coachNum}, ${styling.tag}${
                  coach.position ? `, ${coach.position} section` : ''
                }${isSelected ? ', Selected as My Coach' : ''}`}
              >
                {/* Selected Indicator Pill */}
                {isSelected && (
                  <View style={styles.myCoachPill}>
                    <Text style={styles.myCoachPillText}>MY COACH</Text>
                  </View>
                )}

                {/* Coach Number/Code */}
                <Text
                  style={[
                    styles.coachNumber,
                    { color: styling.text },
                    isSelected && styles.selectedCoachNumber,
                  ]}
                >
                  {isSelected ? `[ ${coachNum} ]` : coachNum}
                </Text>

                {/* Category / Class Tag */}
                <Text style={styles.coachCategoryText}>{styling.tag}</Text>

                {/* Front / Middle / Rear Position */}
                {coach.position && (
                  <Text style={styles.positionTag}>{coach.position}</Text>
                )}

                {/* Sequence Number */}
                <Text style={styles.seqText}>#{coach.sequence}</Text>
              </TouchableOpacity>

              {/* Coupler Arrow between coaches */}
              {index < composition.coaches.length - 1 && (
                <View style={styles.coupler}>
                  <View style={styles.couplerLine} />
                  <Ionicons name="chevron-forward" size={12} color={theme.colors.border} />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>

      {/* My Coach Selector Section */}
      <View style={styles.myCoachSection}>
        <View style={styles.myCoachHeader}>
          <Text style={styles.myCoachTitle}>
            {selectedCoach ? (
              <Text>
                Your Coach: <Text style={styles.selectedCoachHighlight}>{selectedCoach}</Text>
              </Text>
            ) : (
              'Select My Coach'
            )}
          </Text>

          {selectedCoach && (
            <TouchableOpacity
              onPress={handleClearCoach}
              style={styles.clearBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Clear selected coach"
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Selection Chips */}
        {passengerCoaches.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {passengerCoaches.map((c) => {
              const num = c.number || c.label || '';
              const isChipSelected = selectedCoach?.toUpperCase() === num.toUpperCase();
              return (
                <TouchableOpacity
                  key={`chip-${num}`}
                  style={[styles.coachChip, isChipSelected && styles.coachChipSelected]}
                  onPress={() => handleSelectCoach(num)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select coach ${num}${isChipSelected ? ', currently selected' : ''}`}
                >
                  <Text style={[styles.coachChipText, isChipSelected && styles.coachChipTextSelected]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Input Bar for Direct Search */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type coach (e.g. B2, S1, A1)..."
            placeholderTextColor={theme.colors.textMuted}
            value={inputQuery}
            onChangeText={(t) => {
              setInputQuery(t);
              setInputError(null);
            }}
            onSubmitEditing={handleInputSubmit}
            autoCapitalize="characters"
            maxLength={6}
            accessibilityLabel="Coach code to highlight"
          />
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={handleInputSubmit}
            accessibilityRole="button"
            accessibilityLabel="Highlight coach"
          >
            <Text style={styles.selectBtnText}>Highlight</Text>
          </TouchableOpacity>
        </View>

        {inputError && <Text style={styles.errorText}>{inputError}</Text>}
      </View>

      {/* Important Notice Distinguishing Platform Position */}
      <View style={styles.disclaimerBox}>
        <Ionicons name="information-circle-outline" size={13} color={theme.colors.textMuted} style={{ marginRight: 5 }} />
        <Text style={styles.disclaimerText}>
          Coach composition shows sequence in train. Platform stopping positions may vary.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.8,
  },
  totalBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  directionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: theme.spacing.sm,
  },
  directionText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  trainTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 2,
  },
  coachBox: {
    width: 72,
    height: 94,
    borderRadius: 8,
    borderWidth: 1.5,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      },
    }),
  },
  selectedCoachBox: {
    borderColor: theme.colors.accent,
    borderWidth: 2.5,
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ scale: 1.04 }],
  },
  myCoachPill: {
    position: 'absolute',
    top: -10,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    alignSelf: 'center',
  },
  myCoachPillText: {
    color: '#0B0F19',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  coachNumber: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  selectedCoachNumber: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  coachCategoryText: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  positionTag: {
    fontSize: 7.5,
    color: theme.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  seqText: {
    fontSize: 8,
    color: theme.colors.textMuted,
  },
  coupler: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  couplerLine: {
    width: 6,
    height: 2,
    backgroundColor: theme.colors.border,
  },
  myCoachSection: {
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  myCoachHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  myCoachTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  selectedCoachHighlight: {
    color: theme.colors.accent,
    fontWeight: '800',
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearBtnText: {
    fontSize: 11,
    color: theme.colors.delayed,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 6,
  },
  coachChip: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coachChipSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  coachChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  coachChipTextSelected: {
    color: theme.colors.accent,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  selectBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  selectBtnText: {
    color: '#0B0F19',
    fontSize: 11,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 11,
    color: theme.colors.delayed,
    marginTop: 4,
    fontWeight: '600',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: theme.colors.textMuted,
    lineHeight: 14,
  },
  unavailableBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.cardSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  unavailableText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
});
