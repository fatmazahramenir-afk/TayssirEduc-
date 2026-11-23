import type { Locale } from './i18n.ts';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface TayssirUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  status: 'active' | 'suspended';
  cycleId: string | null;
  yearId: string | null;
  streamId: string | null;
  subscriptionTier: 'free' | 'premium';
  subscriptionStatus: 'active' | 'inactive';
  subscriptionNote: string | null;
  preferredLocale: Locale;
  createdAt: string;
}

export interface CycleItem {
  id: string;
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  sort_order: number;
}

export interface YearItem {
  id: string;
  cycle_id: string;
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  has_streams: number;
  sort_order: number;
}

export interface StreamItem {
  id: string;
  year_id: string;
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  sort_order: number;
}

export interface SubjectItem {
  id: string;
  cycle_id: string;
  year_id: string;
  stream_id: string | null;
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  coefficient: number;
}

export interface PlatformSettings {
  contactEmail: string | null;
  contactPhone: string | null;
  telegramUrl: string | null;
  telegramLabel: string | null;
}

export interface PublicOverviewResponse {
  cycles: CycleItem[];
  years: YearItem[];
  streams: StreamItem[];
  stats: {
    subjectsCount: number;
    publishedCoursesCount: number;
    publishedLessonsCount: number;
    publishedQuizzesCount: number;
  };
  settings: PlatformSettings;
}

export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) msg = data.error;
    } catch {
      // keep fallback
    }
    throw new ApiRequestError(msg, res.status);
  }

  return (await res.json()) as T;
}
