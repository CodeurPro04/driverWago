import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DriverProvider } from '@/hooks/useDriverStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <DriverProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="job-details" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="account/phone" options={{ headerShown: false }} />
          <Stack.Screen name="account/otp" options={{ headerShown: false }} />
          <Stack.Screen name="account/profile" options={{ headerShown: false }} />
          <Stack.Screen name="account/location" options={{ headerShown: false }} />
          <Stack.Screen name="account/legal" options={{ headerShown: false }} />
          <Stack.Screen name="account/documents" options={{ headerShown: false }} />
          <Stack.Screen name="account/review" options={{ headerShown: false }} />
          <Stack.Screen name="before-images" options={{ headerShown: false }} />
          <Stack.Screen name="after-images" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </DriverProvider>
  );
}
