import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  driverName: string;
  rating: number;
  availability: boolean;
  jobs: DriverJob[];
  activeJobId: string | null;
  cashoutBalance: number;
  onboardingDone: boolean;
  accountStep: number;
  beforePhotos: string[];
  afterPhotos: string[];
  documents: Record<string, string | null>;
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
  | { type: 'SET_BEFORE_PHOTO'; index: number; uri: string }
  | { type: 'SET_AFTER_PHOTO'; index: number; uri: string }
  | { type: 'HYDRATE'; value: Partial<DriverState> };

const STORAGE_KEY = 'ZIWAGO_DRIVER_STATE_V1';

const nowLabel = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `Aujourd'hui, ${hours}:${minutes}`;
};

const initialJobs: DriverJob[] = [
  {
    id: 'job-1001',
    customerName: 'Amadou K.',
    service: 'Lavage complet',
    vehicle: 'SUV - Toyota Prado',
    address: 'Riviera 2, Carrefour Duncan',
    latitude: 5.3482,
    longitude: -4.0212,
    distanceKm: 2.4,
    etaMin: 12,
    price: 5500,
    scheduledAt: nowLabel(),
    notes: 'Parking intérieur, portail blanc.',
    status: 'enRoute',
    createdAt: nowLabel(),
    phone: '+225 07 12 34 56 78',
  },
  {
    id: 'job-1002',
    customerName: 'Mariam B.',
    service: 'Extérieur uniquement',
    vehicle: 'Berline - Peugeot 301',
    address: 'Cocody Angre 8e Tranche',
    latitude: 5.3591,
    longitude: -4.0115,
    distanceKm: 4.1,
    etaMin: 18,
    price: 2500,
    scheduledAt: "Aujourd'hui, 16:30",
    status: 'pending',
    createdAt: "Aujourd'hui, 15:55",
    phone: '+225 05 56 78 12 90',
  },
  {
    id: 'job-1003',
    customerName: 'Ghislain Y.',
    service: 'Intérieur uniquement',
    vehicle: 'Compacte - Kia Picanto',
    address: 'Plateau, Tour BNI',
    latitude: 5.3267,
    longitude: -4.0196,
    distanceKm: 6.8,
    etaMin: 25,
    price: 3000,
    scheduledAt: 'Demain, 09:30',
    status: 'pending',
    createdAt: "Aujourd'hui, 15:20",
    phone: '+225 01 02 03 04 05',
  },
  {
    id: 'job-0994',
    customerName: 'Alex D.',
    service: 'Lavage complet',
    vehicle: 'Berline - Mazda 6',
    address: 'Marcory Zone 4',
    latitude: 5.2929,
    longitude: -3.9998,
    distanceKm: 3.2,
    etaMin: 14,
    price: 5000,
    scheduledAt: "Aujourd'hui, 10:15",
    status: 'completed',
    createdAt: "Aujourd'hui, 09:40",
    phone: '+225 07 10 20 30 40',
  },
];

const initialState: DriverState = {
  driverName: 'Ibrahim',
  rating: 4.9,
  availability: true,
  jobs: initialJobs,
  activeJobId: 'job-1001',
  cashoutBalance: 18500,
  onboardingDone: false,
  accountStep: 0,
  beforePhotos: [],
  afterPhotos: [],
  documents: {
    id: null,
    profile: null,
    license: null,
    address: null,
    certificate: null,
  },
};

const updateJob = (jobs: DriverJob[], id: string, patch: Partial<DriverJob>) =>
  jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));

const driverReducer = (state: DriverState, action: DriverAction): DriverState => {
  switch (action.type) {
    case 'TOGGLE_AVAILABILITY':
      return { ...state, availability: !state.availability };
    case 'ACCEPT_JOB': {
      const jobs = updateJob(state.jobs, action.id, { status: 'enRoute' });
      return { ...state, jobs, activeJobId: action.id, beforePhotos: [], afterPhotos: [] };
    }
    case 'DECLINE_JOB': {
      const jobs = updateJob(state.jobs, action.id, { status: 'cancelled' });
      return { ...state, jobs };
    }
    case 'ARRIVE_JOB': {
      const jobs = updateJob(state.jobs, action.id, { status: 'arrived' });
      return { ...state, jobs, activeJobId: action.id };
    }
    case 'START_WASH': {
      const jobs = updateJob(state.jobs, action.id, { status: 'washing' });
      return { ...state, jobs, activeJobId: action.id };
    }
    case 'COMPLETE_JOB': {
      const target = state.jobs.find((job) => job.id === action.id);
      const jobs = updateJob(state.jobs, action.id, { status: 'completed' });
      return {
        ...state,
        jobs,
        activeJobId: null,
        cashoutBalance: state.cashoutBalance + (target?.price ?? 0),
        beforePhotos: [],
        afterPhotos: [],
      };
    }
    case 'CANCEL_JOB': {
      const jobs = updateJob(state.jobs, action.id, { status: 'cancelled' });
      return { ...state, jobs, activeJobId: null, beforePhotos: [], afterPhotos: [] };
    }
    case 'SET_ONBOARDING_DONE':
      return { ...state, onboardingDone: action.value };
    case 'SET_ACCOUNT_STEP':
      return { ...state, accountStep: action.value };
    case 'SET_DOCUMENT':
      return {
        ...state,
        documents: { ...state.documents, [action.id]: action.uri },
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
} | null>(null);

export const DriverProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(driverReducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<DriverState>;
          dispatch({ type: 'HYDRATE', value: parsed });
        }
      } catch (error) {
        // ignore storage errors
      } finally {
        setHydrated(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const persist = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        // ignore storage errors
      }
    };
    persist();
  }, [state, hydrated]);

  const value = useMemo(() => ({ state, dispatch, hydrated }), [state, hydrated]);
  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
};

export const useDriverStore = () => {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDriverStore must be used within DriverProvider');
  }
  return context;
};
