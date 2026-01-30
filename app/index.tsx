import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDriverStore } from '@/hooks/useDriverStore';

const stepRoutes: Record<number, string> = {
  0: '/account/phone',
  1: '/account/otp',
  2: '/account/profile',
  3: '/account/location',
  4: '/account/legal',
  5: '/account/documents',
  6: '/account/review',
  7: '/account/review',
};

export default function Index() {
  const router = useRouter();
  const { state, hydrated } = useDriverStore();

  useEffect(() => {
    if (!hydrated) return;

    if (!state.onboardingDone) {
      router.replace('/onboarding');
      return;
    }

    if (state.accountStep < 6) {
      router.replace(stepRoutes[state.accountStep] || '/account/phone');
      return;
    }

    router.replace('/(tabs)');
  }, [hydrated, state.onboardingDone, state.accountStep, router]);

  return <View />;
}
