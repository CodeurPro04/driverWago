import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

const FILTERS = [
  { id: 'all', label: 'Tout' },
  { id: 'pending', label: 'Nouvelles' },
  { id: 'active', label: 'En cours' },
  { id: 'completed', label: 'Terminées' },
  { id: 'cancelled', label: 'Annulées' },
];

export default function JobsScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const [filter, setFilter] = useState('all');

  const activeJobs = useMemo(
    () => state.jobs.filter((job) => ['accepted', 'enRoute', 'arrived', 'washing'].includes(job.status)),
    [state.jobs]
  );
  const canSeeAvailableJobs = state.availability && state.profileStatus === 'approved';

  const filteredJobs = useMemo(() => {
    const baseJobs = state.jobs.filter((job) =>
      canSeeAvailableJobs ? true : job.status !== 'pending'
    );
    if (filter === 'all') return baseJobs;
    if (filter === 'active') return activeJobs;
    return baseJobs.filter((job) => job.status === filter);
  }, [filter, state.jobs, activeJobs, canSeeAvailableJobs]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Demandes</Text>
            <Text style={styles.subtitle}>Gérez vos missions en temps réel.</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="options" size={18} color={DriverColors.primary} />
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
            <Text style={styles.sectionTitle}>Missions</Text>
          <Text style={styles.sectionCount}>{filteredJobs.length} au total</Text>
        </View>

        {filteredJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle" size={20} color={DriverColors.primary} />
            <Text style={styles.emptyTitle}>
              {!state.availability
                ? 'Vous etes hors ligne'
                : state.profileStatus !== 'approved'
                  ? 'Profil non valide'
                  : 'Aucune mission'}
            </Text>
            <Text style={styles.emptyText}>
              {!state.availability
                ? 'Activez votre disponibilite pour recevoir des demandes.'
                : state.profileStatus !== 'approved'
                  ? 'Validation du compte requise pour recevoir des demandes.'
                  : 'Revenez plus tard pour de nouvelles demandes.'}
            </Text>
          </View>
        ) : (
          filteredJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/job-details', params: { id: job.id } })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIdentity}>
                  {job.customerAvatarUrl ? (
                    <Image source={{ uri: job.customerAvatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{job.customerName.charAt(0)}</Text>
                    </View>
                  )}
                  <View>
                  <Text style={styles.cardTitle}>{job.customerName}</Text>
                  <Text style={styles.cardSubtitle}>{job.service} • {job.vehicle}</Text>
                  </View>
                </View>
                <Text style={styles.cardPrice}>{job.price.toLocaleString()} F CFA</Text>
              </View>

              <View style={styles.cardRow}>
                <Ionicons name="location" size={14} color={DriverColors.primary} />
                <Text style={styles.cardAddress} numberOfLines={2}>{job.address}</Text>
              </View>
              <View style={styles.cardRow}>
                <Ionicons name="time" size={14} color={DriverColors.primary} />
                <Text style={styles.cardMeta}>{job.scheduledAt} • {job.etaMin} min</Text>
              </View>

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
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>Détails</Text>
                  <Ionicons name="chevron-forward" size={14} color={DriverColors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))
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
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#F9FAFB',
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
    marginBottom: DriverSpacing.sm,
  },
  cardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.muted,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  cardPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardAddress: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  actionRow: {
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: DriverSpacing.md,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.primary,
  },
});
