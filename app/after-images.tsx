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
import { useDriverStore } from '@/hooks/useDriverStore';
import { transitionJob, uploadJobMedia } from '@/lib/api';

const slots = [0, 1, 2, 3, 4];

export default function AfterImagesScreen() {
  const router = useRouter();
  const { state, dispatch, refreshJobsNow } = useDriverStore();
  const [uploadingCount, setUploadingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const activeJob = useMemo(() => {
    if (!state.activeJobId) return null;
    return state.jobs.find((job) => job.id === state.activeJobId) || null;
  }, [state.activeJobId, state.jobs]);

  const photos = useMemo(() => {
    const local = state.afterPhotos || [];
    const remote = activeJob?.afterPhotos || [];
    return local.length >= remote.length ? local : remote;
  }, [state.afterPhotos, activeJob?.afterPhotos]);

  const progress = useMemo(() => photos.filter(Boolean).length, [photos]);

  const pickImage = async (index: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (result.canceled) return;

    dispatch({ type: 'SET_AFTER_PHOTO', index, uri: result.assets[0].uri });

    if (activeJob && state.driverId) {
      setUploadingCount((prev) => prev + 1);
      uploadJobMedia(activeJob.id, state.driverId, 'after', result.assets[0].uri)
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

  const onCompleteJob = async () => {
    if (progress < 5 || !activeJob || !state.driverId) return;

    setSubmitting(true);
    try {
      await transitionJob(activeJob.id, state.driverId, 'complete');
      await refreshJobsNow(state.driverId);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Transition impossible', error?.message || 'Les photos apres lavage ne sont pas encore enregistrees.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>
          Téléchargez des photos montrant la voiture après le lavage pour terminer la commande
        </Text>

        <View style={styles.grid}>
          {slots.map((slot) => {
            const uri = photos[slot];
            return (
              <TouchableOpacity key={slot} style={styles.photoCard} onPress={() => pickImage(slot)}>
                {uri ? <Image source={{ uri }} style={styles.photo} /> : null}
                <View style={styles.refreshIcon}>
                  <Ionicons name="refresh" size={16} color={DriverColors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{Math.min(5, progress)}/5</Text>
          </View>
          <Text style={styles.progressHint}>
            Ajoutez 5 photos claires montrant le véhicule nettoyé après le lavage.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (progress < 5 || uploadingCount > 0 || submitting) && styles.primaryButtonDisabled]}
          disabled={progress < 5 || uploadingCount > 0 || submitting}
          onPress={onCompleteJob}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.primaryText}>Soumettre la preuve et terminer la commande</Text>
          )}
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DriverColors.border,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: DriverSpacing.lg,
  },
  progressBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
