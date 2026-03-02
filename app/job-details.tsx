import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import DriverSafeMap, { DriverMapRegion } from '@/components/DriverSafeMap';
import { useScreenRefresh } from '@/hooks/useScreenRefresh';

const DEFAULT_REGION: DriverMapRegion = {
  latitude: 5.3364,
  longitude: -4.0267,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Nouvelle mission', bg: '#E0F2FE', color: '#0369A1' },
  accepted: { label: 'Mission acceptee', bg: '#DBEAFE', color: '#1D4ED8' },
  enRoute: { label: 'En route', bg: '#E0E7FF', color: '#4338CA' },
  arrived: { label: 'Arrive sur place', bg: '#EDE9FE', color: '#6D28D9' },
  washing: { label: 'Lavage en cours', bg: '#CCFBF1', color: '#0F766E' },
  completed: { label: 'Mission terminee', bg: '#DCFCE7', color: '#15803D' },
  cancelled: { label: 'Mission annulee', bg: '#FEE2E2', color: '#B91C1C' },
};
const COMMISSION_RATE = 0.2;

export default function JobDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state, dispatch } = useDriverStore();
  useScreenRefresh({ jobs: true, intervalMs: 10000 });
  const [mapRegion, setMapRegion] = useState<DriverMapRegion>(DEFAULT_REGION);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const job = useMemo(() => {
    const id = params.id as string | undefined;
    if (!id) return null;
    return state.jobs.find((item) => item.id === id) || null;
  }, [params.id, state.jobs]);

  const canRespondToRequest = job?.status === 'pending';
  const hasAnotherActiveMission = useMemo(
    () =>
      state.jobs.some(
        (item) => item.id !== job?.id && ['accepted', 'enRoute', 'arrived', 'washing'].includes(item.status)
      ),
    [job?.id, state.jobs]
  );

  const statusMeta = job ? STATUS_META[job.status] || STATUS_META.pending : STATUS_META.pending;
  const commissionAmount = useMemo(
    () => (job ? Math.round(job.price * COMMISSION_RATE) : 0),
    [job]
  );
  const netAmount = useMemo(
    () => (job ? Math.max(0, job.price - commissionAmount) : 0),
    [job, commissionAmount]
  );
  const initialRegion = useMemo<DriverMapRegion>(() => {
    if (!job) return DEFAULT_REGION;
    return {
      latitude: job.latitude || DEFAULT_REGION.latitude,
      longitude: job.longitude || DEFAULT_REGION.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
  }, [job]);

  useEffect(() => {
    setMapRegion(initialRegion);
  }, [initialRegion]);

  const focusDestination = () => {
    if (!job) return;
    setMapRegion({
      latitude: job.latitude,
      longitude: job.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    });
  };

  const openExternalMaps = () => {
    if (!job) return;
    const { latitude, longitude } = job;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const callCustomer = () => {
    if (!job?.phone) return;
    Linking.openURL(`tel:${job.phone}`);
  };

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle" size={40} color={DriverColors.primary} />
          <Text style={styles.emptyTitle}>Mission introuvable</Text>
          <Text style={styles.emptyText}>Cette mission n existe plus ou a deja ete retiree.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Retour</Text>
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
          region={mapRegion}
          marker={{
            latitude: job.latitude,
            longitude: job.longitude,
            title: job.customerName,
            description: job.address,
          }}
          markerIcon="car"
        />

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
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
            {job.customerAvatarUrl ? (
              <Image source={{ uri: job.customerAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{job.customerName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.identityBody}>
              <Text style={styles.customerName}>{job.customerName}</Text>
              <Text style={styles.subInfo}>{job.service}</Text>
            </View>
            <Text style={styles.priceText}>{job.price.toLocaleString()} F CFA</Text>
          </View>

          <View style={styles.infoLine}>
            <Ionicons name="car" size={14} color={DriverColors.primary} />
            <Text style={styles.infoText}>{job.vehicle}</Text>
          </View>
          <View style={styles.infoLine}>
            <Ionicons name="location" size={14} color={DriverColors.primary} />
            <Text style={styles.infoText}>{job.address}</Text>
          </View>
          <View style={styles.infoLine}>
            <Ionicons name="time" size={14} color={DriverColors.primary} />
            <Text style={styles.infoText}>{job.scheduledAt} - {job.etaMin} min</Text>
          </View>
        </View>

        <View style={styles.financeCard}>
          <View style={styles.financeHeader}>
            <Ionicons name="cash" size={14} color={DriverColors.primary} />
            <Text style={styles.financeTitle}>Detail financier</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Montant commande</Text>
            <Text style={styles.financeValue}>{job.price.toLocaleString()} F CFA</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Commission ({Math.round(COMMISSION_RATE * 100)}%)</Text>
            <Text style={styles.financeNegative}>- {commissionAmount.toLocaleString()} F CFA</Text>
          </View>
          <View style={styles.financeDivider} />
          <View style={styles.financeRow}>
            <Text style={styles.financeNetLabel}>Gain net</Text>
            <Text style={styles.financeNetValue}>{netAmount.toLocaleString()} F CFA</Text>
          </View>
        </View>

        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>Photos mission</Text>
          {job.beforePhotos?.length ? (
            <>
              <Text style={styles.photosGroupTitle}>Avant lavage</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
                {job.beforePhotos.map((uri, index) => (
                  <TouchableOpacity key={`before-${index}`} activeOpacity={0.9} onPress={() => setPreviewUri(uri)}>
                    <Image source={{ uri }} style={styles.photoItem} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}
          {job.afterPhotos?.length ? (
            <>
              <Text style={styles.photosGroupTitle}>Apres lavage</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
                {job.afterPhotos.map((uri, index) => (
                  <TouchableOpacity key={`after-${index}`} activeOpacity={0.9} onPress={() => setPreviewUri(uri)}>
                    <Image source={{ uri }} style={styles.photoItem} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}
          {!job.beforePhotos?.length && !job.afterPhotos?.length ? (
            <Text style={styles.emptyPhotos}>Aucune photo disponible pour le moment.</Text>
          ) : null}
        </View>

        {canRespondToRequest ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                dispatch({ type: 'DECLINE_JOB', id: job.id });
                router.back();
              }}
            >
              <Text style={styles.secondaryButtonText}>Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, hasAnotherActiveMission && styles.primaryButtonDisabled]}
              onPress={() => {
                dispatch({ type: 'ACCEPT_JOB', id: job.id });
                router.replace('/(tabs)/active');
              }}
              disabled={hasAnotherActiveMission}
            >
              <Text style={styles.primaryButtonText}>
                {hasAnotherActiveMission ? 'Mission deja en cours' : 'Accepter'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusInfoCard}>
            <Ionicons name="information-circle" size={16} color={DriverColors.primary} />
            <Text style={styles.statusInfoText}>
              {job.status === 'completed'
                ? 'Mission terminee. Les details restent consultables ici.'
                : 'Mission deja traitee. Ouvrez Missions pour suivre la course active.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewUri(null)} activeOpacity={0.85}>
            <Text style={styles.previewCloseText}>Fermer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewBackdrop} activeOpacity={1} onPress={() => setPreviewUri(null)}>
            {previewUri ? <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" /> : null}
          </TouchableOpacity>
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
  photosSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DriverColors.border,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
  },
  photosGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.muted,
  },
  photosRow: {
    gap: 10,
    paddingBottom: 2,
  },
  photoItem: {
    width: 130,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  emptyPhotos: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
  },
  previewClose: {
    marginTop: DriverSpacing.xl,
    marginRight: DriverSpacing.lg,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  previewCloseText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  previewBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DriverSpacing.md,
    paddingBottom: DriverSpacing.xl,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: DriverColors.primary,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.danger,
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
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: DriverSpacing.lg,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
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
