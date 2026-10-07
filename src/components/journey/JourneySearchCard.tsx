import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { StationAutocompleteInput } from './StationAutocompleteInput';
import type { StationSearchResult } from '../../types/api';

export function JourneySearchCard() {
  const [sourceStation, setSourceStation] = useState<StationSearchResult | null>(null);
  const [destinationStation, setDestinationStation] = useState<StationSearchResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const router = useRouter();

  const handleSwapStations = () => {
    const temp = sourceStation;
    setSourceStation(destinationStation);
    setDestinationStation(temp);
    setValidationError(null);
  };

  const handleSearch = () => {
    if (!sourceStation) {
      setValidationError('Please select a departure station.');
      return;
    }

    if (!destinationStation) {
      setValidationError('Please select an arrival destination station.');
      return;
    }

    if (sourceStation.code.toUpperCase() === destinationStation.code.toUpperCase()) {
      setValidationError('Departure and arrival stations cannot be the same.');
      return;
    }

    setValidationError(null);

    router.push({
      pathname: '/trains/between',
      params: {
        from: sourceStation.code,
        to: destinationStation.code,
        fromName: sourceStation.name,
        toName: destinationStation.name,
      },
    } as any);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="swap-horizontal" size={18} color={theme.colors.accent} />
          <Text style={styles.cardTitle}>WHERE TO WHERE</Text>
        </View>
        <Text style={styles.cardSubtitle}>Search trains between stations</Text>
      </View>

      {/* From Station Input */}
      <View style={styles.inputContainer}>
        <StationAutocompleteInput
          label="FROM (DEPARTURE STATION)"
          placeholder="e.g. Chandigarh or CDG"
          selectedStation={sourceStation}
          onSelectStation={(station) => {
            setSourceStation(station);
            setValidationError(null);
          }}
          iconName="radio-button-on"
          isError={!!validationError && !sourceStation}
        />
      </View>

      {/* Swap Button Row */}
      <View style={styles.swapRow}>
        <View style={styles.swapLine} />
        <TouchableOpacity
          style={styles.swapButton}
          onPress={handleSwapStations}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Swap departure and arrival stations"
          accessibilityHint="Swaps the departure and arrival stations"
        >
          <Ionicons name="swap-vertical" size={18} color={theme.colors.accent} />
        </TouchableOpacity>
        <View style={styles.swapLine} />
      </View>

      {/* To Station Input */}
      <View style={styles.inputContainer}>
        <StationAutocompleteInput
          label="TO (DESTINATION STATION)"
          placeholder="e.g. New Delhi or NDLS"
          selectedStation={destinationStation}
          onSelectStation={(station) => {
            setDestinationStation(station);
            setValidationError(null);
          }}
          iconName="location"
          isError={
            !!validationError &&
            (!destinationStation || sourceStation?.code === destinationStation?.code)
          }
        />
      </View>

      {/* Validation Error Banner */}
      {validationError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={theme.colors.delayed} />
          <Text style={styles.errorText}>{validationError}</Text>
        </View>
      )}

      {/* Search Button */}
      <TouchableOpacity
        style={styles.searchButton}
        onPress={handleSearch}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Search Trains between stations"
        accessibilityHint="Finds available train services connecting departure and destination stations"
      >
        <Ionicons name="search" size={18} color="#FFFFFF" style={styles.searchButtonIcon} />
        <Text style={styles.searchButtonText}>Search Trains</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  cardHeader: {
    marginBottom: theme.spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.8,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  inputContainer: {
    zIndex: 1,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
  },
  swapButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    flex: 1,
    color: theme.colors.delayed,
    fontSize: 12,
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: theme.colors.accentHover,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
  },
  searchButtonIcon: {
    marginRight: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
