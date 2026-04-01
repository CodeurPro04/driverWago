import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getExpoPushTokenSafe(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const permission = await Notifications.getPermissionsAsync();
    let status = permission.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.easConfig?.projectId ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
      undefined;

    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data || null;
  } catch {
    return null;
  }
}

export async function configurePushChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0B63F6',
      showBadge: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    // no-op
  }
}
