import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

const docItems = [
  { id: 'id', title: 'Carte d’identité nationale ou passeport' },
  { id: 'profile', title: 'Photo de profil' },
  { id: 'license', title: 'Permis de conduire' },
  { id: 'address', title: 'Justificatif de domicile ou de résidence' },
  { id: 'certificate', title: 'Certificat de bonne conduite' },
];

export default function DriverDocumentsScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const documents = state.documents || {};

  const allUploaded = useMemo(
    () => docItems.every((doc) => Boolean(documents[doc.id])),
    [documents]
  );

  const pickDocument = async (id: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) {
      dispatch({ type: 'SET_DOCUMENT', id, uri: result.assets[0].uri });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Téléchargez les documents suivants pour vérifier votre identité</Text>

        {docItems.map((item) => {
          const uri = documents[item.id];
          const status = uri ? 'Téléversé' : item.id === 'id' ? 'Étape suivante recommandée' : '';
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.docRow, uri && styles.docRowActive]}
              onPress={() => pickDocument(item.id)}
            >
              <View>
                <Text style={styles.docTitle}>{item.title}</Text>
                {status ? <Text style={styles.docStatus}>{status}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={DriverColors.muted} />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.primaryButton, !allUploaded && styles.primaryButtonDisabled]}
          disabled={!allUploaded}
          onPress={() => {
            dispatch({ type: 'SET_ACCOUNT_STEP', value: 6 });
            router.push('/account/review');
          }}
        >
          <Text style={styles.primaryText}>Soumettre pour examen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/account/review')}>
          <Text style={styles.linkText}>Voir l&lsquo;état du dossier</Text>
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
    marginBottom: DriverSpacing.lg,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: DriverRadius.md,
    marginBottom: 10,
  },
  docRowActive: {
    backgroundColor: '#E7F6EA',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DriverColors.text,
  },
  docStatus: {
    fontSize: 11,
    color: DriverColors.success,
    marginTop: 4,
  },
  primaryButton: {
    marginTop: DriverSpacing.lg,
    backgroundColor: DriverColors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.35,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: DriverSpacing.md,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 12,
    color: DriverColors.primary,
    fontWeight: '600',
  },
});
