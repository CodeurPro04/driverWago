import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { getUserProfile, updateUserProfile, uploadUserAvatar } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', bio: '' });

  const loadProfile = useCallback(async () => {
    if (!state.driverId) return;
    setLoading(true);
    try {
      const profile = await getUserProfile(state.driverId);
      setForm({
        firstName: profile.user.first_name || '',
        lastName: profile.user.last_name || '',
        email: profile.user.email || '',
        phone: profile.user.phone || '',
        bio: profile.user.bio || '',
      });
      setAvatarUrl(profile.user.avatar_url || '');
      dispatch({ type: 'SET_DRIVER_NAME', value: profile.user.first_name || profile.user.name || 'Laveur' });
      dispatch({ type: 'SET_PROFILE_STATUS', value: (profile.user.profile_status || 'pending') as any });
      dispatch({ type: 'SET_DOCUMENTS', value: (profile.user.documents as Record<string, string | null>) || {} });
      dispatch({ type: 'SET_DOCUMENTS_STATUS', value: (profile.user.documents_status || 'pending') as any });
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le profil driver.');
    } finally {
      setLoading(false);
    }
  }, [dispatch, state.driverId]);

  useEffect(() => {
    loadProfile().catch(() => undefined);
  }, [loadProfile]);

  const onSave = async () => {
    if (!state.driverId) return;
    setSaving(true);
    try {
      const updated = await updateUserProfile(state.driverId, {
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        bio: form.bio,
        is_available: state.availability,
      });
      dispatch({ type: 'SET_DRIVER_NAME', value: updated.user.first_name || updated.user.name || 'Laveur' });
      Alert.alert('Succes', 'Profil mis a jour.');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil.');
    } finally {
      setSaving(false);
    }
  };

  const completedJobs = state.jobs.filter((job) => job.status === 'completed');
  const profileStatusLabel = state.profileStatus === 'approved'
    ? 'Valide'
    : state.profileStatus === 'rejected'
      ? 'Rejete'
      : 'En attente';
  const documentsStatusLabel = state.documentsStatus === 'approved'
    ? 'Documents valides'
    : state.documentsStatus === 'submitted'
      ? 'Documents soumis'
      : state.documentsStatus === 'rejected'
        ? 'Documents rejetes'
        : 'Documents en attente';
  const documentEntries = Object.entries(state.documents || {});
  const documentLabels: Record<string, string> = {
    id: 'Piece d identite',
    profile: 'Photo de profil',
    license: 'Permis de conduire',
    address: 'Justificatif de domicile',
    certificate: 'Certificat de bonne conduite',
  };

  const onPickAvatar = async () => {
    if (!state.driverId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    try {
      const uploaded = await uploadUserAvatar(state.driverId, result.assets[0].uri);
      setAvatarUrl(uploaded.user.avatar_url || '');
    } catch {
      Alert.alert('Erreur', 'Upload avatar impossible.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil Driver</Text>
          <TouchableOpacity style={styles.headerIcon} onPress={() => loadProfile().catch(() => undefined)}>
            <Ionicons name="refresh" size={18} color={DriverColors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatar} onPress={onPickAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{(form.firstName || state.driverName || 'L').charAt(0).toUpperCase()}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{`${form.firstName} ${form.lastName}`.trim() || state.driverName}</Text>
            <Text style={styles.profileMeta}>Statut: {profileStatusLabel}</Text>
            <Text style={styles.profileMeta}>Disponibilite: {state.availability ? 'En ligne' : 'Hors ligne'}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <TextInput style={styles.input} placeholder="Prenom" value={form.firstName} onChangeText={(v) => setForm((p) => ({ ...p, firstName: v }))} />
          <TextInput style={styles.input} placeholder="Nom" value={form.lastName} onChangeText={(v) => setForm((p) => ({ ...p, lastName: v }))} />
          <TextInput style={styles.input} placeholder="Telephone" value={form.phone} keyboardType="phone-pad" onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
          <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
          <TextInput style={styles.bioInput} placeholder="Bio" value={form.bio} multiline onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))} />

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.availabilityBtn} onPress={() => dispatch({ type: 'TOGGLE_AVAILABILITY' })}>
              <Text style={styles.availabilityText}>{state.availability ? 'Passer hors ligne' : 'Passer en ligne'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving || loading}>
              {saving || loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveText}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.jobs.length}</Text>
            <Text style={styles.statLabel}>Missions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.cashoutBalance.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Solde</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Note</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <TouchableOpacity onPress={() => router.push('/account/documents')}>
              <Text style={styles.linkText}>Gerer</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.profileMeta}>{documentsStatusLabel}</Text>
          <View style={styles.documentsList}>
            {documentEntries.length === 0 ? (
              <Text style={styles.emptyListText}>Aucun document enregistre.</Text>
            ) : (
              documentEntries.map(([key, value]) => (
                <View key={key} style={styles.docRow}>
                  <Text style={styles.docLabel}>{documentLabels[key] || key}</Text>
                  <Text style={[styles.docValue, value ? styles.docUploaded : styles.docMissing]}>
                    {value ? 'Televerse' : 'Manquant'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Commandes effectuees</Text>
          {completedJobs.length === 0 ? (
            <Text style={styles.emptyListText}>Aucune mission terminee pour le moment.</Text>
          ) : (
            completedJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.orderCard}
                onPress={() => router.push({ pathname: '/job-details', params: { id: job.id } })}
              >
                <View>
                  <Text style={styles.orderTitle}>{job.customerName}</Text>
                  <Text style={styles.orderMeta}>{job.service} • {job.vehicle}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderPrice}>{job.price.toLocaleString()} F CFA</Text>
                  <Text style={styles.orderDate}>{job.scheduledAt}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DriverColors.background },
  content: { padding: DriverSpacing.lg, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DriverSpacing.lg },
  title: { ...DriverTypography.title },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DriverColors.surface,
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    gap: DriverSpacing.md,
    alignItems: 'center',
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.lg,
    padding: DriverSpacing.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    marginBottom: DriverSpacing.md,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: DriverColors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: DriverColors.text },
  profileMeta: { fontSize: 12, color: DriverColors.muted, marginTop: 3 },
  formCard: { backgroundColor: DriverColors.surface, borderRadius: DriverRadius.md, borderWidth: 1, borderColor: DriverColors.border, padding: DriverSpacing.md, marginBottom: DriverSpacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: DriverColors.text, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  linkText: { fontSize: 12, color: DriverColors.primary, fontWeight: '700' },
  input: { height: 44, borderRadius: DriverRadius.md, backgroundColor: '#F3F4F6', paddingHorizontal: 12, color: DriverColors.text, marginBottom: 10 },
  bioInput: { minHeight: 80, borderRadius: DriverRadius.md, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top', color: DriverColors.text, marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  availabilityBtn: { flex: 1, borderRadius: 999, borderWidth: 1, borderColor: DriverColors.border, backgroundColor: '#FFFFFF', paddingVertical: 12, alignItems: 'center' },
  availabilityText: { fontSize: 12, fontWeight: '700', color: DriverColors.primary },
  saveBtn: { flex: 1, borderRadius: 999, backgroundColor: DriverColors.primary, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  statsRow: { flexDirection: 'row', gap: DriverSpacing.sm },
  statCard: { flex: 1, backgroundColor: DriverColors.surface, borderRadius: DriverRadius.md, padding: DriverSpacing.md, borderWidth: 1, borderColor: DriverColors.border, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: DriverColors.text },
  statLabel: { fontSize: 11, color: DriverColors.muted },
  documentsList: { gap: 8, marginTop: 10 },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
  },
  docLabel: { fontSize: 12, color: DriverColors.text, fontWeight: '600' },
  docValue: { fontSize: 11, fontWeight: '700' },
  docUploaded: { color: DriverColors.success },
  docMissing: { color: DriverColors.danger },
  emptyListText: { fontSize: 12, color: DriverColors.muted },
  orderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
  },
  orderTitle: { fontSize: 13, fontWeight: '700', color: DriverColors.text },
  orderMeta: { fontSize: 11, color: DriverColors.muted, marginTop: 2 },
  orderRight: { alignItems: 'flex-end' },
  orderPrice: { fontSize: 12, fontWeight: '700', color: DriverColors.text },
  orderDate: { fontSize: 11, color: DriverColors.muted, marginTop: 2 },
});
