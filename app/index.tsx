import React from 'react';
import { Redirect, useRootNavigationState } from 'expo-router';
import { useDriverStore } from '@/hooks/useDriverStore';

const stepRoutes: Record<number, string> = {
  0: '/account/profile',
  1: '/account/profile',
  2: '/account/profile',
  3: '/account/location',
  4: '/account/legal',
  5: '/account/documents',
  6: '/account/review',
  7: '/account/review',
  8: '/(tabs)',
};

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const { state, hydrated } = useDriverStore();

  if (!rootNavigationState?.key || !hydrated) {
    return null;
  }

  if (!state.onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  if (!state.driverId) {
    return <Redirect href="/account/auth" />;
  }

  if (state.accountStep < 6) {
    return <Redirect href={(stepRoutes[state.accountStep] || '/account/auth') as any} />;
  }

  if (state.profileStatus === 'rejected') {
    return <Redirect href="/account/review" />;
  }

  return <Redirect href="/(tabs)" />;
}
