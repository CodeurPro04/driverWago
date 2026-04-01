import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { ApiError, submitDriverDocuments, updateUserProfile } from '@/lib/api';
import {
  DriverPricing,
  DriverVehicleType,
  DriverWashType,
  driverVehicleLabels,
  driverWashLabels,
  isDriverPricingComplete,
  normalizeDriverPricing,
} from '@/lib/driverAccount';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDriverPalette } from '@/lib/driverAppearance';

const vehicleOrder: DriverVehicleType[] = ['compacte', 'berline', 'suv'];
const washOrder: DriverWashType[] = ['exterior', 'interior', 'full'];

const toDraft = (pricing: DriverPricing) =>
  Object.fromEntries(
    vehicleOrder.map((vehicle) => [
      vehicle,
      Object.fromEntries(
        washOrder.map((service) => [service, pricing[vehicle][service] ? String(pricing[vehicle][service]) : ''])
      ),
    ])
  ) as Record<DriverVehicleType, Record<DriverWashType, string>>;

const toPricing = (draft: Record<DriverVehicleType, Record<DriverWashType, string>>): DriverPricing =>
  normalizeDriverPricing(
    Object.fromEntries(
      vehicleOrder.map((vehicle) => [
        vehicle,
        Object.fromEntries(
          washOrder.map((service) => {
            const digits = draft[vehicle][service].replace(/[^\d]/g, '');
            return [service, digits ? Number(digits) : null];
          })
        ),
      ])
    ) as DriverPricing
  );

export default function DriverPricingScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const palette = getDriverPalette(useColorScheme());
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      padding: DriverSpacing.lg,
      paddingBottom: 40,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 12,
      lineHeight: 18,
      color: palette.textMuted,
      marginBottom: DriverSpacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    headerCell: {
      flex: 1,
      fontSize: 11,
      fontWeight: '800',
      color: palette.textMuted,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    vehicleHeader: {
      flex: 1.15,
      textAlign: 'left',
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    rowLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.text,
    },
    priceInput: {
      flex: 1,
      height: 48,
      borderRadius: DriverRadius.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      textAlign: 'center',
      color: palette.text,
      fontSize: 14,
      fontWeight: '700',
    },
    currencyHint: {
      marginTop: DriverSpacing.sm,
      fontSize: 12,
      color: palette.textMuted,
    },
    primaryButton: {
      marginTop: DriverSpacing.xl,
      backgroundColor: DriverColors.primary,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
    },
    primaryButtonDisabled: {
      opacity: 0.4,
    },
    primaryText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
  const [draft, setDraft] = useState(() => toDraft(state.pricing));
  const [saving, setSaving] = useState(false);

  const pricing = useMemo(() => toPricing(draft), [draft]);
  const canSubmit = isDriverPricingComplete(pricing) && !saving;
  const shouldUpdateDirectly =
    state.driverAccountType === 'company' &&
    (state.accountStep >= 7 || state.documentsStatus === 'submitted' || state.profileStatus === 'approved');

  const setValue = (vehicle: DriverVehicleType, service: DriverWashType, value: string) => {
    const digits = value.replace(/[^\d]/g, '').slice(0, 6);
    setDraft((current) => ({
      ...current,
      [vehicle]: {
        ...current[vehicle],
        [service]: digits,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!state.driverId) {
      Alert.alert('Session invalide', 'Reconnectez-vous puis reessayez.');
      return;
    }
    if (!isDriverPricingComplete(pricing)) {
      Alert.alert('Tarifs incomplets', 'Renseignez tous les tarifs avant de continuer.');
      return;
    }

    setSaving(true);
    try {
      const profile = await updateUserProfile(state.driverId, {
        pricing,
        account_step: shouldUpdateDirectly ? state.accountStep : 7,
      });
      dispatch({ type: 'SET_PRICING', value: profile.user.pricing || pricing });
      dispatch({ type: 'SET_ACCOUNT_STEP', value: profile.user.account_step || state.accountStep || 7 });
      dispatch({ type: 'SET_PROFILE_STATUS', value: (profile.user.profile_status || state.profileStatus || 'pending') as any });
      dispatch({ type: 'SET_DOCUMENTS', value: (profile.user.documents as Record<string, string | null>) || state.documents });
      dispatch({ type: 'SET_DOCUMENTS_STATUS', value: (profile.user.documents_status || state.documentsStatus || 'pending') as any });

      if (shouldUpdateDirectly) {
        Alert.alert('Tarifs mis a jour', 'Les nouveaux tarifs de l entreprise ont ete enregistres directement.');
        router.back();
        return;
      }

      const submitted = await submitDriverDocuments(state.driverId);
      dispatch({ type: 'SET_ACCOUNT_STEP', value: submitted.user.account_step || 7 });
      dispatch({ type: 'SET_PROFILE_STATUS', value: (submitted.user.profile_status || state.profileStatus || 'pending') as any });
      dispatch({ type: 'SET_DOCUMENTS', value: (submitted.user.documents as Record<string, string | null>) || {} });
      dispatch({ type: 'SET_DOCUMENTS_STATUS', value: (submitted.user.documents_status || 'submitted') as any });
      router.replace('/account/review');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Impossible d enregistrer les tarifs pour le moment.';
      Alert.alert('Erreur', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Renseignez vos tarifs</Text>
        <Text style={styles.subtitle}>
          {state.driverAccountType === 'company'
            ? 'Definissez les prix standards de votre entreprise pour chaque categorie de vehicule.'
            : 'Definissez vos prix de lavage pour chaque categorie de vehicule.'}
        </Text>

        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.vehicleHeader]}>Vehicule</Text>
          {washOrder.map((service) => (
            <Text key={service} style={styles.headerCell}>{driverWashLabels[service]}</Text>
          ))}
        </View>

        {vehicleOrder.map((vehicle) => (
          <View key={vehicle} style={styles.priceRow}>
            <Text style={[styles.rowLabel, styles.vehicleHeader]}>{driverVehicleLabels[vehicle]}</Text>
            {washOrder.map((service) => (
              <TextInput
                key={`${vehicle}-${service}`}
                style={styles.priceInput}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={DriverColors.muted}
                value={draft[vehicle][service]}
                onChangeText={(value) => setValue(vehicle, service, value)}
              />
            ))}
          </View>
        ))}

        <Text style={styles.currencyHint}>Montants en FCFA.</Text>

        <TouchableOpacity style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]} disabled={!canSubmit} onPress={handleSubmit}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>{shouldUpdateDirectly ? 'Enregistrer les tarifs' : 'Soumettre mon dossier'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
