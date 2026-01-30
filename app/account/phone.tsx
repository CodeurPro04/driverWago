import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DriverColors, DriverRadius, DriverSpacing } from '@/constants/driverTheme';
import { useDriverStore } from '@/hooks/useDriverStore';

export default function DriverPhoneScreen() {
  const { dispatch } = useDriverStore();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Entrez votre numéro de téléphone portable</Text>

        <View style={styles.inputRow}>
          <View style={styles.flagBox}>
            <Text style={styles.flagText}>🇨🇮</Text>
          </View>
          <View style={styles.countryCode}>
            <Text style={styles.codeText}>+225</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Votre numéro"
            placeholderTextColor={DriverColors.muted}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => {
          dispatch({ type: 'SET_ACCOUNT_STEP', value: 1 });
          router.push('/account/otp');
        }}>
          <Text style={styles.primaryText}>Continuer</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.socialButton}>
          <Ionicons name="logo-apple" size={18} color={DriverColors.text} />
          <Text style={styles.socialText}>Continuer avec Apple</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Ionicons name="logo-google" size={18} color={DriverColors.text} />
          <Text style={styles.socialText}>Continuer avec Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Ionicons name="mail" size={18} color={DriverColors.text} />
          <Text style={styles.socialText}>Continuer avec Email</Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          En continuant, vous acceptez de recevoir des appels, des messages WhatsApp ou SMS de la part
          de Ziwago concernant vos commandes et mises à jour. Vous pouvez vous désabonner à tout moment.
        </Text>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: DriverSpacing.lg,
  },
  flagBox: {
    width: 52,
    height: 48,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: {
    fontSize: 18,
  },
  countryCode: {
    paddingHorizontal: 14,
    height: 48,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 14,
    fontWeight: '600',
    color: DriverColors.text,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: DriverRadius.md,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    fontSize: 14,
    color: DriverColors.text,
  },
  primaryButton: {
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: DriverSpacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: DriverColors.border,
  },
  dividerText: {
    fontSize: 12,
    color: DriverColors.muted,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DriverColors.border,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  socialText: {
    fontSize: 13,
    fontWeight: '600',
    color: DriverColors.text,
  },
  legalText: {
    marginTop: DriverSpacing.lg,
    fontSize: 11,
    color: DriverColors.muted,
    lineHeight: 16,
  },
});
