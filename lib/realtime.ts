import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import { API_BASE_URL } from '@/lib/api';

type DriverRealtimeHandlers = {
  onJobsUpdated?: () => void;
  onInboxUpdated?: () => void;
  onDriverUpdated?: () => void;
};

let echoInstance: Echo<'pusher'> | null = null;

const resolveHostFromApi = () => {
  try {
    const parsed = new URL(API_BASE_URL);
    return parsed.hostname;
  } catch {
    return '127.0.0.1';
  }
};

const wsEnabled = () => {
  const raw = (process.env.EXPO_PUBLIC_WS_ENABLED || 'true').toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(raw);
};

const getEcho = () => {
  if (!wsEnabled()) return null;
  if (echoInstance) return echoInstance;

  const key = process.env.EXPO_PUBLIC_WS_KEY || process.env.EXPO_PUBLIC_PUSHER_APP_KEY || '';
  if (!key) return null;

  const host = process.env.EXPO_PUBLIC_WS_HOST || resolveHostFromApi();
  const port = Number(process.env.EXPO_PUBLIC_WS_PORT || 6001);
  const scheme = (process.env.EXPO_PUBLIC_WS_SCHEME || 'http').toLowerCase();
  const cluster = process.env.EXPO_PUBLIC_WS_CLUSTER || process.env.EXPO_PUBLIC_PUSHER_APP_CLUSTER || 'mt1';

  (globalThis as any).Pusher = Pusher;

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key,
    cluster,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
  });

  return echoInstance;
};

export const subscribeDriverRealtime = (
  driverId: number,
  handlers: DriverRealtimeHandlers
): (() => void) => {
  const echo = getEcho();
  if (!echo || !driverId) return () => undefined;

  const bookingsChannel = echo.channel('backoffice.bookings');
  const inboxChannel = echo.channel('drivers.inbox');
  const driversChannel = echo.channel('backoffice.drivers');

  const onBooking = () => handlers.onJobsUpdated?.();
  const onInbox = (payload: { driver_id?: number }) => {
    if (Number(payload?.driver_id) === Number(driverId)) {
      handlers.onInboxUpdated?.();
    }
  };
  const onDriver = (payload: { id?: number }) => {
    if (Number(payload?.id) === Number(driverId)) {
      handlers.onDriverUpdated?.();
    }
  };

  bookingsChannel.listen('.booking.updated', onBooking);
  inboxChannel.listen('.driver.inbox.updated', onInbox);
  driversChannel.listen('.driver.updated', onDriver);

  return () => {
    bookingsChannel.stopListening('.booking.updated');
    inboxChannel.stopListening('.driver.inbox.updated');
    driversChannel.stopListening('.driver.updated');
    echo.leaveChannel('backoffice.bookings');
    echo.leaveChannel('drivers.inbox');
    echo.leaveChannel('backoffice.drivers');
  };
};
