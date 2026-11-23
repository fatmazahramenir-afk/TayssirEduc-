import { useCallback, useEffect, useState } from 'react';
import { BookOpen, FilePlus2, HelpCircle, Plus, Trash2, Users } from 'lucide-react';
import {
  apiRequest,
  CycleItem,
  StreamItem,
  SubjectItem,
  TayssirUser,
  YearItem,
} from '../lib/api.ts';
import { Locale, pickLocalizedName, TRANSLATIONS } from '../lib/i18n.ts';
import { BackButton } from './BackButton.tsx';
import { TayssirSkeletonGrid, TayssirSpinner } from './TayssirLoader.tsx';

interface TeacherCourse {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  access_tier: 'free' | 'premium';
  subject_name_ar: string;
  subject_name_fr: string;
  subject_name_en: string;
  year_name_ar: string;
  year_name_fr: string;
  year_name_en: string;
  lessons_count: number;
  quizzes_count: number;
  students_count: number;
}

interface TeacherDashboardData {
  courses: TeacherCourse[];
  recentResults: Array<{
    id: string;
    student_name: string;
    quiz_title: string;
    course_title: string;
    score: number;
    max_score: number;
    percentage: number;
    passed: number;
    submitted_at: string;
  }>;
}

export function TeacherDashboard({
  token,
  user,
  locale,
  onOpenCourse,
  onBack,
}: {
  token: string;
  user: TayssirUser;
  locale: Locale;
  onOpenCourse: (courseId: string) => void;
  onBack?: () => void;
}) {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [cycles, setCycles] = useState<CycleItem[]>([]);
  const [years, setYears] = useState<YearItem[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<'overview' | 'new-course' | 'new-lesson' | 'new-quiz'>('overview');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Course creation state
  const [cCycleId, setCCycleId] = useState('cycle-secondary');
  const [cYearId, setCYearId] = useState('year-3as');
  const [cStreamId, setCStreamId] = useState('stream-3as-se');
  const [cSubjectId, setCSubjectId] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cTier, setCTier] = useState<'free' | 'premium'>('free');

  // Lesson creation state
  const [lCourseId, setLCourseId] = useState('');
  const [lUnits, setLUnits] = useState<Array<{ id: string; title: string }>>([]);
  const [lUnitId, setLUnitId] = useState('');
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [lTitle, setLTitle] = useState('');
  const [lObjectives, setLObjectives] = useState('');
  const [lExplanation, setLExplanation] = useState('');
  const [lConceptsRaw, setLConceptsRaw] = useState('');
  const [lExamplesRaw, setLExamplesRaw] = useState('');
  const [lExerciseQ, setLExerciseQ] = useState('');
  const [lExerciseSol, setLExerciseSol] = useState('');
  const [lSummary, setLSummary] = useState('');
  const [lTier, setLTier] = useState<'free' | 'premium'>('free');

  // Quiz creation state
  const [qCourseId, setQCourseId] = useState('');
  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qDuration, setQDuration] = useState(15);
  const [qPass, setQPass] = useState(60);
  const [qQuestions, setQQuestions] = useState<
    Array<{ prompt: string; options: [string, string, string, string]; correctIndex: number; explanation: string }>
  >([{ prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, curr] = await Promise.all([
        apiRequest<TeacherDashboardData>('/api/teacher/dashboard', { token }),
        apiRequest<{
          cycles: CycleItem[];
          years: YearItem[];
          streams: StreamItem[];
          subjects: SubjectItem[];
        }>('/api/curriculum', { token }),
      ]);
      setData(dash);
      setCycles(curr.cycles);
      setYears(curr.years);
      setStreams(curr.streams);
      setSubjects(curr.subjects);
      if (dash.courses.length > 0) {
        if (!lCourseId) setLCourseId(dash.courses[0].id);
        if (!qCourseId) setQCourseId(dash.courses[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [token, lCourseId, qCourseId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!lCourseId) return;
    void apiRequest<{ units: Array<{ id: string; title: string }> }>(`/api/courses/${lCourseId}`, {
      token,
    })
      .then((res) => {
        setLUnits(res.units);
        if (res.units.length > 0) setLUnitId(res.units[0].id);
      })
      .catch(() => setLUnits([]));
  }, [lCourseId, token]);

  const filteredSubjects = subjects.filter((s) => {
    if (cCycleId && s.cycle_id !== cCycleId) return false;
    if (cYearId && s.year_id !== cYearId) return false;
    if (cStreamId && s.stream_id && s.stream_id !== cStreamId) return false;
    return true;
  });

  useEffect(() => {
    if (filteredSubjects.length > 0 && !filteredSubjects.some((s) => s.id === cSubjectId)) {
      setCSubjectId(filteredSubjects[0].id);
    }
  }, [filteredSubjects, cSubjectId]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await apiRequest('/api/teacher/courses', {
        method: 'POST',
        token,
        body: {
          subjectId: cSubjectId,
          title: cTitle,
          description: cDesc,
          accessTier: cTier,
        },
      });
      setCTitle('');
      setCDesc('');
      setFeedback(locale === 'ar' ? 'تم إنشاء الدورة بنجاح.' : 'Course created.');
      setActivePanel('overview');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const handleAddUnit = async () => {
    if (!lCourseId || !newUnitTitle.trim()) return;
    setBusy(true);
    try {
      const res = await apiRequest<{ id: string }>('/api/teacher/units', {
        method: 'POST',
        token,
        body: { courseId: lCourseId, title: newUnitTitle.trim() },
      });
      setNewUnitTitle('');
      const detail = await apiRequest<{ units: Array<{ id: string; title: string }> }>(
        `/api/courses/${lCourseId}`,
        { token }
      );
      setLUnits(detail.units);
      setLUnitId(res.id);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await apiRequest('/api/teacher/lessons', {
        method: 'POST',
        token,
        body: {
          courseId: lCourseId,
          unitId: lUnitId,
          title: lTitle,
          objectives: lObjectives,
          explanation: lExplanation,
          keyConcepts: lConceptsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
          appliedExamples: lExamplesRaw.split('\n').map((s) => s.trim()).filter(Boolean),
          exercisesSolutions:
            lExerciseQ.trim() && lExerciseSol.trim()
              ? [{ question: lExerciseQ.trim(), solution: lExerciseSol.trim() }]
              : [],
          summary: lSummary,
          accessTier: lTier,
        },
      });
      setLTitle('');
      setLObjectives('');
      setLExplanation('');
      setLConceptsRaw('');
      setLExamplesRaw('');
      setLExerciseQ('');
      setLExerciseSol('');
      setLSummary('');
      setFeedback(locale === 'ar' ? 'تم نشر الدرس وحفظه.' : 'Lesson published.');
      setActivePanel('overview');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await apiRequest('/api/teacher/quizzes', {
        method: 'POST',
        token,
        body: {
          courseId: qCourseId,
          title: qTitle,
          description: qDesc,
          durationMinutes: qDuration,
          passScore: qPass,
          questions: qQuestions.map((q) => ({
            prompt: q.prompt,
            options: q.options.filter((o) => o.trim().length > 0),
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            points: 2,
          })),
        },
      });
      setQTitle('');
      setQDesc('');
      setQQuestions([{ prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }]);
      setFeedback(locale === 'ar' ? 'تم نشر الاختبار بنجاح.' : 'Quiz published.');
      setActivePanel('overview');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    await apiRequest(`/api/teacher/courses/${id}`, { method: 'DELETE', token });
    await load();
  };

  const copy = {
    ar: {
      title: 'لوحة الأستاذ',
      subtitle: `إدارة الدورات والدروس والاختبارات ومتابعة نتائج التلاميذ · ${user.fullName}`,
      tabOverview: 'الدورات والنتائج',
      tabCourse: 'إضافة دورة',
      tabLesson: 'إضافة درس',
      tabQuiz: 'إضافة اختبار',
      coursesCount: 'الدورات',
      studentsCount: 'المسجلون',
      attemptsCount: 'محاولات الاختبار',
      noCourses: 'لم تنشئ أي دورة بعد. ابدأ بإنشاء أول دورة.',
      resultsTitle: 'أحدث نتائج التلاميذ',
      noResults: 'لا توجد نتائج اختبارات بعد.',
      saveCourse: 'حفظ ونشر الدورة',
      saveLesson: 'حفظ ونشر الدرس',
      saveQuiz: 'حفظ ونشر الاختبار',
      addQuestion: 'إضافة سؤال آخر',
      addUnit: 'إضافة وحدة',
    },
    fr: {
      title: 'Espace Enseignant',
      subtitle: `Gestion des cours, leçons, quiz et résultats · ${user.fullName}`,
      tabOverview: 'Cours & Résultats',
      tabCourse: 'Nouveau cours',
      tabLesson: 'Nouvelle leçon',
      tabQuiz: 'Nouveau quiz',
      coursesCount: 'Cours',
      studentsCount: 'Inscrits',
      attemptsCount: 'Soumissions',
      noCourses: 'Aucun cours créé pour le moment.',
      resultsTitle: 'Derniers résultats des élèves',
      noResults: 'Aucun résultat de quiz pour le moment.',
      saveCourse: 'Publier le cours',
      saveLesson: 'Publier la leçon',
      saveQuiz: 'Publier le quiz',
      addQuestion: 'Ajouter une question',
      addUnit: 'Ajouter une unité',
    },
    en: {
      title: 'Teacher Dashboard',
      subtitle: `Manage courses, structured lessons, quizzes, and student results · ${user.fullName}`,
      tabOverview: 'Courses & Results',
      tabCourse: 'New Course',
      tabLesson: 'New Lesson',
      tabQuiz: 'New Quiz',
      coursesCount: 'Courses',
      studentsCount: 'Enrollments',
      attemptsCount: 'Submissions',
      noCourses: 'You have not created any courses yet.',
      resultsTitle: 'Recent Student Results',
      noResults: 'No quiz submissions yet.',
      saveCourse: 'Publish Course',
      saveLesson: 'Publish Lesson',
      saveQuiz: 'Publish Quiz',
      addQuestion: 'Add Another Question',
      addUnit: 'Add Unit',
    },
  }[locale];

  if (loading || !data) {
    return <TayssirSkeletonGrid count={4} />;
  }

  const totalEnrollments = data.courses.reduce((sum, c) => sum + c.students_count, 0);

  return (
    <div className="space-y-6">
      {activePanel !== 'overview' ? (
        <BackButton
          locale={locale}
          onClick={() => {
            setActivePanel('overview');
            setError(null);
            setFeedback(null);
          }}
          label={copy.tabOverview}
        />
      ) : onBack ? (
        <BackButton locale={locale} onClick={onBack} label={TRANSLATIONS[locale].back} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#101D42] dark:text-white">
            {copy.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
        </div>

        <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-[#E9EDF5] dark:bg-[#101D42]">
          {(
            [
              { id: 'overview', label: copy.tabOverview, icon: BookOpen },
              { id: 'new-course', label: copy.tabCourse, icon: Plus },
              { id: 'new-lesson', label: copy.tabLesson, icon: FilePlus2 },
              { id: 'new-quiz', label: copy.tabQuiz, icon: HelpCircle },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActivePanel(tab.id);
                  setError(null);
                  setFeedback(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  activePanel === tab.id
                    ? 'bg-white dark:bg-[#1769E8] text-[#101D42] dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {activePanel === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="tayssir-card rounded-2xl p-5">
              <BookOpen className="w-5 h-5 text-[#1769E8]" />
              <p className="mt-3 text-2xl font-bold tabular-nums text-[#101D42] dark:text-white">
                {data.courses.length}
              </p>
              <p className="text-xs text-slate-500">{copy.coursesCount}</p>
            </div>
            <div className="tayssir-card rounded-2xl p-5">
              <Users className="w-5 h-5 text-[#7652D6]" />
              <p className="mt-3 text-2xl font-bold tabular-nums text-[#101D42] dark:text-white">
                {totalEnrollments}
              </p>
              <p className="text-xs text-slate-500">{copy.studentsCount}</p>
            </div>
            <div className="tayssir-card rounded-2xl p-5">
              <HelpCircle className="w-5 h-5 text-emerald-600" />
              <p className="mt-3 text-2xl font-bold tabular-nums text-[#101D42] dark:text-white">
                {data.recentResults.length}
              </p>
              <p className="text-xs text-slate-500">{copy.attemptsCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="tayssir-card rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-[#101D42] dark:text-white">
                {copy.coursesCount}
              </h2>
              {data.courses.length === 0 ? (
                <p className="text-sm text-slate-500">{copy.noCourses}</p>
              ) : (
                <div className="divide-y divide-[#E9EDF5] dark:divide-white/10">
                  {data.courses.map((c) => (
                    <div key={c.id} className="py-3.5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onOpenCourse(c.id)}
                        className="text-start min-w-0 cursor-pointer hover:text-[#1769E8]"
                      >
                        <p className="text-sm font-semibold text-[#101D42] dark:text-white truncate">
                          {c.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {locale === 'ar' ? c.subject_name_ar : c.subject_name_fr} · {c.lessons_count}{' '}
                          lessons · {c.quizzes_count} quizzes
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteCourse(c.id)}
                        className="p-2 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="tayssir-card rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-[#101D42] dark:text-white">
                {copy.resultsTitle}
              </h2>
              {data.recentResults.length === 0 ? (
                <p className="text-sm text-slate-500">{copy.noResults}</p>
              ) : (
                <div className="divide-y divide-[#E9EDF5] dark:divide-white/10">
                  {data.recentResults.map((r) => (
                    <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#101D42] dark:text-white truncate">
                          {r.student_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{r.quiz_title}</p>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#1769E8] shrink-0">
                        {r.percentage}% ({r.score}/{r.max_score})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {activePanel === 'new-course' && (
        <form onSubmit={handleCreateCourse} className="tayssir-card rounded-2xl p-6 space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={cCycleId}
              onChange={(e) => {
                setCCycleId(e.target.value);
                const y = years.find((yr) => yr.cycle_id === e.target.value);
                setCYearId(y?.id || '');
                const st = streams.find((s) => s.year_id === y?.id);
                setCStreamId(st?.id || '');
              }}
              className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {pickLocalizedName(c, locale)}
                </option>
              ))}
            </select>

            <select
              value={cYearId}
              onChange={(e) => {
                setCYearId(e.target.value);
                const st = streams.find((s) => s.year_id === e.target.value);
                setCStreamId(st?.id || '');
              }}
              className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            >
              {years
                .filter((y) => y.cycle_id === cCycleId)
                .map((y) => (
                  <option key={y.id} value={y.id}>
                    {pickLocalizedName(y, locale)}
                  </option>
                ))}
            </select>

            {streams.some((s) => s.year_id === cYearId) && (
              <select
                value={cStreamId}
                onChange={(e) => setCStreamId(e.target.value)}
                className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
              >
                {streams
                  .filter((s) => s.year_id === cYearId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {pickLocalizedName(s, locale)}
                    </option>
                  ))}
              </select>
            )}

            <select
              value={cSubjectId}
              onChange={(e) => setCSubjectId(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            >
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {pickLocalizedName(s, locale)}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            required
            minLength={3}
            value={cTitle}
            onChange={(e) => setCTitle(e.target.value)}
            placeholder={locale === 'ar' ? 'عنوان الدورة' : 'Course title'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />

          <textarea
            rows={3}
            value={cDesc}
            onChange={(e) => setCDesc(e.target.value)}
            placeholder={locale === 'ar' ? 'وصف الدورة وأهدافها' : 'Course description'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />

          <select
            value={cTier}
            onChange={(e) => setCTier(e.target.value as 'free' | 'premium')}
            className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          >
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>

          <div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1769E8] text-white text-sm font-semibold cursor-pointer"
            >
              {busy && <TayssirSpinner />}
              <span>{copy.saveCourse}</span>
            </button>
          </div>
        </form>
      )}

      {activePanel === 'new-lesson' && (
        <form onSubmit={handleCreateLesson} className="tayssir-card rounded-2xl p-6 space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              required
              value={lCourseId}
              onChange={(e) => setLCourseId(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            >
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <select
              required
              value={lUnitId}
              onChange={(e) => setLUnitId(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            >
              {lUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newUnitTitle}
              onChange={(e) => setNewUnitTitle(e.target.value)}
              placeholder={locale === 'ar' ? 'اسم وحدة جديدة (اختياري)' : 'New unit title'}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            />
            <button
              type="button"
              onClick={() => void handleAddUnit()}
              className="px-3.5 py-2 rounded-xl bg-[#E9EDF5] dark:bg-white/10 text-xs font-semibold cursor-pointer"
            >
              {copy.addUnit}
            </button>
          </div>

          <input
            type="text"
            required
            value={lTitle}
            onChange={(e) => setLTitle(e.target.value)}
            placeholder={locale === 'ar' ? 'عنوان الدرس' : 'Lesson title'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />

          <textarea
            rows={2}
            value={lObjectives}
            onChange={(e) => setLObjectives(e.target.value)}
            placeholder={locale === 'ar' ? 'الأهداف التعليمية' : 'Learning objectives'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />

          <textarea
            required
            rows={5}
            value={lExplanation}
            onChange={(e) => setLExplanation(e.target.value)}
            placeholder={locale === 'ar' ? 'الشرح المنظم للدرس' : 'Structured lesson explanation'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <textarea
              rows={3}
              value={lConceptsRaw}
              onChange={(e) => setLConceptsRaw(e.target.value)}
              placeholder={locale === 'ar' ? 'المفاهيم الأساسية (سطر لكل مفهوم)' : 'Key concepts (one per line)'}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            />
            <textarea
              rows={3}
              value={lExamplesRaw}
              onChange={(e) => setLExamplesRaw(e.target.value)}
              placeholder={locale === 'ar' ? 'أمثلة تطبيقية (سطر لكل مثال)' : 'Applied examples (one per line)'}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={lExerciseQ}
              onChange={(e) => setLExerciseQ(e.target.value)}
              placeholder={locale === 'ar' ? 'تمرين تطبيقي' : 'Practice exercise prompt'}
              className="px-3.5 py-2.5 text-xs rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            />
            <input
              type="text"
              value={lExerciseSol}
              onChange={(e) => setLExerciseSol(e.target.value)}
              placeholder={locale === 'ar' ? 'حل التمرين' : 'Exercise solution'}
              className="px-3.5 py-2.5 text-xs rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            />
          </div>

          <textarea
            rows={2}
            value={lSummary}
            onChange={(e) => setLSummary(e.target.value)}
            placeholder={locale === 'ar' ? 'ملخص الدرس' : 'Lesson summary'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />

          <div className="flex items-center justify-between gap-3">
            <select
              value={lTier}
              onChange={(e) => setLTier(e.target.value as 'free' | 'premium')}
              className="px-3 py-2 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1769E8] text-white text-sm font-semibold cursor-pointer"
            >
              {busy && <TayssirSpinner />}
              <span>{copy.saveLesson}</span>
            </button>
          </div>
        </form>
      )}

      {activePanel === 'new-quiz' && (
        <form onSubmit={handleCreateQuiz} className="tayssir-card rounded-2xl p-6 space-y-5 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              required
              value={qCourseId}
              onChange={(e) => setQCourseId(e.target.value)}
              className="sm:col-span-2 px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            >
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={180}
              value={qDuration}
              onChange={(e) => setQDuration(Number(e.target.value))}
              className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
              title="Minutes"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={qTitle}
              onChange={(e) => setQTitle(e.target.value)}
              placeholder={locale === 'ar' ? 'عنوان الاختبار' : 'Quiz title'}
              className="sm:col-span-2 px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            />
            <input
              type="number"
              min={10}
              max={100}
              value={qPass}
              onChange={(e) => setQPass(Number(e.target.value))}
              placeholder="Pass %"
              className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            />
          </div>

          <input
            type="text"
            value={qDesc}
            onChange={(e) => setQDesc(e.target.value)}
            placeholder={locale === 'ar' ? 'وصف موجز للاختبار' : 'Quiz description'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />

          <div className="space-y-4">
            {qQuestions.map((q, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#E9EDF5] dark:border-white/10 p-4 space-y-3"
              >
                <input
                  type="text"
                  required
                  value={q.prompt}
                  onChange={(e) => {
                    const next = [...qQuestions];
                    next[idx].prompt = e.target.value;
                    setQQuestions(next);
                  }}
                  placeholder={`${locale === 'ar' ? 'السؤال' : 'Question'} ${idx + 1}`}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => (
                    <input
                      key={optIdx}
                      type="text"
                      required={optIdx < 2}
                      value={opt}
                      onChange={(e) => {
                        const next = [...qQuestions];
                        next[idx].options[optIdx] = e.target.value;
                        setQQuestions(next);
                      }}
                      placeholder={`${locale === 'ar' ? 'خيار' : 'Option'} ${optIdx + 1}`}
                      className="px-3 py-2 text-xs rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
                    />
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={q.correctIndex}
                    onChange={(e) => {
                      const next = [...qQuestions];
                      next[idx].correctIndex = Number(e.target.value);
                      setQQuestions(next);
                    }}
                    className="px-3 py-2 text-xs rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {locale === 'ar' ? `الإجابة الصحيحة: الخيار ${n + 1}` : `Correct Option ${n + 1}`}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={q.explanation}
                    onChange={(e) => {
                      const next = [...qQuestions];
                      next[idx].explanation = e.target.value;
                      setQQuestions(next);
                    }}
                    placeholder={locale === 'ar' ? 'تفسير الإجابة' : 'Answer explanation'}
                    className="px-3 py-2 text-xs rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setQQuestions((prev) => [
                  ...prev,
                  { prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' },
                ])
              }
              className="px-4 py-2 rounded-xl bg-[#E9EDF5] dark:bg-white/10 text-xs font-semibold cursor-pointer"
            >
              {copy.addQuestion}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7652D6] text-white text-sm font-semibold cursor-pointer"
            >
              {busy && <TayssirSpinner />}
              <span>{copy.saveQuiz}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
