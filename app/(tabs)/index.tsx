import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

export default function DashboardScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();

  const activeJob = useMemo(() => {
    if (!state.activeJobId) return null;
    return state.jobs.find((job) => job.id == state.activeJobId) || null;
  }, [state.activeJobId, state.jobs]);

  const pendingJobs = useMemo(
    () => state.jobs.filter((job) => job.status == 'pending'),
    [state.jobs]
  );

  const completedCount = useMemo(
    () => state.jobs.filter((job) => job.status == 'completed').length,
    [state.jobs]
  );

  const todayEarnings = useMemo(
    () => state.jobs.filter((job) => job.status == 'completed').reduce((sum, job) => sum + job.price, 0),
    [state.jobs]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour {state.driverName},</Text>
            <Text style={styles.subGreeting}>Pr\u00eat pour vos prochaines missions.</Text>
          </View>
          <View style={styles.availabilityCard}>
            <Text style={styles.availabilityText}>{state.availability ? 'En ligne' : 'Hors ligne'}</Text>
            <Switch
              value={state.availability}
              onValueChange={() => dispatch({ type: 'TOGGLE_AVAILABILITY' })}
              trackColor={{ false: '#CBD5F5', true: '#9AE6E4' }}
              thumbColor={state.availability ? DriverColors.secondary : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroGlowAlt} />
          <Text style={styles.heroTitle}>Objectif du jour</Text>
          <Text style={styles.heroValue}>{todayEarnings.toLocaleString()} F CFA</Text>
          <Text style={styles.heroCaption}>Gardez le rythme pour atteindre votre bonus.</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroChip}>
              <Ionicons name="star" size={14} color={DriverColors.accent} />
              <Text style={styles.heroChipText}>{state.rating.toFixed(1)} note</Text>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="checkmark-circle" size={14} color={DriverColors.success} />
              <Text style={styles.heroChipText}>{completedCount} termin\u00e9s</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingJobs.length}</Text>
            <Text style={styles.statLabel}>Demandes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Livr\u00e9s</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.cashoutBalance.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Solde (F)</Text>
          </View>
        </View>

        {activeJob ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mission en cours</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/active')}>
                <Text style={styles.linkText}>Voir</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activeCard}>
              <View style={styles.activeHeader}>
                <View>
                  <Text style={styles.activeTitle}>{activeJob.customerName}</Text>
                  <Text style={styles.activeSubtitle}>{activeJob.service}</Text>
                </View>
                <View style={styles.activeBadge}>
                  <Ionicons name="navigate" size={12} color={DriverColors.primary} />
                  <Text style={styles.activeBadgeText}>{activeJob.etaMin} min</Text>
                </View>
              </View>
              <View style={styles.activeRow}>
                <Ionicons name="location" size={16} color={DriverColors.primary} />
                <Text style={styles.activeAddress} numberOfLines={2}>
                  {activeJob.address}
                </Text>
              </View>
              <View style={styles.activeFooter}>
                <Text style={styles.activePrice}>{activeJob.price.toLocaleString()} F CFA</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(tabs)/active')}>
                  <Text style={styles.primaryButtonText}>Ouvrir l'itin\u00e9raire</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nouvelles demandes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
              <Text style={styles.linkText}>Tout voir</Text>
            </TouchableOpacity>
          </View>
          {pendingJobs.length == 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="sparkles" size={20} color={DriverColors.primary} />
              <Text style={styles.emptyTitle}>Aucune demande pour l'instant</Text>
              <Text style={styles.emptyText}>Restez en ligne pour recevoir des missions.</Text>
            </View>
          ) : (
            pendingJobs.map((job) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <View>
                    <Text style={styles.jobName}>{job.customerName}</Text>
                    <Text style={styles.jobMeta}>{job.service} \u2022 {job.vehicle}</Text>
                  </View>
                  <Text style={styles.jobPrice}>{job.price.toLocaleString()} F CFA</Text>
                </View>
                <View style={styles.jobRow}>
                  <Ionicons name="location-outline" size={14} color={DriverColors.muted} />
                  <Text style={styles.jobAddress} numberOfLines={2}>{job.address}</Text>
                </View>
                <View style={styles.jobActions}>
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
              </View>
            ))
          )}
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
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: DriverColors.text,
  },
  subGreeting: {
    fontSize: 13,
    color: DriverColors.muted,
    marginTop: 4,
  },
  availabilityCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    gap: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.primary,
  },
  heroCard: {
    backgroundColor: DriverColors.primary,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.lg,
    marginBottom: DriverSpacing.lg,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 90,
    top: -40,
    right: -30,
  },
  heroGlowAlt: {
    position: 'absolute',
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 60,
    bottom: -30,
    left: -20,
  },
  heroTitle: {
    fontSize: 14,
    color: '#E0E7FF',
    fontWeight: '600',
  },
  heroValue: {
    fontSize: 30,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 8,
  },
  heroCaption: {
    fontSize: 12,
    color: '#E0F2FE',
    marginTop: 6,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
  },
  heroChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
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
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.text,
  },
  statLabel: {
    fontSize: 11,
    color: DriverColors.muted,
    marginTop: 4,
  },
  section: {
    marginBottom: DriverSpacing.lg,
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
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.primary,
  },
  activeCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DriverSpacing.sm,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.text,
  },
  activeSubtitle: {
    fontSize: 12,
    color: DriverColors.muted,
    marginTop: 4,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: DriverColors.chip,
    borderRadius: 999,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: DriverColors.chipText,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: DriverSpacing.md,
  },
  activeAddress: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.muted,
  },
  activeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: DriverColors.primary,
  },
  primaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: DriverColors.primary,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  jobCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.sm,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobName: {
    fontSize: 15,
    fontWeight: '700',
    color: DriverColors.text,
  },
  jobMeta: {
    fontSize: 12,
    color: DriverColors.muted,
    marginTop: 4,
  },
  jobPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.primary,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: DriverSpacing.sm,
  },
  jobAddress: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.muted,
  },
  jobActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: DriverSpacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
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
});
