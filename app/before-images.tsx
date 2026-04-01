import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { transitionJob, uploadJobMedia } from '@/lib/api';
import { getDriverPalette } from '@/lib/driverAppearance';

const slots = [0, 1, 2, 3, 4, 5];

export default function BeforeImagesScreen() {
  const router = useRouter();
  const { state, dispatch, refreshJobsNow } = useDriverStore();
  const palette = getDriverPalette(useColorScheme());
  const [uploadingCount, setUploadingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const activeJob = useMemo(() => {
    if (!state.activeJobId) return null;
    return state.jobs.find((job) => job.id === state.activeJobId) || null;
  }, [state.activeJobId, state.jobs]);

  const photos = useMemo(() => {
    const local = state.beforePhotos || [];
    const remote = activeJob?.beforePhotos || [];
    return local.length >= remote.length ? local : remote;
  }, [state.beforePhotos, activeJob?.beforePhotos]);

  const progress = useMemo(() => photos.filter(Boolean).length, [photos]);

  const uploadPickedImage = async (index: number, uri: string) => {
    dispatch({ type: 'SET_BEFORE_PHOTO', index, uri });

    if (activeJob && state.driverId) {
      setUploadingCount((prev) => prev + 1);
      uploadJobMedia(activeJob.id, state.driverId, 'before', uri)
        .then(async () => {
          await refreshJobsNow(state.driverId || undefined);
        })
        .catch(() => {
          Alert.alert('Erreur', "Impossible d enregistrer cette photo en base.");
        })
        .finally(() => {
          setUploadingCount((prev) => Math.max(0, prev - 1));
        });
    }
  };

  const pickFromGallery = async (index: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (result.canceled) return;
    await uploadPickedImage(index, result.assets[0].uri);
  };

  const pickFromCamera = async (index: number) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (result.canceled) return;
    await uploadPickedImage(index, result.assets[0].uri);
  };

  const pickImage = (index: number) => {
    Alert.alert('Ajouter une photo', 'Choisissez la source de la photo', [
      { text: 'Caméra', onPress: () => pickFromCamera(index).catch(() => undefined) },
      { text: 'Galerie', onPress: () => pickFromGallery(index).catch(() => undefined) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const onStartWash = async () => {
    if (progress < 6 || !activeJob || !state.driverId) return;

    setSubmitting(true);
    try {
      await transitionJob(activeJob.id, state.driverId, 'start');
      await refreshJobsNow(state.driverId);
      router.replace('/(tabs)/active');
    } catch (error: any) {
      Alert.alert('Transition impossible', error?.message || 'Les photos avant lavage ne sont pas encore enregistrees.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: palette.text }]}>Ajoutez 6 photos du vehicule avant le lavage (camera ou galerie)</Text>

        <View style={styles.grid}>
          {slots.map((slot) => {
            const uri = photos[slot];
            return (
              <TouchableOpacity key={slot} style={[styles.photoCard, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]} onPress={() => pickImage(slot)}>
                {uri ? <Image source={{ uri }} style={styles.photo} /> : null}
                <View style={[styles.slotBadge, uri && styles.slotBadgeFilled]}>
                  <Text style={[styles.slotBadgeText, { color: palette.text }, uri && styles.slotBadgeTextFilled]}>
                    {slot + 1}/6
                  </Text>
                </View>
                <View style={[styles.refreshIcon, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Ionicons name="camera" size={16} color={DriverColors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressBadge}>
            <Text style={[styles.progressText, { color: palette.text }]}>{Math.min(6, progress)}/6</Text>
          </View>
          <Text style={[styles.progressHint, { color: palette.textMuted }]}>Ajoutez 6 photos claires montrant l etat du vehicule avant le lavage.</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (progress < 6 || uploadingCount > 0 || submitting) && styles.primaryButtonDisabled]}
          disabled={progress < 6 || uploadingCount > 0 || submitting}
          onPress={onStartWash}
        >
          {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.primaryText}>Commencer le lavage</Text>}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: DriverColors.border,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  refreshIcon: {
    alignSelf: 'flex-end',
    margin: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DriverColors.border,
  },
  slotBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: DriverColors.border,
  },
  slotBadgeFilled: {
    backgroundColor: 'rgba(34,197,94,0.95)',
    borderColor: '#22C55E',
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DriverColors.text,
  },
  slotBadgeTextFilled: {
    color: '#FFFFFF',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: DriverSpacing.lg,
  },
  progressBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: DriverColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.text,
  },
  progressHint: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.muted,
  },
  primaryButton: {
    marginTop: DriverSpacing.xl,
    backgroundColor: DriverColors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
