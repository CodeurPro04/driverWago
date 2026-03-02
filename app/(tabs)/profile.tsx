import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { ApiError, getUserProfile, updateUserProfile, uploadUserAvatar } from '@/lib/api';

type ProfileTab = 'overview' | 'verification' | 'activity' | 'settings' | 'security';

const TABS: Array<{ id: ProfileTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'overview', label: 'Apercu', icon: 'person-circle-outline' },
  { id: 'verification', label: 'Verification', icon: 'shield-checkmark-outline' },
  { id: 'activity', label: 'Activite', icon: 'briefcase-outline' },
  { id: 'settings', label: 'Parametres', icon: 'settings-outline' },
  { id: 'security', label: 'Securite', icon: 'shield-outline' },
];

const DOC_LABELS: Record<string, string> = {
  id: 'Piece d identite',
  profile: 'Photo de profil',
  license: 'Permis de conduire',
  address: 'Justificatif de domicile',
  certificate: 'Certificat de bonne conduite',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', bio: '' });

  const loadProfile = async () => {
    const driverId = state.driverId;
    if (!driverId) return;
    setLoading(true);
    try {
      const profile = await getUserProfile(driverId);
      setForm({
        firstName: profile.user.first_name || '',
        lastName: profile.user.last_name || '',
        email: profile.user.email || '',
        phone: profile.user.phone || '',
        bio: profile.user.bio || '',
      });
      setAvatarUrl(profile.user.avatar_url || '');
      dispatch({ type: 'SET_DRIVER_NAME', value: profile.user.first_name || profile.user.name || 'Laveur' });
      dispatch({
        type: 'SET_DRIVER_SESSION',
        value: {
          id: profile.user.id,
          name: profile.user.first_name || profile.user.name || 'Laveur',
          phone: profile.user.phone || '',
          isAvailable: Boolean(profile.user.is_available),
          accountStep: Number(profile.user.account_step || 0),
          profileStatus: (profile.user.profile_status || 'pending') as 'pending' | 'approved' | 'rejected',
          documents: (profile.user.documents as Record<string, string | null>) || {},
          documentsStatus: (profile.user.documents_status || 'pending') as 'pending' | 'submitted' | 'approved' | 'rejected',
          rating: Number(profile.user.rating ?? 0),
        },
      });
      dispatch({ type: 'SET_PROFILE_STATUS', value: (profile.user.profile_status || 'pending') as 'pending' | 'approved' | 'rejected' });
      dispatch({ type: 'SET_DOCUMENTS', value: (profile.user.documents as Record<string, string | null>) || {} });
      dispatch({ type: 'SET_DOCUMENTS_STATUS', value: (profile.user.documents_status || 'pending') as 'pending' | 'submitted' | 'approved' | 'rejected' });
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le profil driver.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!state.driverId) return;
    loadProfile().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.driverId]);

  useEffect(() => {
    if (state.profileStatus === 'approved' && activeTab === 'verification') {
      setActiveTab('overview');
    }
  }, [activeTab, state.profileStatus]);

  const onSave = async () => {
    if (!state.driverId) {
      Alert.alert('Session invalide', 'Reconnectez-vous puis reessayez.');
      return;
    }
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
      dispatch({
        type: 'SET_DRIVER_SESSION',
        value: {
          id: state.driverId,
          name: updated.user.first_name || updated.user.name || 'Laveur',
          phone: updated.user.phone || state.driverPhone || '',
          isAvailable: state.availability,
          accountStep: updated.user.account_step ?? state.accountStep,
          profileStatus: (updated.user.profile_status || state.profileStatus) as 'pending' | 'approved' | 'rejected',
          documents: (updated.user.documents as Record<string, string | null>) || state.documents,
          documentsStatus: (updated.user.documents_status || state.documentsStatus) as 'pending' | 'submitted' | 'approved' | 'rejected',
          rating: Number(updated.user.rating ?? state.rating ?? 0),
        },
      });
      Alert.alert('Succes', 'Profil mis a jour.');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Impossible de sauvegarder le profil.';
      Alert.alert('Erreur', message);
    } finally {
      setSaving(false);
    }
  };

  const onPickAvatar = async () => {
    if (!state.driverId) {
      Alert.alert('Session invalide', 'Reconnectez-vous puis reessayez.');
      return;
    }

    const pickFromLibrary = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Autorisation requise', 'Autorisez la galerie pour choisir une photo de profil.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) return;
      try {
        const uploaded = await uploadUserAvatar(state.driverId as number, result.assets[0].uri);
        setAvatarUrl(uploaded.user.avatar_url || '');
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Upload avatar impossible.';
        Alert.alert('Erreur', message);
      }
    };

    const takePhoto = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Autorisation requise', 'Autorisez la camera pour prendre une photo de profil.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) return;
      try {
        const uploaded = await uploadUserAvatar(state.driverId as number, result.assets[0].uri);
        setAvatarUrl(uploaded.user.avatar_url || '');
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Upload avatar impossible.';
        Alert.alert('Erreur', message);
      }
    };

    Alert.alert('Photo de profil', 'Choisissez la source', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Camera', onPress: () => takePhoto() },
      { text: 'Galerie', onPress: () => pickFromLibrary() },
    ]);
  };

  const profileStatusLabel =
    state.profileStatus === 'approved' ? 'Valide' : state.profileStatus === 'rejected' ? 'Refuse' : 'En attente';
  const documentsStatusLabel =
    state.documentsStatus === 'approved'
      ? 'Documents valides'
      : state.documentsStatus === 'submitted'
        ? 'Documents soumis'
        : state.documentsStatus === 'rejected'
          ? 'Documents rejetes'
          : 'Documents en attente';

  const verificationMeta = useMemo(() => {
    if (state.profileStatus === 'approved') {
      return {
        label: 'Compte valide',
        message: 'Votre compte est actif. Vous pouvez recevoir des missions.',
        bg: '#DCFCE7',
        border: '#86EFAC',
        text: '#166534',
      };
    }
    if (state.profileStatus === 'rejected') {
      return {
        label: 'Compte refuse',
        message: 'Votre dossier a ete refuse. Mettez a jour les documents puis resoumettez.',
        bg: '#FEF2F2',
        border: '#FECACA',
        text: '#991B1B',
      };
    }
    return {
      label: 'Verification en attente',
      message: 'Votre dossier est en cours de verification par l administrateur.',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1E3A8A',
    };
  }, [state.profileStatus]);

  const completedJobs = useMemo(() => state.jobs.filter((job) => job.status === 'completed'), [state.jobs]);
  const uploadedDocsCount = useMemo(() => Object.values(state.documents || {}).filter(Boolean).length, [state.documents]);
  const totalDocs = 5;
  const visibleTabs = useMemo(
    () => (state.profileStatus === 'approved' ? TABS.filter((tab) => tab.id !== 'verification') : TABS),
    [state.profileStatus]
  );

  const renderOverview = () => (
    <>
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
          <Text style={styles.profileMeta}>Statut compte: {profileStatusLabel}</Text>
          <Text style={styles.profileMeta}>Disponibilite: {state.availability ? 'En ligne' : 'Hors ligne'}</Text>
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
          <Text style={styles.statLabel}>{state.reviewsCount > 0 ? `Note (${state.reviewsCount} avis)` : 'Note'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        <TextInput style={styles.input} placeholder="Prenom" value={form.firstName} onChangeText={(v) => setForm((p) => ({ ...p, firstName: v }))} />
        <TextInput style={styles.input} placeholder="Nom" value={form.lastName} onChangeText={(v) => setForm((p) => ({ ...p, lastName: v }))} />
        <TextInput style={styles.input} placeholder="Telephone" value={form.phone} keyboardType="phone-pad" onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
        <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
        <TextInput style={styles.bioInput} placeholder="Bio" value={form.bio} multiline onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))} />

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.availabilityBtn, state.profileStatus !== 'approved' && styles.availabilityBtnDisabled]}
            onPress={() => {
              if (state.profileStatus !== 'approved') {
                Alert.alert('Validation requise', 'Votre compte doit etre valide pour changer votre disponibilite.');
                return;
              }
              dispatch({ type: 'TOGGLE_AVAILABILITY' });
            }}
          >
            <Text style={[styles.availabilityText, state.profileStatus !== 'approved' && styles.availabilityTextDisabled]}>
              {state.availability ? 'Passer hors ligne' : 'Passer en ligne'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving || loading}>
            {saving || loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveText}>Enregistrer</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderVerification = () => (
    <>
      <View style={[styles.statusCard, { backgroundColor: verificationMeta.bg, borderColor: verificationMeta.border }]}>
        <View style={styles.statusHeader}>
          <Ionicons name="shield-checkmark" size={18} color={verificationMeta.text} />
          <Text style={[styles.statusTitle, { color: verificationMeta.text }]}>{verificationMeta.label}</Text>
        </View>
        <Text style={[styles.statusBody, { color: verificationMeta.text }]}>{verificationMeta.message}</Text>
        <View style={styles.statusActions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/account/review')}>
            <Text style={styles.secondaryBtnText}>Voir statut dossier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/account/documents')}>
            <Text style={styles.primaryBtnText}>Gerer documents</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Progression documents</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressValue}>
            {uploadedDocsCount}/{totalDocs}
          </Text>
          <Text style={styles.progressLabel}>{documentsStatusLabel}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(uploadedDocsCount / totalDocs) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Liste des documents</Text>
        {Object.keys(DOC_LABELS).map((key) => {
          const uploaded = Boolean(state.documents?.[key]);
          return (
            <View key={key} style={styles.docRow}>
              <Text style={styles.docLabel}>{DOC_LABELS[key]}</Text>
              <Text style={[styles.docValue, uploaded ? styles.docUploaded : styles.docMissing]}>
                {uploaded ? 'Televerse' : 'Manquant'}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );

  const renderActivity = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Commandes terminees</Text>
        {completedJobs.length === 0 ? (
          <Text style={styles.emptyText}>Aucune mission terminee pour le moment.</Text>
        ) : (
          completedJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.orderCard}
              onPress={() => router.push({ pathname: '/job-details', params: { id: job.id } })}
            >
              <View style={styles.orderLeft}>
                <Text style={styles.orderTitle}>{job.customerName}</Text>
                <Text style={styles.orderMeta}>{job.service} - {job.vehicle}</Text>
                <Text style={styles.orderDate}>{job.scheduledAt}</Text>
              </View>
              <Text style={styles.orderPrice}>{job.price.toLocaleString()} F CFA</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Avis clients</Text>
        {state.recentReviews.length === 0 ? (
          <Text style={styles.emptyText}>Aucun avis redige pour le moment.</Text>
        ) : (
          state.recentReviews.map((item) => (
            <View key={`${item.bookingId}-${item.createdAt}`} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewName}>{item.customerName}</Text>
                <View style={styles.reviewRating}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.reviewRatingText}>{item.rating.toFixed(1)}</Text>
                </View>
              </View>
              <Text style={styles.reviewText}>{item.review}</Text>
            </View>
          ))
        )}
      </View>
    </>
  );

  const renderSettings = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Raccourcis</Text>
      <TouchableOpacity style={styles.settingRow} onPress={() => loadProfile().catch(() => undefined)}>
        <View style={styles.settingLeft}>
          <Ionicons name="refresh" size={16} color={DriverColors.primary} />
          <Text style={styles.settingText}>Actualiser le profil</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={DriverColors.muted} />
      </TouchableOpacity>
      {state.profileStatus !== 'approved' ? (
        <>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/account/review')}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={16} color={DriverColors.primary} />
              <Text style={styles.settingText}>Suivi verification</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={DriverColors.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/account/documents')}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={16} color={DriverColors.primary} />
              <Text style={styles.settingText}>Documents</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={DriverColors.muted} />
          </TouchableOpacity>
        </>
      ) : null}
      <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/notifications')}>
        <View style={styles.settingLeft}>
          <Ionicons name="notifications-outline" size={16} color={DriverColors.primary} />
          <Text style={styles.settingText}>Notifications</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={DriverColors.muted} />
      </TouchableOpacity>
    </View>
  );

  const renderSecurity = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Securite du compte</Text>
      <View style={styles.securityRow}>
        <Text style={styles.securityLabel}>Identifiant session</Text>
        <Text style={styles.securityValue}>{state.driverId ? `DRV-${state.driverId}` : '-'}</Text>
      </View>
      <View style={styles.securityRow}>
        <Text style={styles.securityLabel}>Numero connecte</Text>
        <Text style={styles.securityValue}>{state.driverPhone || '-'}</Text>
      </View>
      <View style={styles.securityRow}>
        <Text style={styles.securityLabel}>Version application</Text>
        <Text style={styles.securityValue}>{state.lastSeenAppVersion || '-'}</Text>
      </View>

      <TouchableOpacity
        style={styles.dangerBtn}
        onPress={() =>
          Alert.alert('Deconnexion', 'Voulez-vous vraiment vous deconnecter ?', [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Se deconnecter',
              style: 'destructive',
              onPress: () => {
                dispatch({ type: 'CLEAR_DRIVER_SESSION' });
                router.replace('/account/auth');
              },
            },
          ])
        }
      >
        <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
        <Text style={styles.dangerBtnText}>Se deconnecter</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil laveur</Text>
          <TouchableOpacity style={styles.headerIcon} onPress={() => loadProfile().catch(() => undefined)}>
            <Ionicons name="refresh" size={18} color={DriverColors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {visibleTabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, selected && styles.tabChipActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons name={tab.icon} size={14} color={selected ? '#FFFFFF' : DriverColors.muted} />
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'verification' && renderVerification()}
        {activeTab === 'activity' && renderActivity()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'security' && renderSecurity()}
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
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DriverSpacing.md,
  },
  title: {
    ...DriverTypography.title,
    textTransform: 'capitalize',
  },
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
  tabsRow: {
    gap: DriverSpacing.sm,
    marginBottom: DriverSpacing.md,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: DriverColors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  tabChipActive: {
    backgroundColor: DriverColors.primary,
    borderColor: DriverColors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.muted,
  },
  tabTextActive: {
    color: '#FFFFFF',
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
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: DriverColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.text,
  },
  profileMeta: {
    fontSize: 12,
    color: DriverColors.muted,
    marginTop: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: DriverSpacing.sm,
    marginBottom: DriverSpacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.text,
  },
  statLabel: {
    fontSize: 11,
    color: DriverColors.muted,
  },
  card: {
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    borderColor: DriverColors.border,
    padding: DriverSpacing.md,
    marginBottom: DriverSpacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.text,
    marginBottom: 10,
  },
  input: {
    height: 44,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    color: DriverColors.text,
    marginBottom: 10,
  },
  bioInput: {
    minHeight: 86,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    color: DriverColors.text,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  availabilityBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  availabilityBtnDisabled: {
    backgroundColor: '#F3F4F6',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.primary,
  },
  availabilityTextDisabled: {
    color: DriverColors.muted,
  },
  saveBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: DriverColors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  statusCard: {
    borderRadius: DriverRadius.md,
    borderWidth: 1,
    padding: DriverSpacing.md,
    marginBottom: DriverSpacing.md,
    gap: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusBody: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  statusActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.text,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: DriverColors.primary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '800',
    color: DriverColors.text,
  },
  progressLabel: {
    fontSize: 12,
    color: DriverColors.muted,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: DriverColors.primary,
    borderRadius: 999,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
  },
  docLabel: {
    fontSize: 12,
    color: DriverColors.text,
    fontWeight: '600',
  },
  docValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  docUploaded: {
    color: DriverColors.success,
  },
  docMissing: {
    color: DriverColors.danger,
  },
  emptyText: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  orderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
    gap: 10,
  },
  orderLeft: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
  },
  orderMeta: {
    fontSize: 11,
    color: DriverColors.muted,
    marginTop: 2,
  },
  orderDate: {
    fontSize: 11,
    color: DriverColors.muted,
    marginTop: 3,
  },
  orderPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.text,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
    paddingVertical: 10,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewName: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.text,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  reviewText: {
    fontSize: 12,
    color: DriverColors.muted,
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingText: {
    fontSize: 13,
    fontWeight: '600',
    color: DriverColors.text,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
  },
  securityLabel: {
    fontSize: 12,
    color: DriverColors.muted,
    fontWeight: '600',
  },
  securityValue: {
    fontSize: 12,
    color: DriverColors.text,
    fontWeight: '700',
  },
  dangerBtn: {
    marginTop: DriverSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: DriverColors.danger,
    paddingVertical: 12,
  },
  dangerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
