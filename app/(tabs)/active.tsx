import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requireNativeModule } from 'expo-modules-core';
import * as Location from 'expo-location';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

const STATUS_LABELS: Record<string, string> = {
  enRoute: 'En route',
  arrived: 'Arriv\u00e9',
  washing: 'Lavage',
  completed: 'Termin\u00e9',
};

export default function ActiveScreen() {
  const { state, dispatch } = useDriverStore();
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
            Acceptez une demande pour suivre votre itin\u00e9raire en direct.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mission en cours</Text>
            <Text style={styles.subtitle}>{STATUS_LABELS[activeJob.status] || 'En cours'}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{activeJob.etaMin} min</Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <Ionicons name="location" size={16} color={DriverColors.primary} />
            <Text style={styles.mapTitle}>Itin\u00e9raire vers le client</Text>
          </View>
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
          <View style={styles.mapFooter}>
            <Text style={styles.mapAddress}>{activeJob.address}</Text>
            <TouchableOpacity style={styles.mapButton} onPress={openExternalMaps}>
              <Ionicons name="navigate" size={14} color="#FFFFFF" />
              <Text style={styles.mapButtonText}>Ouvrir GPS</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.clientCard}>
          <View style={styles.clientHeader}>
            <View>
              <Text style={styles.clientName}>{activeJob.customerName}</Text>
              <Text style={styles.clientMeta}>{activeJob.vehicle}</Text>
            </View>
            <Text style={styles.clientPrice}>{activeJob.price.toLocaleString()} F CFA</Text>
          </View>
          <View style={styles.clientRow}>
            <Ionicons name="calendar" size={14} color={DriverColors.muted} />
            <Text style={styles.clientDetail}>{activeJob.scheduledAt}</Text>
          </View>
          <View style={styles.clientRow}>
            <Ionicons name="document-text" size={14} color={DriverColors.muted} />
            <Text style={styles.clientDetail}>{activeJob.notes || 'Aucune note client.'}</Text>
          </View>
          <View style={styles.clientActions}>
            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="call" size={14} color={DriverColors.primary} />
              <Text style={styles.secondaryButtonText}>Appeler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="chatbubble" size={14} color={DriverColors.primary} />
              <Text style={styles.secondaryButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>\u00c9tapes</Text>
          {['En route', 'Arriv\u00e9', 'Lavage', 'Termin\u00e9'].map((step, index) => {
            const activeIndex = activeJob.status === 'enRoute'
              ? 0
              : activeJob.status === 'arrived'
                ? 1
                : activeJob.status === 'washing'
                  ? 2
                  : 3;
            const isActive = index <= activeIndex;
            return (
              <View key={step} style={styles.progressRow}>
                <View style={[styles.progressDot, isActive && styles.progressDotActive]} />
                <Text style={[styles.progressText, isActive && styles.progressTextActive]}>{step}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.actionFooter}>
          {nextAction ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => dispatch({ type: nextAction, id: activeJob.id })}
            >
              <Text style={styles.primaryButtonText}>
                {nextAction === 'ARRIVE_JOB'
                  ? 'Je suis arriv\u00e9'
                  : nextAction === 'START_WASH'
                    ? 'D\u00e9marrer le lavage'
                    : 'Terminer la mission'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.doneCard}>
              <Ionicons name="checkmark-circle" size={18} color={DriverColors.success} />
              <Text style={styles.doneText}>Mission termin\u00e9e</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => dispatch({ type: 'CANCEL_JOB', id: activeJob.id })}
          >
            <Text style={styles.cancelText}>Annuler la mission</Text>
          </TouchableOpacity>
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
    paddingBottom: 140,
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: DriverColors.chip,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.primary,
  },
  mapCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.lg,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: DriverSpacing.sm,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
  },
  map: {
    height: 180,
    borderRadius: DriverRadius.md,
    overflow: 'hidden',
    marginBottom: DriverSpacing.sm,
  },
  mapFallback: {
    height: 180,
    borderRadius: DriverRadius.md,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: DriverSpacing.sm,
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
  mapFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapAddress: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.muted,
    marginRight: 10,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: DriverColors.primary,
  },
  mapButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clientCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.lg,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: DriverSpacing.sm,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.text,
  },
  clientMeta: {
    fontSize: 12,
    color: DriverColors.muted,
    marginTop: 4,
  },
  clientPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.primary,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  clientDetail: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.muted,
  },
  clientActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: DriverSpacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: '#F8FAFC',
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.primary,
  },
  progressCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.lg,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
    marginBottom: DriverSpacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5F5',
  },
  progressDotActive: {
    backgroundColor: DriverColors.primary,
  },
  progressText: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  progressTextActive: {
    color: DriverColors.text,
    fontWeight: '600',
  },
  actionFooter: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: DriverColors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  doneText: {
    fontSize: 13,
    fontWeight: '600',
    color: DriverColors.success,
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
});
