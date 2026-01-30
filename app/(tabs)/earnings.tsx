import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

const PERIODS = ['Jour', 'Semaine', 'Mois'] as const;

export default function EarningsScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('Jour');

  const completedCount = useMemo(
    () => state.jobs.filter((job) => job.status === 'completed').length,
    [state.jobs]
  );

  const totalEarnings = useMemo(
    () => state.jobs.filter((job) => job.status === 'completed').reduce((sum, job) => sum + job.price, 0),
    [state.jobs]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.statusPill}>
            <TouchableOpacity
              style={[styles.statusOption, !state.availability && styles.statusOptionActive]}
              onPress={() => state.availability && dispatch({ type: 'TOGGLE_AVAILABILITY' })}
            >
              <Text style={[styles.statusText, !state.availability && styles.statusTextActive]}>
                Hors ligne
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusOption, state.availability && styles.statusOptionActive]}
              onPress={() => !state.availability && dispatch({ type: 'TOGGLE_AVAILABILITY' })}
            >
              <Text style={[styles.statusText, state.availability && styles.statusTextActive]}>
                En ligne
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={20} color={DriverColors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.segmented}>
          {PERIODS.map((item) => {
            const active = item === period;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setPeriod(item)}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{completedCount}</Text>
            <Text style={styles.overviewLabel}>Commandes</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{totalEarnings.toLocaleString()} F CFA</Text>
            <Text style={styles.overviewLabel}>Gain net</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{state.rating.toFixed(1)}</Text>
            <Text style={styles.overviewLabel}>Évaluation</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.historyButton}>
          <Ionicons name="time" size={16} color={DriverColors.primary} />
          <Text style={styles.historyButtonText}>Voir l'historique des commandes</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Votre progression</Text>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartGrid}>
            {[1, 2, 3, 4].map((row) => (
              <View key={`row-${row}`} style={styles.chartRow} />
            ))}
          </View>
          <View style={styles.chartLine} />
          <View style={styles.chartPoint} />
          <View style={styles.chartBadge}>
            <Text style={styles.chartBadgeText}>2,000 F CFA</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  content: {
    padding: DriverSpacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DriverSpacing.lg,
  },
  statusPill: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 999,
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusOptionActive: {
    backgroundColor: DriverColors.primary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.muted,
  },
  statusTextActive: {
    color: '#FFFFFF',
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    padding: 4,
    marginBottom: DriverSpacing.lg,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: DriverColors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.muted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  overviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DriverSpacing.md,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
  },
  overviewLabel: {
    fontSize: 11,
    color: DriverColors.muted,
  },
  overviewDivider: {
    width: 1,
    height: 34,
    backgroundColor: DriverColors.border,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: DriverSpacing.lg,
  },
  historyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.text,
  },
  sectionHeader: {
    marginBottom: DriverSpacing.sm,
  },
  sectionTitle: {
    ...DriverTypography.section,
  },
  chartCard: {
    height: 220,
    borderRadius: DriverRadius.lg,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  chartGrid: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  chartRow: {
    height: 1,
    backgroundColor: '#E5E7EB',
    opacity: 0.7,
  },
  chartLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 80,
    height: 120,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: DriverColors.primary,
    borderBottomLeftRadius: 60,
  },
  chartPoint: {
    position: 'absolute',
    left: 70,
    top: 92,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DriverColors.primary,
  },
  chartBadge: {
    position: 'absolute',
    left: 40,
    top: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  chartBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.text,
  },
});
