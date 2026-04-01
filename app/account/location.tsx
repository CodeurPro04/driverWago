import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDriverPalette } from '@/lib/driverAppearance';

export default function DriverLocationScreen() {
  const { dispatch } = useDriverStore();
  const router = useRouter();
  const palette = getDriverPalette(useColorScheme());
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      padding: DriverSpacing.lg,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.text,
      marginBottom: DriverSpacing.lg,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: palette.input,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: DriverRadius.md,
      paddingHorizontal: 12,
      height: 48,
      marginBottom: DriverSpacing.md,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: palette.text,
    },
    mapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: palette.surfaceMuted,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: DriverRadius.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    mapText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.text,
    },
    primaryButton: {
      marginTop: DriverSpacing.xl,
      backgroundColor: DriverColors.primary,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
    },
    primaryText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Où travaillez-vous ?</Text>

        <View style={styles.inputRow}>
          <Ionicons name="location" size={18} color={DriverColors.primary} />
          <TextInput
            style={styles.input}
            placeholder="Entrez l'emplacement"
            placeholderTextColor={DriverColors.muted}
          />
        </View>

        <TouchableOpacity style={styles.mapButton}>
          <Ionicons name="map" size={18} color={DriverColors.primary} />
          <Text style={styles.mapText}>Choisir sur la carte</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={() => {
          dispatch({ type: 'SET_ACCOUNT_STEP', value: 4 });
          router.push('/account/legal');
        }}>
          <Text style={styles.primaryText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
