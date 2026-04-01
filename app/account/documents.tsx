import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { ApiError, getUserProfile, updateUserProfile, uploadDriverDocument } from '@/lib/api';
import { DriverDocumentId, getDriverDocumentItems } from '@/lib/driverAccount';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDriverPalette } from '@/lib/driverAppearance';

export default function DriverDocumentsScreen() {
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
      fontSize: 18,
      fontWeight: '700',
      color: palette.text,
      marginBottom: DriverSpacing.lg,
    },
    managerBox: {
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: DriverRadius.md,
      padding: DriverSpacing.md,
      marginBottom: DriverSpacing.md,
    },
    managerTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.text,
      marginBottom: 4,
    },
    managerValue: {
      fontSize: 12,
      color: palette.textMuted,
    },
    docRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: palette.surfaceMuted,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: DriverRadius.md,
      marginBottom: 10,
    },
    docCopy: {
      flex: 1,
      paddingRight: 12,
    },
    docRowActive: {
      backgroundColor: palette.successMuted,
      borderColor: palette.successBorder,
    },
    docRowDisabled: {
      opacity: 0.6,
    },
    docTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.text,
    },
    docStatus: {
      fontSize: 11,
      color: palette.successText,
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
      opacity: 0.4,
    },
    primaryText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
  const documents = state.documents;
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const docItems = useMemo(() => getDriverDocumentItems(state.driverAccountType), [state.driverAccountType]);

  useEffect(() => {
    if (state.profileStatus === 'approved' || (state.accountStep >= 7 && state.documentsStatus === 'submitted')) {
      router.replace('/(tabs)');
    }
  }, [router, state.accountStep, state.documentsStatus, state.profileStatus]);

  const allUploaded = useMemo(() => docItems.every((doc) => Boolean(documents[doc.id])), [docItems, documents]);

  const syncProfileState = async () => {
    if (!state.driverId) return null;
    const profile = await getUserProfile(state.driverId);
    dispatch({ type: 'SET_ACCOUNT_STEP', value: Number(profile.user.account_step || state.accountStep || 5) });
    dispatch({ type: 'SET_PROFILE_STATUS', value: (profile.user.profile_status || state.profileStatus || 'pending') as any });
    dispatch({ type: 'SET_DOCUMENTS', value: (profile.user.documents as Record<string, string | null>) || {} });
    dispatch({ type: 'SET_DOCUMENTS_STATUS', value: (profile.user.documents_status || state.documentsStatus || 'pending') as any });
    dispatch({ type: 'SET_DRIVER_ACCOUNT_TYPE', value: (profile.user.driver_account_type || state.driverAccountType) as any });
    dispatch({ type: 'SET_COMPANY_NAME', value: profile.user.company_name || state.companyName });
    dispatch({ type: 'SET_MANAGER_NAME', value: profile.user.manager_name || state.managerName });
    if (profile.user.pricing) {
      dispatch({ type: 'SET_PRICING', value: profile.user.pricing });
    }
    return profile;
  };

  const persistDocument = async (id: DriverDocumentId, uri: string) => {
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
      try {
        const profile = await syncProfileState();
        if (profile?.user?.documents?.[id]) {
          return;
        }
      } catch {
        // Keep the original upload error below when the sync also fails.
      }

      dispatch({ type: 'SET_DOCUMENT', id, uri: previousUri });
      const message = error instanceof ApiError ? error.message : 'Impossible de televerser ce document pour le moment.';
      Alert.alert('Erreur', message);
    } finally {
      setUploadingDocId(null);
    }
  };

  const pickFromLibrary = async (id: DriverDocumentId) => {
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

  const captureWithCamera = async (id: DriverDocumentId, forceSelfie = false) => {
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

  const pickDocument = async (id: DriverDocumentId) => {
    if (id === 'profile' && state.driverAccountType !== 'company') {
      Alert.alert('Photo de profil', 'Prenez un selfie avec la camera frontale.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Prendre un selfie', onPress: () => captureWithCamera(id, true) },
      ]);
      return;
    }

    if (id === 'manager_photo') {
      Alert.alert('Photo du gerant', 'Ajoutez un portrait recent du gerant.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Camera', onPress: () => captureWithCamera(id, true) },
        { text: 'Galerie', onPress: () => pickFromLibrary(id) },
      ]);
      return;
    }

    Alert.alert('Ajouter un document', 'Choisissez la source du document', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Camera', onPress: () => captureWithCamera(id) },
      { text: 'Galerie', onPress: () => pickFromLibrary(id) },
    ]);
  };

  const continueToPricing = async () => {
    if (!allUploaded) {
      Alert.alert('Documents requis', 'Ajoutez tous les documents obligatoires avant de continuer.');
      return;
    }

    if (!state.driverId) {
      router.push('/account/pricing');
      return;
    }

    try {
      const response = await updateUserProfile(state.driverId, { account_step: 6 });
      dispatch({ type: 'SET_ACCOUNT_STEP', value: response.user.account_step || 6 });
      dispatch({ type: 'SET_DOCUMENTS', value: (response.user.documents as Record<string, string | null>) || {} });
      router.push('/account/pricing');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Impossible de continuer pour le moment.';
      Alert.alert('Erreur', message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>
          {state.driverAccountType === 'company'
            ? 'Telechargez les documents de verification de votre entreprise'
            : 'Telechargez les documents suivants pour verifier votre identite'}
        </Text>

        {state.driverAccountType === 'company' ? (
          <View style={styles.managerBox}>
            <Text style={styles.managerTitle}>Gerant declare</Text>
            <Text style={styles.managerValue}>{state.managerName || 'A renseigner dans le profil entreprise'}</Text>
          </View>
        ) : null}

        {docItems.map((item) => {
          const uri = documents[item.id];
          const status = uri ? 'Televerse' : item.hint || '';
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.docRow, uri && styles.docRowActive, uploadingDocId && styles.docRowDisabled]}
              disabled={Boolean(uploadingDocId)}
              onPress={() => pickDocument(item.id)}
            >
              <View style={styles.docCopy}>
                <Text style={styles.docTitle}>{item.title}</Text>
                {status ? (
                  <Text style={styles.docStatus}>{uploadingDocId === item.id ? 'Televersement en cours...' : status}</Text>
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
          onPress={continueToPricing}
        >
          <Text style={styles.primaryText}>Continuer vers les tarifs</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
