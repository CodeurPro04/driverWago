import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricKind = 'face_id' | 'fingerprint' | 'iris' | 'biometric' | 'none';

export async function getBiometricKind(): Promise<BiometricKind> {
  const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (supported.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'face_id';
  }
  if (supported.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (supported.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  if (supported.length > 0) {
    return 'biometric';
  }
  return 'none';
}

export async function getBiometricLabel(): Promise<string> {
  const kind = await getBiometricKind();
  if (kind === 'face_id') return 'Face ID';
  if (kind === 'fingerprint') return Platform.OS === 'ios' ? 'Touch ID' : 'Empreinte';
  if (kind === 'iris') return 'Biometrie';
  return 'Biometrie';
}

export async function canUseBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function canUseFaceId(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return (await getBiometricKind()) === 'face_id';
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Annuler',
    disableDeviceFallback: true,
  });
  return result.success;
}
