import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

export interface HorizontalCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  daysRange?: number;
}

export function HorizontalCalendar({ selectedDate, onSelectDate, daysRange = 7 }: HorizontalCalendarProps) {
  const dates = useMemo(() => {
    const arr = [];
    const today = new Date();
    // Start from yesterday
    for (let i = -1; i <= daysRange; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoString = d.toISOString().split('T')[0];
      
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      
      let label = dayName;
      if (i === -1) label = 'Yest';
      if (i === 0) label = 'Today';
      if (i === 1) label = 'Tomw';

      arr.push({
        id: isoString,
        dateString: isoString,
        label,
        dateNum,
        monthName,
      });
    }
    return arr;
  }, [daysRange]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((item) => {
          const isActive = selectedDate === item.dateString;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.dateItem, isActive && styles.dateItemActive]}
              onPress={() => onSelectDate(item.dateString)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.label, isActive && styles.textActive]}>{item.label}</Text>
              <Text style={[styles.dateNum, isActive && styles.textActive]}>{item.dateNum}</Text>
              <Text style={[styles.monthName, isActive && styles.textActive]}>{item.monthName}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: 12,
  },
  dateItem: {
    width: 60,
    height: 70,
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateItemActive: {
    backgroundColor: theme.colors.accentGlow,
    borderColor: theme.colors.accent,
  },
  label: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  monthName: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  textActive: {
    color: theme.colors.accent,
  },
});

