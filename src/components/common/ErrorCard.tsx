import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface ErrorCardProps {
  code?: string;
  message?: string;
  statusCode?: number;
  onRetry: () => void;
  onBack: () => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  code,
  message,
  statusCode,
  onRetry,
  onBack,
}) => {
  const isInvalidNumber = code === 'INVALID_TRAIN_NUMBER' || statusCode === 400;
  const isNotFound = code === 'TRAIN_NOT_FOUND' || statusCode === 404;
  const isTimeout = code === 'TIMEOUT' || code === 'UPSTREAM_TIMEOUT' || statusCode === 504;
  const isRateLimit = code === 'UPSTREAM_RATE_LIMITED' || code === 'RATE_LIMITED' || statusCode === 429;
  const isUnavailable = code === 'UPSTREAM_UNAVAILABLE' || statusCode === 502 || statusCode === 503;
  const isNetwork = code === 'NETWORK_ERROR' || statusCode === 0;

  const iconName = isInvalidNumber
    ? 'keypad-outline'
    : isNotFound
    ? 'search-outline'
    : isTimeout
    ? 'timer-outline'
    : isRateLimit
    ? 'hourglass-outline'
    : isUnavailable
    ? 'server-outline'
    : isNetwork
    ? 'cloud-offline-outline'
    : 'alert-circle-outline';

  const title = isInvalidNumber
    ? 'Invalid Train Number'
    : isNotFound
    ? 'Train Not Found'
    : isTimeout
    ? 'Request Timed Out'
    : isRateLimit
    ? 'Quota Limit Reached'
    : isUnavailable
    ? 'Service Temporarily Unavailable'
    : isNetwork
    ? 'No Internet Connection'
    : 'Tracking Unavailable';

  const defaultMessage = isInvalidNumber
    ? 'Train numbers must be 5 numeric digits (e.g. 12919). Please check and try again.'
    : isNotFound
    ? 'No active train with this number was found on the Indian Railways live network.'
    : isTimeout
    ? 'The railway telemetry service took too long to respond. Please try again.'
    : isRateLimit
    ? 'Upstream live tracking quota is currently saturated. Please wait a minute and retry.'
    : isUnavailable
    ? 'The railway live tracking service is temporarily down for maintenance. Please try again shortly.'
    : isNetwork
    ? 'Unable to connect to the live tracking service. Please verify your network connection.'
    : 'An unexpected issue occurred while retrieving live train tracking data.';

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={iconName} size={40} color={theme.colors.delayed} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message || defaultMessage}</Text>

      {code && (
        <View style={styles.codePill}>
          <Text style={styles.codeText}>CODE: {code}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.backButtonText}>Back to Search</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 380,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    margin: theme.spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  message: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: theme.spacing.md,
  },
  codePill: {
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: theme.spacing.lg,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accentHover,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

