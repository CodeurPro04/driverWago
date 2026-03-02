import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { useScreenRefresh } from '@/hooks/useScreenRefresh';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  accepted: { label: 'Mission acceptee', color: '#1D4ED8', bg: '#DBEAFE' },
  enRoute: { label: 'En route', color: '#2563EB', bg: '#E0E7FF' },
  arrived: { label: 'Arrive sur place', color: '#7C3AED', bg: '#EDE9FE' },
  washing: { label: 'Lavage en cours', color: '#0891B2', bg: '#CFFAFE' },
};

export default function MissionsScreen() {
  const router = useRouter();
  const { state } = useDriverStore();
  useScreenRefresh({ jobs: true, intervalMs: 12000 });
  const isApproved = state.profileStatus === 'approved';

  const activeJobs = useMemo(
    () => state.jobs.filter((job) => ['accepted', 'enRoute', 'arrived', 'washing'].includes(job.status)),
    [state.jobs]
  );

  const currentMission = useMemo(() => {
    if (state.activeJobId) {
      const found = activeJobs.find((job) => job.id === state.activeJobId);
      if (found) return found;
    }
    return activeJobs[0] || null;
  }, [activeJobs, state.activeJobId]);

  const latestCancelledJob = useMemo(
    () => state.jobs.find((job) => job.status === 'cancelled') || null,
    [state.jobs]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Missions</Text>
          <Text style={styles.subtitle}>Suivez votre mission active en temps reel.</Text>
        </View>

        <View style={styles.ruleCard}>
          <Ionicons name="shield-checkmark" size={16} color={DriverColors.primary} />
          <Text style={styles.ruleText}>
            Une seule mission peut etre active a la fois. Seul le client peut annuler la mission, et apres demarrage du lavage, aucune annulation n est possible.
          </Text>
        </View>

        {!isApproved ? (
          <View style={styles.emptyCard}>
            <Ionicons name="hourglass-outline" size={24} color={DriverColors.primary} />
            <Text style={styles.emptyTitle}>Compte en attente de validation</Text>
            <Text style={styles.emptyText}>
              Vous ne pouvez pas voir les missions tant que l administrateur n a pas valide votre dossier.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/account/review')}>
              <Text style={styles.primaryButtonText}>Voir le statut du dossier</Text>
            </TouchableOpacity>
          </View>
        ) : !currentMission ? (
          <>
            <View style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={24} color={DriverColors.primary} />
              <Text style={styles.emptyTitle}>Aucune mission en cours</Text>
              <Text style={styles.emptyText}>Acceptez une nouvelle demande pour commencer.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(tabs)/jobs')}>
                <Text style={styles.primaryButtonText}>Voir les demandes</Text>
              </TouchableOpacity>
            </View>

            {latestCancelledJob ? (
              <View style={styles.cancelledCard}>
                <View style={styles.cancelledHeader}>
                  <Ionicons name="close-circle" size={16} color="#B91C1C" />
                  <Text style={styles.cancelledTitle}>Commande annulée par le client</Text>
                </View>
                <Text style={styles.cancelledCustomer}>{latestCancelledJob.customerName}</Text>
                <Text style={styles.cancelledMeta}>
                  {latestCancelledJob.service} - {latestCancelledJob.vehicle}
                </Text>
                <Text style={styles.cancelledMeta} numberOfLines={2}>
                  {latestCancelledJob.address}
                </Text>
                <TouchableOpacity
                  style={styles.cancelledAction}
                  onPress={() => router.push({ pathname: '/job-details', params: { id: latestCancelledJob.id } })}
                >
                  <Text style={styles.cancelledActionText}>Voir commande annulée</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.missionCard}>
            <View style={styles.cardTop}>
              <Text style={styles.customerName}>{currentMission.customerName}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_META[currentMission.status]?.bg || '#E5E7EB' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: STATUS_META[currentMission.status]?.color || DriverColors.text },
                  ]}
                >
                  {STATUS_META[currentMission.status]?.label || 'Mission active'}
                </Text>
              </View>
            </View>

            <Text style={styles.serviceText}>
              {currentMission.service} - {currentMission.vehicle}
            </Text>

            <View style={styles.infoRow}>
              <Ionicons name="location" size={14} color={DriverColors.primary} />
              <Text style={styles.infoText} numberOfLines={2}>
                {currentMission.address}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={14} color={DriverColors.primary} />
              <Text style={styles.infoText}>
                {currentMission.scheduledAt} - {currentMission.etaMin} min
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="cash" size={14} color={DriverColors.primary} />
              <Text style={styles.infoText}>{currentMission.price.toLocaleString()} F CFA</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push({ pathname: '/job-details', params: { id: currentMission.id } })}>
                <Text style={styles.secondaryButtonText}>Voir details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(tabs)/active')}>
                <Text style={styles.primaryButtonText}>Continuer</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    gap: DriverSpacing.md,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: DriverColors.text,
  },
  subtitle: {
    fontSize: 13,
    color: DriverColors.muted,
  },
  ruleCard: {
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: DriverRadius.md,
    padding: DriverSpacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ruleText: {
    flex: 1,
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 18,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: DriverColors.border,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.text,
  },
  emptyText: {
    fontSize: 12,
    color: DriverColors.muted,
    textAlign: 'center',
    marginBottom: 6,
  },
  cancelledCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    gap: 6,
  },
  cancelledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelledTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  cancelledCustomer: {
    fontSize: 15,
    fontWeight: '800',
    color: DriverColors.text,
  },
  cancelledMeta: {
    fontSize: 12,
    color: '#7F1D1D',
    fontWeight: '600',
  },
  cancelledAction: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelledActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DriverColors.border,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: DriverColors.text,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  serviceText: {
    fontSize: 13,
    color: DriverColors.muted,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: DriverColors.text,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: DriverColors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
  },
});
