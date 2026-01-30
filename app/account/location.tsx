import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

export default function DriverLocationScreen() {
  const { dispatch } = useDriverStore();
  const router = useRouter();

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  content: {
    padding: DriverSpacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.text,
    marginBottom: DriverSpacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: DriverRadius.md,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: DriverSpacing.md,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: DriverColors.text,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: DriverRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  mapText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.text,
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
