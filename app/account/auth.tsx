import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverSpacing } from '@/constants/driverTheme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { DriverAccountType } from '@/lib/driverAccount';
import { ApiError, loginWithEmail, registerWithEmail } from '@/lib/api';

type AuthMode = 'login' | 'register';

type RegisterField = {
  key: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad';
  withPhonePrefix?: boolean;
  hint?: string;
};

const MAX_FAILS = 5;
const LOCK_SECONDS = 180;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

const validateStrongPassword = (value: string) => {
  const password = value.trim();
  if (password.length < 8) return '8 caracteres minimum';
  if (!/[A-Z]/.test(password)) return '1 majuscule requise';
  if (!/[a-z]/.test(password)) return '1 minuscule requise';
  if (!/\d/.test(password)) return '1 chiffre requis';
  return null;
};

const normalizePhoneDigits = (value: string) => value.replace(/\D/g, '').slice(0, 10);
const isValidIvorianPhone = (value: string) => /^(01|05|07)\d{8}$/.test(value);

const getPostAuthRoute = (user: {
  account_step?: number;
  profile_status?: string;
  documents_status?: string;
}): '/(tabs)' | '/account/profile' | '/account/location' | '/account/legal' | '/account/documents' | '/account/pricing' | '/account/review' => {
  const step = Number(user.account_step || 0);
  const profileStatus = user.profile_status || 'pending';
  const documentsStatus = user.documents_status || 'pending';

  if ((profileStatus === 'approved' && step >= 8) || (documentsStatus === 'submitted' && step >= 7)) return '/(tabs)';
  if (step <= 2) return '/account/profile';
  if (step === 3) return '/account/location';
  if (step === 4) return '/account/legal';
  if (step === 5) return '/account/documents';
  if (step === 6) return '/account/pricing';
  return '/account/review';
};

export default function DriverAuthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { dispatch, refreshJobsNow } = useDriverStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [accountType, setAccountType] = useState<DriverAccountType>('independent');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const lockRemaining = isLocked ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  const isCompany = accountType === 'company';

  const registerFields = useMemo<RegisterField[]>(() => {
    const phoneField: RegisterField = {
      key: 'phone',
      placeholder: '07 12 34 56 78',
      value: phone,
      onChangeText: (value) => setPhone(normalizePhoneDigits(value)),
      keyboardType: 'phone-pad',
      withPhonePrefix: true,
    };

    if (isCompany) {
      return [
        {
          key: 'company_name',
          placeholder: "Nom de l entreprise",
          value: companyName,
          onChangeText: setCompanyName,
        },
        phoneField,
      ];
    }

    return [
      {
        key: 'first_name',
        placeholder: 'Prenom',
        value: firstName,
        onChangeText: setFirstName,
      },
      {
        key: 'last_name',
        placeholder: 'Nom',
        value: lastName,
        onChangeText: setLastName,
      },
      phoneField,
    ];
  }, [companyName, firstName, isCompany, lastName, phone]);

  const canSubmit = useMemo(() => {
    if (loading || isLocked) return false;
    if (!isValidEmail(email)) return false;
    if (!password) return false;
    if (mode === 'register' && password !== confirmPassword) return false;
    if (mode === 'register' && isCompany && !companyName.trim()) return false;
    if (mode === 'register' && !isCompany && (!firstName.trim() || !lastName.trim())) return false;
    if (mode === 'register' && !isValidIvorianPhone(phone)) return false;
    return true;
  }, [loading, isLocked, email, password, mode, confirmPassword, isCompany, companyName, firstName, lastName, phone]);

  const applyDriverSession = async (session: any) => {
    const user = session.user;
    dispatch({
      type: 'SET_DRIVER_SESSION',
      value: {
        id: user.id,
        name: user.first_name || user.company_name || user.name || 'Laveur',
        phone: user.phone || '',
        isAvailable: Boolean(user.is_available),
        accountType: user.driver_account_type || 'independent',
        companyName: user.company_name || '',
        managerName: user.manager_name || '',
        accountStep: user.account_step ?? 0,
        profileStatus: (user.profile_status || 'pending') as 'pending' | 'approved' | 'rejected',
        documents: (user.documents as Record<string, string | null>) || {},
        documentsStatus: (user.documents_status || 'pending') as 'pending' | 'submitted' | 'approved' | 'rejected',
        pricing: user.pricing || undefined,
        rating: Number(user.rating ?? 0),
      },
    });
    dispatch({ type: 'SET_ACCOUNT_STEP', value: user.account_step ?? 0 });
    dispatch({ type: 'SET_ONBOARDING_DONE', value: true });
    router.replace(getPostAuthRoute(user));
    refreshJobsNow(user.id).catch(() => undefined);
  };

  const handleEmailSubmit = async () => {
    if (!canSubmit) return;

    if (mode === 'register') {
      const passwordError = validateStrongPassword(password);
      if (passwordError) {
        Alert.alert('Mot de passe faible', passwordError);
        return;
      }
      if (!isValidIvorianPhone(phone)) {
        Alert.alert('Telephone invalide', 'Entrez un numero ivoirien de 10 chiffres commencant par 01, 05 ou 07.');
        return;
      }
    }

    setLoading(true);
    try {
      const session =
        mode === 'login'
          ? await loginWithEmail({ email: email.trim().toLowerCase(), password, role: 'driver' })
          : await registerWithEmail({
              first_name: isCompany ? undefined : firstName.trim(),
              last_name: isCompany ? undefined : lastName.trim(),
              company_name: isCompany ? companyName.trim() : undefined,
              email: email.trim().toLowerCase(),
              password,
              phone,
              role: 'driver',
              driver_account_type: accountType,
            });

      await applyDriverSession(session);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          const attempts = failedAttempts + 1;
          setFailedAttempts(attempts);
          if (attempts >= MAX_FAILS) {
            setLockedUntil(Date.now() + LOCK_SECONDS * 1000);
            Alert.alert('Compte temporairement bloque', `Trop d erreurs. Reessayez dans ${LOCK_SECONDS} secondes.`);
            return;
          }
          Alert.alert('Connexion refusee', `Identifiants invalides. Tentatives restantes: ${MAX_FAILS - attempts}.`);
          return;
        }
        Alert.alert('Erreur', error.message || 'Impossible de finaliser la connexion.');
        return;
      }

      const message = error instanceof Error && error.message ? error.message : 'Connexion au backend impossible.';
      Alert.alert('Erreur reseau', message);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: RegisterField) => {
    if (field.withPhonePrefix) {
      return (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, isDark && styles.textWhite]}>Telephone</Text>
          <View style={styles.phoneRow}>
            <View style={[styles.countryPrefix, isDark && styles.inputDark]}>
              <Text style={[styles.countryPrefixText, isDark && styles.textWhite]}>+225</Text>
            </View>
            <TextInput
              style={[styles.phoneInput, isDark && styles.inputDark]}
              placeholder={field.placeholder}
              placeholderTextColor={DriverColors.muted}
              keyboardType={field.keyboardType}
              value={field.value}
              onChangeText={field.onChangeText}
              maxLength={10}
            />
          </View>
          {field.hint ? <Text style={[styles.phoneHint, isDark && styles.textMutedDark]}>{field.hint}</Text> : null}
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, isDark && styles.textWhite]}>{field.placeholder}</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder={field.placeholder}
          placeholderTextColor={DriverColors.muted}
          value={field.value}
          onChangeText={field.onChangeText}
          keyboardType={field.keyboardType}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, isDark && styles.heroDark]}>
            <View style={styles.heroGlowLarge} />
            <View style={styles.heroGlowSmall} />
            <View style={styles.heroBadge}>
              <Ionicons name="car-sport-outline" size={16} color="#D7F7E7" />
              <Text style={styles.heroBadgeText}>ZIWAGO</Text>
            </View>
            <Text style={styles.heroTitle}>Votre espace chauffeur, plus clair et plus rapide.</Text>
            <Text style={styles.heroSubtitle}>
              Connectez-vous ou creez un compte professionnel en tant que laveur independant ou entreprise.
            </Text>
          </View>

          <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={[styles.modeRow, isDark && styles.modeRowDark]}>
              <TouchableOpacity style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]} onPress={() => setMode('login')}>
                <Text style={[styles.modeText, isDark && styles.modeTextDark, mode === 'login' && styles.modeTextActive]}>Connexion</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]} onPress={() => setMode('register')}>
                <Text style={[styles.modeText, isDark && styles.modeTextDark, mode === 'register' && styles.modeTextActive]}>Inscription</Text>
              </TouchableOpacity>
            </View>

            {mode === 'register' ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Type de compte</Text>
                  <Text style={[styles.sectionHint, isDark && styles.textMutedDark]}>Choisissez le profil adapte a votre activite.</Text>
                </View>

                <View style={styles.accountTypeRow}>
                  <TouchableOpacity
                    style={[styles.accountTypeButton, isDark && styles.accountTypeButtonDark, !isCompany && styles.accountTypeButtonActive]}
                    onPress={() => setAccountType('independent')}
                  >
                    <Ionicons name="person-outline" size={18} color={!isCompany ? DriverColors.primary : DriverColors.muted} />
                    <Text style={[styles.accountTypeTitle, isDark && styles.textWhite, !isCompany && styles.accountTypeTitleActive]}>Independant</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.accountTypeButton, isDark && styles.accountTypeButtonDark, isCompany && styles.accountTypeButtonActive]}
                    onPress={() => setAccountType('company')}
                  >
                    <Ionicons name="business-outline" size={18} color={isCompany ? DriverColors.primary : DriverColors.muted} />
                    <Text style={[styles.accountTypeTitle, isDark && styles.textWhite, isCompany && styles.accountTypeTitleActive]}>Entreprise</Text>
                  </TouchableOpacity>
                </View>
                {registerFields.map(renderField)}
              </>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>{mode === 'login' ? 'Acces au compte' : 'Identifiants du compte'}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.textWhite]}>Adresse email</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="nom@exemple.com"
                placeholderTextColor={DriverColors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.textWhite]}>Mot de passe</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Mot de passe"
                placeholderTextColor={DriverColors.muted}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {mode === 'register' ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isDark && styles.textWhite]}>Confirmation</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor={DriverColors.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            ) : null}

            {isLocked ? <Text style={styles.lockText}>Reessayez dans {lockRemaining}s</Text> : null}

            <TouchableOpacity style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]} disabled={!canSubmit} onPress={handleEmailSubmit}>
              {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryText}>{mode === 'login' ? 'Se connecter' : 'Creer mon compte'}</Text>}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
  containerDark: {
    backgroundColor: '#050816',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: DriverSpacing.lg,
    paddingTop: DriverSpacing.xl,
    paddingBottom: DriverSpacing.xl,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    backgroundColor: '#144B34',
  },
  heroDark: {
    backgroundColor: '#0A2A1F',
  },
  heroGlowLarge: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(94, 234, 155, 0.16)',
  },
  heroGlowSmall: {
    position: 'absolute',
    bottom: -22,
    left: -16,
    width: 90,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#D7F7E7',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.82)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5ECE8',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#0E1627',
    borderColor: '#1E293B',
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F3',
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
  },
  modeRowDark: {
    backgroundColor: '#111C31',
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  modeButtonActive: {
    backgroundColor: DriverColors.primary,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.muted,
  },
  modeTextDark: {
    color: '#E2E8F0',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DriverColors.text,
  },
  sectionHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: DriverColors.muted,
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  accountTypeButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5ECE8',
    backgroundColor: '#FAFCFB',
    padding: 14,
  },
  accountTypeButtonDark: {
    borderColor: '#223047',
    backgroundColor: '#101B2F',
  },
  accountTypeButtonActive: {
    backgroundColor: '#ECF8F1',
    borderColor: '#A7D9BC',
  },
  accountTypeTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
    color: DriverColors.text,
  },
  accountTypeTitleActive: {
    color: DriverColors.primary,
  },
  accountTypeCopy: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: DriverColors.muted,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: '700',
    color: '#244135',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textMutedDark: {
    color: '#CBD5E1',
  },
  input: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E1E8E4',
    paddingHorizontal: 14,
    color: DriverColors.text,
    fontSize: 14,
  },
  inputDark: {
    backgroundColor: '#101B2F',
    borderColor: '#223047',
    color: '#F8FAFC',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryPrefix: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E1E8E4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  countryPrefixText: {
    color: DriverColors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  phoneInput: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E1E8E4',
    paddingHorizontal: 14,
    color: DriverColors.text,
    fontSize: 14,
  },
  phoneHint: {
    fontSize: 11,
    lineHeight: 16,
    color: DriverColors.muted,
    marginTop: 6,
  },
  lockText: {
    fontSize: 12,
    color: '#B45309',
    marginBottom: 8,
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: DriverColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
