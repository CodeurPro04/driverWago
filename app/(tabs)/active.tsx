import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requireNativeModule } from 'expo-modules-core';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

export default function ActiveScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const [confirmAction, setConfirmAction] = useState<'ARRIVE_JOB' | 'COMPLETE_JOB' | null>(null);
  const [camera, setCamera] = useState({
    coordinates: { latitude: 5.3364, longitude: -4.0267 },
    zoom: 13,
  });

  const activeJob = useMemo(() => {
    if (!state.activeJobId) return null;
    return state.jobs.find((job) => job.id == state.activeJobId) || null;
  }, [state.activeJobId, state.jobs]);

  useEffect(() => {
    if (!activeJob) return;
    setCamera((prev) => ({
      ...prev,
      coordinates: { latitude: activeJob.latitude, longitude: activeJob.longitude },
    }));
  }, [activeJob]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted) return;
        setCamera((prev) => ({
          ...prev,
          coordinates: { latitude: location.coords.latitude, longitude: location.coords.longitude },
        }));
      } catch (error) {
        // Keep fallback camera.
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const markers = useMemo(() => {
    if (!activeJob) return [];
    return [
      {
        id: activeJob.id,
        coordinates: { latitude: activeJob.latitude, longitude: activeJob.longitude },
        title: activeJob.customerName,
        snippet: activeJob.address,
        tintColor: DriverColors.primary,
      },
    ];
  }, [activeJob]);

  const nextAction = useMemo(() => {
    if (!activeJob) return null;
    if (activeJob.status === 'enRoute') return 'ARRIVE_JOB';
    if (activeJob.status === 'arrived') return 'START_WASH';
    if (activeJob.status === 'washing') return 'COMPLETE_JOB';
    return null;
  }, [activeJob]);

  const openExternalMaps = () => {
    if (!activeJob) return;
    const { latitude, longitude } = activeJob;
    const url = Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${latitude},${longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  let hasExpoMaps = true;
  let MapView: any = null;
  try {
    requireNativeModule('ExpoMaps');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExpoMaps = require('expo-maps');
    MapView = Platform.OS === 'ios' ? ExpoMaps.AppleMaps.View : ExpoMaps.GoogleMaps.View;
  } catch (error) {
    hasExpoMaps = false;
  }

  if (!activeJob) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Ionicons name="navigate" size={42} color={DriverColors.primary} />
          <Text style={styles.emptyTitle}>Aucune mission en cours</Text>
          <Text style={styles.emptyText}>
            Acceptez une demande pour suivre votre itinéraire en direct.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapSection}>
        {hasExpoMaps ? (
          <MapView
            style={styles.map}
            cameraPosition={camera}
            markers={markers}
            uiSettings={{
              compassEnabled: false,
              myLocationButtonEnabled: false,
            }}
            properties={{
              isMyLocationEnabled: true,
            }}
          />
        ) : (
          <View style={styles.mapFallback}>
            <Ionicons name="map" size={26} color={DriverColors.primary} />
            <Text style={styles.mapFallbackTitle}>Carte indisponible (Expo Go)</Text>
            <Text style={styles.mapFallbackText}>
              Installez un dev build pour activer la carte.
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={DriverColors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={openExternalMaps}>
          <Ionicons name="navigate" size={14} color={DriverColors.primary} />
          <Text style={styles.navButtonText}>Navigateur</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHandle} />
          {activeJob.status === 'washing' ? (
            <View style={styles.statusPill}>
              <Ionicons name="time" size={14} color={DriverColors.primary} />
              <Text style={styles.statusPillText}>Lavage en cours</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.clientCard}>
          <View style={styles.clientRow}>
            {activeJob.customerAvatarUrl ? (
              <Image source={{ uri: activeJob.customerAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{activeJob.customerName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{activeJob.customerName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={DriverColors.accent} />
                <Text style={styles.ratingText}>4.5</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={14} color={DriverColors.primary} />
            <Text style={styles.infoText}>{activeJob.address}</Text>
          </View>
          <Text style={styles.metaText}>
            À {activeJob.distanceKm.toFixed(1)} km | {activeJob.etaMin} min
          </Text>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={14} color={DriverColors.primary} />
            <Text style={styles.infoText}>{activeJob.scheduledAt}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>{activeJob.price.toLocaleString()} F CFA</Text>
            <Text style={styles.priceMeta}>
              Vous recevrez {(activeJob.price * 0.8).toLocaleString()} F CFA après commission.
            </Text>
          </View>
        </View>

        <View style={styles.tagRow}>
          <View style={styles.tagCard}>
            <Ionicons name="car" size={18} color={DriverColors.primary} />
            <Text style={styles.tagText}>{activeJob.vehicle}</Text>
          </View>
          <View style={styles.tagCard}>
            <Ionicons name="sparkles" size={18} color={DriverColors.primary} />
            <Text style={styles.tagText}>{activeJob.service}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            if (!nextAction) return;
            if (nextAction === 'START_WASH') {
              router.push('/before-images');
              return;
            }
            if (nextAction === 'ARRIVE_JOB') {
              setConfirmAction(nextAction);
              return;
            }
            if (nextAction === 'COMPLETE_JOB') {
              router.push('/after-images');
            }
          }}
          disabled={!nextAction}
        >
          <Text style={styles.primaryButtonText}>
            {nextAction === 'ARRIVE_JOB'
              ? 'Je suis arrivé'
              : nextAction === 'START_WASH'
                ? 'Démarrer le lavage'
                : nextAction === 'COMPLETE_JOB'
                  ? 'Lavage terminé'
                  : 'Mission terminée'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => dispatch({ type: 'CANCEL_JOB', id: activeJob.id })}
        >
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={confirmAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmAction(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {confirmAction === 'ARRIVE_JOB'
                ? "Confirmez-vous être arrivé à l'emplacement du client ?"
                : 'Êtes-vous sûr d’avoir terminé le lavage du véhicule ?'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondary}
                onPress={() => setConfirmAction(null)}
              >
                <Text style={styles.modalSecondaryText}>
                  {confirmAction === 'ARRIVE_JOB' ? 'Retour' : 'Annuler'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimary}
                onPress={() => {
                  if (!confirmAction) return;
                  dispatch({ type: confirmAction, id: activeJob.id });
                  setConfirmAction(null);
                }}
              >
                <Text style={styles.modalPrimaryText}>
                  {confirmAction === 'ARRIVE_JOB' ? 'Confirmer' : "Oui, j'ai terminé"}
                </Text>
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
    height: 320,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
  },
  mapFallbackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
    textAlign: 'center',
  },
  mapFallbackText: {
    fontSize: 11,
    color: DriverColors.muted,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  navButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.primary,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: DriverSpacing.lg,
    paddingBottom: 140,
    borderTopLeftRadius: DriverRadius.xl,
    borderTopRightRadius: DriverRadius.xl,
    marginTop: -20,
    paddingTop: 16,
  },
  sheetHeader: {
    alignItems: 'center',
    gap: 10,
    marginBottom: DriverSpacing.sm,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.primary,
  },
  clientCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.md,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: DriverSpacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.muted,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.text,
  },
  metaText: {
    fontSize: 12,
    color: DriverColors.muted,
    marginBottom: 6,
  },
  priceRow: {
    marginTop: 6,
    gap: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
  },
  priceMeta: {
    fontSize: 11,
    color: DriverColors.muted,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: DriverSpacing.lg,
  },
  tagCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.text,
  },
  primaryButton: {
    backgroundColor: DriverColors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.danger,
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
});
