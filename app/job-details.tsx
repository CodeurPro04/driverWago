import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SignatureScreen from 'react-native-signature-canvas';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

const STEP_LABELS = ['Demande', 'En route', 'Arriv\u00e9', 'Lavage', 'Termin\u00e9'];

export default function JobDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state, dispatch } = useDriverStore();
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [signatureOpen, setSignatureOpen] = useState(false);

  const job = useMemo(() => {
    const id = params.id as string | undefined;
    if (!id) return null;
    return state.jobs.find((item) => item.id === id) || null;
  }, [params.id, state.jobs]);

  const currentStepIndex = useMemo(() => {
    if (!job) return 0;
    if (job.status === 'pending') return 0;
    if (job.status === 'accepted' || job.status === 'enRoute') return 1;
    if (job.status === 'arrived') return 2;
    if (job.status === 'washing') return 3;
    if (job.status === 'completed') return 4;
    return 0;
  }, [job]);

  const pickImage = async (setter: (uri: string | null) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle" size={36} color={DriverColors.primary} />
          <Text style={styles.emptyTitle}>Mission introuvable</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color={DriverColors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>D\u00e9tails mission</Text>
            <Text style={styles.subtitle}>{job.service}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{job.customerName}</Text>
            <Text style={styles.cardPrice}>{job.price.toLocaleString()} F CFA</Text>
          </View>
          <Text style={styles.cardMeta}>{job.vehicle}</Text>
          <View style={styles.cardRow}>
            <Ionicons name="location" size={14} color={DriverColors.muted} />
            <Text style={styles.cardText}>{job.address}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="time" size={14} color={DriverColors.muted} />
            <Text style={styles.cardText}>{job.scheduledAt}</Text>
          </View>
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {STEP_LABELS.map((label, index) => {
            const isActive = index <= currentStepIndex;
            return (
              <View key={label} style={styles.timelineRow}>
                <View style={[styles.timelineDot, isActive && styles.timelineDotActive]} />
                <Text style={[styles.timelineText, isActive && styles.timelineTextActive]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actions avanc\u00e9es</Text>
          <Text style={styles.sectionMeta}>Preuves et validation</Text>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionTile, beforePhoto && styles.actionTileActive]}
            onPress={() => pickImage(setBeforePhoto)}
          >
            <Ionicons name="camera" size={18} color={beforePhoto ? '#FFFFFF' : DriverColors.primary} />
            <Text style={[styles.actionLabel, beforePhoto && styles.actionLabelActive]}>
              Photo avant
            </Text>
            <Text style={[styles.actionSub, beforePhoto && styles.actionLabelActive]}>
              {beforePhoto ? 'Ajout\u00e9e' : 'Ajouter'}
            </Text>
            {beforePhoto ? <Image source={{ uri: beforePhoto }} style={styles.preview} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionTile, afterPhoto && styles.actionTileActive]}
            onPress={() => pickImage(setAfterPhoto)}
          >
            <Ionicons name="camera-reverse" size={18} color={afterPhoto ? '#FFFFFF' : DriverColors.primary} />
            <Text style={[styles.actionLabel, afterPhoto && styles.actionLabelActive]}>
              Photo apr\u00e8s
            </Text>
            <Text style={[styles.actionSub, afterPhoto && styles.actionLabelActive]}>
              {afterPhoto ? 'Ajout\u00e9e' : 'Ajouter'}
            </Text>
            {afterPhoto ? <Image source={{ uri: afterPhoto }} style={styles.preview} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionTile, signature && styles.actionTileActive]}
            onPress={() => setSignatureOpen(true)}
          >
            <Ionicons name="pencil" size={18} color={signature ? '#FFFFFF' : DriverColors.primary} />
            <Text style={[styles.actionLabel, signature && styles.actionLabelActive]}>
              Signature client
            </Text>
            <Text style={[styles.actionSub, signature && styles.actionLabelActive]}>
              {signature ? 'Collect\u00e9e' : 'Collecter'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ratingCard}>
          <Text style={styles.sectionTitle}>Note client</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setRating(value)}>
                <Ionicons
                  name={rating >= value ? 'star' : 'star-outline'}
                  size={20}
                  color={rating >= value ? DriverColors.accent : DriverColors.border}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingHint}>
            {rating ? `${rating}/5 - Merci pour votre retour.` : 'Attribuez une note au client.'}
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => dispatch({ type: 'COMPLETE_JOB', id: job.id })}
          >
            <Text style={styles.primaryButtonText}>Marquer termin\u00e9</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => dispatch({ type: 'CANCEL_JOB', id: job.id })}
          >
            <Text style={styles.cancelText}>Annuler la mission</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={signatureOpen} animationType="slide" onRequestClose={() => setSignatureOpen(false)}>
        <SafeAreaView style={styles.signatureContainer}>
          <View style={styles.signatureHeader}>
            <Text style={styles.signatureTitle}>Signature du client</Text>
            <TouchableOpacity onPress={() => setSignatureOpen(false)}>
              <Ionicons name="close" size={20} color={DriverColors.text} />
            </TouchableOpacity>
          </View>
          <SignatureScreen
            onOK={(sig) => {
              setSignature(sig);
              setSignatureOpen(false);
            }}
            onEmpty={() => setSignatureOpen(false)}
            autoClear
            webStyle={`.m-signature-pad--footer {display: none;}`}
          />
        </SafeAreaView>
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
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: DriverSpacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DriverColors.surface,
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...DriverTypography.title,
  },
  subtitle: {
    fontSize: 13,
    color: DriverColors.muted,
    marginTop: 4,
  },
  card: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.text,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.primary,
  },
  cardMeta: {
    fontSize: 12,
    color: DriverColors.muted,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardText: {
    flex: 1,
    fontSize: 12,
    color: DriverColors.muted,
  },
  timelineCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.lg,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5F5',
  },
  timelineDotActive: {
    backgroundColor: DriverColors.primary,
  },
  timelineText: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  timelineTextActive: {
    color: DriverColors.text,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DriverSpacing.sm,
  },
  sectionTitle: {
    ...DriverTypography.section,
  },
  sectionMeta: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: DriverSpacing.lg,
  },
  actionTile: {
    flexBasis: '48%',
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.md,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    gap: 6,
  },
  actionTileActive: {
    backgroundColor: DriverColors.primary,
    borderColor: DriverColors.primary,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.text,
  },
  actionLabelActive: {
    color: '#FFFFFF',
  },
  actionSub: {
    fontSize: 11,
    color: DriverColors.muted,
  },
  preview: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    marginTop: 8,
  },
  ratingCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.lg,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  ratingHint: {
    fontSize: 11,
    color: DriverColors.muted,
    marginTop: 8,
  },
  footer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: DriverColors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.danger,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: DriverSpacing.lg,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.text,
  },
  signatureContainer: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  signatureHeader: {
    padding: DriverSpacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
  },
  signatureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.text,
  },
});
