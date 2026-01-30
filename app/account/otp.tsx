import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

export default function DriverOtpScreen() {
  const { dispatch } = useDriverStore();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Entrez le code à 4 chiffres que nous avons envoyé à votre numéro
        </Text>

        <View style={styles.otpRow}>
          {[0, 1, 2, 3].map((item) => (
            <TextInput key={item} style={styles.otpInput} keyboardType="number-pad" maxLength={1} />
          ))}
        </View>

        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>Vous n'avez pas reçu le code ? Renvoyer (0:09)</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.changeText}>Vous avez changé de numéro de téléphone ?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={() => {
          dispatch({ type: 'SET_ACCOUNT_STEP', value: 2 });
          router.push('/account/profile');
        }}
        >
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
