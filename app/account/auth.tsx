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
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { ApiError, buildOAuthStartUrl, completeOAuth, loginWithEmail, registerWithEmail } from '@/lib/api';

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'login' | 'register';

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

const secureRandomState = () => {
  const seed = `${Date.now()}-${Math.random()}-${Math.random()}`;
  return seed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
};

const getPostAuthRoute = (user: {
  account_step?: number;
  profile_status?: string;
}): '/(tabs)' | '/account/profile' | '/account/location' | '/account/legal' | '/account/documents' | '/account/review' => {
  const step = Number(user.account_step || 0);
  const profileStatus = user.profile_status || 'pending';

  if (profileStatus === 'approved' && step >= 8) return '/(tabs)';
  if (step <= 2) return '/account/profile';
  if (step === 3) return '/account/location';
  if (step === 4) return '/account/legal';
  if (step === 5) return '/account/documents';
  return '/account/review';
};

export default function DriverAuthScreen() {
  const router = useRouter();
  const { dispatch, refreshJobsNow } = useDriverStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const lockRemaining = isLocked ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  const canSubmit = useMemo(() => {
    if (loading || oauthLoading || isLocked) return false;
    if (!isValidEmail(email)) return false;
    if (!password) return false;
    if (mode === 'register' && (!firstName.trim() || !lastName.trim())) return false;
    if (mode === 'register' && !isValidIvorianPhone(phone)) return false;
    if (mode === 'register' && password !== confirmPassword) return false;
    return true;
  }, [loading, oauthLoading, isLocked, email, password, mode, firstName, lastName, phone, confirmPassword]);

  const applyDriverSession = async (session: any) => {
    const user = session.user;
    dispatch({
      type: 'SET_DRIVER_SESSION',
      value: {
        id: user.id,
        name: user.first_name || user.name || 'Laveur',
        phone: user.phone || '',
        isAvailable: Boolean(user.is_available),
        accountStep: user.account_step ?? 0,
        profileStatus: (user.profile_status || 'pending') as 'pending' | 'approved' | 'rejected',
        documents: (user.documents as Record<string, string | null>) || {},
        documentsStatus: (user.documents_status || 'pending') as 'pending' | 'submitted' | 'approved' | 'rejected',
        rating: Number(user.rating ?? 0),
      },
    });
    dispatch({ type: 'SET_ACCOUNT_STEP', value: user.account_step ?? 0 });
    dispatch({ type: 'SET_ONBOARDING_DONE', value: true });
    await refreshJobsNow(user.id);
    router.replace(getPostAuthRoute(user));
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
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: email.trim().toLowerCase(),
              password,
              phone: phone,
              role: 'driver',
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
      Alert.alert('Erreur reseau', 'Connexion au backend impossible.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (loading || oauthLoading) return;

    const state = secureRandomState();
    const redirectUri = Linking.createURL('/account/callback');
    const authUrl = buildOAuthStartUrl(provider, redirectUri, state);

    setOauthLoading(provider);
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type !== 'success' || !result.url) return;

      const parsed = Linking.parse(result.url);
      const params = parsed.queryParams || {};

      if (params.state !== state) {
        throw new Error('invalid_oauth_state');
      }

      const code = typeof params.code === 'string' ? params.code : null;
      const idToken = typeof params.id_token === 'string' ? params.id_token : null;
      const accessToken = typeof params.access_token === 'string' ? params.access_token : null;

      if (!code && !idToken && !accessToken) {
        throw new Error('missing_oauth_token');
      }

      const session = await completeOAuth({
        provider,
        code,
        id_token: idToken,
        access_token: accessToken,
        redirect_uri: redirectUri,
        state,
      });
      await applyDriverSession(session);
    } catch {
      Alert.alert('Connexion impossible', `Echec de connexion ${provider === 'google' ? 'Google' : 'Apple'}.`);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Connexion Laveur</Text>
          <Text style={styles.subtitle}>Connectez-vous avec Email, Google ou Apple.</Text>

          <View style={styles.modeRow}>
            <TouchableOpacity style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]} onPress={() => setMode('login')}>
              <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>Connexion</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]} onPress={() => setMode('register')}>
              <Text style={[styles.modeText, mode === 'register' && styles.modeTextActive]}>Inscription</Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Prenom"
                placeholderTextColor={DriverColors.muted}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={styles.input}
                placeholder="Nom"
                placeholderTextColor={DriverColors.muted}
                value={lastName}
                onChangeText={setLastName}
              />
              <View style={styles.phoneRow}>
                <View style={styles.countryPrefix}>
                  <Text style={styles.countryPrefixText}>+225</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="07 12 34 56 78"
                  placeholderTextColor={DriverColors.muted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(v) => setPhone(normalizePhoneDigits(v))}
                  maxLength={10}
                />
              </View>
              <Text style={styles.phoneHint}>Numero ivoirien: 10 chiffres, commence par 01, 05 ou 07.</Text>
            </>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Adresse email"
            placeholderTextColor={DriverColors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={DriverColors.muted}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
          {mode === 'register' ? (
            <TextInput
              style={styles.input}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor={DriverColors.muted}
              secureTextEntry
              autoCapitalize="none"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          ) : null}

          {isLocked ? <Text style={styles.lockText}>Reessayez dans {lockRemaining}s</Text> : null}

          <TouchableOpacity style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]} disabled={!canSubmit} onPress={handleEmailSubmit}>
            {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryText}>{mode === 'login' ? 'Se connecter' : 'Creer mon compte'}</Text>}
          </TouchableOpacity>

          <Text style={styles.divider}>ou</Text>

          <TouchableOpacity style={styles.socialButton} disabled={Boolean(oauthLoading || loading)} onPress={() => handleOAuth('apple')}>
            <View style={styles.socialButtonContent}>
              {oauthLoading === 'apple' ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="logo-apple" size={22} color="#000" />}
              <Text style={styles.socialText}>Continuer avec Apple</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton} disabled={Boolean(oauthLoading || loading)} onPress={() => handleOAuth('google')}>
            <View style={styles.socialButtonContent}>
              {oauthLoading === 'google' ? <ActivityIndicator size="small" color="#DB4437" /> : <Ionicons name="logo-google" size={22} color="#DB4437" />}
              <Text style={styles.socialText}>Continuer avec Google</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: DriverSpacing.lg,
    paddingTop: DriverSpacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: DriverColors.text,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: DriverSpacing.md,
    color: DriverColors.muted,
    fontSize: 13,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: DriverColors.surface,
    borderRadius: DriverRadius.md,
    padding: 4,
    marginBottom: DriverSpacing.lg,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: DriverRadius.sm,
  },
  modeButtonActive: {
    backgroundColor: DriverColors.primary,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.muted,
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  input: {
    height: 48,
    borderRadius: DriverRadius.md,
    backgroundColor: DriverColors.surface,
    paddingHorizontal: 12,
    color: DriverColors.text,
    marginBottom: DriverSpacing.md,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  countryPrefix: {
    height: 48,
    borderRadius: DriverRadius.md,
    backgroundColor: DriverColors.surface,
    borderWidth: 1,
    borderColor: DriverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  countryPrefixText: {
    color: DriverColors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    height: 48,
    borderRadius: DriverRadius.md,
    backgroundColor: DriverColors.surface,
    paddingHorizontal: 12,
    color: DriverColors.text,
    borderWidth: 1,
    borderColor: DriverColors.border,
  },
  phoneHint: {
    fontSize: 11,
    color: DriverColors.muted,
    marginBottom: DriverSpacing.md,
  },
  lockText: {
    fontSize: 12,
    color: '#B45309',
    marginBottom: 8,
  },
  primaryButton: {
    marginTop: DriverSpacing.sm,
    borderRadius: DriverRadius.sm,
    backgroundColor: DriverColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    textAlign: 'center',
    color: DriverColors.muted,
    marginVertical: DriverSpacing.lg,
  },
  socialButton: {
    backgroundColor: DriverColors.surface,
    paddingVertical: 14,
    borderRadius: DriverRadius.sm,
    marginBottom: DriverSpacing.sm,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DriverSpacing.sm,
  },
  socialText: {
    fontSize: 15,
    fontWeight: '600',
    color: DriverColors.text,
  },
});
