import { ApiResponse, User, Sender, EmailJob, StatsSummary, ScheduleRequest, ScheduleResponse } from '../types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:4000/api');

async function fetcher<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Crucial for session/cookies
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, config);
  } catch (netErr: any) {
    const err = new Error(
      'Unable to connect to backend server. Make sure the backend is running at http://localhost:4000'
    ) as any;
    err.code = 'NETWORK_ERROR';
    err.status = 0;
    throw err;
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch (e) {
    // Plain response or empty body
  }

  if (!response.ok || data.success === false) {
    const errorMsg =
      data.error?.message || data.message || `HTTP Error ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg) as any;
    err.code = data.error?.code || (response.status === 401 ? 'UNAUTHORIZED' : 'API_ERROR');
    err.status = response.status;
    throw err;
  }

  return (data.user || data.data || data) as T;
}

export const api = {
  // Health API - always tests backend server connectivity via GET /api/health
  getHealth: () =>
    fetcher<{
      success: boolean;
      status: string;
      redis: string;
      database: string;
      oauth?: { google: string };
    }>('/health'),

  // Auth APIs
  getMe: async (): Promise<User | null> => {
    try {
      return await fetcher<User>('/auth/me');
    } catch (err: any) {
      if (err.status === 401 || err.code === 'UNAUTHORIZED') {
        return null; // Return null cleanly for unauthenticated users without raising errors
      }
      throw err;
    }
  },
  logout: () => fetcher<{ message: string }>('/auth/logout', { method: 'POST' }),
  devLogin: (email?: string, name?: string) =>
    fetcher<{ user: User; token: string }>('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    }),

  // Campaign APIs
  createCampaign: (data: ScheduleRequest) =>
    fetcher<ScheduleResponse>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Email & Stats APIs
  getStats: () => fetcher<StatsSummary>('/emails/stats'),
  getSenders: () => fetcher<Sender[]>('/emails/senders'),
  getScheduledEmails: (page = 1, search = '') =>
    fetcher<{ jobs: EmailJob[]; pagination: { page: number; total: number; totalPages: number } }>(
      `/emails/scheduled?page=${page}&search=${encodeURIComponent(search)}`
    ),
  getSentEmails: (page = 1, search = '', status = '') =>
    fetcher<{ jobs: EmailJob[]; pagination: { page: number; total: number; totalPages: number } }>(
      `/emails/sent?page=${page}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`
    ),
  getEmailById: (id: string) => fetcher<EmailJob>(`/emails/${id}`),
};
