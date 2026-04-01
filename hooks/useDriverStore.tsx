import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import {
  acceptJob,
  clearDriverNotifications,
  createDriverWalletTransaction,
  declineJob,
  getDriverJobs,
  getDriverNotifications,
  getDriverWalletTransactions,
  markAllDriverNotificationsRead,
  markDriverNotificationRead,
  registerDriverDevice,
  transitionJob,
  updateDriverAvailability,
} from '@/lib/api';
import { configurePushChannels, getExpoPushTokenSafe } from '@/lib/push';
import { subscribeDriverRealtime } from '@/lib/realtime';

export type JobStatus = 'pending' | 'accepted' | 'enRoute' | 'arrived' | 'washing' | 'completed' | 'cancelled';

export interface DriverJob {
  id: string;
  customerName: string;
  customerAvatarUrl?: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
  customerRating?: number | null;
  customerReview?: string | null;
  service: string;
  vehicle: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  etaMin: number;
  price: number;
  scheduledAt: string;
  notes?: string;
  status: JobStatus;
  createdAt: string;
  phone: string;
  cancelledReason?: string | null;
}

export interface DriverReview {
  bookingId: string;
  customerName: string;
  rating: number;
  review: string;
  createdAt: string;
}

export type DriverNotificationKind = 'earning' | 'deposit' | 'withdrawal' | 'system';

export interface DriverNotification {
  id: string;
  title: string;
  body: string;
  kind: DriverNotificationKind;
  createdAt: string;
  read: boolean;
}

export type WalletTransactionType = 'earning' | 'deposit' | 'withdrawal';

export interface WalletTransaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: WalletTransactionType;
  createdAt: string;
}

interface DriverState {
  driverId: number | null;
  driverPhone: string;
  driverName: string;
  biometricEnabled: boolean;
  rating: number;
  reviewsCount: number;
  recentReviews: DriverReview[];
  availability: boolean;
  jobs: DriverJob[];
  activeJobId: string | null;
  cashoutBalance: number;
  walletTransactions: WalletTransaction[];
  notifications: DriverNotification[];
  onboardingDone: boolean;
  accountStep: number;
  profileStatus: 'pending' | 'approved' | 'rejected';
  beforePhotos: string[];
  afterPhotos: string[];
  documents: Record<string, string | null>;
  documentsStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
  lastAutoCancelledJobId: string | null;
  lastSeenAppVersion: string;
}

type DriverAction =
  | { type: 'TOGGLE_AVAILABILITY' }
  | { type: 'ACCEPT_JOB'; id: string }
  | { type: 'DECLINE_JOB'; id: string }
  | { type: 'ARRIVE_JOB'; id: string }
  | { type: 'START_WASH'; id: string }
  | { type: 'COMPLETE_JOB'; id: string }
  | { type: 'CANCEL_JOB'; id: string }
  | { type: 'SET_ONBOARDING_DONE'; value: boolean }
  | { type: 'SET_ACCOUNT_STEP'; value: number }
  | { type: 'SET_DOCUMENT'; id: string; uri: string | null }
  | { type: 'SET_DOCUMENTS'; value: Record<string, string | null> }
  | { type: 'SET_DOCUMENTS_STATUS'; value: DriverState['documentsStatus'] }
  | { type: 'SET_BEFORE_PHOTO'; index: number; uri: string }
  | { type: 'SET_AFTER_PHOTO'; index: number; uri: string }
  | { type: 'SET_DRIVER_PHONE'; value: string }
  | { type: 'SET_DRIVER_NAME'; value: string }
  | { type: 'SET_BIOMETRIC_ENABLED'; value: boolean }
  | {
      type: 'SET_DRIVER_SESSION';
      value: {
        id: number;
        name: string;
        phone: string;
        isAvailable: boolean;
        accountStep?: number;
        profileStatus?: 'pending' | 'approved' | 'rejected';
        documents?: Record<string, string | null>;
        documentsStatus?: DriverState['documentsStatus'];
        rating?: number;
      };
    }
  | { type: 'SET_AVAILABILITY'; value: boolean }
  | { type: 'SET_PROFILE_STATUS'; value: 'pending' | 'approved' | 'rejected' }
  | { type: 'SET_JOBS'; jobs: DriverJob[] }
  | { type: 'ADD_WALLET_TRANSACTION'; mode: 'deposit' | 'withdrawal'; amount: number; method?: string }
  | { type: 'SET_REMOTE_NOTIFICATIONS'; value: DriverNotification[] }
  | { type: 'SET_REMOTE_WALLET'; balance: number; transactions: WalletTransaction[] }
  | { type: 'MARK_NOTIFICATION_READ'; id: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_LAST_SEEN_APP_VERSION'; value: string }
  | { type: 'CLEAR_AUTO_CANCELLED_NOTICE' }
  | { type: 'CLEAR_DRIVER_SESSION' }
  | { type: 'HYDRATE'; value: Partial<DriverState> };

const STORAGE_KEY = 'ZIWAGO_DRIVER_STATE_V7';

const toDateOnlyLabel = (raw?: string) => {
  const now = new Date();
  const value = (raw || '').trim();
  const lower = value.toLowerCase();
  if (!value || lower.includes('aujourd')) {
    return now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  if (lower.includes('demain')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return value;
};

const toDateTimeLabel = (iso?: string) => {
  const parsed = iso ? new Date(iso) : new Date();
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const initialState: DriverState = {
  driverId: null,
  driverPhone: '',
  driverName: 'Laveur',
  biometricEnabled: false,
  rating: 0,
  reviewsCount: 0,
  recentReviews: [],
  availability: true,
  jobs: [],
  activeJobId: null,
  cashoutBalance: 0,
  walletTransactions: [],
  notifications: [],
  onboardingDone: false,
  accountStep: 0,
  profileStatus: 'pending',
  beforePhotos: [],
  afterPhotos: [],
  documents: { id: null, profile: null, license: null, address: null, certificate: null },
  documentsStatus: 'pending',
  lastAutoCancelledJobId: null,
  lastSeenAppVersion: '',
};

const statusFromApi = (status: string): JobStatus => {
  if (status === 'pending') return 'pending';
  if (status === 'accepted' || status === 'en_route') return 'enRoute';
  if (status === 'arrived') return 'arrived';
  if (status === 'washing') return 'washing';
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
};

const activeStatuses: JobStatus[] = ['accepted', 'enRoute', 'arrived', 'washing'];

const mapApiJob = (job: any): DriverJob => ({
  id: String(job.id),
  customerName: job.customer_name || 'Client',
  customerAvatarUrl: job.customer_avatar_url || null,
  beforePhotos: Array.isArray(job.before_photos) ? job.before_photos : [],
  afterPhotos: Array.isArray(job.after_photos) ? job.after_photos : [],
  customerRating: job.customer_rating ? Number(job.customer_rating) : null,
  customerReview: job.customer_review || null,
  service: job.service || 'Lavage',
  vehicle: job.vehicle || 'Vehicule',
  address: job.address || 'Adresse non renseignee',
  latitude: Number(job.latitude || 5.3364),
  longitude: Number(job.longitude || -4.0267),
  distanceKm: 2.5,
  etaMin: 12,
  price: Number(job.price || 0),
  scheduledAt: toDateOnlyLabel(job.scheduled_at),
  notes: undefined,
  status: statusFromApi(job.status),
  createdAt: toDateOnlyLabel(job.created_at || job.scheduled_at),
  phone: job.customer_phone || '+225 00 00 00 00 00',
  cancelledReason: job.cancelled_reason || null,
});

const mapApiNotification = (item: any): DriverNotification => ({
  id: String(item.id),
  title: String(item.title || 'Notification'),
  body: String(item.body || ''),
  kind: (item.type || 'system') as DriverNotificationKind,
  createdAt: String(item.created_at || new Date().toISOString()),
  read: Boolean(item.read_at),
});

const mapApiWalletTransaction = (item: any): WalletTransaction => {
  const createdAt = String(item.created_at || new Date().toISOString());
  const type = (item.type || 'earning') as WalletTransactionType;
  const amount = Number(item.amount || 0);
  const title =
    type === 'earning' ? 'Mission terminee' : type === 'deposit' ? 'Depot confirme' : 'Retrait confirme';
  return {
    id: String(item.id),
    title,
    date: toDateTimeLabel(createdAt),
    amount,
    type,
    createdAt,
  };
};

const driverReducer = (state: DriverState, action: DriverAction): DriverState => {
  switch (action.type) {
    case 'TOGGLE_AVAILABILITY':
      return { ...state, availability: !state.availability };
    case 'SET_AVAILABILITY':
      return { ...state, availability: action.value };
    case 'SET_DRIVER_PHONE':
      return { ...state, driverPhone: action.value };
    case 'SET_DRIVER_NAME':
      return { ...state, driverName: action.value };
    case 'SET_BIOMETRIC_ENABLED':
      return { ...state, biometricEnabled: action.value };
    case 'SET_DRIVER_SESSION':
      return {
        ...state,
        driverId: action.value.id,
        driverName: action.value.name,
        driverPhone: action.value.phone,
        availability: action.value.isAvailable,
        accountStep: action.value.accountStep ?? state.accountStep,
        profileStatus: action.value.profileStatus ?? state.profileStatus,
        documents: action.value.documents ?? state.documents,
        documentsStatus: action.value.documentsStatus ?? state.documentsStatus,
        rating: typeof action.value.rating === 'number' ? action.value.rating : state.rating,
      };
    case 'SET_JOBS': {
      const firstActive = action.jobs.find((job) => activeStatuses.includes(job.status));
      const ratedJobs = action.jobs.filter(
        (job) => job.status === 'completed' && typeof job.customerRating === 'number' && job.customerRating > 0
      );
      const reviewsCount = ratedJobs.length;
      const averageRating =
        reviewsCount > 0
          ? Number((ratedJobs.reduce((sum, job) => sum + Number(job.customerRating || 0), 0) / reviewsCount).toFixed(1))
          : 0;
      const recentReviews: DriverReview[] = action.jobs
        .filter(
          (job) =>
            job.status === 'completed' &&
            typeof job.customerRating === 'number' &&
            job.customerRating > 0 &&
            Boolean((job.customerReview || '').trim())
        )
        .slice(0, 20)
        .map((job) => ({
          bookingId: job.id,
          customerName: job.customerName,
          rating: Number(job.customerRating || 0),
          review: String(job.customerReview || '').trim(),
          createdAt: job.createdAt,
        }));
      const previousActiveId = state.activeJobId;
      const previousActiveBefore = previousActiveId ? state.jobs.find((job) => job.id === previousActiveId) || null : null;
      const previousActiveNow = previousActiveId ? action.jobs.find((job) => job.id === previousActiveId) || null : null;
      const autoCancelledJobId =
        previousActiveId &&
        previousActiveBefore &&
        !['arrived', 'washing', 'completed', 'cancelled'].includes(previousActiveBefore.status) &&
        previousActiveNow &&
        previousActiveNow.status === 'cancelled'
          ? previousActiveId
          : null;

      return {
        ...state,
        jobs: action.jobs,
        activeJobId: firstActive?.id || null,
        rating: averageRating,
        reviewsCount,
        recentReviews,
        lastAutoCancelledJobId: autoCancelledJobId ?? state.lastAutoCancelledJobId,
      };
    }
    case 'SET_REMOTE_NOTIFICATIONS':
      return { ...state, notifications: action.value.slice(0, 200) };
    case 'SET_REMOTE_WALLET':
      return {
        ...state,
        cashoutBalance: Math.max(0, action.balance),
        walletTransactions: action.transactions.slice(0, 300),
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.id ? { ...item, read: true } : item
        ),
      };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map((item) => ({ ...item, read: true })),
      };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    case 'SET_LAST_SEEN_APP_VERSION':
      return { ...state, lastSeenAppVersion: action.value };
    case 'CLEAR_AUTO_CANCELLED_NOTICE':
      return { ...state, lastAutoCancelledJobId: null };
    case 'ACCEPT_JOB':
      return {
        ...state,
        jobs: state.jobs.map((job) => (job.id === action.id ? { ...job, status: 'enRoute' as JobStatus } : job)),
        activeJobId: action.id,
        beforePhotos: [],
        afterPhotos: [],
      };
    case 'DECLINE_JOB':
      return {
        ...state,
        jobs: state.jobs.map((job) => (job.id === action.id ? { ...job, status: 'cancelled' as JobStatus } : job)),
      };
    case 'ARRIVE_JOB':
      return {
        ...state,
        jobs: state.jobs.map((job) => (job.id === action.id ? { ...job, status: 'arrived' as JobStatus } : job)),
        activeJobId: action.id,
      };
    case 'START_WASH':
      return {
        ...state,
        jobs: state.jobs.map((job) => (job.id === action.id ? { ...job, status: 'washing' as JobStatus } : job)),
        activeJobId: action.id,
      };
    case 'COMPLETE_JOB':
      return {
        ...state,
        jobs: state.jobs.map((job) => (job.id === action.id ? { ...job, status: 'completed' as JobStatus } : job)),
        activeJobId: null,
        beforePhotos: [],
        afterPhotos: [],
      };
    case 'CANCEL_JOB':
      return {
        ...state,
        jobs: state.jobs.map((job) => (job.id === action.id ? { ...job, status: 'cancelled' as JobStatus } : job)),
        activeJobId: null,
        beforePhotos: [],
        afterPhotos: [],
      };
    case 'SET_ONBOARDING_DONE':
      return { ...state, onboardingDone: action.value };
    case 'SET_ACCOUNT_STEP':
      return { ...state, accountStep: action.value };
    case 'SET_PROFILE_STATUS':
      return { ...state, profileStatus: action.value };
    case 'SET_DOCUMENT':
      return { ...state, documents: { ...state.documents, [action.id]: action.uri } };
    case 'SET_DOCUMENTS':
      return { ...state, documents: { ...state.documents, ...action.value } };
    case 'SET_DOCUMENTS_STATUS':
      return { ...state, documentsStatus: action.value };
    case 'SET_BEFORE_PHOTO': {
      const next = [...state.beforePhotos];
      next[action.index] = action.uri;
      return { ...state, beforePhotos: next };
    }
    case 'SET_AFTER_PHOTO': {
      const next = [...state.afterPhotos];
      next[action.index] = action.uri;
      return { ...state, afterPhotos: next };
    }
    case 'CLEAR_DRIVER_SESSION':
      return {
        ...initialState,
        onboardingDone: state.onboardingDone,
        lastSeenAppVersion: state.lastSeenAppVersion,
      };
    case 'HYDRATE':
      return {
        ...state,
        ...action.value,
        jobs: Array.isArray(action.value.jobs)
          ? action.value.jobs.map((job) => ({
              ...job,
              scheduledAt: toDateOnlyLabel(job.scheduledAt),
              createdAt: toDateOnlyLabel(job.createdAt),
            }))
          : state.jobs,
      };
    default:
      return state;
  }
};

const DriverContext = createContext<{
  state: DriverState;
  dispatch: React.Dispatch<DriverAction>;
  hydrated: boolean;
  refreshJobsNow: (driverId?: number) => Promise<void>;
  refreshJobsOnly: (driverId?: number) => Promise<void>;
  refreshInboxOnly: (driverId?: number) => Promise<void>;
} | null>(null);

export const DriverProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(driverReducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  const refreshJobs = useCallback(async (driverId: number) => {
    const response = await getDriverJobs(driverId);
    dispatch({ type: 'SET_JOBS', jobs: response.jobs.map(mapApiJob) });
  }, []);

  const refreshRemoteInbox = useCallback(async (driverId: number) => {
    const [notifRes, walletRes] = await Promise.all([
      getDriverNotifications(driverId),
      getDriverWalletTransactions(driverId),
    ]);
    dispatch({ type: 'SET_REMOTE_NOTIFICATIONS', value: notifRes.notifications.map(mapApiNotification) });
    dispatch({
      type: 'SET_REMOTE_WALLET',
      balance: Number(walletRes.balance || 0),
      transactions: walletRes.transactions.map(mapApiWalletTransaction),
    });
  }, []);

  useEffect(() => {
    configurePushChannels().catch(() => undefined);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<DriverState>;
          dispatch({ type: 'HYDRATE', value: parsed });
        }
      } finally {
        setHydrated(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!hydrated || !state.driverId) return;
    if (appState !== 'active') return;
    Promise.all([refreshJobs(state.driverId), refreshRemoteInbox(state.driverId)]).catch(() => undefined);
  }, [hydrated, state.driverId, appState, refreshJobs, refreshRemoteInbox]);

  useEffect(() => {
    if (!hydrated || !state.driverId) return;
    if (appState !== 'active') return;

    let disposed = false;
    let jobsBusy = false;
    let inboxBusy = false;
    let jobsTimer: ReturnType<typeof setTimeout> | null = null;
    let inboxTimer: ReturnType<typeof setTimeout> | null = null;
    const driverId = state.driverId;

    const scheduleJobsRefresh = () => {
      if (jobsBusy || disposed) return;
      if (jobsTimer) clearTimeout(jobsTimer);
      jobsTimer = setTimeout(() => {
        jobsTimer = null;
        jobsBusy = true;
        refreshJobs(driverId).catch(() => undefined).finally(() => {
          jobsBusy = false;
        });
      }, 250);
    };

    const scheduleInboxRefresh = () => {
      if (inboxBusy || disposed) return;
      if (inboxTimer) clearTimeout(inboxTimer);
      inboxTimer = setTimeout(() => {
        inboxTimer = null;
        inboxBusy = true;
        refreshRemoteInbox(driverId).catch(() => undefined).finally(() => {
          inboxBusy = false;
        });
      }, 250);
    };

    const unsubscribe = subscribeDriverRealtime(driverId, {
      onJobsUpdated: scheduleJobsRefresh,
      onInboxUpdated: scheduleInboxRefresh,
      onDriverUpdated: scheduleJobsRefresh,
    });

    return () => {
      disposed = true;
      if (jobsTimer) clearTimeout(jobsTimer);
      if (inboxTimer) clearTimeout(inboxTimer);
      unsubscribe();
    };
  }, [hydrated, state.driverId, appState, refreshJobs, refreshRemoteInbox]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated || !state.driverId) return;
    const appVersion = String(
      Constants.expoConfig?.version ||
      (Constants as any)?.manifest?.version ||
      (Constants as any)?.manifest2?.extra?.expoClient?.version ||
      ''
    );
    const syncDevice = async () => {
      const token = await getExpoPushTokenSafe();
      await registerDriverDevice(state.driverId as number, {
        expo_push_token: token,
        app_version: appVersion || null,
      });
      if (appVersion && state.lastSeenAppVersion !== appVersion) {
        dispatch({ type: 'SET_LAST_SEEN_APP_VERSION', value: appVersion });
      }
      await refreshRemoteInbox(state.driverId as number);
    };
    syncDevice().catch(() => undefined);
  }, [hydrated, state.driverId, state.lastSeenAppVersion, refreshRemoteInbox]);

  useEffect(() => {
    if (!hydrated || !state.driverId) return;

    const refreshInboxFromPush = () => {
      refreshRemoteInbox(state.driverId as number).catch(() => undefined);
    };

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      refreshInboxFromPush();
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
      refreshInboxFromPush();
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [hydrated, state.driverId, refreshRemoteInbox]);

  const networkDispatch = useCallback(
    async (action: DriverAction) => {
      const driverId = state.driverId;

      if (action.type === 'TOGGLE_AVAILABILITY') {
        if (!driverId) return;
        const next = !state.availability;
        try {
          await updateDriverAvailability(driverId, { is_available: next });
          dispatch({ type: 'SET_AVAILABILITY', value: next });
        } catch {
          return;
        }
        return;
      }

      if (action.type === 'MARK_NOTIFICATION_READ') {
        if (!driverId) return;
        dispatch(action);
        markDriverNotificationRead(driverId, action.id).catch(() => undefined);
        return;
      }

      if (action.type === 'MARK_ALL_NOTIFICATIONS_READ') {
        if (!driverId) return;
        dispatch(action);
        markAllDriverNotificationsRead(driverId).catch(() => undefined);
        return;
      }

      if (action.type === 'CLEAR_NOTIFICATIONS') {
        if (!driverId) return;
        dispatch(action);
        clearDriverNotifications(driverId).catch(() => undefined);
        return;
      }

      if ('type' in action && action.type === 'ADD_WALLET_TRANSACTION') {
        if (!driverId) return;
        try {
          await createDriverWalletTransaction(driverId, {
            type: action.mode,
            amount: action.amount,
            method: action.method,
          });
          await refreshRemoteInbox(driverId);
        } catch {
          return;
        }
        return;
      }

      if (action.type === 'CANCEL_JOB') {
        return;
      }

      if (
        action.type === 'ACCEPT_JOB' ||
        action.type === 'DECLINE_JOB' ||
        action.type === 'ARRIVE_JOB' ||
        action.type === 'START_WASH' ||
        action.type === 'COMPLETE_JOB'
      ) {
        if (!driverId) return;
        if (action.type === 'ACCEPT_JOB') {
          const runningMission = state.jobs.find((job) => activeStatuses.includes(job.status) && job.id !== action.id);
          if (runningMission) return;
        }
        try {
          if (action.type === 'ACCEPT_JOB') await acceptJob(action.id, driverId);
          if (action.type === 'DECLINE_JOB') await declineJob(action.id, driverId);
          if (action.type === 'ARRIVE_JOB') await transitionJob(action.id, driverId, 'arrive');
          if (action.type === 'START_WASH') await transitionJob(action.id, driverId, 'start');
          if (action.type === 'COMPLETE_JOB') await transitionJob(action.id, driverId, 'complete');
          await refreshJobs(driverId);
          await refreshRemoteInbox(driverId);
        } catch {
          return;
        }
        return;
      }

      dispatch(action);
    },
    [state.driverId, state.availability, state.jobs, refreshJobs, refreshRemoteInbox]
  );

  const refreshJobsNow = useCallback(
    async (driverId?: number) => {
      const targetId = driverId ?? state.driverId;
      if (!targetId) return;
      await Promise.all([refreshJobs(targetId), refreshRemoteInbox(targetId)]);
    },
    [state.driverId, refreshJobs, refreshRemoteInbox]
  );

  const refreshJobsOnly = useCallback(
    async (driverId?: number) => {
      const targetId = driverId ?? state.driverId;
      if (!targetId) return;
      await refreshJobs(targetId);
    },
    [state.driverId, refreshJobs]
  );

  const refreshInboxOnly = useCallback(
    async (driverId?: number) => {
      const targetId = driverId ?? state.driverId;
      if (!targetId) return;
      await refreshRemoteInbox(targetId);
    },
    [state.driverId, refreshRemoteInbox]
  );

  const value = useMemo(
    () => ({
      state,
      dispatch: networkDispatch as React.Dispatch<DriverAction>,
      hydrated,
      refreshJobsNow,
      refreshJobsOnly,
      refreshInboxOnly,
    }),
    [state, hydrated, networkDispatch, refreshJobsNow, refreshJobsOnly, refreshInboxOnly]
  );

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
};

export const useDriverStore = () => {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDriverStore must be used within DriverProvider');
  }
  return context;
};
