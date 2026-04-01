import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DriverProvider } from '@/hooks/useDriverStore';
import { getDriverPalette } from '@/lib/driverAppearance';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const palette = getDriverPalette(colorScheme);

  return (
    <DriverProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="earnings-history" options={{ headerShown: false }} />
          <Stack.Screen name="job-details" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="account/auth" options={{ headerShown: false }} />
          <Stack.Screen name="account/callback" options={{ headerShown: false }} />
          <Stack.Screen name="account/profile" options={{ headerShown: false }} />
          <Stack.Screen name="account/location" options={{ headerShown: false }} />
          <Stack.Screen name="account/legal" options={{ headerShown: false }} />
          <Stack.Screen name="account/documents" options={{ headerShown: false }} />
          <Stack.Screen name="account/pricing" options={{ headerShown: false }} />
          <Stack.Screen name="account/review" options={{ headerShown: false }} />
          <Stack.Screen name="before-images" options={{ headerShown: false }} />
          <Stack.Screen name="after-images" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </DriverProvider>
  );
}
