import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import DriverSafeMap, { DriverMapRegion } from '@/components/DriverSafeMap';
import { useScreenRefresh } from '@/hooks/useScreenRefresh';
import { useDriverNavigation } from '@/hooks/useDriverNavigation';

const DEFAULT_REGION: DriverMapRegion = {
  latitude: 5.3364,
  longitude: -4.0267,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  accepted: { label: 'Mission acceptee', bg: '#DBEAFE', color: '#1D4ED8' },
  enRoute: { label: 'En route', bg: '#E0E7FF', color: '#4338CA' },
  arrived: { label: 'Arrive sur place', bg: '#EDE9FE', color: '#6D28D9' },
  washing: { label: 'Lavage en cours', bg: '#CCFBF1', color: '#0F766E' },
  completed: { label: 'Mission terminee', bg: '#DCFCE7', color: '#15803D' },
};
const COMMISSION_RATE = 0.2;

const STEPS = [
  { key: 'enRoute', label: 'En route vers le client' },
  { key: 'arrived', label: 'Arrive sur place' },
  { key: 'washing', label: 'Lavage demarre' },
  { key: 'completed', label: 'Mission terminee' },
] as const;

const getProgressIndex = (status: string) => {
  if (status === 'accepted' || status === 'enRoute') return 0;
  if (status === 'arrived') return 1;
  if (status === 'washing') return 2;
  if (status === 'completed') return 3;
  return -1;
};

export default function ActiveScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  useScreenRefresh({ jobs: true, intervalMs: 8000 });
  const [confirmArrive, setConfirmArrive] = useState(false);
  const [mapRegionOverride, setMapRegionOverride] = useState<DriverMapRegion | null>(null);

  const activeJob = useMemo(() => {
    if (!state.activeJobId) return null;
    return state.jobs.find((job) => job.id === state.activeJobId) || null;
  }, [state.activeJobId, state.jobs]);

  const statusMeta = activeJob ? STATUS_META[activeJob.status] || STATUS_META.enRoute : STATUS_META.enRoute;
  const commissionAmount = useMemo(
    () => (activeJob ? Math.round(activeJob.price * COMMISSION_RATE) : 0),
    [activeJob]
  );
  const netAmount = useMemo(
    () => (activeJob ? Math.max(0, activeJob.price - commissionAmount) : 0),
    [activeJob, commissionAmount]
  );

  const fallbackRegion = useMemo<DriverMapRegion>(() => {
    if (!activeJob) return DEFAULT_REGION;
    return {
      latitude: activeJob.latitude || DEFAULT_REGION.latitude,
      longitude: activeJob.longitude || DEFAULT_REGION.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
  }, [activeJob]);

  const { driverLocation, hasLocationPermission, mapRegion, routeCoordinates } = useDriverNavigation({
    destination: activeJob ? { latitude: activeJob.latitude, longitude: activeJob.longitude } : null,
    fallbackRegion,
    enabled: !!activeJob,
  });

  useEffect(() => {
    setMapRegionOverride(null);
  }, [activeJob?.id]);

  useEffect(() => {
    if (!state.lastAutoCancelledJobId) return;
    Alert.alert(
      'Mission annulee',
      'Le client a annule cette mission. Elle est retiree automatiquement de vos missions en cours.',
      [
        {
          text: 'OK',
          onPress: () => dispatch({ type: 'CLEAR_AUTO_CANCELLED_NOTICE' }),
        },
      ]
    );
  }, [state.lastAutoCancelledJobId, dispatch]);

  const progressIndex = useMemo(() => getProgressIndex(activeJob?.status || ''), [activeJob?.status]);

  const nextAction = useMemo(() => {
    if (!activeJob) return null;
    if (activeJob.status === 'accepted' || activeJob.status === 'enRoute') return 'ARRIVE_JOB';
    if (activeJob.status === 'arrived') return 'START_WASH';
    if (activeJob.status === 'washing') return 'COMPLETE_JOB';
    return null;
  }, [activeJob]);

  const focusDestination = () => {
    if (!activeJob) return;
    setMapRegionOverride({
      latitude: activeJob.latitude,
      longitude: activeJob.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    });
  };

  const openExternalMaps = () => {
    if (!activeJob) return;
    const { latitude, longitude } = activeJob;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const callCustomer = () => {
    if (!activeJob?.phone) return;
    Linking.openURL(`tel:${activeJob.phone}`);
  };

  const handlePrimaryAction = () => {
    if (!activeJob || !nextAction) return;

    if (nextAction === 'ARRIVE_JOB') {
      setConfirmArrive(true);
      return;
    }

    if (nextAction === 'START_WASH') {
      router.push('/before-images');
      return;
    }

    if (nextAction === 'COMPLETE_JOB') {
      router.push('/after-images');
    }
  };

  if (!activeJob) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Ionicons name="navigate" size={42} color={DriverColors.primary} />
          <Text style={styles.emptyTitle}>Aucune mission en cours</Text>
          <Text style={styles.emptyText}>Acceptez une demande pour suivre votre itineraire en direct.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(tabs)/missions')}>
            <Text style={styles.primaryButtonText}>Voir les missions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapSection}>
        <DriverSafeMap
          style={styles.map}
          region={mapRegionOverride || mapRegion}
          marker={{
            latitude: activeJob.latitude,
            longitude: activeJob.longitude,
            title: activeJob.customerName,
            description: activeJob.address,
          }}
          driverLocation={driverLocation}
          routeCoordinates={routeCoordinates}
          showsUserLocation={hasLocationPermission}
          markerIcon="sparkles"
        />

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.replace('/(tabs)/missions')}>
            <Ionicons name="chevron-back" size={18} color={DriverColors.primary} />
          </TouchableOpacity>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={focusDestination}>
            <Ionicons name="locate" size={18} color={DriverColors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.mapQuickActions}>
          <TouchableOpacity style={styles.quickActionPrimary} onPress={openExternalMaps}>
            <Ionicons name="navigate" size={16} color="#FFFFFF" />
            <Text style={styles.quickActionPrimaryText}>Naviguer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionSecondary} onPress={callCustomer}>
            <Ionicons name="call" size={16} color={DriverColors.primary} />
            <Text style={styles.quickActionSecondaryText}>Appeler</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
        <View style={styles.identityCard}>
          <View style={styles.identityHeader}>
            {activeJob.customerAvatarUrl ? (
              <Image source={{ uri: activeJob.customerAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{activeJob.customerName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.identityBody}>
              <Text style={styles.customerName}>{activeJob.customerName}</Text>
              <Text style={styles.subInfo}>{activeJob.service}</Text>
            </View>
            <Text style={styles.priceText}>{activeJob.price.toLocaleString()} F CFA</Text>
          </View>

          <View style={styles.infoLine}>
            <Ionicons name="car" size={14} color={DriverColors.primary} />
            <Text style={styles.infoText}>{activeJob.vehicle}</Text>
          </View>
          <View style={styles.infoLine}>
            <Ionicons name="location" size={14} color={DriverColors.primary} />
            <Text style={styles.infoText}>{activeJob.address}</Text>
          </View>
          <View style={styles.infoLine}>
            <Ionicons name="time" size={14} color={DriverColors.primary} />
            <Text style={styles.infoText}>{activeJob.scheduledAt} - {activeJob.etaMin} min</Text>
          </View>
        </View>

        <View style={styles.financeCard}>
          <View style={styles.financeHeader}>
            <Ionicons name="cash" size={14} color={DriverColors.primary} />
            <Text style={styles.financeTitle}>Estimation financiere</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Montant commande</Text>
            <Text style={styles.financeValue}>{activeJob.price.toLocaleString()} F CFA</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Commission ({Math.round(COMMISSION_RATE * 100)}%)</Text>
            <Text style={styles.financeNegative}>- {commissionAmount.toLocaleString()} F CFA</Text>
          </View>
          <View style={styles.financeDivider} />
          <View style={styles.financeRow}>
            <Text style={styles.financeNetLabel}>Gain net estime</Text>
            <Text style={styles.financeNetValue}>{netAmount.toLocaleString()} F CFA</Text>
          </View>
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Suivi de mission</Text>
          {STEPS.map((step, index) => {
            const active = index <= progressIndex;
            const current = index === progressIndex;
            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, active && styles.timelineDotActive, current && styles.timelineDotCurrent]} />
                  {index < STEPS.length - 1 ? <View style={[styles.timelineLine, active && styles.timelineLineActive]} /> : null}
                </View>
                <Text style={[styles.timelineStepText, current && styles.timelineStepTextCurrent]}>{step.label}</Text>
              </View>
            );
          })}
        </View>

        {nextAction ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handlePrimaryAction}>
            <Text style={styles.primaryButtonText}>
              {nextAction === 'ARRIVE_JOB'
                ? 'Je suis arrive'
                : nextAction === 'START_WASH'
                  ? 'Demarrer le lavage'
                  : 'Lavage termine'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.statusInfoCard}>
            <Ionicons name="checkmark-circle" size={16} color={DriverColors.success} />
            <Text style={styles.statusInfoText}>Mission finalisee. Vous pouvez retourner aux missions.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={confirmArrive} transparent animationType="fade" onRequestClose={() => setConfirmArrive(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmez-vous etre arrive a l emplacement du client ?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondary} onPress={() => setConfirmArrive(false)}>
                <Text style={styles.modalSecondaryText}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimary}
                onPress={() => {
                  dispatch({ type: 'ARRIVE_JOB', id: activeJob.id });
                  setConfirmArrive(false);
                }}
              >
                <Text style={styles.modalPrimaryText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  mapSection: {
    height: 360,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topActions: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DriverColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mapQuickActions: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    gap: 10,
  },
  quickActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DriverColors.primary,
    borderRadius: 999,
    paddingVertical: 11,
  },
  quickActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: DriverColors.border,
  },
  quickActionSecondaryText: {
    color: DriverColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    borderTopLeftRadius: DriverRadius.xl,
    borderTopRightRadius: DriverRadius.xl,
    paddingHorizontal: DriverSpacing.lg,
    paddingTop: DriverSpacing.xl,
    paddingBottom: 140,
    gap: 14,
  },
  identityCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: DriverColors.border,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    gap: 8,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: DriverColors.muted,
  },
  identityBody: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: DriverColors.text,
  },
  subInfo: {
    fontSize: 12,
    color: DriverColors.muted,
    marginTop: 2,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: DriverColors.text,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.text,
    fontWeight: '600',
  },
  financeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DriverColors.border,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    gap: 8,
  },
  financeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  financeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
  },
  financeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  financeLabel: {
    fontSize: 12,
    color: DriverColors.muted,
    fontWeight: '600',
  },
  financeValue: {
    fontSize: 12,
    color: DriverColors.text,
    fontWeight: '700',
  },
  financeNegative: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  financeDivider: {
    height: 1,
    backgroundColor: DriverColors.border,
  },
  financeNetLabel: {
    fontSize: 13,
    color: DriverColors.text,
    fontWeight: '800',
  },
  financeNetValue: {
    fontSize: 14,
    color: DriverColors.success,
    fontWeight: '900',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DriverColors.border,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineLeft: {
    alignItems: 'center',
  },
  timelineDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#D1D5DB',
    marginTop: 2,
  },
  timelineDotActive: {
    backgroundColor: DriverColors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: DriverColors.success,
  },
  timelineLine: {
    width: 2,
    minHeight: 24,
    backgroundColor: '#E5E7EB',
    marginVertical: 3,
  },
  timelineLineActive: {
    backgroundColor: '#93C5FD',
  },
  timelineStepText: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.muted,
    fontWeight: '600',
    paddingBottom: 8,
  },
  timelineStepTextCurrent: {
    color: DriverColors.text,
  },
  primaryButton: {
    backgroundColor: DriverColors.primary,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: DriverColors.border,
  },
  statusInfoText: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.muted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: DriverSpacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.lg,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: DriverSpacing.lg,
  },
  modalSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.muted,
  },
  modalPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: DriverColors.primary,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: DriverSpacing.lg,
    gap: 10,
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
    marginBottom: 8,
  },
});
