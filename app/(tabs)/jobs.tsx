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

const FILTERS = [
  { id: 'all', label: 'Tout' },
  { id: 'pending', label: 'Nouvelles' },
  { id: 'active', label: 'En cours' },
  { id: 'completed', label: 'Termin\u00e9es' },
  { id: 'cancelled', label: 'Annul\u00e9es' },
];

export default function JobsScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const [filter, setFilter] = useState('all');

  const activeJobs = useMemo(
    () => state.jobs.filter((job) => ['accepted', 'enRoute', 'arrived', 'washing'].includes(job.status)),
    [state.jobs]
  );

  const pendingJobs = useMemo(
    () => state.jobs.filter((job) => job.status === 'pending'),
    [state.jobs]
  );

  const completedJobs = useMemo(
    () => state.jobs.filter((job) => job.status === 'completed'),
    [state.jobs]
  );

  const filteredJobs = useMemo(() => {
    if (filter === 'all') return state.jobs;
    if (filter === 'active') return activeJobs;
    return state.jobs.filter((job) => job.status === filter);
  }, [filter, state.jobs, activeJobs]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Missions</Text>
            <Text style={styles.subtitle}>G\u00e9rez vos demandes en temps r\u00e9el.</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="options" size={18} color={DriverColors.primary} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingJobs.length}</Text>
            <Text style={styles.statLabel}>Nouvelles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeJobs.length}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedJobs.length}</Text>
            <Text style={styles.statLabel}>Termin\u00e9es</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => {
            const isActive = item.id === filter;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(item.id)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Missions disponibles</Text>
          <Text style={styles.sectionCount}>{filteredJobs.length} au total</Text>
        </View>

        {filteredJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle" size={20} color={DriverColors.primary} />
            <Text style={styles.emptyTitle}>Aucune mission</Text>
            <Text style={styles.emptyText}>Revenez plus tard pour de nouvelles demandes.</Text>
          </View>
        ) : (
          filteredJobs.map((job) => {
            const statusLabel =
              job.status === 'pending'
                ? 'Nouvelle'
                : job.status === 'completed'
                  ? 'Termin\u00e9e'
                  : job.status === 'cancelled'
                    ? 'Annul\u00e9e'
                    : 'En cours';
            const statusColor =
              job.status === 'completed'
                ? DriverColors.success
                : job.status === 'cancelled'
                  ? DriverColors.danger
                  : job.status === 'pending'
                    ? DriverColors.accent
                    : DriverColors.primary;

            return (
              <TouchableOpacity
                key={job.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/job-details', params: { id: job.id } })}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{job.customerName}</Text>
                    <Text style={styles.cardSubtitle}>{job.service} \u2022 {job.vehicle}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={styles.cardRow}>
                  <Ionicons name="location" size={14} color={DriverColors.muted} />
                  <Text style={styles.cardAddress} numberOfLines={2}>{job.address}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Ionicons name="time" size={14} color={DriverColors.muted} />
                  <Text style={styles.cardMeta}>{job.scheduledAt} \u2022 {job.etaMin} min</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrice}>{job.price.toLocaleString()} F CFA</Text>
                  {job.status === 'pending' ? (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => dispatch({ type: 'ACCEPT_JOB', id: job.id })}
                      >
                        <Text style={styles.actionText}>Accepter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.declineButton]}
                        onPress={() => dispatch({ type: 'DECLINE_JOB', id: job.id })}
                      >
                        <Text style={styles.declineText}>Refuser</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.detailButton}
                      onPress={() => router.push({ pathname: '/job-details', params: { id: job.id } })}
                    >
                      <Text style={styles.detailText}>D\u00e9tails</Text>
                      <Ionicons name="chevron-forward" size={14} color={DriverColors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
  title: {
    ...DriverTypography.title,
  },
  subtitle: {
    fontSize: 13,
    color: DriverColors.muted,
    marginTop: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DriverColors.surface,
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: DriverSpacing.sm,
    marginBottom: DriverSpacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.md,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.text,
  },
  statLabel: {
    fontSize: 11,
    color: DriverColors.muted,
  },
  filters: {
    gap: DriverSpacing.sm,
    marginBottom: DriverSpacing.lg,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: DriverColors.surface,
  },
  filterChipActive: {
    borderColor: DriverColors.primary,
    backgroundColor: DriverColors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.muted,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DriverSpacing.sm,
  },
  sectionTitle: {
    ...DriverTypography.section,
  },
  sectionCount: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  emptyCard: {
    padding: DriverSpacing.lg,
    borderRadius: DriverRadius.lg,
    backgroundColor: DriverColors.surface,
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
  },
  emptyText: {
    fontSize: 12,
    color: DriverColors.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DriverColors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: DriverColors.muted,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: DriverSpacing.sm,
  },
  cardAddress: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.muted,
  },
  cardMeta: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: DriverSpacing.md,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  acceptButton: {
    backgroundColor: DriverColors.primary,
  },
  declineButton: {
    backgroundColor: '#FEE2E2',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  declineText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.danger,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.primary,
  },
});
