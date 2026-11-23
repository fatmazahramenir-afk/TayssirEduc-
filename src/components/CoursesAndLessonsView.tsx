import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  Lock,
  Search,
} from 'lucide-react';
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
import { TayssirFullLoader, TayssirSkeletonGrid, TayssirSpinner } from './TayssirLoader.tsx';

interface CourseListItem {
  id: string;
  subject_id: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  description: string;
  access_tier: 'free' | 'premium';
  subject_name_ar: string;
  subject_name_fr: string;
  subject_name_en: string;
  subject_coefficient: number;
  cycle_id: string;
  year_id: string;
  stream_id: string | null;
  year_name_ar: string;
  year_name_fr: string;
  year_name_en: string;
  stream_name_ar: string | null;
  stream_name_fr: string | null;
  stream_name_en: string | null;
  lessons_count: number;
  quizzes_count: number;
  isEnrolled: boolean;
  progressPercent: number;
}

interface LessonDetail {
  id: string;
  unitId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  objectives: string;
  explanation: string;
  keyConcepts: string[];
  appliedExamples: string[];
  exercisesSolutions: Array<{ question: string; solution: string }>;
  summary: string;
  resources: Array<{ label: string; url: string }>;
  mediaUrl: string | null;
  accessTier: 'free' | 'premium';
}

interface QuizQuestionClient {
  id: string;
  prompt: string;
  options: string[];
  points: number;
}

interface QuizAttemptBreakdown {
  questionId: string;
  prompt: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
  pointsEarned: number;
  pointsTotal: number;
}

interface CoursesAndLessonsViewProps {
  token: string;
  user: TayssirUser;
  locale: Locale;
  initialCourseId?: string | null;
  onBack?: () => void;
}

export function CoursesAndLessonsView({
  token,
  user,
  locale,
  initialCourseId = null,
  onBack,
}: CoursesAndLessonsViewProps) {
  const [cycles, setCycles] = useState<CycleItem[]>([]);
  const [years, setYears] = useState<YearItem[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [cycleId, setCycleId] = useState<string>(user.cycleId || '');
  const [yearId, setYearId] = useState<string>(user.yearId || '');
  const [streamId, setStreamId] = useState<string>(user.streamId || '');
  const [subjectId, setSubjectId] = useState<string>('');
  const [search, setSearch] = useState('');

  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected course / lesson / quiz state
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(initialCourseId);
  const [courseDetail, setCourseDetail] = useState<{
    course: CourseListItem;
    units: Array<{ id: string; title: string; sort_order: number }>;
    lessons: Array<{ id: string; unit_id: string; title: string; access_tier: string }>;
    quizzes: Array<{ id: string; title: string; description: string; duration_minutes: number; pass_score: number; questions_count: number }>;
    isEnrolled: boolean;
    completedLessonIds: string[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [activeLesson, setActiveLesson] = useState<{
    lesson: LessonDetail;
    isCompleted: boolean;
    prevLesson: { id: string; title: string } | null;
    nextLesson: { id: string; title: string } | null;
    linkedQuizzes: Array<{ id: string; title: string; duration_minutes: number; pass_score: number }>;
  } | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [openSolutions, setOpenSolutions] = useState<Record<number, boolean>>({});
  const [completingLesson, setCompletingLesson] = useState(false);

  // Quiz Player state
  const [activeQuiz, setActiveQuiz] = useState<{
    quiz: { id: string; courseId: string; title: string; description: string; durationMinutes: number; passScore: number };
    questions: QuizQuestionClient[];
    myAttempts: Array<{ id: string; score: number; max_score: number; percentage: number; passed: number; submitted_at: string }>;
  } | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    attempt: { score: number; maxScore: number; percentage: number; passed: boolean };
    breakdown: QuizAttemptBreakdown[];
  } | null>(null);

  useEffect(() => {
    void apiRequest<{
      cycles: CycleItem[];
      years: YearItem[];
      streams: StreamItem[];
      subjects: SubjectItem[];
    }>('/api/curriculum', { token })
      .then((res) => {
        setCycles(res.cycles);
        setYears(res.years);
        setStreams(res.streams);
        setSubjects(res.subjects);
      })
      .catch(() => {});
  }, [token]);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (cycleId) qs.set('cycleId', cycleId);
      if (yearId) qs.set('yearId', yearId);
      if (streamId) qs.set('streamId', streamId);
      if (subjectId) qs.set('subjectId', subjectId);
      if (search.trim()) qs.set('q', search.trim());
      const res = await apiRequest<{ courses: CourseListItem[] }>(`/api/courses?${qs.toString()}`, {
        token,
      });
      setCourses(res.courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [token, cycleId, yearId, streamId, subjectId, search]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const openCourse = useCallback(
    async (cId: string) => {
      setSelectedCourseId(cId);
      setActiveLesson(null);
      setActiveQuiz(null);
      setQuizResult(null);
      setDetailLoading(true);
      setError(null);
      try {
        const res = await apiRequest<NonNullable<typeof courseDetail>>(`/api/courses/${cId}`, {
          token,
        });
        setCourseDetail(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (initialCourseId) {
      void openCourse(initialCourseId);
    }
  }, [initialCourseId, openCourse]);

  const openLesson = async (lessonId: string) => {
    setLessonLoading(true);
    setActiveQuiz(null);
    setQuizResult(null);
    setOpenSolutions({});
    setError(null);
    try {
      const res = await apiRequest<NonNullable<typeof activeLesson>>(`/api/lessons/${lessonId}`, {
        token,
      });
      setActiveLesson(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open lesson');
    } finally {
      setLessonLoading(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!activeLesson) return;
    setCompletingLesson(true);
    try {
      await apiRequest(`/api/lessons/${activeLesson.lesson.id}/complete`, {
        method: 'POST',
        token,
      });
      setActiveLesson({ ...activeLesson, isCompleted: true });
      if (selectedCourseId) {
        void openCourse(selectedCourseId);
      }
    } finally {
      setCompletingLesson(false);
    }
  };

  const openQuiz = async (quizId: string) => {
    setLessonLoading(true);
    setActiveLesson(null);
    setQuizResult(null);
    setQuizAnswers({});
    setError(null);
    try {
      const res = await apiRequest<NonNullable<typeof activeQuiz>>(`/api/quizzes/${quizId}`, {
        token,
      });
      setActiveQuiz(res);
      setSecondsLeft((res.quiz.durationMinutes || 15) * 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open quiz');
    } finally {
      setLessonLoading(false);
    }
  };

  const handleSubmitQuiz = useCallback(async () => {
    if (!activeQuiz || submittingQuiz) return;
    setSubmittingQuiz(true);
    try {
      const res = await apiRequest<NonNullable<typeof quizResult>>(
        `/api/quizzes/${activeQuiz.quiz.id}/submit`,
        {
          method: 'POST',
          token,
          body: { answers: quizAnswers },
        }
      );
      setQuizResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  }, [activeQuiz, quizAnswers, submittingQuiz, token]);

  useEffect(() => {
    if (!activeQuiz || quizResult || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, quizResult, secondsLeft, handleSubmitQuiz]);

  const handleEnroll = async (cId: string) => {
    await apiRequest(`/api/courses/${cId}/enroll`, { method: 'POST', token });
    await openCourse(cId);
    await loadCourses();
  };

  const copy = {
    ar: {
      title: 'المناهج والدورات التعليمية',
      subtitle: 'الطور ← السنة ← الشعبة ← المادة ← الوحدة ← الدرس ← التمارين والاختبارات',
      allCycles: 'كل الأطوار',
      allYears: 'كل السنوات',
      allStreams: 'كل الشعب',
      allSubjects: 'كل المواد',
      search: 'ابحث عن دورة أو مادة...',
      emptyCourses: 'لا توجد دورات متاحة حالياً ضمن هذا التصنيف.',
      backToCourses: 'العودة إلى الدورات',
      backToCourse: 'العودة إلى وحدات الدورة',
      enroll: 'التسجيل في الدورة',
      enrolled: 'مسجّل',
      lessons: 'دروس',
      quizzes: 'اختبارات',
      free: 'مجاني',
      premium: 'محتوى Premium',
      objectives: 'الأهداف التعليمية',
      explanation: 'الشرح المنظم',
      keyConcepts: 'المفاهيم الأساسية',
      examples: 'أمثلة تطبيقية',
      exercises: 'تمارين وحلول',
      showSolution: 'عرض الحل',
      hideSolution: 'إخفاء الحل',
      summary: 'ملخص الدرس',
      resources: 'موارد ومراجع رسمية',
      markComplete: 'إتمام الدرس وحفظ التقدم',
      completed: 'تم إتمام الدرس',
      prevLesson: 'الدرس السابق',
      nextLesson: 'الدرس التالي',
      startQuiz: 'بدء الاختبار',
      submitQuiz: 'إرسال الإجابات والتصحيح',
      scoreResult: 'النتيجة النهائية',
      passed: 'ناجح',
      notPassed: 'يحتاج مراجعة',
      coef: 'المعامل',
      noContentYet: 'لم تُضف دروس في هذه الدورة بعد.',
    },
    fr: {
      title: 'Programme officiel & Cours',
      subtitle: 'Cycle → Année → Filière → Matière → Unité → Cours → Exercices & Quiz',
      allCycles: 'Tous les cycles',
      allYears: 'Toutes les années',
      allStreams: 'Toutes les filières',
      allSubjects: 'Toutes les matières',
      search: 'Rechercher un cours ou une matière...',
      emptyCourses: 'Aucun cours disponible pour ce filtre actuellement.',
      backToCourses: 'Retour aux cours',
      backToCourse: 'Retour aux unités du cours',
      enroll: "S'inscrire au cours",
      enrolled: 'Inscrit',
      lessons: 'leçons',
      quizzes: 'quiz',
      free: 'Gratuit',
      premium: 'Premium',
      objectives: 'Objectifs pédagogiques',
      explanation: 'Explication structurée',
      keyConcepts: 'Concepts clés',
      examples: 'Exemples appliqués',
      exercises: 'Exercices et corrigés',
      showSolution: 'Voir le corrigé',
      hideSolution: 'Masquer le corrigé',
      summary: 'Résumé du cours',
      resources: 'Ressources officielles',
      markComplete: 'Marquer comme terminé',
      completed: 'Leçon terminée',
      prevLesson: 'Leçon précédente',
      nextLesson: 'Leçon suivante',
      startQuiz: 'Démarrer le quiz',
      submitQuiz: 'Soumettre mes réponses',
      scoreResult: 'Résultat final',
      passed: 'Réussi',
      notPassed: 'À réviser',
      coef: 'Coef.',
      noContentYet: 'Aucune leçon publiée dans ce cours pour le moment.',
    },
    en: {
      title: 'Curriculum & Courses',
      subtitle: 'Cycle → Year → Stream → Subject → Unit → Lesson → Exercises & Quizzes',
      allCycles: 'All Cycles',
      allYears: 'All Years',
      allStreams: 'All Streams',
      allSubjects: 'All Subjects',
      search: 'Search courses or subjects...',
      emptyCourses: 'No courses available for this filter yet.',
      backToCourses: 'Back to Courses',
      backToCourse: 'Back to Course Units',
      enroll: 'Enroll in Course',
      enrolled: 'Enrolled',
      lessons: 'lessons',
      quizzes: 'quizzes',
      free: 'Free',
      premium: 'Premium',
      objectives: 'Learning Objectives',
      explanation: 'Structured Explanation',
      keyConcepts: 'Key Concepts',
      examples: 'Applied Examples',
      exercises: 'Exercises & Solutions',
      showSolution: 'Show Solution',
      hideSolution: 'Hide Solution',
      summary: 'Lesson Summary',
      resources: 'Official Resources',
      markComplete: 'Complete Lesson & Save Progress',
      completed: 'Lesson Completed',
      prevLesson: 'Previous Lesson',
      nextLesson: 'Next Lesson',
      startQuiz: 'Start Quiz',
      submitQuiz: 'Submit Answers & Grade',
      scoreResult: 'Final Score',
      passed: 'Passed',
      notPassed: 'Needs Review',
      coef: 'Coef.',
      noContentYet: 'No lessons have been added to this course yet.',
    },
  }[locale];

  // Quiz View
  if (activeQuiz) {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return (
      <div className="space-y-6">
        <BackButton
          locale={locale}
          onClick={() => {
            setActiveQuiz(null);
            setQuizResult(null);
          }}
          label={copy.backToCourse}
        />

        <div className="tayssir-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E9EDF5] dark:border-white/10 pb-5">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-[#101D42] dark:text-white">
                {activeQuiz.quiz.title}
              </h1>
              {activeQuiz.quiz.description && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {activeQuiz.quiz.description}
                </p>
              )}
            </div>
            {!quizResult && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101D42] text-white font-mono text-sm tabular-nums">
                <Clock className="w-4 h-4 text-[#60A5FA]" />
                <span>
                  {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {quizResult ? (
            <div className="space-y-6">
              <div className="rounded-2xl p-6 bg-[#E9EDF5]/60 dark:bg-white/5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {copy.scoreResult}
                  </p>
                  <p className="mt-1 font-display text-3xl font-bold tabular-nums text-[#101D42] dark:text-white">
                    {quizResult.attempt.percentage}%{' '}
                    <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                      ({quizResult.attempt.score}/{quizResult.attempt.maxScore})
                    </span>
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                    quizResult.attempt.passed
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{quizResult.attempt.passed ? copy.passed : copy.notPassed}</span>
                </span>
              </div>

              <div className="space-y-4">
                {quizResult.breakdown.map((b, i) => (
                  <div
                    key={b.questionId}
                    className="rounded-2xl border border-[#E9EDF5] dark:border-white/10 p-5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[#101D42] dark:text-white">
                        {i + 1}. {b.prompt}
                      </p>
                      <span
                        className={`text-xs font-mono tabular-nums shrink-0 ${
                          b.isCorrect
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {b.pointsEarned}/{b.pointsTotal}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {b.options[b.correctIndex]}
                    </p>
                    {b.explanation && (
                      <p className="text-xs text-[#1769E8] dark:text-[#60A5FA] bg-[#1769E8]/8 rounded-xl p-3">
                        {b.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {activeQuiz.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-[#E9EDF5] dark:border-white/10 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[#101D42] dark:text-white">
                      {idx + 1}. {q.prompt}
                    </p>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {q.points} pt
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const selected = quizAnswers[q.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() =>
                            setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                          }
                          className={`text-start px-4 py-3 rounded-xl border text-sm transition-colors cursor-pointer min-h-[44px] ${
                            selected
                              ? 'border-[#1769E8] bg-[#1769E8]/10 text-[#101D42] dark:text-white font-medium'
                              : 'border-[#E9EDF5] dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-[#E9EDF5]/40 dark:hover:bg-white/5'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={submittingQuiz}
                  onClick={() => void handleSubmitQuiz()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1769E8] hover:bg-[#1358C7] text-white text-sm font-semibold cursor-pointer disabled:opacity-60 min-h-[44px]"
                >
                  {submittingQuiz && <TayssirSpinner />}
                  <span>{copy.submitQuiz}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lesson Reader View
  if (lessonLoading) {
    return <TayssirFullLoader locale={locale} />;
  }

  if (activeLesson) {
    const l = activeLesson.lesson;
    return (
      <div className="space-y-6">
        <BackButton
          locale={locale}
          onClick={() => setActiveLesson(null)}
          label={copy.backToCourse}
        />

        <article className="tayssir-card rounded-3xl p-6 sm:p-8 space-y-8">
          <header className="border-b border-[#E9EDF5] dark:border-white/10 pb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#1769E8] dark:text-[#60A5FA]">
                {l.courseTitle}
              </p>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#101D42] dark:text-white">
                {l.title}
              </h1>
            </div>
            <button
              type="button"
              disabled={completingLesson || activeLesson.isCompleted}
              onClick={() => void handleCompleteLesson()}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[42px] ${
                activeLesson.isCompleted
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-[#1769E8] hover:bg-[#1358C7] text-white'
              }`}
            >
              {completingLesson ? (
                <TayssirSpinner />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{activeLesson.isCompleted ? copy.completed : copy.markComplete}</span>
            </button>
          </header>

          {l.objectives && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[#7652D6] dark:text-[#A58DF0]">
                {copy.objectives}
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {l.objectives}
              </p>
            </section>
          )}

          <section className="space-y-2.5">
            <h2 className="text-base font-semibold text-[#101D42] dark:text-white">
              {copy.explanation}
            </h2>
            <div className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-loose whitespace-pre-line">
              {l.explanation}
            </div>
          </section>

          {l.keyConcepts.length > 0 && (
            <section className="rounded-2xl bg-[#E9EDF5]/60 dark:bg-white/5 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[#101D42] dark:text-white">
                {copy.keyConcepts}
              </h2>
              <ul className="space-y-2">
                {l.keyConcepts.map((kc, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                    <span className="font-mono text-xs text-[#1769E8] mt-1">•</span>
                    <span>{kc}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {l.appliedExamples.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#101D42] dark:text-white">
                {copy.examples}
              </h2>
              <div className="space-y-2.5">
                {l.appliedExamples.map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-[#E9EDF5] dark:border-white/10 p-4 text-sm text-slate-700 dark:text-slate-200 leading-relaxed"
                  >
                    {ex}
                  </div>
                ))}
              </div>
            </section>
          )}

          {l.exercisesSolutions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#101D42] dark:text-white">
                {copy.exercises}
              </h2>
              <div className="space-y-3">
                {l.exercisesSolutions.map((ex, i) => {
                  const open = Boolean(openSolutions[i]);
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-[#E9EDF5] dark:border-white/10 p-4 space-y-3"
                    >
                      <p className="text-sm font-medium text-[#101D42] dark:text-white">
                        {ex.question}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSolutions((prev) => ({ ...prev, [i]: !open }))
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1769E8] hover:underline cursor-pointer"
                      >
                        {open ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>{copy.hideSolution}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>{copy.showSolution}</span>
                          </>
                        )}
                      </button>
                      {open && (
                        <div className="rounded-xl bg-[#E9EDF5]/70 dark:bg-white/5 p-3.5 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                          {ex.solution}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {l.summary && (
            <section className="rounded-2xl border border-[#7652D6]/25 bg-[#7652D6]/6 p-5 space-y-2">
              <h2 className="text-sm font-semibold text-[#7652D6] dark:text-[#A58DF0]">
                {copy.summary}
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {l.summary}
              </p>
            </section>
          )}

          {l.resources.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {copy.resources}
              </h2>
              <div className="flex flex-wrap gap-3">
                {l.resources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1769E8] hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{r.label}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Linked Quizzes & Prev/Next */}
          <footer className="pt-6 border-t border-[#E9EDF5] dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {activeLesson.prevLesson && (
                <button
                  type="button"
                  onClick={() => void openLesson(activeLesson.prevLesson!.id)}
                  className="px-3.5 py-2 rounded-xl border border-[#E9EDF5] dark:border-white/15 text-xs font-medium text-[#101D42] dark:text-white hover:bg-[#E9EDF5]/60 dark:hover:bg-white/5 cursor-pointer"
                >
                  {copy.prevLesson}
                </button>
              )}
              {activeLesson.nextLesson && (
                <button
                  type="button"
                  onClick={() => void openLesson(activeLesson.nextLesson!.id)}
                  className="px-3.5 py-2 rounded-xl bg-[#101D42] text-white text-xs font-medium hover:bg-[#1769E8] cursor-pointer"
                >
                  {copy.nextLesson}
                </button>
              )}
            </div>

            {activeLesson.linkedQuizzes.map((qz) => (
              <button
                key={qz.id}
                type="button"
                onClick={() => void openQuiz(qz.id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7652D6] hover:bg-[#6442C2] text-white text-xs font-semibold cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>{qz.title}</span>
              </button>
            ))}
          </footer>
        </article>
      </div>
    );
  }

  // Course Detail View
  if (selectedCourseId) {
    return (
      <div className="space-y-6">
        <BackButton
          locale={locale}
          onClick={() => {
            setSelectedCourseId(null);
            setCourseDetail(null);
            setError(null);
          }}
          label={copy.backToCourses}
        />

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3.5 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {detailLoading || !courseDetail ? (
          <TayssirFullLoader locale={locale} />
        ) : (
          <div className="space-y-6">
            <div className="tayssir-card rounded-3xl p-6 sm:p-8 flex flex-wrap items-start justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-medium text-[#1769E8] dark:text-[#60A5FA]">
                  {locale === 'ar'
                    ? courseDetail.course.subject_name_ar
                    : locale === 'fr'
                    ? courseDetail.course.subject_name_fr
                    : courseDetail.course.subject_name_en}{' '}
                  · {courseDetail.course.teacher_name}
                </p>
                <h1 className="font-display text-2xl font-bold text-[#101D42] dark:text-white">
                  {courseDetail.course.title}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {courseDetail.course.description}
                </p>
              </div>
              {user.role === 'student' && (
                <button
                  type="button"
                  onClick={() => void handleEnroll(courseDetail.course.id)}
                  disabled={courseDetail.isEnrolled}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer min-h-[42px] ${
                    courseDetail.isEnrolled
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-[#1769E8] text-white hover:bg-[#1358C7]'
                  }`}
                >
                  {courseDetail.isEnrolled ? copy.enrolled : copy.enroll}
                </button>
              )}
            </div>

            {courseDetail.units.length === 0 ? (
              <div className="tayssir-card rounded-2xl p-6 text-sm text-slate-500">
                {copy.noContentYet}
              </div>
            ) : (
              <div className="space-y-4">
                {courseDetail.units.map((unit) => {
                  const unitLessons = courseDetail.lessons.filter((l) => l.unit_id === unit.id);
                  return (
                    <div key={unit.id} className="tayssir-card rounded-2xl p-5 sm:p-6 space-y-4">
                      <h2 className="text-base font-semibold text-[#101D42] dark:text-white border-b border-[#E9EDF5] dark:border-white/10 pb-3">
                        {unit.title}
                      </h2>
                      {unitLessons.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {copy.noContentYet}
                        </p>
                      ) : (
                        <div className="divide-y divide-[#E9EDF5] dark:divide-white/10">
                          {unitLessons.map((les) => {
                            const done = courseDetail.completedLessonIds.includes(les.id);
                            const locked =
                              les.access_tier === 'premium' &&
                              user.role === 'student' &&
                              user.subscriptionTier !== 'premium';
                            return (
                              <button
                                key={les.id}
                                type="button"
                                onClick={() => void openLesson(les.id)}
                                className="w-full py-3.5 flex items-center justify-between gap-3 text-start hover:opacity-80 transition-opacity cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {done ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  ) : locked ? (
                                    <Lock className="w-4 h-4 text-[#7652D6] shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-[#1769E8] shrink-0" />
                                  )}
                                  <span className="text-sm font-medium text-[#101D42] dark:text-white truncate">
                                    {les.title}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                  {les.access_tier === 'premium' ? copy.premium : copy.free}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {courseDetail.quizzes.length > 0 && (
              <div className="tayssir-card rounded-2xl p-6 space-y-3">
                <h2 className="text-base font-semibold text-[#101D42] dark:text-white">
                  {copy.quizzes}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {courseDetail.quizzes.map((qz) => (
                    <div
                      key={qz.id}
                      className="rounded-2xl border border-[#E9EDF5] dark:border-white/10 p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#101D42] dark:text-white truncate">
                          {qz.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {qz.questions_count} Q · {qz.duration_minutes} min
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void openQuiz(qz.id)}
                        className="px-3.5 py-2 rounded-xl bg-[#7652D6] hover:bg-[#6442C2] text-white text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        {copy.startQuiz}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Courses Catalog Browser
  const filteredYears = cycleId ? years.filter((y) => y.cycle_id === cycleId) : years;
  const filteredStreams = yearId ? streams.filter((s) => s.year_id === yearId) : [];
  const filteredSubjects = subjects.filter((s) => {
    if (cycleId && s.cycle_id !== cycleId) return false;
    if (yearId && s.year_id !== yearId) return false;
    if (streamId && s.stream_id !== streamId) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {onBack && (
        <BackButton
          locale={locale}
          onClick={onBack}
          label={TRANSLATIONS[locale].back}
        />
      )}
      <div>
        <h1 className="font-display text-2xl font-bold text-[#101D42] dark:text-white">
          {copy.title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          {copy.subtitle}
        </p>
      </div>

      {/* Filters */}
      <div className="tayssir-card rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.search}
              className="w-full ps-10 pe-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white focus:outline-none focus:border-[#1769E8]"
            />
          </div>

          <select
            value={cycleId}
            onChange={(e) => {
              setCycleId(e.target.value);
              setYearId('');
              setStreamId('');
              setSubjectId('');
            }}
            className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white"
          >
            <option value="">{copy.allCycles}</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {pickLocalizedName(c, locale)}
              </option>
            ))}
          </select>

          <select
            value={yearId}
            onChange={(e) => {
              setYearId(e.target.value);
              setStreamId('');
              setSubjectId('');
            }}
            className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white"
          >
            <option value="">{copy.allYears}</option>
            {filteredYears.map((y) => (
              <option key={y.id} value={y.id}>
                {pickLocalizedName(y, locale)}
              </option>
            ))}
          </select>

          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white"
          >
            <option value="">{copy.allSubjects}</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {pickLocalizedName(s, locale)}
              </option>
            ))}
          </select>
        </div>

        {filteredStreams.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setStreamId('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                !streamId
                  ? 'bg-[#1769E8] text-white'
                  : 'bg-[#E9EDF5] dark:bg-white/10 text-slate-700 dark:text-slate-200'
              }`}
            >
              {copy.allStreams}
            </button>
            {filteredStreams.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStreamId(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  streamId === s.id
                    ? 'bg-[#1769E8] text-white'
                    : 'bg-[#E9EDF5] dark:bg-white/10 text-slate-700 dark:text-slate-200'
                }`}
              >
                {pickLocalizedName(s, locale)}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <TayssirSkeletonGrid count={4} />
      ) : courses.length === 0 ? (
        <div className="tayssir-card rounded-3xl p-10 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {copy.emptyCourses}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.map((c) => {
            const subjName =
              locale === 'ar'
                ? c.subject_name_ar
                : locale === 'fr'
                ? c.subject_name_fr
                : c.subject_name_en;
            const yearName =
              locale === 'ar'
                ? c.year_name_ar
                : locale === 'fr'
                ? c.year_name_fr
                : c.year_name_en;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => void openCourse(c.id)}
                className="tayssir-card rounded-2xl p-6 text-start hover:border-[#1769E8] cursor-pointer flex flex-col justify-between gap-4"
              >
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {subjName} · {yearName} · {copy.coef} {c.subject_coefficient}
                  </p>
                  <h2 className="mt-1.5 text-base font-bold text-[#101D42] dark:text-white">
                    {c.title}
                  </h2>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E9EDF5] dark:border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>
                      {c.teacher_name} · {c.lessons_count} {copy.lessons} · {c.quizzes_count}{' '}
                      {copy.quizzes}
                    </span>
                    <span className="font-semibold text-[#1769E8] dark:text-[#60A5FA]">
                      {c.access_tier === 'premium' ? copy.premium : copy.free}
                    </span>
                  </div>
                  {c.isEnrolled && (
                    <div className="w-full h-1.5 rounded-full bg-[#E9EDF5] dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-[#1769E8] rounded-full"
                        style={{ width: `${c.progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
