import React from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  NativeModules,
  StyleProp,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverColors } from '@/constants/driverTheme';

export type DriverMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type DriverMapCoordinate = {
  latitude: number;
  longitude: number;
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
  driverLocation?: DriverMapCoordinate | null;
  routeCoordinates?: DriverMapCoordinate[];
  markerIcon?: 'car' | 'sparkles';
};

let cachedMapsModule: typeof import('react-native-maps') | null | undefined;

function getMapsModule() {
  if (cachedMapsModule !== undefined) {
    return cachedMapsModule;
  }

  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.appOwnership === 'expo';

  if (isExpoGo) {
    cachedMapsModule = null;
    return cachedMapsModule;
  }

  const hasTurboModule = !!TurboModuleRegistry.get?.('RNMapsAirModule');
  const hasLegacyModule = !!NativeModules.RNMapsAirModule || !!NativeModules.AirMapModule;

  if (!hasTurboModule && !hasLegacyModule) {
    cachedMapsModule = null;
    return cachedMapsModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedMapsModule = require('react-native-maps');
  } catch {
    cachedMapsModule = null;
  }

  return cachedMapsModule;
}

export default function DriverSafeMap({
  style,
  marker,
  region,
  showsUserLocation = false,
  driverLocation = null,
  routeCoordinates = [],
}: Props) {
  const mapRegion = {
    latitude: region.latitude,
    longitude: region.longitude,
    latitudeDelta: region.latitudeDelta,
    longitudeDelta: region.longitudeDelta,
  };

  const ReactNativeMaps = getMapsModule();

  if (ReactNativeMaps) {
    const MapView = ReactNativeMaps.default;
    const Marker = ReactNativeMaps.Marker;
    const Polyline = ReactNativeMaps.Polyline;
    const provider = ReactNativeMaps.PROVIDER_DEFAULT;

    return (
      <MapView
        provider={provider}
        style={style}
        region={mapRegion}
        showsCompass
        rotateEnabled={false}
        toolbarEnabled={false}
        showsUserLocation={showsUserLocation}
        loadingEnabled
      >
        {routeCoordinates.length > 1 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={DriverColors.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        {driverLocation ? (
          <Marker
            coordinate={driverLocation}
            title="Votre position"
            description="Position actuelle du livreur"
            pinColor="#2563EB"
          />
        ) : null}
        <Marker
          coordinate={{
            latitude: marker.latitude,
            longitude: marker.longitude,
          }}
          title={marker.title}
          description={marker.description}
          pinColor="#F97316"
        />
      </MapView>
    );
  }

  return (
    <View style={[styles.fallback, style]}>
      <Ionicons name="map" size={22} color={DriverColors.primary} />
      <Text style={styles.fallbackTitle}>Carte native indisponible</Text>
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
