import axios from 'axios';
import type {
  ArtTask,
  AuthUser,
  AuditLogListResponse,
  TaskCreatePayload,
  TaskListResponse,
  TaskStatus,
  ComfyUIWorkflow,
  AnalyzeRequest,
  AnalyzeResponse,
  ChatSession,
  ChatSessionListItem,
  Skill,
  LlmOptionsResponse,
} from '../types';
import { getAccessToken, setAccessToken } from './authStorage';

const API_BASE_STORAGE_KEY = 'gameart_api_base';

export function getApiBaseUrl(): string {
  try {
    const s = localStorage.getItem(API_BASE_STORAGE_KEY);
    if (s && /^https?:\/\//i.test(s)) {
      return s.replace(/\/+$/, '');
    }
  } catch {
    /* ignore */
  }
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (env && env.length > 0) return env.replace(/\/+$/, '');
  return 'http://localhost:8000/api';
}

export function setApiBaseUrl(url: string): void {
  const u = url.trim().replace(/\/+$/, '');
  localStorage.setItem(API_BASE_STORAGE_KEY, u);
  api.defaults.baseURL = u;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const t = getAccessToken();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const url = String(err.config?.url || '');
      if (!url.includes('/auth/login')) {
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          if (window.location.protocol === 'file:') {
            try {
              const raw = window.location.hash.slice(1) || '/';
              const pathOnly = raw.split('?')[0] || '/';
              if (pathOnly !== '/login') {
                sessionStorage.setItem('aaaflow_login_return', pathOnly);
              }
            } catch {
              /* ignore */
            }
            window.location.hash = '#/login';
          } else {
            window.location.assign(`${window.location.origin}${window.location.pathname.replace(/\/$/, '')}/login`);
          }
        }
      }
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  login: (username: string, password: string) =>
    api
      .post<{ access_token: string; token_type: string }>('/auth/login', {
        username,
        password,
      })
      .then((r) => r.data),

  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
};

export const taskApi = {
  create: (data: TaskCreatePayload) =>
    api.post<ArtTask>('/tasks', data).then((r) => r.data),

  list: (params?: { page?: number; page_size?: number; status?: TaskStatus }) =>
    api.get<TaskListResponse>('/tasks', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<ArtTask>(`/tasks/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<ArtTask>) =>
    api.patch<ArtTask>(`/tasks/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/tasks/${id}`),

  regenerate: (id: string, feedback?: string) =>
    api.post<ArtTask>(`/tasks/${id}/regenerate`, null, {
      params: feedback ? { feedback } : undefined,
    }).then((r) => r.data),

  submitFeedback: (
    taskId: string,
    resultId: string,
    data: { rating?: number; feedback?: string; is_selected?: boolean },
  ) =>
    api.post(`/tasks/${taskId}/results/${resultId}/feedback`, data),
};

export const workflowApi = {
  list: (activeOnly = true) =>
    api.get<ComfyUIWorkflow[]>('/workflows', {
      params: { active_only: activeOnly },
    }).then((r) => r.data),

  get: (id: string) =>
    api.get<ComfyUIWorkflow>(`/workflows/${id}`).then((r) => r.data),

  create: (data: Partial<ComfyUIWorkflow>) =>
    api.post<ComfyUIWorkflow>('/workflows', data).then((r) => r.data),

  update: (id: string, data: Partial<ComfyUIWorkflow>) =>
    api.patch<ComfyUIWorkflow>(`/workflows/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/workflows/${id}`),
};

export const uploadApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await api.post<{ filename: string; url: string }>(
      '/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return resp.data;
  },
};

export const chatApi = {
  llmOptions: () =>
    api.get<LlmOptionsResponse>('/chat/llm-options').then((r) => r.data),

  createSession: (data?: {
    title?: string;
    task_id?: string;
    llm_provider?: string;
    llm_model?: string;
  }) => {
    const body: Record<string, unknown> = { ...(data || {}) };
    if (body.llm_model === '' || body.llm_model === undefined) {
      delete body.llm_model;
    }
    return api.post<ChatSession>('/chat/sessions', body).then((r) => r.data);
  },

  listSessions: (limit = 50) =>
    api.get<ChatSessionListItem[]>('/chat/sessions', { params: { limit } }).then((r) => r.data),

  getSession: (id: string) =>
    api.get<ChatSession>(`/chat/sessions/${id}`).then((r) => r.data),

  deleteSession: (id: string) =>
    api.delete(`/chat/sessions/${id}`),

  sendMessage: (sessionId: string, content: string, imageUrls: string[] = []) => {
    const baseUrl = api.defaults.baseURL || '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const t = getAccessToken();
    if (t) headers.Authorization = `Bearer ${t}`;
    return fetch(`${baseUrl}/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content, image_urls: imageUrls }),
    });
  },

  listSkills: () =>
    api.get<{ skills: Skill[] }>('/chat/skills').then((r) => r.data.skills),
};

export const analyzeApi = {
  analyze: (data: AnalyzeRequest) =>
    api.post<AnalyzeResponse>('/analyze', data).then((r) => r.data),

  providers: () =>
    api.get<{ providers: Array<{ provider: string; available: boolean; mode: string }> }>(
      '/analyze/providers',
    ).then((r) => r.data),
};

export const auditApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get<AuditLogListResponse>('/audit/logs', { params }).then((r) => r.data),

  exportCsvBlob: (limit = 5000) =>
    api
      .get<Blob>('/audit/logs/export', {
        params: { limit },
        responseType: 'blob',
      })
      .then((r) => r.data),
};

export const healthApi = {
  check: () => api.get('/health').then((r) => r.data),
  detailed: () => api.get('/health/detailed').then((r) => r.data),
};

export interface SystemStatsResponse {
  tasks: {
    total: number;
    pending: number;
    generating: number;
    completed: number;
    failed: number;
  };
  users: { total: number };
  available_providers: unknown[];
}

export const systemApi = {
  stats: () => api.get<SystemStatsResponse>('/system/stats').then((r) => r.data),
  config: () => api.get<Record<string, unknown>>('/system/config').then((r) => r.data),
};

export interface UserListResponse {
  users: AuthUser[];
  total: number;
  page: number;
  page_size: number;
}

export const userApi = {
  list: (params?: { page?: number; page_size?: number; role?: string }) =>
    api.get<UserListResponse>('/users', { params }).then((r) => r.data),
  get: (id: string) => api.get<AuthUser>(`/users/${id}`).then((r) => r.data),
  create: (data: { username: string; email: string; password: string; full_name?: string; department?: string }) =>
    api.post<AuthUser>('/users', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<AuthUser>(`/users/${id}`, data).then((r) => r.data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
  profile: () => api.get<AuthUser>('/users/me/profile').then((r) => r.data),
};

export interface AuditLogEntry {
  id: string;
  user_id?: string;
  username?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  detail?: string;
  ip_address?: string;
  created_at: string;
}

export interface AuditLogPageResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
}

export const auditApiV2 = {
  list: (params?: { page?: number; page_size?: number; action?: string; resource_type?: string; user_id?: string }) =>
    api.get<AuditLogPageResponse>('/audit', { params }).then((r) => r.data),
};

export default api;

export type { AuthUser } from '../types';
