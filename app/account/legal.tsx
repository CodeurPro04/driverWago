import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

export default function DriverLegalScreen() {
  const { dispatch } = useDriverStore();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Consentement légal</Text>
        <Text style={styles.paragraph}>En savoir plus sur votre processus de vérification</Text>

        <Text style={styles.body}>
          Avant de pouvoir commencer à recevoir des demandes de lavage sur Ziwago, nous devons
          vérifier votre identité et votre éligibilité à fournir des services de lavage de voitures.
        </Text>
        <Text style={styles.body}>
          Pour rendre ce processus simple et sécurisé, vous téléchargez quelques documents requis
          directement dans l&lsquo;application. Cela nous aide à confirmer votre identité, à garantir la
          sécurité de nos clients et à instaurer la confiance au sein de la communauté Ziwago.
        </Text>
        <Text style={styles.body}>Il vous sera demandé de fournir des images claires des documents suivants :</Text>
        <View style={styles.list}>
          {[
            'Carte d’identité nationale ou passeport (pour vérifier votre identité)',
            'Photo de profil (pour votre profil public et la sécurité)',
            'Permis de conduire (puisque vous vous déplacez chez les clients)',
            'Justificatif de domicile ou de résidence (pour confirmer votre zone de service)',
            'Photo(s) de votre équipement de lavage (pour vérifier votre préparation à fournir les services)',
            'Certificat de bonne conduite / extrait de casier judiciaire (pour renforcer la confiance lors des services à domicile ou sur site)',
          ].map((item) => (
            <View key={item} style={styles.listRow}>
              <View style={styles.bullet} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.body}>En continuant, vous reconnaissez et acceptez que :</Text>
        <View style={styles.list}>
          {[
            'Ziwago examinera vos informations afin de confirmer votre identité et votre éligibilité.',
            'Vos documents seront stockés en toute sécurité et utilisés uniquement à des fins de vérification.',
            'Vous ne pourrez peut-être pas recevoir de nouvelles demandes tant que votre profil n’aura pas été entièrement vérifié.',
          ].map((item) => (
            <View key={item} style={styles.listRow}>
              <View style={styles.bullet} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.checkboxRow} onPress={() => setAccepted((prev) => !prev)}>
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]} />
          <Text style={styles.checkboxText}>Je comprends et j’accepte de poursuivre le processus de vérification.</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  content: {
    padding: DriverSpacing.lg,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.text,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 12,
    color: DriverColors.muted,
    marginBottom: DriverSpacing.md,
  },
  body: {
    fontSize: 12,
    color: DriverColors.muted,
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
    color: DriverColors.muted,
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
    borderColor: DriverColors.border,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: DriverColors.primary,
    borderColor: DriverColors.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: 11,
    color: DriverColors.muted,
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
