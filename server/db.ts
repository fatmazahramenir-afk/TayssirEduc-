import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { seedOfficialAlgerianTaxonomy } from './seed-algerian.ts';

export type UserRole = 'student' | 'teacher' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type SubscriptionTier = 'free' | 'premium';
export type SupportedLocale = 'ar' | 'fr' | 'en';

export interface DbUser {
  id: string;
  role: UserRole;
  full_name: string;
  full_name_norm: string;
  email: string | null;
  password_hash: string;
  status: AccountStatus;
  cycle_id: string | null;
  year_id: string | null;
  stream_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: 'active' | 'inactive';
  subscription_note: string | null;
  preferred_locale: SupportedLocale;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  status: AccountStatus;
  cycleId: string | null;
  yearId: string | null;
  streamId: string | null;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: 'active' | 'inactive';
  subscriptionNote: string | null;
  preferredLocale: SupportedLocale;
  createdAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'tayssir.db');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cycles (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS years (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    has_streams INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS streams (
    id TEXT PRIMARY KEY,
    year_id TEXT NOT NULL REFERENCES years(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    year_id TEXT NOT NULL REFERENCES years(id) ON DELETE CASCADE,
    stream_id TEXT REFERENCES streams(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    coefficient INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin')),
    full_name TEXT NOT NULL,
    full_name_norm TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
    cycle_id TEXT REFERENCES cycles(id) ON DELETE SET NULL,
    year_id TEXT REFERENCES years(id) ON DELETE SET NULL,
    stream_id TEXT REFERENCES streams(id) ON DELETE SET NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK(subscription_tier IN ('free', 'premium')),
    subscription_status TEXT NOT NULL DEFAULT 'active' CHECK(subscription_status IN ('active', 'inactive')),
    subscription_note TEXT,
    preferred_locale TEXT NOT NULL DEFAULT 'ar' CHECK(preferred_locale IN ('ar', 'fr', 'en')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_name
    ON users(full_name_norm) WHERE role = 'student';

  CREATE TABLE IF NOT EXISTS teacher_subjects (
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    access_tier TEXT NOT NULL DEFAULT 'free' CHECK(access_tier IN ('free', 'premium')),
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    objectives TEXT NOT NULL,
    explanation TEXT NOT NULL,
    key_concepts_json TEXT NOT NULL DEFAULT '[]',
    applied_examples_json TEXT NOT NULL DEFAULT '[]',
    exercises_solutions_json TEXT NOT NULL DEFAULT '[]',
    summary TEXT NOT NULL DEFAULT '',
    resources_json TEXT NOT NULL DEFAULT '[]',
    media_url TEXT,
    access_tier TEXT NOT NULL DEFAULT 'free' CHECK(access_tier IN ('free', 'premium')),
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE (student_id, course_id)
  );

  CREATE TABLE IF NOT EXISTS lesson_progress (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    completed INTEGER NOT NULL DEFAULT 1,
    completed_at TEXT NOT NULL,
    UNIQUE (student_id, lesson_id)
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    pass_score INTEGER NOT NULL DEFAULT 60,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    options_json TEXT NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers_json TEXT NOT NULL,
    score REAL NOT NULL,
    max_score REAL NOT NULL,
    percentage INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    submitted_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role_target TEXT CHECK(role_target IN ('student', 'teacher', 'admin') OR role_target IS NULL),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

seedOfficialAlgerianTaxonomy(db);

// Ephemeral fallback if SESSION_SECRET env var is absent (never hardcoded static secret)
const SESSION_SIGNING_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  } catch {
    return false;
  }
}

export interface SessionPayload {
  uid: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export function signSessionToken(uid: string, role: UserRole): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid,
    role,
    iat: now,
    exp: now + 60 * 60 * 12, // 12 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  try {
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SIGNING_SECRET)
      .update(encoded)
      .digest('base64url');
    const sigBuf = Buffer.from(sig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.uid || !decoded.role || decoded.exp <= now) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function toSafeUser(row: DbUser): SafeUser {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    email: row.email,
    status: row.status,
    cycleId: row.cycle_id,
    yearId: row.year_id,
    streamId: row.stream_id,
    subscriptionTier: row.subscription_tier,
    subscriptionStatus: row.subscription_status,
    subscriptionNote: row.subscription_note,
    preferredLocale: row.preferred_locale,
    createdAt: row.created_at,
  };
}

export function getPublicPlatformSettings(): {
  contactEmail: string | null;
  contactPhone: string | null;
  telegramUrl: string | null;
  telegramLabel: string | null;
} {
  const rows = db.prepare('SELECT key, value FROM platform_settings').all() as Array<{
    key: string;
    value: string;
  }>;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    contactEmail: map.get('contact_email') || null,
    contactPhone: map.get('contact_phone') || null,
    telegramUrl: map.get('telegram_url') || null,
    telegramLabel: map.get('telegram_label') || null,
  };
}
