import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

export default function DashboardScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();

  const pendingJobs = useMemo(
    () => state.jobs.filter((job) => job.status === 'pending'),
    [state.jobs]
  );

  const todayEarnings = useMemo(
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aperçu du jour</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>{pendingJobs.length}</Text>
              <Text style={styles.overviewLabel}>Commandes</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>{todayEarnings.toLocaleString()} F CFA</Text>
              <Text style={styles.overviewLabel}>Gain net</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>{state.rating.toFixed(1)}</Text>
              <Text style={styles.overviewLabel}>Évaluation</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Demandes disponibles</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
              <Text style={styles.linkText}>Tout voir</Text>
            </TouchableOpacity>
          </View>
          {pendingJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="sparkles" size={20} color={DriverColors.primary} />
              <Text style={styles.emptyTitle}>Aucune demande pour l'instant</Text>
              <Text style={styles.emptyText}>Restez en ligne pour recevoir des missions.</Text>
            </View>
          ) : (
            pendingJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.requestCard}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/job-details', params: { id: job.id } })}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestUser}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{job.customerName.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.requestName}>{job.customerName}</Text>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color={DriverColors.accent} />
                        <Text style={styles.ratingText}>{state.rating.toFixed(1)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.requestPriceWrap}>
                    <Text style={styles.requestPrice}>{job.price.toLocaleString()} F CFA</Text>
                    <Text style={styles.requestMeta}>Demande immédiate</Text>
                  </View>
                </View>

                <View style={styles.requestRow}>
                  <Ionicons name="car" size={14} color={DriverColors.primary} />
                  <Text style={styles.requestRowText}>{job.vehicle}</Text>
                </View>
                <View style={styles.requestRow}>
                  <Ionicons name="sparkles" size={14} color={DriverColors.primary} />
                  <Text style={styles.requestRowText}>{job.service}</Text>
                </View>
                <View style={styles.requestRow}>
                  <Ionicons name="location" size={14} color={DriverColors.primary} />
                  <Text style={styles.requestRowText} numberOfLines={2}>
                    {job.address}
                  </Text>
                </View>
                <View style={styles.requestFooter}>
                  <Text style={styles.requestDistance}>À {job.distanceKm.toFixed(1)} km</Text>
                  <Text style={styles.requestDistance}>{job.etaMin} min</Text>
                </View>
              </TouchableOpacity>
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
  section: {
    marginBottom: DriverSpacing.lg,
  },
  sectionTitle: {
    ...DriverTypography.section,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DriverSpacing.sm,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.primary,
  },
  overviewCard: {
    marginTop: DriverSpacing.sm,
    backgroundColor: '#F9FAFB',
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  emptyCard: {
    padding: DriverSpacing.lg,
    borderRadius: DriverRadius.md,
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
  requestCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    padding: DriverSpacing.md,
    marginBottom: DriverSpacing.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: DriverSpacing.sm,
  },
  requestUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  requestName: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    color: DriverColors.muted,
  },
  requestPriceWrap: {
    alignItems: 'flex-end',
  },
  requestPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
  },
  requestMeta: {
    fontSize: 11,
    color: DriverColors.muted,
    marginTop: 2,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  requestRowText: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.text,
  },
  requestFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  requestDistance: {
    fontSize: 11,
    color: DriverColors.muted,
  },
});
