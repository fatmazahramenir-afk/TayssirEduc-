import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  db,
  getPublicPlatformSettings,
  hashPassword,
  normalizeName,
  signSessionToken,
  toSafeUser,
  verifyPassword,
  verifySessionToken,
  type DbUser,
  type SupportedLocale,
  type UserRole,
} from './server/db.ts';
import { seedSampleOfficialUnitsForAdmin } from './server/seed-algerian.ts';

interface AuthedRequest extends Request {
  authUser?: DbUser;
}

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function sanitizeSafeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString().slice(0, 1024);
    }
    return null;
  } catch {
    return null;
  }
}

function parseJsonArray<T>(raw: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = header.slice(7).trim();
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid) as unknown as DbUser | undefined;
  if (!user || user.status !== 'active') {
    res.status(401).json({ error: 'Account unavailable or suspended' });
    return;
  }
  req.authUser = user;
  next();
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action' });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: 'connected' });
  });

  // Public overview (no protected lessons, no quiz questions, no PII)
  app.get('/api/public/overview', (_req, res) => {
    const cycles = db.prepare('SELECT id, code, name_ar, name_fr, name_en, sort_order FROM cycles ORDER BY sort_order').all();
    const years = db.prepare('SELECT id, cycle_id, code, name_ar, name_fr, name_en, has_streams, sort_order FROM years ORDER BY sort_order').all();
    const streams = db.prepare('SELECT id, year_id, code, name_ar, name_fr, name_en, sort_order FROM streams ORDER BY sort_order').all();
    const subjectsCount = (db.prepare('SELECT COUNT(*) as cnt FROM subjects').get() as { cnt: number }).cnt;
    const publishedCoursesCount = (db.prepare('SELECT COUNT(*) as cnt FROM courses WHERE is_published = 1').get() as { cnt: number }).cnt;
    const publishedLessonsCount = (db.prepare('SELECT COUNT(*) as cnt FROM lessons WHERE is_published = 1').get() as { cnt: number }).cnt;
    const publishedQuizzesCount = (db.prepare('SELECT COUNT(*) as cnt FROM quizzes WHERE is_published = 1').get() as { cnt: number }).cnt;
    const settings = getPublicPlatformSettings();

    res.json({
      cycles,
      years,
      streams,
      stats: {
        subjectsCount,
        publishedCoursesCount,
        publishedLessonsCount,
        publishedQuizzesCount,
      },
      settings,
    });
  });

  // Bootstrap status
  app.get('/api/auth/bootstrap-status', (_req, res) => {
    const adminRow = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'").get() as { cnt: number };
    const envSecret = process.env.TAYSSIR_ADMIN_BOOTSTRAP_SECRET;
    res.json({
      needsAdminBootstrap: adminRow.cnt === 0,
      requiresBootstrapSecret: Boolean(envSecret && envSecret.trim().length > 0),
    });
  });

  // Secure one-time Admin Bootstrap (no hardcoded admin credentials in code)
  app.post('/api/auth/bootstrap-admin', (req, res) => {
    const existingAdmin = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'").get() as { cnt: number };
    if (existingAdmin.cnt > 0) {
      res.status(403).json({ error: 'Initial administrator is already configured.' });
      return;
    }

    const envSecret = process.env.TAYSSIR_ADMIN_BOOTSTRAP_SECRET;
    if (envSecret && envSecret.trim().length > 0) {
      const provided = typeof req.body?.bootstrapSecret === 'string' ? req.body.bootstrapSecret : '';
      const a = Buffer.from(provided, 'utf8');
      const b = Buffer.from(envSecret, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(403).json({ error: 'Invalid bootstrap secret key.' });
        return;
      }
    }

    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const locale = (['ar', 'fr', 'en'].includes(req.body?.preferredLocale) ? req.body.preferredLocale : 'ar') as SupportedLocale;

    if (fullName.length < 3 || fullName.length > 120) {
      res.status(400).json({ error: 'Full name must be between 3 and 120 characters.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'A valid administrator email address is required.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Administrator password must be at least 8 characters.' });
      return;
    }

    const emailTaken = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
    if (emailTaken) {
      res.status(409).json({ error: 'Email is already registered.' });
      return;
    }

    const now = new Date().toISOString();
    const id = makeId('adm');
    const pwHash = hashPassword(password);

    db.prepare(`
      INSERT INTO users (
        id, role, full_name, full_name_norm, email, password_hash, status,
        subscription_tier, subscription_status, preferred_locale, created_at, updated_at
      ) VALUES (?, 'admin', ?, ?, ?, ?, 'active', 'premium', 'active', ?, ?, ?)
    `).run(id, fullName, normalizeName(fullName), email, pwHash, locale, now, now);

    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('admin_bootstrapped', '1')").run();

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as DbUser;
    const token = signSessionToken(userRow.id, userRow.role);
    res.status(201).json({ token, user: toSafeUser(userRow) });
  });

  // Public registration: strictly student or teacher (NEVER admin)
  app.post('/api/auth/register', (req, res) => {
    const requestedRole = req.body?.accountType;
    if (requestedRole === 'admin') {
      res.status(403).json({ error: 'Administrator accounts cannot be created via public registration.' });
      return;
    }
    if (requestedRole !== 'student' && requestedRole !== 'teacher') {
      res.status(400).json({ error: 'Invalid account type.' });
      return;
    }

    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const locale = (['ar', 'fr', 'en'].includes(req.body?.preferredLocale) ? req.body.preferredLocale : 'ar') as SupportedLocale;

    if (fullName.length < 3 || fullName.length > 120) {
      res.status(400).json({ error: 'Full name must be between 3 and 120 characters.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const now = new Date().toISOString();
    const normName = normalizeName(fullName);

    if (requestedRole === 'student') {
      const existingStudent = db
        .prepare("SELECT id FROM users WHERE role = 'student' AND full_name_norm = ?")
        .get(normName);
      if (existingStudent) {
        res.status(409).json({ error: 'A student account with this full name already exists.' });
        return;
      }

      const cycleId = typeof req.body?.cycleId === 'string' && req.body.cycleId ? req.body.cycleId : null;
      const yearId = typeof req.body?.yearId === 'string' && req.body.yearId ? req.body.yearId : null;
      const streamId = typeof req.body?.streamId === 'string' && req.body.streamId ? req.body.streamId : null;

      if (cycleId && !db.prepare('SELECT id FROM cycles WHERE id = ?').get(cycleId)) {
        res.status(400).json({ error: 'Invalid cycle selected.' });
        return;
      }
      if (yearId && !db.prepare('SELECT id FROM years WHERE id = ?').get(yearId)) {
        res.status(400).json({ error: 'Invalid year selected.' });
        return;
      }
      if (streamId && !db.prepare('SELECT id FROM streams WHERE id = ?').get(streamId)) {
        res.status(400).json({ error: 'Invalid stream selected.' });
        return;
      }

      const id = makeId('stu');
      db.prepare(`
        INSERT INTO users (
          id, role, full_name, full_name_norm, email, password_hash, status,
          cycle_id, year_id, stream_id, subscription_tier, subscription_status,
          preferred_locale, created_at, updated_at
        ) VALUES (?, 'student', ?, ?, NULL, ?, 'active', ?, ?, ?, 'free', 'active', ?, ?, ?)
      `).run(id, fullName, normName, hashPassword(password), cycleId, yearId, streamId, locale, now, now);

      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as DbUser;
      const token = signSessionToken(userRow.id, userRow.role);
      res.status(201).json({ token, user: toSafeUser(userRow) });
      return;
    }

    // Teacher registration
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'A valid email address is required for teacher accounts.' });
      return;
    }
    if (db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const id = makeId('tch');
    db.prepare(`
      INSERT INTO users (
        id, role, full_name, full_name_norm, email, password_hash, status,
        subscription_tier, subscription_status, preferred_locale, created_at, updated_at
      ) VALUES (?, 'teacher', ?, ?, ?, ?, 'active', 'free', 'active', ?, ?, ?)
    `).run(id, fullName, normName, email, hashPassword(password), locale, now, now);

    if (Array.isArray(req.body?.subjectIds)) {
      const insertSubj = db.prepare('INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)');
      for (const sid of req.body.subjectIds.slice(0, 12)) {
        if (typeof sid === 'string' && db.prepare('SELECT id FROM subjects WHERE id = ?').get(sid)) {
          insertSubj.run(id, sid);
        }
      }
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as DbUser;
    const token = signSessionToken(userRow.id, userRow.role);
    res.status(201).json({ token, user: toSafeUser(userRow) });
  });

  // Unified Login
  app.post('/api/auth/login', (req, res) => {
    const accountType = req.body?.accountType as UserRole | undefined;
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (accountType !== 'student' && accountType !== 'teacher' && accountType !== 'admin') {
      res.status(400).json({ error: 'Please select a valid account type.' });
      return;
    }
    if (!fullName || !password) {
      res.status(400).json({ error: 'All required credentials must be provided.' });
      return;
    }

    let user: DbUser | undefined;
    if (accountType === 'student') {
      user = db
        .prepare("SELECT * FROM users WHERE role = 'student' AND full_name_norm = ?")
        .get(normalizeName(fullName)) as unknown as DbUser | undefined;
    } else {
      if (!email) {
        res.status(400).json({ error: 'Email is required for teacher and administrator sign-in.' });
        return;
      }
      user = db
        .prepare('SELECT * FROM users WHERE LOWER(email) = ?')
        .get(email) as unknown as DbUser | undefined;
    }

    if (!user || user.role !== accountType || user.full_name_norm !== normalizeName(fullName)) {
      res.status(401).json({ error: 'Invalid credentials or account role mismatch.' });
      return;
    }
    if (!verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials or account role mismatch.' });
      return;
    }
    if (user.status !== 'active') {
      res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      return;
    }

    const token = signSessionToken(user.id, user.role);
    res.json({ token, user: toSafeUser(user) });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: toSafeUser(req.authUser!) });
  });

  app.patch('/api/auth/preferences', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const now = new Date().toISOString();
    const locale = ['ar', 'fr', 'en'].includes(req.body?.preferredLocale)
      ? (req.body.preferredLocale as SupportedLocale)
      : user.preferred_locale;

    let cycleId = user.cycle_id;
    let yearId = user.year_id;
    let streamId = user.stream_id;

    if (user.role === 'student') {
      if (req.body?.cycleId !== undefined) {
        cycleId = req.body.cycleId && db.prepare('SELECT id FROM cycles WHERE id = ?').get(req.body.cycleId) ? req.body.cycleId : null;
      }
      if (req.body?.yearId !== undefined) {
        yearId = req.body.yearId && db.prepare('SELECT id FROM years WHERE id = ?').get(req.body.yearId) ? req.body.yearId : null;
      }
      if (req.body?.streamId !== undefined) {
        streamId = req.body.streamId && db.prepare('SELECT id FROM streams WHERE id = ?').get(req.body.streamId) ? req.body.streamId : null;
      }
    }

    db.prepare(
      'UPDATE users SET preferred_locale = ?, cycle_id = ?, year_id = ?, stream_id = ?, updated_at = ? WHERE id = ?'
    ).run(locale, cycleId, yearId, streamId, now, user.id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as unknown as DbUser;
    res.json({ user: toSafeUser(updated) });
  });

  // Protected Curriculum Tree
  app.get('/api/curriculum', requireAuth, (_req, res) => {
    const cycles = db.prepare('SELECT * FROM cycles ORDER BY sort_order').all();
    const years = db.prepare('SELECT * FROM years ORDER BY sort_order').all();
    const streams = db.prepare('SELECT * FROM streams ORDER BY sort_order').all();
    const subjects = db.prepare('SELECT * FROM subjects ORDER BY coefficient DESC, code ASC').all();
    res.json({ cycles, years, streams, subjects });
  });

  // Protected Courses List
  app.get('/api/courses', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const cycleId = typeof req.query.cycleId === 'string' ? req.query.cycleId : '';
    const yearId = typeof req.query.yearId === 'string' ? req.query.yearId : '';
    const streamId = typeof req.query.streamId === 'string' ? req.query.streamId : '';
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    const rows = db.prepare(`
      SELECT
        c.*,
        u.full_name as teacher_name,
        s.name_ar as subject_name_ar,
        s.name_fr as subject_name_fr,
        s.name_en as subject_name_en,
        s.code as subject_code,
        s.coefficient as subject_coefficient,
        s.cycle_id,
        s.year_id,
        s.stream_id,
        y.name_ar as year_name_ar,
        y.name_fr as year_name_fr,
        y.name_en as year_name_en,
        cy.name_ar as cycle_name_ar,
        cy.name_fr as cycle_name_fr,
        cy.name_en as cycle_name_en,
        st.name_ar as stream_name_ar,
        st.name_fr as stream_name_fr,
        st.name_en as stream_name_en,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND (c.teacher_id = ? OR ? = 'admin' OR l.is_published = 1)) as lessons_count,
        (SELECT COUNT(*) FROM quizzes qz WHERE qz.course_id = c.id AND (c.teacher_id = ? OR ? = 'admin' OR qz.is_published = 1)) as quizzes_count
      FROM courses c
      JOIN users u ON u.id = c.teacher_id
      JOIN subjects s ON s.id = c.subject_id
      JOIN years y ON y.id = s.year_id
      JOIN cycles cy ON cy.id = s.cycle_id
      LEFT JOIN streams st ON st.id = s.stream_id
      WHERE (c.is_published = 1 OR c.teacher_id = ? OR ? = 'admin')
      ORDER BY c.updated_at DESC
    `).all(user.id, user.role, user.id, user.role, user.id, user.role) as Array<Record<string, unknown>>;

    const enrollments = new Set(
      (db.prepare('SELECT course_id FROM enrollments WHERE student_id = ?').all(user.id) as Array<{ course_id: string }>).map(
        (e) => e.course_id
      )
    );
    const completedRows = db
      .prepare('SELECT course_id, COUNT(*) as cnt FROM lesson_progress WHERE student_id = ? AND completed = 1 GROUP BY course_id')
      .all(user.id) as Array<{ course_id: string; cnt: number }>;
    const completedMap = new Map(completedRows.map((r) => [r.course_id, r.cnt]));

    const filtered = rows
      .filter((r) => {
        if (cycleId && r.cycle_id !== cycleId) return false;
        if (yearId && r.year_id !== yearId) return false;
        if (streamId && r.stream_id !== streamId) return false;
        if (subjectId && r.subject_id !== subjectId) return false;
        if (q) {
          const hay = `${r.title} ${r.description} ${r.subject_name_ar} ${r.subject_name_fr} ${r.subject_name_en}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((r) => {
        const total = Number(r.lessons_count || 0);
        const done = completedMap.get(String(r.id)) || 0;
        const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;
        return {
          ...r,
          isEnrolled: enrollments.has(String(r.id)),
          completedLessonsCount: done,
          progressPercent,
        };
      });

    res.json({ courses: filtered });
  });

  // Protected Course Detail
  app.get('/api/courses/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const course = db.prepare(`
      SELECT
        c.*,
        u.full_name as teacher_name,
        s.name_ar as subject_name_ar,
        s.name_fr as subject_name_fr,
        s.name_en as subject_name_en,
        s.coefficient as subject_coefficient,
        s.cycle_id,
        s.year_id,
        s.stream_id,
        y.name_ar as year_name_ar,
        y.name_fr as year_name_fr,
        y.name_en as year_name_en,
        cy.name_ar as cycle_name_ar,
        cy.name_fr as cycle_name_fr,
        cy.name_en as cycle_name_en,
        st.name_ar as stream_name_ar,
        st.name_fr as stream_name_fr,
        st.name_en as stream_name_en
      FROM courses c
      JOIN users u ON u.id = c.teacher_id
      JOIN subjects s ON s.id = c.subject_id
      JOIN years y ON y.id = s.year_id
      JOIN cycles cy ON cy.id = s.cycle_id
      LEFT JOIN streams st ON st.id = s.stream_id
      WHERE c.id = ?
    `).get(req.params.id) as Record<string, unknown> | undefined;

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const canManage = user.role === 'admin' || (user.role === 'teacher' && course.teacher_id === user.id);
    if (!course.is_published && !canManage) {
      res.status(403).json({ error: 'Course is not published' });
      return;
    }

    const units = db
      .prepare('SELECT * FROM units WHERE course_id = ? ORDER BY sort_order ASC, created_at ASC')
      .all(req.params.id);

    const lessons = db
      .prepare(
        `SELECT id, unit_id, course_id, title, access_tier, sort_order, is_published, created_at, updated_at
         FROM lessons WHERE course_id = ? AND (? = 1 OR is_published = 1)
         ORDER BY sort_order ASC, created_at ASC`
      )
      .all(req.params.id, canManage ? 1 : 0);

    const quizzes = db
      .prepare(
        `SELECT id, course_id, lesson_id, title, description, duration_minutes, pass_score, is_published,
         (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = quizzes.id) as questions_count
         FROM quizzes WHERE course_id = ? AND (? = 1 OR is_published = 1)
         ORDER BY created_at DESC`
      )
      .all(req.params.id, canManage ? 1 : 0);

    const enrolled = Boolean(
      db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?').get(user.id, req.params.id)
    );
    const completedIds = (
      db.prepare('SELECT lesson_id FROM lesson_progress WHERE student_id = ? AND course_id = ? AND completed = 1').all(user.id, req.params.id) as Array<{ lesson_id: string }>
    ).map((r) => r.lesson_id);

    res.json({
      course,
      units,
      lessons,
      quizzes,
      isEnrolled: enrolled,
      completedLessonIds: completedIds,
    });
  });

  app.post('/api/courses/:id/enroll', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const course = db.prepare('SELECT id, is_published FROM courses WHERE id = ?').get(req.params.id) as { id: string; is_published: number } | undefined;
    if (!course || !course.is_published) {
      res.status(404).json({ error: 'Course not available' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare('INSERT OR IGNORE INTO enrollments (id, student_id, course_id, created_at) VALUES (?, ?, ?, ?)').run(
      makeId('enr'),
      user.id,
      course.id,
      now
    );
    res.json({ enrolled: true });
  });

  // Protected Lesson Content
  app.get('/api/lessons/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const lesson = db.prepare(`
      SELECT l.*, c.teacher_id, c.access_tier as course_access_tier, c.is_published as course_published, c.title as course_title
      FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = ?
    `).get(req.params.id) as Record<string, unknown> | undefined;

    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    const canManage = user.role === 'admin' || (user.role === 'teacher' && lesson.teacher_id === user.id);
    if ((!lesson.is_published || !lesson.course_published) && !canManage) {
      res.status(403).json({ error: 'Lesson is not published yet' });
      return;
    }

    const requiresPremium = lesson.access_tier === 'premium' || lesson.course_access_tier === 'premium';
    const hasPremium = user.subscription_tier === 'premium' && user.subscription_status === 'active';
    if (requiresPremium && !canManage && !hasPremium) {
      res.status(403).json({ error: 'This lesson requires an active Premium subscription activated by the administration.' });
      return;
    }

    const courseLessons = db
      .prepare(
        `SELECT id, title FROM lessons WHERE course_id = ? AND (? = 1 OR is_published = 1) ORDER BY sort_order ASC, created_at ASC`
      )
      .all(String(lesson.course_id), canManage ? 1 : 0) as Array<{ id: string; title: string }>;
    const idx = courseLessons.findIndex((l) => l.id === lesson.id);
    const prevLesson = idx > 0 ? courseLessons[idx - 1] : null;
    const nextLesson = idx >= 0 && idx < courseLessons.length - 1 ? courseLessons[idx + 1] : null;

    const lessonIdStr = String(lesson.id);
    const progress = db
      .prepare('SELECT completed FROM lesson_progress WHERE student_id = ? AND lesson_id = ?')
      .get(user.id, lessonIdStr) as { completed: number } | undefined;

    const linkedQuizzes = db
      .prepare('SELECT id, title, duration_minutes, pass_score FROM quizzes WHERE lesson_id = ? AND is_published = 1')
      .all(lessonIdStr);

    res.json({
      lesson: {
        id: lesson.id,
        unitId: lesson.unit_id,
        courseId: lesson.course_id,
        courseTitle: lesson.course_title,
        title: lesson.title,
        objectives: lesson.objectives,
        explanation: lesson.explanation,
        keyConcepts: parseJsonArray<string>(String(lesson.key_concepts_json || '[]'), []),
        appliedExamples: parseJsonArray<string>(String(lesson.applied_examples_json || '[]'), []),
        exercisesSolutions: parseJsonArray<{ question: string; solution: string }>(
          String(lesson.exercises_solutions_json || '[]'),
          []
        ),
        summary: lesson.summary,
        resources: parseJsonArray<{ label: string; url: string }>(String(lesson.resources_json || '[]'), []),
        mediaUrl: lesson.media_url,
        accessTier: lesson.access_tier,
        isPublished: Boolean(lesson.is_published),
      },
      isCompleted: Boolean(progress?.completed),
      prevLesson,
      nextLesson,
      linkedQuizzes,
    });
  });

  app.post('/api/lessons/:id/complete', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const lesson = db.prepare(`
      SELECT l.id, l.course_id, l.access_tier, l.is_published, c.teacher_id, c.access_tier as course_access_tier, c.is_published as course_published
      FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = ?
    `).get(req.params.id) as
      | {
          id: string;
          course_id: string;
          access_tier: string;
          is_published: number;
          teacher_id: string;
          course_access_tier: string;
          course_published: number;
        }
      | undefined;
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }
    const canManage = user.role === 'admin' || (user.role === 'teacher' && lesson.teacher_id === user.id);
    if ((!lesson.is_published || !lesson.course_published) && !canManage) {
      res.status(403).json({ error: 'Lesson is not published yet' });
      return;
    }
    const requiresPremium = lesson.access_tier === 'premium' || lesson.course_access_tier === 'premium';
    const hasPremium = user.subscription_tier === 'premium' && user.subscription_status === 'active';
    if (requiresPremium && !canManage && !hasPremium) {
      res.status(403).json({ error: 'This lesson requires an active Premium subscription activated by the administration.' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare('INSERT OR IGNORE INTO enrollments (id, student_id, course_id, created_at) VALUES (?, ?, ?, ?)').run(
      makeId('enr'),
      user.id,
      lesson.course_id,
      now
    );
    db.prepare(
      `INSERT INTO lesson_progress (id, student_id, lesson_id, course_id, completed, completed_at)
       VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT(student_id, lesson_id) DO UPDATE SET completed = 1, completed_at = excluded.completed_at`
    ).run(makeId('prog'), user.id, lesson.id, lesson.course_id, now);

    const totalRow = db
      .prepare('SELECT COUNT(*) as cnt FROM lessons WHERE course_id = ? AND is_published = 1')
      .get(lesson.course_id) as { cnt: number };
    const doneRow = db
      .prepare('SELECT COUNT(*) as cnt FROM lesson_progress WHERE student_id = ? AND course_id = ? AND completed = 1')
      .get(user.id, lesson.course_id) as { cnt: number };
    const progressPercent = totalRow.cnt > 0 ? Math.round((doneRow.cnt / totalRow.cnt) * 100) : 0;

    res.json({ completed: true, progressPercent });
  });

  // Protected Quizzes
  app.get('/api/quizzes/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const quiz = db.prepare(`
      SELECT q.*, c.title as course_title, c.access_tier as course_access_tier
      FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = ?
    `).get(req.params.id) as Record<string, unknown> | undefined;

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    const canManage = user.role === 'admin' || (user.role === 'teacher' && quiz.teacher_id === user.id);
    if (!quiz.is_published && !canManage) {
      res.status(403).json({ error: 'Quiz is not published' });
      return;
    }
    const requiresPremium = quiz.course_access_tier === 'premium';
    const hasPremium = user.subscription_tier === 'premium' && user.subscription_status === 'active';
    if (requiresPremium && !canManage && !hasPremium) {
      res.status(403).json({ error: 'This quiz requires an active Premium subscription activated by the administration.' });
      return;
    }

    const questions = db
      .prepare('SELECT id, prompt, options_json, points, sort_order, correct_index, explanation FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order ASC')
      .all(req.params.id) as Array<{
      id: string;
      prompt: string;
      options_json: string;
      points: number;
      sort_order: number;
      correct_index: number;
      explanation: string;
    }>;

    const myAttempts = db
      .prepare('SELECT id, score, max_score, percentage, passed, submitted_at FROM quiz_attempts WHERE quiz_id = ? AND student_id = ? ORDER BY submitted_at DESC LIMIT 10')
      .all(req.params.id, user.id);

    res.json({
      quiz: {
        id: quiz.id,
        courseId: quiz.course_id,
        courseTitle: quiz.course_title,
        lessonId: quiz.lesson_id,
        title: quiz.title,
        description: quiz.description,
        durationMinutes: quiz.duration_minutes,
        passScore: quiz.pass_score,
      },
      questions: questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: parseJsonArray<string>(q.options_json, []),
        points: q.points,
        ...(canManage ? { correctIndex: q.correct_index, explanation: q.explanation } : {}),
      })),
      myAttempts,
    });
  });

  app.post('/api/quizzes/:id/submit', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const quiz = db.prepare(`
      SELECT q.*, c.access_tier as course_access_tier, c.is_published as course_published
      FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = ?
    `).get(req.params.id) as
      | {
          id: string;
          course_id: string;
          teacher_id: string;
          title: string;
          pass_score: number;
          is_published: number;
          course_access_tier: string;
          course_published: number;
        }
      | undefined;
    if (!quiz || !quiz.is_published || !quiz.course_published) {
      res.status(404).json({ error: 'Quiz not found or unavailable' });
      return;
    }
    const canManage = user.role === 'admin' || (user.role === 'teacher' && quiz.teacher_id === user.id);
    const requiresPremium = quiz.course_access_tier === 'premium';
    const hasPremium = user.subscription_tier === 'premium' && user.subscription_status === 'active';
    if (requiresPremium && !canManage && !hasPremium) {
      res.status(403).json({ error: 'This quiz requires an active Premium subscription activated by the administration.' });
      return;
    }

    const questions = db
      .prepare('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order ASC')
      .all(quiz.id) as Array<{
      id: string;
      prompt: string;
      options_json: string;
      correct_index: number;
      explanation: string;
      points: number;
    }>;

    if (questions.length === 0) {
      res.status(400).json({ error: 'Quiz has no questions yet' });
      return;
    }

    const answersMap = (typeof req.body?.answers === 'object' && req.body.answers !== null ? req.body.answers : {}) as Record<
      string,
      number
    >;

    let score = 0;
    let maxScore = 0;
    const breakdown = questions.map((q) => {
      const selected = typeof answersMap[q.id] === 'number' ? answersMap[q.id] : -1;
      const isCorrect = selected === q.correct_index;
      maxScore += q.points;
      if (isCorrect) score += q.points;
      return {
        questionId: q.id,
        prompt: q.prompt,
        options: parseJsonArray<string>(q.options_json, []),
        selectedIndex: selected,
        correctIndex: q.correct_index,
        isCorrect,
        explanation: q.explanation,
        pointsEarned: isCorrect ? q.points : 0,
        pointsTotal: q.points,
      };
    });

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percentage >= quiz.pass_score ? 1 : 0;
    const now = new Date().toISOString();
    const attemptId = makeId('att');

    db.prepare(
      `INSERT INTO quiz_attempts (id, quiz_id, student_id, answers_json, score, max_score, percentage, passed, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(attemptId, quiz.id, user.id, JSON.stringify(answersMap), score, maxScore, percentage, passed, now);

    db.prepare(
      `INSERT INTO notifications (id, user_id, role_target, title, body, is_read, created_at)
       VALUES (?, ?, NULL, ?, ?, 0, ?)`
    ).run(
      makeId('ntf'),
      user.id,
      quiz.title,
      `${percentage}% (${score}/${maxScore})`,
      now
    );

    res.status(201).json({
      attempt: { id: attemptId, score, maxScore, percentage, passed: Boolean(passed), submittedAt: now },
      breakdown,
    });
  });

  // Notifications
  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const rows = db
      .prepare(
        `SELECT * FROM notifications
         WHERE user_id = ? OR (user_id IS NULL AND (role_target IS NULL OR role_target = ?))
         ORDER BY created_at DESC LIMIT 30`
      )
      .all(user.id, user.role);
    res.json({ notifications: rows });
  });

  app.post('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
    res.json({ ok: true });
  });

  // Student Dashboard
  app.get('/api/student/dashboard', requireAuth, requireRole('student'), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const cycle = user.cycle_id ? db.prepare('SELECT * FROM cycles WHERE id = ?').get(user.cycle_id) : null;
    const year = user.year_id ? db.prepare('SELECT * FROM years WHERE id = ?').get(user.year_id) : null;
    const stream = user.stream_id ? db.prepare('SELECT * FROM streams WHERE id = ?').get(user.stream_id) : null;

    const subjects = user.year_id
      ? db
          .prepare('SELECT * FROM subjects WHERE year_id = ? AND (stream_id IS NULL OR stream_id = ?) ORDER BY coefficient DESC')
          .all(user.year_id, user.stream_id)
      : [];

    const enrolledCourses = db
      .prepare(
        `SELECT c.*, s.name_ar as subject_name_ar, s.name_fr as subject_name_fr, s.name_en as subject_name_en,
         (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.is_published = 1) as lessons_count,
         (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.course_id = c.id AND lp.student_id = ? AND lp.completed = 1) as completed_count
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         JOIN subjects s ON s.id = c.subject_id
         WHERE e.student_id = ?
         ORDER BY e.created_at DESC`
      )
      .all(user.id, user.id);

    const recentAttempts = db
      .prepare(
        `SELECT qa.*, q.title as quiz_title, c.title as course_title
         FROM quiz_attempts qa
         JOIN quizzes q ON q.id = qa.quiz_id
         JOIN courses c ON c.id = q.course_id
         WHERE qa.student_id = ?
         ORDER BY qa.submitted_at DESC LIMIT 10`
      )
      .all(user.id);

    const completedLessonsTotal = (
      db.prepare('SELECT COUNT(*) as cnt FROM lesson_progress WHERE student_id = ? AND completed = 1').get(user.id) as { cnt: number }
    ).cnt;

    const notifications = db
      .prepare(
        `SELECT * FROM notifications
         WHERE user_id = ? OR (user_id IS NULL AND (role_target IS NULL OR role_target = 'student'))
         ORDER BY created_at DESC LIMIT 10`
      )
      .all(user.id);

    res.json({
      profile: toSafeUser(user),
      cycle,
      year,
      stream,
      subjects,
      enrolledCourses,
      recentAttempts,
      completedLessonsTotal,
      notifications,
    });
  });

  // Teacher Dashboard & Authoring
  app.get('/api/teacher/dashboard', requireAuth, requireRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const isAdmin = user.role === 'admin';

    const courses = db
      .prepare(
        `SELECT c.*, s.name_ar as subject_name_ar, s.name_fr as subject_name_fr, s.name_en as subject_name_en,
         y.name_ar as year_name_ar, y.name_fr as year_name_fr, y.name_en as year_name_en,
         (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count,
         (SELECT COUNT(*) FROM quizzes q WHERE q.course_id = c.id) as quizzes_count,
         (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as students_count
         FROM courses c
         JOIN subjects s ON s.id = c.subject_id
         JOIN years y ON y.id = s.year_id
         WHERE (? = 1 OR c.teacher_id = ?)
         ORDER BY c.updated_at DESC`
      )
      .all(isAdmin ? 1 : 0, user.id);

    const assignedSubjects = db
      .prepare(
        `SELECT s.* FROM teacher_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE ts.teacher_id = ?`
      )
      .all(user.id);

    const recentResults = db
      .prepare(
        `SELECT qa.*, u.full_name as student_name, q.title as quiz_title, c.title as course_title
         FROM quiz_attempts qa
         JOIN users u ON u.id = qa.student_id
         JOIN quizzes q ON q.id = qa.quiz_id
         JOIN courses c ON c.id = q.course_id
         WHERE (? = 1 OR c.teacher_id = ?)
         ORDER BY qa.submitted_at DESC LIMIT 25`
      )
      .all(isAdmin ? 1 : 0, user.id);

    res.json({ courses, assignedSubjects, recentResults });
  });

  app.post('/api/teacher/courses', requireAuth, requireRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const subjectId = typeof req.body?.subjectId === 'string' ? req.body.subjectId : '';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const accessTier = req.body?.accessTier === 'premium' ? 'premium' : 'free';
    const isPublished = req.body?.isPublished === false ? 0 : 1;

    if (!subjectId || !db.prepare('SELECT id FROM subjects WHERE id = ?').get(subjectId)) {
      res.status(400).json({ error: 'Valid subject is required' });
      return;
    }
    if (title.length < 3 || title.length > 200) {
      res.status(400).json({ error: 'Course title must be 3 to 200 characters' });
      return;
    }

    const now = new Date().toISOString();
    const id = makeId('crs');
    db.prepare(
      `INSERT INTO courses (id, subject_id, teacher_id, title, description, access_tier, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, subjectId, user.id, title, description.slice(0, 2000), accessTier, isPublished, now, now);

    // Auto-create initial unit so lessons can be added smoothly
    db.prepare('INSERT INTO units (id, course_id, title, sort_order, created_at) VALUES (?, ?, ?, 1, ?)').run(
      makeId('unit'),
      id,
      'الوحدة الأولى / Unité 1',
      now
    );

    res.status(201).json({ id });
  });

  app.delete('/api/teacher/courses/:id', requireAuth, requireRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const course = db.prepare('SELECT id, teacher_id FROM courses WHERE id = ?').get(req.params.id) as
      | { id: string; teacher_id: string }
      | undefined;
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    if (user.role !== 'admin' && course.teacher_id !== user.id) {
      res.status(403).json({ error: 'Not authorized to delete this course' });
      return;
    }
    db.prepare('DELETE FROM courses WHERE id = ?').run(course.id);
    res.json({ deleted: true });
  });

  app.post('/api/teacher/units', requireAuth, requireRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const courseId = typeof req.body?.courseId === 'string' ? req.body.courseId : '';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const course = db.prepare('SELECT id, teacher_id FROM courses WHERE id = ?').get(courseId) as
      | { id: string; teacher_id: string }
      | undefined;
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    if (user.role !== 'admin' && course.teacher_id !== user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (title.length < 2 || title.length > 200) {
      res.status(400).json({ error: 'Unit title must be 2 to 200 characters' });
      return;
    }
    const maxOrder = (
      db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM units WHERE course_id = ?').get(courseId) as { m: number }
    ).m;
    const id = makeId('unit');
    db.prepare('INSERT INTO units (id, course_id, title, sort_order, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      courseId,
      title,
      maxOrder + 1,
      new Date().toISOString()
    );
    res.status(201).json({ id });
  });

  app.post('/api/teacher/lessons', requireAuth, requireRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const courseId = typeof req.body?.courseId === 'string' ? req.body.courseId : '';
    const unitId = typeof req.body?.unitId === 'string' ? req.body.unitId : '';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const objectives = typeof req.body?.objectives === 'string' ? req.body.objectives.trim() : '';
    const explanation = typeof req.body?.explanation === 'string' ? req.body.explanation.trim() : '';
    const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
    const mediaUrl = sanitizeSafeUrl(req.body?.mediaUrl);
    const accessTier = req.body?.accessTier === 'premium' ? 'premium' : 'free';

    const course = db.prepare('SELECT id, teacher_id FROM courses WHERE id = ?').get(courseId) as
      | { id: string; teacher_id: string }
      | undefined;
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    if (user.role !== 'admin' && course.teacher_id !== user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const unit = db.prepare('SELECT id FROM units WHERE id = ? AND course_id = ?').get(unitId, courseId);
    if (!unit) {
      res.status(400).json({ error: 'Valid unit within this course is required' });
      return;
    }
    if (title.length < 3 || !explanation) {
      res.status(400).json({ error: 'Lesson title and explanation are required' });
      return;
    }

    const keyConcepts = Array.isArray(req.body?.keyConcepts)
      ? req.body.keyConcepts.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 20)
      : [];
    const appliedExamples = Array.isArray(req.body?.appliedExamples)
      ? req.body.appliedExamples.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 20)
      : [];
    const exercisesSolutions = Array.isArray(req.body?.exercisesSolutions)
      ? req.body.exercisesSolutions
          .filter(
            (x: unknown): x is { question: string; solution: string } =>
              typeof x === 'object' &&
              x !== null &&
              typeof (x as { question?: unknown }).question === 'string' &&
              typeof (x as { solution?: unknown }).solution === 'string'
          )
          .slice(0, 20)
      : [];
    const resources = Array.isArray(req.body?.resources)
      ? req.body.resources
          .map((r: unknown) => {
            if (typeof r === 'object' && r !== null && typeof (r as { label?: unknown }).label === 'string') {
              const safe = sanitizeSafeUrl((r as { url?: unknown }).url);
              if (safe) return { label: (r as { label: string }).label.trim().slice(0, 120), url: safe };
            }
            return null;
          })
          .filter((x: { label: string; url: string } | null): x is { label: string; url: string } => x !== null)
          .slice(0, 10)
      : [];

    const maxOrder = (
      db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM lessons WHERE unit_id = ?').get(unitId) as { m: number }
    ).m;
    const now = new Date().toISOString();
    const id = makeId('les');

    db.prepare(
      `INSERT INTO lessons (
        id, unit_id, course_id, title, objectives, explanation, key_concepts_json,
        applied_examples_json, exercises_solutions_json, summary, resources_json,
        media_url, access_tier, sort_order, is_published, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(
      id,
      unitId,
      courseId,
      title.slice(0, 200),
      objectives.slice(0, 2000),
      explanation.slice(0, 16000),
      JSON.stringify(keyConcepts),
      JSON.stringify(appliedExamples),
      JSON.stringify(exercisesSolutions),
      summary.slice(0, 4000),
      JSON.stringify(resources),
      mediaUrl,
      accessTier,
      maxOrder + 1,
      now,
      now
    );

    db.prepare('UPDATE courses SET updated_at = ? WHERE id = ?').run(now, courseId);
    res.status(201).json({ id });
  });

  app.delete('/api/teacher/lessons/:id', requireAuth, requireRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const lesson = db.prepare('SELECT l.id, c.teacher_id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?').get(req.params.id) as
      | { id: string; teacher_id: string }
      | undefined;
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }
    if (user.role !== 'admin' && lesson.teacher_id !== user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    db.prepare('DELETE FROM lessons WHERE id = ?').run(lesson.id);
    res.json({ deleted: true });
  });

  app.post('/api/teacher/quizzes', requireAuth, requireRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const courseId = typeof req.body?.courseId === 'string' ? req.body.courseId : '';
    const lessonId = typeof req.body?.lessonId === 'string' && req.body.lessonId ? req.body.lessonId : null;
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const durationMinutes = Math.max(1, Math.min(180, Number(req.body?.durationMinutes) || 15));
    const passScore = Math.max(10, Math.min(100, Number(req.body?.passScore) || 60));

    const course = db.prepare('SELECT id, teacher_id FROM courses WHERE id = ?').get(courseId) as
      | { id: string; teacher_id: string }
      | undefined;
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    if (user.role !== 'admin' && course.teacher_id !== user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (title.length < 3 || !Array.isArray(req.body?.questions) || req.body.questions.length === 0) {
      res.status(400).json({ error: 'Quiz title and at least one question are required' });
      return;
    }

    const now = new Date().toISOString();
    const quizId = makeId('quiz');
    db.prepare(
      `INSERT INTO quizzes (id, course_id, lesson_id, teacher_id, title, description, duration_minutes, pass_score, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(quizId, courseId, lessonId, user.id, title.slice(0, 200), description.slice(0, 1000), durationMinutes, passScore, now, now);

    const insertQ = db.prepare(
      `INSERT INTO quiz_questions (id, quiz_id, prompt, options_json, correct_index, explanation, points, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let order = 1;
    for (const q of req.body.questions.slice(0, 50)) {
      if (typeof q?.prompt === 'string' && Array.isArray(q?.options) && q.options.length >= 2) {
        const cleanOpts = q.options.map((o: unknown) => String(o).trim()).filter(Boolean).slice(0, 6);
        const correctIdx = Math.max(0, Math.min(cleanOpts.length - 1, Number(q.correctIndex) || 0));
        const points = Math.max(1, Math.min(20, Number(q.points) || 1));
        insertQ.run(
          makeId('qq'),
          quizId,
          q.prompt.trim().slice(0, 1000),
          JSON.stringify(cleanOpts),
          correctIdx,
          typeof q.explanation === 'string' ? q.explanation.trim().slice(0, 1000) : '',
          points,
          order++
        );
      }
    }

    res.status(201).json({ id: quizId });
  });

  app.delete('/api/teacher/quizzes/:id', requireAuth, requireRole('teacher', 'admin'), (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const quiz = db.prepare('SELECT id, teacher_id FROM quizzes WHERE id = ?').get(req.params.id) as
      | { id: string; teacher_id: string }
      | undefined;
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    if (user.role !== 'admin' && quiz.teacher_id !== user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    db.prepare('DELETE FROM quizzes WHERE id = ?').run(quiz.id);
    res.json({ deleted: true });
  });

  // Admin Dashboard & Management
  app.get('/api/admin/dashboard', requireAuth, requireRole('admin'), (_req, res) => {
    const users = (db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as unknown as DbUser[]).map(toSafeUser);
    const stats = {
      studentsCount: users.filter((u) => u.role === 'student').length,
      teachersCount: users.filter((u) => u.role === 'teacher').length,
      adminsCount: users.filter((u) => u.role === 'admin').length,
      coursesCount: (db.prepare('SELECT COUNT(*) as cnt FROM courses').get() as { cnt: number }).cnt,
      lessonsCount: (db.prepare('SELECT COUNT(*) as cnt FROM lessons').get() as { cnt: number }).cnt,
      quizzesCount: (db.prepare('SELECT COUNT(*) as cnt FROM quizzes').get() as { cnt: number }).cnt,
      attemptsCount: (db.prepare('SELECT COUNT(*) as cnt FROM quiz_attempts').get() as { cnt: number }).cnt,
      subjectsCount: (db.prepare('SELECT COUNT(*) as cnt FROM subjects').get() as { cnt: number }).cnt,
    };
    const settings = getPublicPlatformSettings();
    const recentAttempts = db
      .prepare(
        `SELECT qa.*, u.full_name as student_name, q.title as quiz_title
         FROM quiz_attempts qa
         JOIN users u ON u.id = qa.student_id
         JOIN quizzes q ON q.id = qa.quiz_id
         ORDER BY qa.submitted_at DESC LIMIT 20`
      )
      .all();

    res.json({ users, stats, settings, recentAttempts });
  });

  app.patch('/api/admin/users/:id', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as unknown as DbUser | undefined;
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const nextStatus = req.body?.status === 'suspended' ? 'suspended' : req.body?.status === 'active' ? 'active' : target.status;
    const nextTier = req.body?.subscriptionTier === 'premium' ? 'premium' : req.body?.subscriptionTier === 'free' ? 'free' : target.subscription_tier;
    const nextSubStatus = req.body?.subscriptionStatus === 'inactive' ? 'inactive' : req.body?.subscriptionStatus === 'active' ? 'active' : target.subscription_status;
    const nextNote = typeof req.body?.subscriptionNote === 'string' ? req.body.subscriptionNote.trim().slice(0, 300) : target.subscription_note;

    let nextRole = target.role;
    if (req.body?.role && ['student', 'teacher', 'admin'].includes(req.body.role) && target.id !== req.authUser!.id) {
      nextRole = req.body.role as UserRole;
    }

    db.prepare(
      `UPDATE users SET status = ?, subscription_tier = ?, subscription_status = ?, subscription_note = ?, role = ?, updated_at = ? WHERE id = ?`
    ).run(nextStatus, nextTier, nextSubStatus, nextNote, nextRole, new Date().toISOString(), target.id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(target.id) as unknown as DbUser;
    res.json({ user: toSafeUser(updated) });
  });

  app.delete('/api/admin/users/:id', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    if (req.params.id === req.authUser!.id) {
      res.status(400).json({ error: 'Cannot delete your own active administrator account.' });
      return;
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  });

  app.post('/api/admin/curriculum/subjects', requireAuth, requireRole('admin'), (req, res) => {
    const cycleId = typeof req.body?.cycleId === 'string' ? req.body.cycleId : '';
    const yearId = typeof req.body?.yearId === 'string' ? req.body.yearId : '';
    const streamId = typeof req.body?.streamId === 'string' && req.body.streamId ? req.body.streamId : null;
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase().slice(0, 12) : '';
    const nameAr = typeof req.body?.nameAr === 'string' ? req.body.nameAr.trim() : '';
    const nameFr = typeof req.body?.nameFr === 'string' ? req.body.nameFr.trim() : nameAr;
    const nameEn = typeof req.body?.nameEn === 'string' ? req.body.nameEn.trim() : nameFr;
    const coefficient = Math.max(1, Math.min(10, Number(req.body?.coefficient) || 1));

    if (!cycleId || !yearId || !code || !nameAr) {
      res.status(400).json({ error: 'Cycle, year, subject code, and Arabic name are required' });
      return;
    }

    const id = makeId('subj');
    db.prepare(
      `INSERT INTO subjects (id, cycle_id, year_id, stream_id, code, name_ar, name_fr, name_en, coefficient)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, cycleId, yearId, streamId, code, nameAr.slice(0, 120), nameFr.slice(0, 120), nameEn.slice(0, 120), coefficient);
    res.status(201).json({ id });
  });

  app.delete('/api/admin/curriculum/subjects/:id', requireAuth, requireRole('admin'), (req, res) => {
    db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  });

  app.post('/api/admin/notifications', requireAuth, requireRole('admin'), (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    const roleTarget = ['student', 'teacher', 'admin'].includes(req.body?.roleTarget) ? req.body.roleTarget : null;
    if (!title || !body) {
      res.status(400).json({ error: 'Notification title and body are required' });
      return;
    }
    const id = makeId('ntf');
    db.prepare(
      'INSERT INTO notifications (id, user_id, role_target, title, body, is_read, created_at) VALUES (?, NULL, ?, ?, ?, 0, ?)'
    ).run(id, roleTarget, title.slice(0, 160), body.slice(0, 1000), new Date().toISOString());
    res.status(201).json({ id });
  });

  app.put('/api/admin/settings', requireAuth, requireRole('admin'), (req, res) => {
    const now = new Date().toISOString();
    const upsert = db.prepare(
      'INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    );
    const contactEmail = typeof req.body?.contactEmail === 'string' ? req.body.contactEmail.trim().slice(0, 254) : '';
    const contactPhone = typeof req.body?.contactPhone === 'string' ? req.body.contactPhone.trim().slice(0, 60) : '';
    const telegramUrl = sanitizeSafeUrl(req.body?.telegramUrl) || '';
    const telegramLabel = typeof req.body?.telegramLabel === 'string' ? req.body.telegramLabel.trim().slice(0, 120) : '';

    upsert.run('contact_email', contactEmail, now);
    upsert.run('contact_phone', contactPhone, now);
    upsert.run('telegram_url', telegramUrl, now);
    upsert.run('telegram_label', telegramLabel, now);

    res.json({ settings: getPublicPlatformSettings() });
  });

  app.post('/api/admin/seed-algerian-curriculum', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const result = seedSampleOfficialUnitsForAdmin(db, req.authUser!.id);
    res.json(result);
  });

  const httpServer = http.createServer(app);

  // Frontend serving (Vite dev middleware or built dist/)
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`TAYSSIR server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
