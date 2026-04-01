import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { updateUserProfile } from '@/lib/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDriverPalette } from '@/lib/driverAppearance';

const isValidEmail = (value: string) => !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export default function DriverProfileSetupScreen() {
  const { state, dispatch } = useDriverStore();
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
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 12,
      lineHeight: 18,
      color: palette.textMuted,
      marginBottom: DriverSpacing.lg,
    },
    input: {
      height: 48,
      borderRadius: DriverRadius.md,
      backgroundColor: palette.input,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 12,
      fontSize: 14,
      color: palette.text,
      marginBottom: 12,
    },
    sectionTitle: {
      marginTop: DriverSpacing.md,
      fontSize: 14,
      fontWeight: '700',
      color: palette.text,
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
      borderColor: palette.border,
      backgroundColor: palette.surface,
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: DriverColors.primary,
      borderColor: DriverColors.primary,
    },
    checkboxText: {
      flex: 1,
      fontSize: 11,
      color: palette.textMuted,
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
    primaryButtonDisabled: {
      opacity: 0.4,
    },
    primaryText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
  const isCompany = state.driverAccountType === 'company';
  const [firstName, setFirstName] = useState(isCompany ? '' : state.driverName || '');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState(state.companyName || (isCompany ? state.driverName : ''));
  const [managerName, setManagerName] = useState(state.managerName || '');
  const [email, setEmail] = useState('');
  const [accepted, setAccepted] = useState(false);

  const canContinue = useMemo(() => {
    if (!accepted || !isValidEmail(email)) return false;
    if (isCompany) return Boolean(companyName.trim() && managerName.trim());
    return Boolean(firstName.trim() && lastName.trim());
  }, [accepted, email, isCompany, companyName, managerName, firstName, lastName]);

  const handleContinue = async () => {
    if (!canContinue) return;

    const payload = isCompany
      ? {
          company_name: companyName.trim(),
          manager_name: managerName.trim(),
          driver_account_type: 'company' as const,
          email: email.trim() || undefined,
          account_step: 3,
        }
      : {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          driver_account_type: 'independent' as const,
          email: email.trim() || undefined,
          account_step: 3,
        };

    try {
      if (state.driverId) {
        const response = await updateUserProfile(state.driverId, payload);
        dispatch({ type: 'SET_DRIVER_NAME', value: response.user.name || (isCompany ? companyName.trim() : firstName.trim()) });
        dispatch({ type: 'SET_DRIVER_ACCOUNT_TYPE', value: (response.user.driver_account_type || state.driverAccountType) as any });
        dispatch({ type: 'SET_COMPANY_NAME', value: response.user.company_name || '' });
        dispatch({ type: 'SET_MANAGER_NAME', value: response.user.manager_name || '' });
      }
    } catch {
      Alert.alert('Erreur', 'Profil local mis a jour, mais le backend est indisponible.');
    }

    if (isCompany) {
      dispatch({ type: 'SET_DRIVER_NAME', value: companyName.trim() });
      dispatch({ type: 'SET_COMPANY_NAME', value: companyName.trim() });
      dispatch({ type: 'SET_MANAGER_NAME', value: managerName.trim() });
      dispatch({ type: 'SET_DRIVER_ACCOUNT_TYPE', value: 'company' });
    } else {
      dispatch({ type: 'SET_DRIVER_NAME', value: `${firstName.trim()} ${lastName.trim()}`.trim() });
      dispatch({ type: 'SET_DRIVER_ACCOUNT_TYPE', value: 'independent' });
    }

    dispatch({ type: 'SET_ACCOUNT_STEP', value: 3 });
    router.push('/account/location');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{isCompany ? 'Informations de l entreprise' : 'Informations du laveur'}</Text>
        <Text style={styles.subtitle}>
          {isCompany
            ? 'Renseignez les informations principales de votre entreprise avant la verification.'
            : 'Renseignez votre identite telle qu elle apparait sur vos documents.'}
        </Text>

        {isCompany ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nom de l entreprise"
              placeholderTextColor={DriverColors.muted}
              value={companyName}
              onChangeText={setCompanyName}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom du gerant"
              placeholderTextColor={DriverColors.muted}
              value={managerName}
              onChangeText={setManagerName}
            />
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Entrez votre prenom"
              placeholderTextColor={DriverColors.muted}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Entrez votre nom de famille"
              placeholderTextColor={DriverColors.muted}
              value={lastName}
              onChangeText={setLastName}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Adresse email de contact (facultatif si deja renseignee)</Text>
        <TextInput
          style={styles.input}
          placeholder="Entrez votre adresse e-mail"
          placeholderTextColor={DriverColors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity style={styles.checkboxRow} onPress={() => setAccepted((prev) => !prev)}>
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]} />
          <Text style={styles.checkboxText}>
            Je confirme l exactitude des informations et j accepte les
            <Text style={styles.linkText}> Conditions d utilisation</Text> et la
            <Text style={styles.linkText}> Politique de confidentialite</Text> de Ziwago.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]} disabled={!canContinue} onPress={handleContinue}>
          <Text style={styles.primaryText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
