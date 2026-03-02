import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { ApiError, submitDriverDocuments, uploadDriverDocument } from '@/lib/api';

const docItems = [
  { id: 'id', title: 'Carte d\'identite nationale ou passeport' },
  { id: 'profile', title: 'Photo de profil' },
  { id: 'license', title: 'Permis de conduire' },
  { id: 'address', title: 'Justificatif de domicile ou de residence' },
  { id: 'certificate', title: 'Certificat de bonne conduite' },
];

export default function DriverDocumentsScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const documents = state.documents || {};
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (state.profileStatus === 'approved') {
      router.replace('/(tabs)');
    }
  }, [router, state.profileStatus]);

  const allUploaded = useMemo(
    () => docItems.every((doc) => Boolean(documents[doc.id])),
    [documents]
  );

  const persistDocument = async (id: string, uri: string) => {
    if (uploadingDocId) return;
    const previousUri = documents[id] ?? null;
    dispatch({ type: 'SET_DOCUMENT', id, uri });
    if (!state.driverId) {
      dispatch({ type: 'SET_DOCUMENT', id, uri: previousUri });
      Alert.alert('Session invalide', 'Reconnectez-vous puis reessayez.');
      return;
    }

    setUploadingDocId(id);
    try {
      const response = await uploadDriverDocument(state.driverId, id, uri);
      dispatch({ type: 'SET_DOCUMENTS', value: (response.user.documents as Record<string, string | null>) || {} });
      dispatch({ type: 'SET_DOCUMENTS_STATUS', value: (response.user.documents_status || 'pending') as any });
    } catch (error) {
      dispatch({ type: 'SET_DOCUMENT', id, uri: previousUri });
      const message = error instanceof ApiError ? error.message : 'Impossible de televerser ce document pour le moment.';
      Alert.alert('Erreur', message);
    } finally {
      setUploadingDocId(null);
    }
  };

  const pickFromLibrary = async (id: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Autorisation requise', 'Autorisez la galerie pour importer ce document.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.75,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (result.canceled) return;
    await persistDocument(id, result.assets[0].uri);
  };

  const captureWithCamera = async (id: string, forceSelfie = false) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Autorisation requise', 'Autorisez la camera pour capturer ce document.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.75,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      cameraType: forceSelfie ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    });
    if (result.canceled) return;
    await persistDocument(id, result.assets[0].uri);
  };

  const pickDocument = async (id: string) => {
    if (id === 'profile') {
      Alert.alert(
        'Photo de profil',
        'Prenez un selfie avec la camera frontale. Cette photo deviendra votre photo de profil apres validation du compte.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Prendre un selfie', onPress: () => captureWithCamera(id, true) },
        ]
      );
      return;
    }

    Alert.alert('Ajouter un document', 'Choisissez la source du document', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Camera', onPress: () => captureWithCamera(id) },
      { text: 'Galerie', onPress: () => pickFromLibrary(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Telechargez les documents suivants pour verifier votre identite</Text>

        {docItems.map((item) => {
          const uri = documents[item.id];
          const status = uri
            ? 'Televerse'
            : item.id === 'profile'
              ? 'Selfie requis (camera frontale)'
              : item.id === 'id'
                ? 'etape suivante recommandee'
                : '';
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.docRow, uri && styles.docRowActive, uploadingDocId && styles.docRowDisabled]}
              disabled={Boolean(uploadingDocId)}
              onPress={() => pickDocument(item.id)}
            >
              <View>
                <Text style={styles.docTitle}>{item.title}</Text>
                {status ? (
                  <Text style={styles.docStatus}>
                    {uploadingDocId === item.id ? 'Televersement en cours...' : status}
                  </Text>
                ) : uploadingDocId === item.id ? (
                  <Text style={styles.docStatus}>Televersement en cours...</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={DriverColors.muted} />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.primaryButton, (!allUploaded || Boolean(uploadingDocId)) && styles.primaryButtonDisabled]}
          disabled={!allUploaded || Boolean(uploadingDocId)}
          onPress={() => {
            if (!state.driverId) {
              router.push('/account/review');
              return;
            }
            submitDriverDocuments(state.driverId)
              .then((response) => {
                dispatch({ type: 'SET_ACCOUNT_STEP', value: response.user.account_step || 6 });
                dispatch({ type: 'SET_DOCUMENTS', value: (response.user.documents as Record<string, string | null>) || {} });
                dispatch({ type: 'SET_DOCUMENTS_STATUS', value: (response.user.documents_status || 'submitted') as any });
                router.push('/account/review');
              })
              .catch((error) => {
                const message = error instanceof ApiError ? error.message : 'Soumission impossible. Verifiez les documents puis reessayez.';
                Alert.alert('Soumission echouee', message);
              });
          }}
        >
          <Text style={styles.primaryText}>Soumettre pour examen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {
            if (!allUploaded) {
              Alert.alert('Documents requis', 'Ajoutez tous les documents obligatoires avant de continuer.');
              return;
            }
            router.push('/account/review');
          }}
        >
          <Text style={styles.linkText}>Voir l etat du dossier</Text>
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
  docRowDisabled: {
    opacity: 0.6,
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


