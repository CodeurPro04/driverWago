import { useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';

export type DriverCoordinate = {
  latitude: number;
  longitude: number;
};

export type DriverMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type UseDriverNavigationParams = {
  destination: DriverCoordinate | null;
  fallbackRegion: DriverMapRegion;
  enabled?: boolean;
};

type UseDriverNavigationResult = {
  driverLocation: DriverCoordinate | null;
  routeCoordinates: DriverCoordinate[];
  mapRegion: DriverMapRegion;
  locationReady: boolean;
  hasLocationPermission: boolean;
};

const MIN_ROUTE_REFRESH_DISTANCE_METERS = 40;
const MIN_LAT_DELTA = 0.01;
const MIN_LNG_DELTA = 0.01;

function isFiniteCoordinate(value?: DriverCoordinate | null): value is DriverCoordinate {
  return !!value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
}

function toCoordinate(coords: Pick<Location.LocationObjectCoords, 'latitude' | 'longitude'>): DriverCoordinate {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

function getDistanceMeters(a: DriverCoordinate, b: DriverCoordinate) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDelta = toRadians(b.latitude - a.latitude);
  const lngDelta = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function buildRegion(points: DriverCoordinate[], fallbackRegion: DriverMapRegion): DriverMapRegion {
  const validPoints = points.filter(isFiniteCoordinate);

  if (!validPoints.length) {
    return fallbackRegion;
  }

  if (validPoints.length === 1) {
    return {
      latitude: validPoints[0].latitude,
      longitude: validPoints[0].longitude,
      latitudeDelta: fallbackRegion.latitudeDelta,
      longitudeDelta: fallbackRegion.longitudeDelta,
    };
  }

  let minLat = validPoints[0].latitude;
  let maxLat = validPoints[0].latitude;
  let minLng = validPoints[0].longitude;
  let maxLng = validPoints[0].longitude;

  for (const point of validPoints) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  const latitudeDelta = Math.max((maxLat - minLat) * 1.45, MIN_LAT_DELTA);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.45, MIN_LNG_DELTA);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

async function fetchRoute(origin: DriverCoordinate, destination: DriverCoordinate, signal: AbortSignal) {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Route request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const routePoints = payload?.routes?.[0]?.geometry?.coordinates;

  if (!Array.isArray(routePoints) || routePoints.length < 2) {
    throw new Error('No route geometry returned');
  }

  return routePoints
    .filter((point: unknown): point is [number, number] => Array.isArray(point) && point.length >= 2)
    .map(([longitude, latitude]) => ({ latitude, longitude }));
}

export function useDriverNavigation({
  destination,
  fallbackRegion,
  enabled = true,
}: UseDriverNavigationParams): UseDriverNavigationResult {
  const [driverLocation, setDriverLocation] = useState<DriverCoordinate | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<DriverCoordinate[]>([]);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const watchSubscriptionRef = useRef<LocationSubscription | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);
  const lastRoutedOriginRef = useRef<DriverCoordinate | null>(null);
  const lastRoutedDestinationRef = useRef<DriverCoordinate | null>(null);

  useEffect(() => {
    if (!enabled || !destination) {
      setDriverLocation(null);
      setRouteCoordinates([]);
      setHasLocationPermission(false);
      setLocationReady(false);
      return;
    }

    let cancelled = false;

    const startWatchingLocation = async () => {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        if (!cancelled) {
          setHasLocationPermission(false);
          setLocationReady(true);
        }
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        if (!cancelled) {
          setHasLocationPermission(false);
          setLocationReady(true);
        }
        return;
      }

      if (!cancelled) {
        setHasLocationPermission(true);
      }

      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 60_000,
        requiredAccuracy: 200,
      });

      if (!cancelled && lastKnown) {
        setDriverLocation(toCoordinate(lastKnown.coords));
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!cancelled) {
        setDriverLocation(toCoordinate(currentPosition.coords));
        setLocationReady(true);
      }

      watchSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (position) => {
          if (cancelled) return;
          setDriverLocation(toCoordinate(position.coords));
          setLocationReady(true);
        }
      );
    };

    startWatchingLocation().catch(() => {
      if (!cancelled) {
        setHasLocationPermission(false);
        setLocationReady(true);
      }
    });

    return () => {
      cancelled = true;
      watchSubscriptionRef.current?.remove();
      watchSubscriptionRef.current = null;
    };
  }, [destination, enabled]);

  useEffect(() => {
    if (!enabled || !destination || !driverLocation) {
      routeAbortRef.current?.abort();
      routeAbortRef.current = null;
      setRouteCoordinates([]);
      return;
    }

    const destinationChanged =
      !lastRoutedDestinationRef.current ||
      getDistanceMeters(lastRoutedDestinationRef.current, destination) > MIN_ROUTE_REFRESH_DISTANCE_METERS;
    const originChanged =
      !lastRoutedOriginRef.current ||
      getDistanceMeters(lastRoutedOriginRef.current, driverLocation) > MIN_ROUTE_REFRESH_DISTANCE_METERS;

    if (!destinationChanged && !originChanged && routeCoordinates.length > 1) {
      return;
    }

    const controller = new AbortController();
    routeAbortRef.current?.abort();
    routeAbortRef.current = controller;

    fetchRoute(driverLocation, destination, controller.signal)
      .then((points) => {
        if (controller.signal.aborted) return;
        setRouteCoordinates(points);
        lastRoutedOriginRef.current = driverLocation;
        lastRoutedDestinationRef.current = destination;
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setRouteCoordinates([driverLocation, destination]);
        lastRoutedOriginRef.current = driverLocation;
        lastRoutedDestinationRef.current = destination;
      });

    return () => {
      controller.abort();
    };
  }, [destination, driverLocation, enabled, routeCoordinates.length]);

  const mapRegion = useMemo(() => {
    if (!enabled || !destination) {
      return fallbackRegion;
    }

    const basePoints =
      routeCoordinates.length > 1 ? routeCoordinates : [driverLocation, destination].filter(isFiniteCoordinate);

    return buildRegion(basePoints.length ? basePoints : [destination], fallbackRegion);
  }, [destination, driverLocation, enabled, fallbackRegion, routeCoordinates]);

  return {
    driverLocation,
    routeCoordinates,
    mapRegion,
    locationReady,
    hasLocationPermission,
  };
}
