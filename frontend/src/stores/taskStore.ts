import axios from 'axios';
import { create } from 'zustand';
import type { ArtTask, TaskCreatePayload, TaskStatus } from '../types';
import { taskApi } from '../services/api';

function errMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as { detail?: string } | string | undefined;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object' && typeof d.detail === 'string') return d.detail;
    return err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

interface TaskStore {
  tasks: ArtTask[];
  currentTask: ArtTask | null;
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;

  fetchTasks: (page?: number, status?: TaskStatus) => Promise<void>;
  fetchTask: (id: string) => Promise<void>;
  createTask: (data: TaskCreatePayload) => Promise<ArtTask>;
  deleteTask: (id: string) => Promise<void>;
  regenerateTask: (id: string, feedback?: string) => Promise<void>;
  clearError: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  currentTask: null,
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  error: null,

  fetchTasks: async (page = 1, status?: TaskStatus) => {
    set({ loading: true, error: null });
    try {
      const data = await taskApi.list({ page, page_size: get().pageSize, status });
      set({
        tasks: data.tasks,
        total: data.total,
        page: data.page,
        loading: false,
      });
    } catch (err: unknown) {
      set({ error: errMessage(err, '加载任务列表失败'), loading: false });
    }
  },

  fetchTask: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const task = await taskApi.get(id);
      set({ currentTask: task, loading: false });
    } catch (err: unknown) {
      set({ error: errMessage(err, '加载任务失败'), loading: false });
    }
  },

  createTask: async (data: TaskCreatePayload) => {
    set({ loading: true, error: null });
    try {
      const task = await taskApi.create(data);
      set((state) => ({
        tasks: [task, ...state.tasks],
        loading: false,
      }));
      return task;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      set({ error: message, loading: false });
      throw err;
    }
  },

  deleteTask: async (id: string) => {
    try {
      await taskApi.delete(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        total: state.total - 1,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      set({ error: message });
    }
  },

  regenerateTask: async (id: string, feedback?: string) => {
    set({ loading: true });
    try {
      const task = await taskApi.regenerate(id, feedback);
      set({ currentTask: task, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate';
      set({ error: message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
