import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { updateUserProfile } from '@/lib/api';

export default function DriverProfileSetupScreen() {
  const { state, dispatch } = useDriverStore();
  const router = useRouter();
  const [firstName, setFirstName] = useState(state.driverName || '');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Comment devons-nous vous appeler ?</Text>

        <TextInput
          style={styles.input}
          placeholder="Entrez votre prenom"
          placeholderTextColor={DriverColors.muted}
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput style={styles.input} placeholder="Entrez votre nom de famille" placeholderTextColor={DriverColors.muted} />

        <Text style={styles.sectionTitle}>Ajoutez votre e-mail pour les mises a jour et l assistance (facultatif)</Text>
        <TextInput style={styles.input} placeholder="Entrez votre adresse e-mail" placeholderTextColor={DriverColors.muted} />

        <TouchableOpacity style={styles.checkboxRow}>
          <View style={styles.checkbox} />
          <Text style={styles.checkboxText}>
            Je confirme avoir au moins 18 ans et j accepte les
            <Text style={styles.linkText}> Conditions d utilisation</Text> et la
            <Text style={styles.linkText}> Politique de confidentialite</Text> de Ziwago.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={async () => {
            try {
              if (state.driverId) {
                await updateUserProfile(state.driverId, {
                  first_name: firstName.trim(),
                  account_step: 3,
                });
              }
            } catch {
              Alert.alert('Erreur', 'Profil local mis a jour, mais le backend est indisponible.');
            }
            if (firstName.trim()) {
              dispatch({ type: 'SET_DRIVER_NAME', value: firstName.trim() });
            }
            dispatch({ type: 'SET_ACCOUNT_STEP', value: 3 });
            router.push('/account/location');
          }}
        >
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
  input: {
    height: 48,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    fontSize: 14,
    color: DriverColors.text,
    marginBottom: 12,
  },
  sectionTitle: {
    marginTop: DriverSpacing.md,
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: DriverSpacing.md,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  checkboxText: {
    flex: 1,
    fontSize: 11,
    color: DriverColors.muted,
    lineHeight: 16,
  },
  linkText: {
    color: DriverColors.primary,
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
