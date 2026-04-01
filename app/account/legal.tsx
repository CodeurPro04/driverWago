import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { DriverColors, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { getDriverDocumentItems } from '@/lib/driverAccount';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDriverPalette } from '@/lib/driverAppearance';

export default function DriverLegalScreen() {
  const { state, dispatch } = useDriverStore();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
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
      fontSize: 18,
      fontWeight: '700',
      color: palette.text,
      marginBottom: 4,
    },
    paragraph: {
      fontSize: 12,
      color: palette.textMuted,
      marginBottom: DriverSpacing.md,
    },
    body: {
      fontSize: 12,
      color: palette.textMuted,
      lineHeight: 18,
      marginBottom: DriverSpacing.md,
    },
    list: {
      gap: 8,
      marginBottom: DriverSpacing.md,
    },
    listRow: {
      flexDirection: 'row',
      gap: 8,
    },
    bullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: DriverColors.primary,
      marginTop: 6,
    },
    listText: {
      flex: 1,
      fontSize: 12,
      color: palette.textMuted,
      lineHeight: 18,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
    primaryButton: {
      marginTop: DriverSpacing.lg,
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
  const documents = useMemo(() => getDriverDocumentItems(state.driverAccountType), [state.driverAccountType]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Consentement legal</Text>
        <Text style={styles.paragraph}>
          {isCompany ? 'Verification entreprise' : 'Verification laveur independant'}
        </Text>

        <Text style={styles.body}>
          Avant de pouvoir recevoir des missions sur Ziwago, nous devons verifier votre dossier pour proteger les clients
          et valider la qualite des prestataires actifs sur la plateforme.
        </Text>
        <Text style={styles.body}>
          Les documents transmis sont utilises uniquement pour l examen du compte. Ils restent lies a votre profil chauffeur
          et seront revus par l equipe de verification.
        </Text>

        <Text style={styles.body}>Documents demandes pour ce type de compte :</Text>
        <View style={styles.list}>
          {documents.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.bullet} />
              <Text style={styles.listText}>{item.title}{item.hint ? `: ${item.hint}` : ''}</Text>
            </View>
          ))}
          {isCompany ? (
            <View style={styles.listRow}>
              <View style={styles.bullet} />
              <Text style={styles.listText}>Nom du gerant: il doit correspondre a la piece d identite fournie.</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.body}>En continuant, vous acceptez que :</Text>
        <View style={styles.list}>
          {[
            'Ziwago examine les informations transmises pour valider le compte chauffeur.',
            'Le compte reste en attente tant que les documents et les tarifs ne sont pas completes.',
            'En cas de refus, vous pourrez corriger le dossier puis le soumettre a nouveau.',
          ].map((item) => (
            <View key={item} style={styles.listRow}>
              <View style={styles.bullet} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.checkboxRow} onPress={() => setAccepted((prev) => !prev)}>
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]} />
          <Text style={styles.checkboxText}>Je comprends et j accepte de poursuivre le processus de verification.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, !accepted && styles.primaryButtonDisabled]}
          disabled={!accepted}
          onPress={() => {
            dispatch({ type: 'SET_ACCOUNT_STEP', value: 5 });
            router.push('/account/documents');
          }}
        >
          <Text style={styles.primaryText}>Continuer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
