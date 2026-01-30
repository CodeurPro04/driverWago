import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requireNativeModule } from 'expo-modules-core';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import BerlineSvg from "@/assets/svg/berline.svg";
import CompacteSvg from "@/assets/svg/compacte.svg";
import SuvSvg from "@/assets/svg/suv.svg";
import GroupSvg from "@/assets/svg/Group.svg";
import Group5Svg from "@/assets/svg/Group5.svg";
import Group7Svg from "@/assets/svg/Group7.svg";

export default function JobDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state, dispatch } = useDriverStore();
  const [camera, setCamera] = useState({
    coordinates: { latitude: 5.3364, longitude: -4.0267 },
    zoom: 13,
  });

  const job = useMemo(() => {
    const id = params.id as string | undefined;
    if (!id) return null;
    return state.jobs.find((item) => item.id === id) || null;
  }, [params.id, state.jobs]);

  const normalize = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const vehicleIcon = useMemo(() => {
    if (!job) return null;
    const key = normalize(job.vehicle);
    if (key.includes('suv')) return SuvSvg;
    if (key.includes('compact')) return CompacteSvg;
    if (key.includes('berline')) return BerlineSvg;
    return null;
  }, [job]);

  const washIcon = useMemo(() => {
    if (!job) return Group7Svg;
    const key = normalize(job.service);
    if (key.includes('complet')) return Group7Svg;
    if (key.includes('interieur')) return Group5Svg;
    if (key.includes('exterieur')) return GroupSvg;
    return Group7Svg;
  }, [job]);

  const VehicleIcon = vehicleIcon;
  const WashIcon = washIcon;

  const renderIcon = (IconComponent: any, fallbackName: keyof typeof Ionicons.glyphMap) => {
    if (!IconComponent) {
      return <Ionicons name={fallbackName} size={20} color={DriverColors.primary} />;
    }
    if (typeof IconComponent === 'number') {
      return <Image source={IconComponent} style={styles.tagImage} />;
    }
    return <IconComponent width={28} height={28} />;
  };

  useEffect(() => {
    if (!job) return;
    setCamera((prev) => ({
      ...prev,
      coordinates: { latitude: job.latitude, longitude: job.longitude },
    }));
  }, [job]);

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
    if (!job) return [];
    return [
      {
        id: job.id,
        coordinates: { latitude: job.latitude, longitude: job.longitude },
        title: job.customerName,
        snippet: job.address,
        tintColor: DriverColors.primary,
      },
    ];
  }, [job]);

  const openExternalMaps = () => {
    if (!job) return;
    const { latitude, longitude } = job;
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

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle" size={36} color={DriverColors.primary} />
          <Text style={styles.emptyTitle}>Mission introuvable</Text>
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
      </View>

      <ScrollView contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetHandle} />

        <View style={styles.clientCard}>
          <View style={styles.clientRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{job.customerName.charAt(0)}</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{job.customerName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={DriverColors.accent} />
                <Text style={styles.ratingText}>4.5</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={14} color={DriverColors.primary} />
            <Text style={styles.infoText}>{job.address}</Text>
          </View>
          <Text style={styles.metaText}>À {job.distanceKm.toFixed(1)} km | {job.etaMin} min</Text>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={14} color={DriverColors.primary} />
            <Text style={styles.infoText}>{job.scheduledAt}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>{job.price.toLocaleString()} F CFA</Text>
            <Text style={styles.priceMeta}>
              Vous recevrez {(job.price * 0.8).toLocaleString()} F CFA après la commission de Ziwago.
            </Text>
          </View>
        </View>

          <View style={styles.tagRow}>
          <View style={styles.tagCard}>
            {renderIcon(VehicleIcon, 'car')}
            <Text style={styles.tagText}>{job.vehicle}</Text>
          </View>
          <View style={styles.tagCard}>
            {renderIcon(WashIcon, 'sparkles')}
            <Text style={styles.tagText}>{job.service}</Text>
          </View>
        </View>

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
            style={styles.primaryButton}
            onPress={() => {
              dispatch({ type: 'ACCEPT_JOB', id: job.id });
              router.replace('/(tabs)/active');
            }}
          >
            <Text style={styles.primaryButtonText}>Accepter</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.navInline} onPress={openExternalMaps}>
          <Ionicons name="navigate" size={16} color={DriverColors.primary} />
          <Text style={styles.navInlineText}>Navigateur</Text>
        </TouchableOpacity>
      </ScrollView>
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
  sheet: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: DriverSpacing.lg,
    paddingBottom: 140,
    borderTopLeftRadius: DriverRadius.xl,
    borderTopRightRadius: DriverRadius.xl,
    marginTop: -20,
    paddingTop: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: DriverSpacing.md,
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
  tagImage: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
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
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.danger,
  },
  navInline: {
    marginTop: DriverSpacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  navInlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.primary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: DriverSpacing.lg,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.text,
  },
});
