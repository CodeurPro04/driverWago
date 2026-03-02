import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverColors } from '@/constants/driverTheme';

export type DriverMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  style?: StyleProp<ViewStyle>;
  region: DriverMapRegion;
  marker: {
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
  };
  showsUserLocation?: boolean;
  markerIcon?: 'car' | 'sparkles';
};

export default function DriverSafeMap({
  style,
  marker,
  region,
}: Props) {
  return (
    <View style={[styles.fallback, style]}>
      <Ionicons name="map" size={22} color={DriverColors.primary} />
      <Text style={styles.fallbackTitle}>Carte non disponible sur ce build</Text>
      <Text style={styles.fallbackText}>{marker.title || marker.description || 'Destination client'}</Text>
      <Text style={styles.coordsText}>
        {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fallbackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  fallbackText: {
    fontSize: 12,
    color: '#334155',
  },
  coordsText: {
    fontSize: 11,
    color: '#475569',
  },
});
