import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';
import { healthCheck, mobileLogin } from '@/lib/api';

export default function DriverOtpScreen() {
  const { state, dispatch, refreshJobsNow } = useDriverStore();
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);

  const submit = async (pin: string[]) => {
    if (pin.join('').length !== 4) return;

    if (!state.driverPhone) {
      Alert.alert('Numero manquant', 'Retournez a l etape precedente.');
      return;
    }

    setLoading(true);
    try {
      await healthCheck();
      const response = await mobileLogin({
        role: 'driver',
        phone: state.driverPhone,
        name: state.driverName || 'Laveur',
      });

      dispatch({
        type: 'SET_DRIVER_SESSION',
        value: {
          id: response.user.id,
          name: response.user.name,
          phone: response.user.phone,
          isAvailable: response.user.is_available,
          accountStep: response.user.account_step ?? 2,
          profileStatus: (response.user.profile_status as 'pending' | 'approved' | 'rejected') ?? 'pending',
          documents: (response.user.documents as Record<string, string | null>) || {},
          documentsStatus: (response.user.documents_status as any) || 'pending',
        },
      });
      dispatch({ type: 'SET_ACCOUNT_STEP', value: response.user.account_step ?? 2 });

      await refreshJobsNow(response.user.id);
      if ((response.user.profile_status || 'pending') === 'approved' && (response.user.account_step || 0) >= 8) {
        router.replace('/(tabs)');
      } else {
        router.replace('/account/profile');
      }
    } catch {
      Alert.alert('Connexion impossible', 'Le backend ne repond pas ou l URL API est invalide.');
    } finally {
      setLoading(false);
    }
  };

  const onChangeDigit = (text: string, index: number) => {
    if (text && !/^\d$/.test(text)) return;

    const next = [...otp];
    next[index] = text;
    setOtp(next);

    if (text && index < 3) refs.current[index + 1]?.focus();
    if (next.every((d) => d.length === 1) && index === 3) {
      submit(next);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Entrez le code a 4 chiffres envoye a {state.driverPhone || '+225...'}</Text>

        <View style={styles.otpRow}>
          {[0, 1, 2, 3].map((item) => (
            <TextInput
              key={item}
              ref={(ref) => {
                refs.current[item] = ref;
              }}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={otp[item]}
              onChangeText={(text) => onChangeDigit(text, item)}
            />
          ))}
        </View>

        {loading ? <ActivityIndicator size="small" color={DriverColors.primary} style={styles.loader} /> : null}

        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>Vous n avez pas recu le code ? Renvoyer</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.changeText}>Vous avez change de numero de telephone ?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={() => submit(otp)} disabled={loading}>
          <Text style={styles.primaryText}>Continuer</Text>
        </TouchableOpacity>
      </View>
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.text,
    marginBottom: DriverSpacing.lg,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
  },
  otpInput: {
    flex: 1,
    height: 52,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F3F4F6',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.text,
  },
  loader: {
    marginTop: DriverSpacing.md,
  },
  resendButton: {
    marginTop: DriverSpacing.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F3F4F6',
  },
  resendText: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  changeText: {
    marginTop: DriverSpacing.md,
    fontSize: 12,
    color: DriverColors.primary,
  },
  primaryButton: {
    marginTop: DriverSpacing.xl,
    backgroundColor: DriverColors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
