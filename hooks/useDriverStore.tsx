import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  acceptJob,
  declineJob,
  getDriverJobs,
  transitionJob,
  updateDriverAvailability,
} from '@/lib/api';

export type JobStatus =
  | 'pending'
  | 'accepted'
  | 'enRoute'
  | 'arrived'
  | 'washing'
  | 'completed'
  | 'cancelled';

export interface DriverJob {
  id: string;
  customerName: string;
  customerAvatarUrl?: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
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
}

interface DriverState {
  driverId: number | null;
  driverPhone: string;
  driverName: string;
  rating: number;
  availability: boolean;
  jobs: DriverJob[];
  activeJobId: string | null;
  cashoutBalance: number;
  onboardingDone: boolean;
  accountStep: number;
  profileStatus: 'pending' | 'approved' | 'rejected';
  beforePhotos: string[];
  afterPhotos: string[];
  documents: Record<string, string | null>;
  documentsStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
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
      };
    }
  | { type: 'SET_AVAILABILITY'; value: boolean }
  | { type: 'SET_PROFILE_STATUS'; value: 'pending' | 'approved' | 'rejected' }
  | { type: 'SET_JOBS'; jobs: DriverJob[] }
  | { type: 'HYDRATE'; value: Partial<DriverState> };

const STORAGE_KEY = 'ZIWAGO_DRIVER_STATE_V3';

const nowLabel = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `Aujourd'hui, ${hours}:${minutes}`;
};

const initialState: DriverState = {
  driverId: null,
  driverPhone: '',
  driverName: 'Laveur',
  rating: 4.9,
  availability: true,
  jobs: [],
  activeJobId: null,
  cashoutBalance: 0,
  onboardingDone: false,
  accountStep: 0,
  profileStatus: 'pending',
  beforePhotos: [],
  afterPhotos: [],
  documents: {
    id: null,
    profile: null,
    license: null,
    address: null,
    certificate: null,
  },
  documentsStatus: 'pending',
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
  service: job.service || 'Lavage',
  vehicle: job.vehicle || 'Vehicule',
  address: job.address || 'Adresse non renseignee',
  latitude: Number(job.latitude || 5.3364),
  longitude: Number(job.longitude || -4.0267),
  distanceKm: 2.5,
  etaMin: 12,
  price: Number(job.price || 0),
  scheduledAt: job.scheduled_at || nowLabel(),
  notes: undefined,
  status: statusFromApi(job.status),
  createdAt: nowLabel(),
  phone: job.customer_phone || '+225 00 00 00 00 00',
});

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
      };
    case 'SET_JOBS': {
      const firstActive = action.jobs.find((job) => activeStatuses.includes(job.status));
      const completedNet = action.jobs
        .filter((job) => job.status === 'completed')
        .reduce((sum, job) => sum + Math.round(job.price * 0.8), 0);
      return {
        ...state,
        jobs: action.jobs,
        activeJobId: firstActive?.id || null,
        cashoutBalance: completedNet,
      };
    }
    case 'ACCEPT_JOB': {
      const jobs = state.jobs.map((job) =>
        job.id === action.id ? { ...job, status: 'enRoute' as JobStatus } : job
      );
      return { ...state, jobs, activeJobId: action.id, beforePhotos: [], afterPhotos: [] };
    }
    case 'DECLINE_JOB': {
      const jobs = state.jobs.map((job) =>
        job.id === action.id ? { ...job, status: 'cancelled' as JobStatus } : job
      );
      return { ...state, jobs };
    }
    case 'ARRIVE_JOB': {
      const jobs = state.jobs.map((job) =>
        job.id === action.id ? { ...job, status: 'arrived' as JobStatus } : job
      );
      return { ...state, jobs, activeJobId: action.id };
    }
    case 'START_WASH': {
      const jobs = state.jobs.map((job) =>
        job.id === action.id ? { ...job, status: 'washing' as JobStatus } : job
      );
      return { ...state, jobs, activeJobId: action.id };
    }
    case 'COMPLETE_JOB': {
      const target = state.jobs.find((job) => job.id === action.id);
      const jobs = state.jobs.map((job) =>
        job.id === action.id ? { ...job, status: 'completed' as JobStatus } : job
      );
      return {
        ...state,
        jobs,
        activeJobId: null,
        cashoutBalance: state.cashoutBalance + Math.round((target?.price || 0) * 0.8),
        beforePhotos: [],
        afterPhotos: [],
      };
    }
    case 'CANCEL_JOB': {
      const jobs = state.jobs.map((job) =>
        job.id === action.id ? { ...job, status: 'cancelled' as JobStatus } : job
      );
      return { ...state, jobs, activeJobId: null, beforePhotos: [], afterPhotos: [] };
    }
    case 'SET_ONBOARDING_DONE':
      return { ...state, onboardingDone: action.value };
    case 'SET_ACCOUNT_STEP':
      return { ...state, accountStep: action.value };
    case 'SET_PROFILE_STATUS':
      return { ...state, profileStatus: action.value };
    case 'SET_DOCUMENT':
      return {
        ...state,
        documents: { ...state.documents, [action.id]: action.uri },
      };
    case 'SET_DOCUMENTS':
      return {
        ...state,
        documents: { ...state.documents, ...action.value },
      };
    case 'SET_DOCUMENTS_STATUS':
      return {
        ...state,
        documentsStatus: action.value,
      };
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
    case 'HYDRATE':
      return { ...state, ...action.value };
    default:
      return state;
  }
};

const DriverContext = createContext<{
  state: DriverState;
  dispatch: React.Dispatch<DriverAction>;
  hydrated: boolean;
  refreshJobsNow: (driverId?: number) => Promise<void>;
} | null>(null);

export const DriverProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(driverReducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  const refreshJobs = useCallback(async (driverId: number) => {
    const response = await getDriverJobs(driverId);
    dispatch({ type: 'SET_JOBS', jobs: response.jobs.map(mapApiJob) });
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
    if (!hydrated || !state.driverId) return;

    refreshJobs(state.driverId).catch(() => undefined);

    const interval = setInterval(() => {
      refreshJobs(state.driverId as number).catch(() => undefined);
    }, 5000);

    return () => clearInterval(interval);
  }, [hydrated, state.driverId, refreshJobs]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, hydrated]);

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

      if (action.type === 'ACCEPT_JOB' || action.type === 'DECLINE_JOB' || action.type === 'ARRIVE_JOB' || action.type === 'START_WASH' || action.type === 'COMPLETE_JOB' || action.type === 'CANCEL_JOB') {
        if (!driverId) return;
        try {
          if (action.type === 'ACCEPT_JOB') {
            await acceptJob(action.id, driverId);
          }
          if (action.type === 'DECLINE_JOB') {
            await declineJob(action.id, driverId);
          }
          if (action.type === 'ARRIVE_JOB') {
            await transitionJob(action.id, driverId, 'arrive');
          }
          if (action.type === 'START_WASH') {
            await transitionJob(action.id, driverId, 'start');
          }
          if (action.type === 'COMPLETE_JOB') {
            await transitionJob(action.id, driverId, 'complete');
          }
          if (action.type === 'CANCEL_JOB') {
            await transitionJob(action.id, driverId, 'cancel');
          }
          await refreshJobs(driverId);
        } catch {
          return;
        }
        return;
      }

      dispatch(action);
    },
    [state.driverId, state.availability, refreshJobs]
  );

  const refreshJobsNow = useCallback(
    async (driverId?: number) => {
      const targetId = driverId ?? state.driverId;
      if (!targetId) return;
      await refreshJobs(targetId);
    },
    [state.driverId, refreshJobs]
  );

  const value = useMemo(
    () => ({ state, dispatch: networkDispatch as React.Dispatch<DriverAction>, hydrated, refreshJobsNow }),
    [state, hydrated, networkDispatch, refreshJobsNow]
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
