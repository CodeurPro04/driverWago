import Constants from 'expo-constants';

const resolveApiBaseUrl = () => {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : null;
  if (host) {
    return `http://${host}:8000/api`;
  }

  return 'http://127.0.0.1:8000/api';
};

const API_BASE_URL = resolveApiBaseUrl();
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const absolutizeMediaUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  if (!/^https?:\/\//i.test(raw)) {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${API_ORIGIN}${path}`;
  }

  try {
    const source = new URL(raw);
    if (source.hostname === '127.0.0.1' || source.hostname === 'localhost') {
      const target = new URL(API_ORIGIN);
      source.protocol = target.protocol;
      source.hostname = target.hostname;
      source.port = target.port;
      return source.toString();
    }
    return source.toString();
  } catch {
    return raw;
  }
};

const normalizeDocuments = (documents?: Record<string, string | null> | null) => {
  if (!documents || typeof documents !== 'object') return {};
  return Object.fromEntries(
    Object.entries(documents).map(([key, value]) => [key, absolutizeMediaUrl(value)])
  );
};

const normalizeUser = (user: any) => {
  if (!user || typeof user !== 'object') return user;
  return {
    ...user,
    avatar_url: absolutizeMediaUrl(user.avatar_url),
    documents: normalizeDocuments(user.documents),
  };
};

const normalizeJob = (job: any) => {
  if (!job || typeof job !== 'object') return job;
  return {
    ...job,
    customer_avatar_url: absolutizeMediaUrl(job.customer_avatar_url),
    before_photos: Array.isArray(job.before_photos)
      ? job.before_photos.map((url: string) => absolutizeMediaUrl(url)).filter(Boolean)
      : [],
    after_photos: Array.isArray(job.after_photos)
      ? job.after_photos.map((url: string) => absolutizeMediaUrl(url)).filter(Boolean)
      : [],
  };
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers || {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Erreur API (${response.status})`);
  }
  return data as T;
}

export async function healthCheck() {
  return apiRequest<{ ok: boolean }>('/health');
}

export async function mobileLogin(payload: {
  phone: string;
  role: 'customer' | 'driver';
  name?: string;
}) {
  const response = await apiRequest<{
    user: {
      id: number;
      name: string;
      first_name?: string | null;
      last_name?: string | null;
      phone: string;
      email?: string | null;
      role: 'customer' | 'driver';
      wallet_balance: number;
      is_available: boolean;
      bio?: string | null;
      avatar_url?: string | null;
      membership?: string | null;
      rating?: number;
      profile_status?: string;
      account_step?: number;
      documents?: Record<string, string | null>;
      documents_status?: 'pending' | 'submitted' | 'approved' | 'rejected';
    };
  }>('/auth/mobile-login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { ...response, user: normalizeUser(response.user) };
}

export async function getDriverJobs(driverId: number) {
  const response = await apiRequest<{ jobs: any[] }>(`/drivers/${driverId}/jobs`);
  return { ...response, jobs: response.jobs.map(normalizeJob) };
}

export async function updateDriverAvailability(
  driverId: number,
  payload: { is_available: boolean; latitude?: number; longitude?: number }
) {
  return apiRequest(`/drivers/${driverId}/availability`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function acceptJob(bookingId: string, driverId: number) {
  return apiRequest(`/jobs/${bookingId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ driver_id: driverId }),
  });
}

export async function declineJob(bookingId: string, driverId: number) {
  return apiRequest(`/jobs/${bookingId}/decline`, {
    method: 'POST',
    body: JSON.stringify({ driver_id: driverId }),
  });
}

export async function transitionJob(
  bookingId: string,
  driverId: number,
  action: 'arrive' | 'start' | 'complete' | 'cancel'
) {
  return apiRequest(`/jobs/${bookingId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ driver_id: driverId, action }),
  });
}

export async function getUserProfile(userId: number) {
  const response = await apiRequest<{ user: any; stats: Record<string, number> }>(`/users/${userId}/profile`);
  return { ...response, user: normalizeUser(response.user) };
}

export async function updateUserProfile(
  userId: number,
  payload: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    bio: string;
    avatar_url: string;
    account_step: number;
    profile_status: 'pending' | 'approved' | 'rejected';
    is_available: boolean;
  }>
) {
  const response = await apiRequest<{ user: any; stats: Record<string, number> }>(`/users/${userId}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return { ...response, user: normalizeUser(response.user) };
}

export async function approveDriverProfile(driverId: number) {
  const response = await apiRequest<{ user: any; stats: Record<string, number> }>(`/drivers/${driverId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approved: true }),
  });
  return { ...response, user: normalizeUser(response.user) };
}

export async function uploadUserAvatar(userId: number, uri: string) {
  const form = new FormData();
  form.append('avatar', {
    uri,
    name: `avatar-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  const response = await apiRequest<{ user: any; stats: Record<string, number> }>(`/users/${userId}/avatar`, {
    method: 'POST',
    body: form,
  });
  return { ...response, user: normalizeUser(response.user) };
}

export async function uploadJobMedia(
  bookingId: string,
  driverId: number,
  stage: 'before' | 'after',
  uri: string
) {
  const form = new FormData();
  form.append('driver_id', String(driverId));
  form.append('stage', stage);
  form.append('photo', {
    uri,
    name: `${stage}-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  const response = await apiRequest<{ booking: any; uploaded_url: string }>(`/bookings/${bookingId}/media`, {
    method: 'POST',
    body: form,
  });
  return {
    ...response,
    booking: normalizeJob(response.booking),
    uploaded_url: absolutizeMediaUrl(response.uploaded_url) || response.uploaded_url,
  };
}

export async function uploadDriverDocument(driverId: number, type: string, uri: string) {
  const form = new FormData();
  form.append('type', type);
  form.append('file', {
    uri,
    name: `${type}-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  const response = await apiRequest<{ user: any; stats: Record<string, number> }>(`/drivers/${driverId}/documents`, {
    method: 'POST',
    body: form,
  });
  return { ...response, user: normalizeUser(response.user) };
}

export async function submitDriverDocuments(driverId: number) {
  const response = await apiRequest<{ user: any; stats: Record<string, number> }>(`/drivers/${driverId}/documents/submit`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return { ...response, user: normalizeUser(response.user) };
}

export { API_BASE_URL };
