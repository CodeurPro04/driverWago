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
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { DriverColors, DriverRadius, DriverSpacing, DriverTypography } from '@/constants/driverTheme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { ApiError, getUserProfile, updateUserProfile, uploadUserAvatar } from '@/lib/api';
import { driverVehicleLabels, driverWashLabels, getDriverDocumentItems } from '@/lib/driverAccount';
import { authenticateWithBiometrics, canUseBiometrics, canUseFaceId, getBiometricLabel } from '@/lib/biometrics';
import { getDriverPalette } from '@/lib/driverAppearance';

type ProfileTab = 'overview' | 'verification' | 'activity' | 'settings' | 'security';

const TABS: { id: ProfileTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
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
  trade_register: 'Registre du commerce',
  manager_id: 'Piece d identite du gerant',
  manager_photo: 'Photo du gerant',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { state, dispatch } = useDriverStore();
  const palette = getDriverPalette(useColorScheme());
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    managerName: '',
    email: '',
    phone: '',
    bio: '',
  });

  const loadProfile = async () => {
    const driverId = state.driverId;
    if (!driverId) return;
    setLoading(true);
    try {
      const profile = await getUserProfile(driverId);
      setForm({
        firstName: profile.user.first_name || '',
        lastName: profile.user.last_name || '',
        companyName: profile.user.company_name || '',
        managerName: profile.user.manager_name || '',
        email: profile.user.email || '',
        phone: profile.user.phone || '',
        bio: profile.user.bio || '',
      });
      setAvatarUrl(profile.user.avatar_url || '');
      dispatch({ type: 'SET_DRIVER_NAME', value: profile.user.company_name || profile.user.first_name || profile.user.name || 'Laveur' });
      dispatch({
        type: 'SET_DRIVER_SESSION',
        value: {
          id: profile.user.id,
          name: profile.user.company_name || profile.user.first_name || profile.user.name || 'Laveur',
          phone: profile.user.phone || '',
          isAvailable: Boolean(profile.user.is_available),
          accountType: profile.user.driver_account_type || state.driverAccountType,
          companyName: profile.user.company_name || '',
          managerName: profile.user.manager_name || '',
          accountStep: Number(profile.user.account_step || 0),
          profileStatus: (profile.user.profile_status || 'pending') as 'pending' | 'approved' | 'rejected',
          documents: (profile.user.documents as Record<string, string | null>) || {},
          documentsStatus: (profile.user.documents_status || 'pending') as 'pending' | 'submitted' | 'approved' | 'rejected',
          pricing: profile.user.pricing || state.pricing,
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
        first_name: state.driverAccountType === 'company' ? '' : form.firstName,
        last_name: state.driverAccountType === 'company' ? '' : form.lastName,
        company_name: state.driverAccountType === 'company' ? form.companyName : '',
        manager_name: state.driverAccountType === 'company' ? form.managerName : '',
        email: form.email,
        phone: form.phone,
        bio: form.bio,
        is_available: state.availability,
      });
      dispatch({ type: 'SET_DRIVER_NAME', value: updated.user.company_name || updated.user.first_name || updated.user.name || 'Laveur' });
      dispatch({
        type: 'SET_DRIVER_SESSION',
        value: {
          id: state.driverId,
          name: updated.user.company_name || updated.user.first_name || updated.user.name || 'Laveur',
          phone: updated.user.phone || state.driverPhone || '',
          isAvailable: state.availability,
          accountType: updated.user.driver_account_type || state.driverAccountType,
          companyName: updated.user.company_name || state.companyName,
          managerName: updated.user.manager_name || state.managerName,
          accountStep: updated.user.account_step ?? state.accountStep,
          profileStatus: (updated.user.profile_status || state.profileStatus) as 'pending' | 'approved' | 'rejected',
          documents: (updated.user.documents as Record<string, string | null>) || state.documents,
          documentsStatus: (updated.user.documents_status || state.documentsStatus) as 'pending' | 'submitted' | 'approved' | 'rejected',
          pricing: updated.user.pricing || state.pricing,
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
  const isCompany = state.driverAccountType === 'company';
  const requiredDocuments = useMemo(() => getDriverDocumentItems(state.driverAccountType), [state.driverAccountType]);
  const uploadedDocsCount = useMemo(
    () => requiredDocuments.filter((doc) => Boolean(state.documents?.[doc.id])).length,
    [requiredDocuments, state.documents]
  );
  const totalDocs = requiredDocuments.length;
  const pricingRows = useMemo(
    () =>
      Object.entries(state.pricing || {}).map(([vehicle, services]) => ({
        vehicle,
        services: Object.entries(services || {}),
      })),
    [state.pricing]
  );
  const visibleTabs = useMemo(
    () => (state.profileStatus === 'approved' ? TABS.filter((tab) => tab.id !== 'verification') : TABS),
    [state.profileStatus]
  );
  const themed = {
    container: { backgroundColor: palette.background },
    title: { color: palette.text },
    headerIcon: { backgroundColor: palette.iconButton, borderColor: palette.border },
    tabChip: { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
    tabText: { color: palette.textMuted },
    card: { backgroundColor: palette.surface, borderColor: palette.border },
    subtleCard: { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
    input: { backgroundColor: palette.input, borderColor: palette.border, color: palette.text },
    primaryText: { color: palette.text },
    mutedText: { color: palette.textMuted },
    softDivider: { borderColor: palette.border },
    track: { backgroundColor: palette.border },
    secondaryButton: { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
    availabilityButton: { backgroundColor: palette.surface, borderColor: palette.border },
    disabledButton: { backgroundColor: palette.surfaceMuted },
  };

  const renderOverview = () => (
    <>
      <View style={[styles.profileCard, themed.card]}>
        <TouchableOpacity style={styles.avatar} onPress={onPickAvatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} onError={() => setAvatarUrl('')} />
          ) : (
            <Text style={styles.avatarText}>
              {(isCompany ? form.companyName || state.companyName : form.firstName || state.driverName || 'L').charAt(0).toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, themed.primaryText]}>
            {isCompany
              ? form.companyName.trim() || state.companyName || state.driverName
              : `${form.firstName} ${form.lastName}`.trim() || state.driverName}
          </Text>
          <Text style={[styles.profileMeta, themed.mutedText]}>Statut compte: {profileStatusLabel}</Text>
          <Text style={[styles.profileMeta, themed.mutedText]}>Type de compte: {isCompany ? 'Entreprise' : 'Laveur independant'}</Text>
          {isCompany ? <Text style={[styles.profileMeta, themed.mutedText]}>Gerant: {form.managerName.trim() || state.managerName || '-'}</Text> : null}
          <Text style={[styles.profileMeta, themed.mutedText]}>Disponibilite: {state.availability ? 'En ligne' : 'Hors ligne'}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, themed.card]}>
          <Text style={[styles.statValue, themed.primaryText]}>{state.jobs.length}</Text>
          <Text style={[styles.statLabel, themed.mutedText]}>Missions</Text>
        </View>
        <View style={[styles.statCard, themed.card]}>
          <Text style={[styles.statValue, themed.primaryText]}>{state.cashoutBalance.toLocaleString()}</Text>
          <Text style={[styles.statLabel, themed.mutedText]}>Solde</Text>
        </View>
        <View style={[styles.statCard, themed.card]}>
          <Text style={[styles.statValue, themed.primaryText]}>{state.rating.toFixed(1)}</Text>
          <Text style={[styles.statLabel, themed.mutedText]}>{state.reviewsCount > 0 ? `Note (${state.reviewsCount} avis)` : 'Note'}</Text>
        </View>
      </View>

      <View style={[styles.card, themed.card]}>
        <Text style={[styles.sectionTitle, themed.primaryText]}>{isCompany ? 'Informations entreprise' : 'Informations personnelles'}</Text>
        {isCompany ? (
          <>
            <TextInput style={[styles.input, themed.input]} placeholder="Nom de l entreprise" placeholderTextColor={palette.textMuted} value={form.companyName} onChangeText={(v) => setForm((p) => ({ ...p, companyName: v }))} />
            <TextInput style={[styles.input, themed.input]} placeholder="Nom du gerant" placeholderTextColor={palette.textMuted} value={form.managerName} onChangeText={(v) => setForm((p) => ({ ...p, managerName: v }))} />
          </>
        ) : (
          <>
            <TextInput style={[styles.input, themed.input]} placeholder="Prenom" placeholderTextColor={palette.textMuted} value={form.firstName} onChangeText={(v) => setForm((p) => ({ ...p, firstName: v }))} />
            <TextInput style={[styles.input, themed.input]} placeholder="Nom" placeholderTextColor={palette.textMuted} value={form.lastName} onChangeText={(v) => setForm((p) => ({ ...p, lastName: v }))} />
          </>
        )}
        <TextInput style={[styles.input, themed.input]} placeholder="Telephone" placeholderTextColor={palette.textMuted} value={form.phone} keyboardType="phone-pad" onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
        <TextInput style={[styles.input, themed.input]} placeholder="Email" placeholderTextColor={palette.textMuted} value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
        <TextInput style={[styles.bioInput, themed.input]} placeholder="Bio" placeholderTextColor={palette.textMuted} value={form.bio} multiline onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))} />

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.availabilityBtn, themed.availabilityButton, state.profileStatus !== 'approved' && styles.availabilityBtnDisabled, state.profileStatus !== 'approved' && themed.disabledButton]}
            onPress={() => {
              if (state.profileStatus !== 'approved') {
                Alert.alert('Validation requise', 'Votre compte doit etre valide pour changer votre disponibilite.');
                return;
              }
              dispatch({ type: 'TOGGLE_AVAILABILITY' });
            }}
          >
            <Text style={[styles.availabilityText, state.profileStatus !== 'approved' && styles.availabilityTextDisabled, state.profileStatus === 'approved' ? null : themed.mutedText]}>
              {state.availability ? 'Passer hors ligne' : 'Passer en ligne'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving || loading}>
            {saving || loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveText}>Enregistrer</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, themed.card]}>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, themed.primaryText]}>Tarifs</Text>
          <TouchableOpacity onPress={() => router.push('/account/pricing')}>
            <Text style={styles.inlineLinkText}>Modifier</Text>
          </TouchableOpacity>
        </View>
        {pricingRows.map((row) => (
          <View key={row.vehicle} style={styles.pricingBlock}>
            <Text style={[styles.pricingVehicle, themed.primaryText]}>{driverVehicleLabels[row.vehicle as keyof typeof driverVehicleLabels] || row.vehicle}</Text>
            {row.services.map(([service, price]) => (
              <View key={`${row.vehicle}-${service}`} style={styles.pricingRow}>
                <Text style={[styles.pricingLabel, themed.mutedText]}>{driverWashLabels[service as keyof typeof driverWashLabels] || service}</Text>
                <Text style={[styles.pricingValue, themed.primaryText]}>
                  {typeof price === 'number' && price > 0 ? `${price.toLocaleString()} F CFA` : 'Non defini'}
                </Text>
              </View>
            ))}
          </View>
        ))}
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
          <TouchableOpacity style={[styles.secondaryBtn, themed.secondaryButton]} onPress={() => router.push('/account/review')}>
            <Text style={[styles.secondaryBtnText, themed.primaryText]}>Voir statut dossier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/account/documents')}>
            <Text style={styles.primaryBtnText}>{isCompany ? 'Gerer dossier entreprise' : 'Gerer documents'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, themed.card]}>
        <Text style={[styles.sectionTitle, themed.primaryText]}>Progression documents</Text>
        <View style={styles.progressRow}>
          <Text style={[styles.progressValue, themed.primaryText]}>
            {uploadedDocsCount}/{totalDocs}
          </Text>
          <Text style={[styles.progressLabel, themed.mutedText]}>{documentsStatusLabel}</Text>
        </View>
        <View style={[styles.progressTrack, themed.track]}>
          <View style={[styles.progressFill, { width: `${(uploadedDocsCount / totalDocs) * 100}%` }]} />
        </View>
      </View>

      <View style={[styles.card, themed.card]}>
        <Text style={[styles.sectionTitle, themed.primaryText]}>Liste des documents</Text>
        {requiredDocuments.map((doc) => {
          const uploaded = Boolean(state.documents?.[doc.id]);
          return (
            <View key={doc.id} style={[styles.docRow, themed.softDivider]}>
              <Text style={[styles.docLabel, themed.primaryText]}>{DOC_LABELS[doc.id] || doc.title}</Text>
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
      <View style={[styles.card, themed.card]}>
        <Text style={[styles.sectionTitle, themed.primaryText]}>Commandes terminees</Text>
        {completedJobs.length === 0 ? (
          <Text style={[styles.emptyText, themed.mutedText]}>Aucune mission terminee pour le moment.</Text>
        ) : (
          completedJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={[styles.orderCard, themed.softDivider]}
              onPress={() => router.push({ pathname: '/job-details', params: { id: job.id } })}
            >
              <View style={styles.orderLeft}>
                <Text style={[styles.orderTitle, themed.primaryText]}>{job.customerName}</Text>
                <Text style={[styles.orderMeta, themed.mutedText]}>{job.service} - {job.vehicle}</Text>
                <Text style={[styles.orderDate, themed.mutedText]}>{job.scheduledAt}</Text>
              </View>
              <Text style={[styles.orderPrice, themed.primaryText]}>{job.price.toLocaleString()} F CFA</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={[styles.card, themed.card]}>
        <Text style={[styles.sectionTitle, themed.primaryText]}>Avis clients</Text>
        {state.recentReviews.length === 0 ? (
          <Text style={[styles.emptyText, themed.mutedText]}>Aucun avis redige pour le moment.</Text>
        ) : (
          state.recentReviews.map((item) => (
            <View key={`${item.bookingId}-${item.createdAt}`} style={[styles.reviewItem, themed.softDivider]}>
              <View style={styles.reviewHeader}>
                <Text style={[styles.reviewName, themed.primaryText]}>{item.customerName}</Text>
                <View style={styles.reviewRating}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.reviewRatingText}>{item.rating.toFixed(1)}</Text>
                </View>
              </View>
              <Text style={[styles.reviewText, themed.mutedText]}>{item.review}</Text>
            </View>
          ))
        )}
      </View>
    </>
  );

  const renderSettings = () => (
    <View style={[styles.card, themed.card]}>
      <Text style={[styles.sectionTitle, themed.primaryText]}>Raccourcis</Text>
      <TouchableOpacity style={[styles.settingRow, themed.softDivider]} onPress={() => loadProfile().catch(() => undefined)}>
        <View style={styles.settingLeft}>
          <Ionicons name="refresh" size={16} color={DriverColors.primary} />
          <Text style={[styles.settingText, themed.primaryText]}>Actualiser le profil</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
      </TouchableOpacity>
      {state.profileStatus !== 'approved' ? (
        <>
          <TouchableOpacity style={[styles.settingRow, themed.softDivider]} onPress={() => router.push('/account/review')}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={16} color={DriverColors.primary} />
              <Text style={[styles.settingText, themed.primaryText]}>Suivi verification</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, themed.softDivider]} onPress={() => router.push('/account/documents')}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={16} color={DriverColors.primary} />
              <Text style={[styles.settingText, themed.primaryText]}>{isCompany ? 'Documents entreprise' : 'Documents'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, themed.softDivider]} onPress={() => router.push('/account/pricing')}>
            <View style={styles.settingLeft}>
              <Ionicons name="cash-outline" size={16} color={DriverColors.primary} />
              <Text style={[styles.settingText, themed.primaryText]}>Tarifs</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
          </TouchableOpacity>
        </>
      ) : null}
      <TouchableOpacity style={[styles.settingRow, themed.softDivider]} onPress={() => router.push('/notifications')}>
        <View style={styles.settingLeft}>
          <Ionicons name="notifications-outline" size={16} color={DriverColors.primary} />
          <Text style={[styles.settingText, themed.primaryText]}>Notifications</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const renderSecurity = () => (
    <View style={[styles.card, themed.card]}>
      <Text style={[styles.sectionTitle, themed.primaryText]}>Securite du compte</Text>
      <View style={styles.securityToggleRow}>
        <View style={styles.securityToggleCopy}>
          <Text style={[styles.securityToggleTitle, themed.primaryText]}>Connexion biométrique</Text>
          <Text style={[styles.securityToggleHint, themed.mutedText]}>
            {Platform.OS === 'ios'
              ? 'Utilisez Face ID pour proteger l acces a l application.'
              : 'Utilisez la biometrie de l appareil pour proteger l acces a l application.'}
          </Text>
        </View>
        <Switch
          value={state.biometricEnabled}
          trackColor={{ false: palette.border, true: palette.primaryBorder }}
          thumbColor={state.biometricEnabled ? DriverColors.primary : palette.surface}
          onValueChange={async (nextValue) => {
            if (!nextValue) {
              dispatch({ type: 'SET_BIOMETRIC_ENABLED', value: false });
              return;
            }

            try {
              if (!(await canUseBiometrics())) {
                Alert.alert('Biometrie indisponible', 'Aucune biometrie n est configuree sur cet appareil.');
                return;
              }

              if (Platform.OS === 'ios' && !(await canUseFaceId())) {
                Alert.alert('Face ID indisponible', 'Face ID n est pas configure sur cet iPhone.');
                return;
              }

              const label = await getBiometricLabel();
              const success = await authenticateWithBiometrics(`Activer ${label}`);
              if (!success) {
                Alert.alert('Activation annulee', `${label} n a pas ete valide.`);
                return;
              }

              dispatch({ type: 'SET_BIOMETRIC_ENABLED', value: true });
            } catch {
              Alert.alert('Erreur', 'Impossible d activer la securite biométrique.');
            }
          }}
        />
      </View>
      <View style={[styles.securityRow, themed.softDivider]}>
        <Text style={[styles.securityLabel, themed.mutedText]}>Identifiant session</Text>
        <Text style={[styles.securityValue, themed.primaryText]}>{state.driverId ? `DRV-${state.driverId}` : '-'}</Text>
      </View>
      <View style={[styles.securityRow, themed.softDivider]}>
        <Text style={[styles.securityLabel, themed.mutedText]}>Numero connecte</Text>
        <Text style={[styles.securityValue, themed.primaryText]}>{state.driverPhone || '-'}</Text>
      </View>
      <View style={[styles.securityRow, themed.softDivider]}>
        <Text style={[styles.securityLabel, themed.mutedText]}>Version application</Text>
        <Text style={[styles.securityValue, themed.primaryText]}>{state.lastSeenAppVersion || '-'}</Text>
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
    <SafeAreaView style={[styles.container, themed.container]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, themed.title]}>Profil laveur</Text>
          <TouchableOpacity style={[styles.headerIcon, themed.headerIcon]} onPress={() => loadProfile().catch(() => undefined)}>
            <Ionicons name="refresh" size={18} color={DriverColors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {visibleTabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, themed.tabChip, selected && styles.tabChipActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons name={tab.icon} size={14} color={selected ? '#FFFFFF' : palette.textMuted} />
                <Text style={[styles.tabText, themed.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
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
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inlineLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.primary,
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
  pricingBlock: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2F0',
    paddingTop: 10,
    marginTop: 10,
  },
  pricingVehicle: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
    marginBottom: 6,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pricingLabel: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  pricingValue: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.text,
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
  securityToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 12,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
  },
  securityToggleCopy: {
    flex: 1,
    gap: 4,
  },
  securityToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.text,
  },
  securityToggleHint: {
    fontSize: 11,
    lineHeight: 16,
    color: DriverColors.muted,
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
