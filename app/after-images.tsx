import React, { useEffect, useMemo, useState } from 'react';
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
  Modal,
  Animated,
  Easing,
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
const COMMISSION_RATE = 0.2;

export default function AfterImagesScreen() {
  const router = useRouter();
  const { state, dispatch, refreshJobsNow } = useDriverStore();
  const palette = getDriverPalette(useColorScheme());
  const [uploadingCount, setUploadingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedAmount, setCompletedAmount] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(0));

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
  const commissionAmount = useMemo(() => Math.round(completedAmount * COMMISSION_RATE), [completedAmount]);
  const netAmount = useMemo(() => Math.max(0, completedAmount - commissionAmount), [completedAmount, commissionAmount]);

  useEffect(() => {
    if (!showSuccess) return;

    pulseAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 850,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [showSuccess, pulseAnim]);

  const uploadPickedImage = async (index: number, uri: string) => {
    dispatch({ type: 'SET_AFTER_PHOTO', index, uri });

    if (activeJob && state.driverId) {
      setUploadingCount((prev) => prev + 1);
      uploadJobMedia(activeJob.id, state.driverId, 'after', uri)
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

  const onCompleteJob = async () => {
    if (progress < 6 || !activeJob || !state.driverId) return;

    setSubmitting(true);
    try {
      const amount = activeJob.price || 0;
      await transitionJob(activeJob.id, state.driverId, 'complete');
      await refreshJobsNow(state.driverId);
      setCompletedAmount(amount);
      setShowSuccess(true);
    } catch (error: any) {
      Alert.alert('Transition impossible', error?.message || 'Les photos apres lavage ne sont pas encore enregistrees.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: palette.text }]}>Ajoutez 6 photos du vehicule apres lavage (camera ou galerie)</Text>

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
                  <Ionicons name="refresh" size={16} color={DriverColors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressBadge}>
            <Text style={[styles.progressText, { color: palette.text }]}>{Math.min(6, progress)}/6</Text>
          </View>
          <Text style={[styles.progressHint, { color: palette.textMuted }]}>Ajoutez 6 photos claires montrant le vehicule nettoye apres le lavage.</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (progress < 6 || uploadingCount > 0 || submitting) && styles.primaryButtonDisabled]}
          disabled={progress < 6 || uploadingCount > 0 || submitting}
          onPress={onCompleteJob}
        >
          {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.primaryText}>Soumettre la preuve et terminer la commande</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => undefined}>
        <View style={[styles.modalBackdrop, { backgroundColor: palette.overlay }]}>
          <View style={[styles.successCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Animated.View
              style={[
                styles.successIconWrap,
                {
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.08],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="checkmark" size={28} color="#FFFFFF" />
            </Animated.View>

            <Text style={[styles.successTitle, { color: palette.text }]}>Mission terminee avec succes</Text>
            <Text style={[styles.successSubtitle, { color: palette.textMuted }]}>Le paiement de cette commande a bien ete enregistre.</Text>

            <View style={[styles.earningsCard, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
              <View style={styles.earningRow}>
                <Text style={[styles.earningLabel, { color: palette.textMuted }]}>Montant commande</Text>
                <Text style={styles.earningValue}>{completedAmount.toLocaleString()} F CFA</Text>
              </View>
              <View style={styles.earningRow}>
                <Text style={[styles.earningLabel, { color: palette.textMuted }]}>Commission ({Math.round(COMMISSION_RATE * 100)}%)</Text>
                <Text style={styles.earningNegative}>- {commissionAmount.toLocaleString()} F CFA</Text>
              </View>
              <View style={[styles.earningDivider, { backgroundColor: palette.border }]} />
              <View style={styles.earningRow}>
                <Text style={styles.earningNetLabel}>Gain net</Text>
                <Text style={styles.earningNetValue}>{netAmount.toLocaleString()} F CFA</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                setShowSuccess(false);
                router.replace('/(tabs)/missions');
              }}
            >
              <Text style={styles.doneButtonText}>Retour aux missions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: DriverSpacing.lg,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.lg,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DriverColors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DriverColors.text,
    textAlign: 'center',
  },
  successSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: DriverColors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  earningsCard: {
    width: '100%',
    marginTop: 14,
    borderWidth: 1,
    borderColor: DriverColors.border,
    borderRadius: DriverRadius.md,
    padding: DriverSpacing.md,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  earningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  earningLabel: {
    fontSize: 12,
    color: DriverColors.muted,
    fontWeight: '600',
  },
  earningValue: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
  },
  earningNegative: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  earningDivider: {
    height: 1,
    backgroundColor: DriverColors.border,
  },
  earningNetLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: DriverColors.text,
  },
  earningNetValue: {
    fontSize: 16,
    fontWeight: '900',
    color: DriverColors.success,
  },
  doneButton: {
    marginTop: 16,
    width: '100%',
    backgroundColor: DriverColors.primary,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
