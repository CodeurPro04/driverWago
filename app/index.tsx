import React, { useMemo, useState } from 'react';
import { Redirect, useRootNavigationState } from 'expo-router';
import { ActivityIndicator, Alert, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDriverStore } from '@/hooks/useDriverStore';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authenticateWithBiometrics, canUseFaceId, getBiometricLabel } from '@/lib/biometrics';
import { getDriverPalette } from '@/lib/driverAppearance';

const stepRoutes: Record<number, string> = {
  0: '/account/profile',
  1: '/account/profile',
  2: '/account/profile',
  3: '/account/location',
  4: '/account/legal',
  5: '/account/documents',
  6: '/account/pricing',
  7: '/account/review',
  8: '/(tabs)',
};

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const { state, hydrated } = useDriverStore();
  const [unlocking, setUnlocking] = useState(false);
  const [biometricUnlocked, setBiometricUnlocked] = useState(false);
  const palette = getDriverPalette(useColorScheme());
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: DriverSpacing.lg,
    },
    card: {
      width: '100%',
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: DriverRadius.md,
      padding: DriverSpacing.lg,
      gap: DriverSpacing.md,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.textMuted,
      textAlign: 'center',
    },
    button: {
      height: 48,
      borderRadius: DriverRadius.md,
      backgroundColor: DriverColors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
  const canEnterMainApp =
    state.profileStatus === 'approved' || (state.accountStep >= 7 && state.documentsStatus === 'submitted');
  const isLoggedIn = useMemo(() => Boolean(state.driverId), [state.driverId]);

  if (!rootNavigationState?.key || !hydrated) {
    return null;
  }

  if (isLoggedIn && state.biometricEnabled && !biometricUnlocked) {
    const unlock = async () => {
      setUnlocking(true);
      try {
        const label = await getBiometricLabel();
        if (Platform.OS === 'ios') {
          const faceIdAvailable = await canUseFaceId();
          if (!faceIdAvailable) {
            Alert.alert('Face ID indisponible', 'Face ID n est pas configure sur cet iPhone.');
            return;
          }
        }
        const success = await authenticateWithBiometrics(`Se connecter avec ${label}`);
        if (!success) {
          Alert.alert('Authentification annulee', `Utilisez ${label} pour acceder a votre compte.`);
          return;
        }
        setBiometricUnlocked(true);
      } catch {
        Alert.alert('Erreur', 'Impossible de lancer la verification biométrique.');
      } finally {
        setUnlocking(false);
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Deverrouillage securise</Text>
          <Text style={styles.subtitle}>Confirmez votre identite avant d acceder a votre espace laveur.</Text>
          <TouchableOpacity style={[styles.button, unlocking && styles.buttonDisabled]} onPress={unlock} disabled={unlocking}>
            {unlocking ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.buttonText}>Deverrouiller</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!state.onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  if (!state.driverId) {
    return <Redirect href="/account/auth" />;
  }

  if (state.accountStep < 7) {
    return <Redirect href={(stepRoutes[state.accountStep] || '/account/auth') as any} />;
  }

  if (!canEnterMainApp) {
    return <Redirect href="/account/review" />;
  }

  return <Redirect href="/(tabs)" />;
}
