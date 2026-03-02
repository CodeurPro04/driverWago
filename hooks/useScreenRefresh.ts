import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useDriverStore } from '@/hooks/useDriverStore';

type ScreenRefreshOptions = {
  jobs?: boolean;
  inbox?: boolean;
  intervalMs?: number;
};

export function useScreenRefresh({
  jobs = false,
  inbox = false,
  intervalMs = 15000,
}: ScreenRefreshOptions) {
  const { state, refreshJobsOnly, refreshInboxOnly } = useDriverStore();
  const inFlightRef = useRef(false);

  const wsEnabled = !['0', 'false', 'off', 'no'].includes(
    String(process.env.EXPO_PUBLIC_WS_ENABLED || 'true').toLowerCase()
  );
  const fallbackInterval = wsEnabled ? Math.max(intervalMs, 60000) : intervalMs;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const driverId = state.driverId;
      if (!driverId || (!jobs && !inbox)) return () => undefined;

      const run = async () => {
        if (cancelled || inFlightRef.current) return;
        inFlightRef.current = true;
        try {
          const tasks: Array<Promise<void>> = [];
          if (jobs) tasks.push(refreshJobsOnly(driverId));
          if (inbox) tasks.push(refreshInboxOnly(driverId));
          await Promise.all(tasks);
        } finally {
          inFlightRef.current = false;
        }
      };

      run().catch(() => undefined);
      const timer = setInterval(() => {
        run().catch(() => undefined);
      }, fallbackInterval);

      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }, [state.driverId, jobs, inbox, fallbackInterval, refreshJobsOnly, refreshInboxOnly])
  );
}
