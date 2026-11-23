import { useCallback, useEffect, useState } from 'react';
import { Award, Bell, BookOpen, CheckCircle2, Layers } from 'lucide-react';
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
import { TayssirSkeletonGrid } from './TayssirLoader.tsx';

interface StudentDashboardData {
  profile: TayssirUser;
  cycle: CycleItem | null;
  year: YearItem | null;
  stream: StreamItem | null;
  subjects: SubjectItem[];
  enrolledCourses: Array<{
    id: string;
    title: string;
    subject_name_ar: string;
    subject_name_fr: string;
    subject_name_en: string;
    lessons_count: number;
    completed_count: number;
  }>;
  recentAttempts: Array<{
    id: string;
    quiz_title: string;
    course_title: string;
    score: number;
    max_score: number;
    percentage: number;
    passed: number;
    submitted_at: string;
  }>;
  completedLessonsTotal: number;
  notifications: Array<{ id: string; title: string; body: string; created_at: string }>;
}

interface StudentDashboardProps {
  token: string;
  locale: Locale;
  onOpenCourses: (courseId?: string) => void;
  onBack?: () => void;
}

export function StudentDashboard({
  token,
  locale,
  onOpenCourses,
  onBack,
}: StudentDashboardProps) {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<StudentDashboardData>('/api/student/dashboard', { token });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = {
    ar: {
      welcome: 'مرحباً',
      levelMissing: 'لم يتم تحديد المستوى الدراسي بعد',
      enrolledCount: 'الدورات المسجلة',
      completedCount: 'الدروس المنجزة',
      quizzesCount: 'الاختبارات المنجزة',
      subscription: 'حالة الاشتراك',
      freePlan: 'مجاني',
      premiumPlan: 'Premium مفعّل',
      myCourses: 'دوراتي وتقدمي الدراسي',
      noCourses: 'لم تسجل في أي دورة بعد. تصفح الدورات المتاحة لبدء التعلم.',
      browseCourses: 'تصفح المناهج والدورات',
      officialSubjects: 'المواد الرسمية لمستواك',
      noSubjects: 'اختر السنة والشعبة من الإعدادات لعرض المواد الرسمية.',
      recentResults: 'نتائج الاختبارات الأخيرة',
      noResults: 'لم تجتز أي اختبار بعد.',
      notifications: 'الإشعارات',
      noNotifications: 'لا توجد إشعارات جديدة.',
      coef: 'المعامل',
    },
    fr: {
      welcome: 'Bienvenue',
      levelMissing: 'Niveau scolaire non défini',
      enrolledCount: 'Cours inscrits',
      completedCount: 'Leçons terminées',
      quizzesCount: 'Quiz passés',
      subscription: 'Abonnement',
      freePlan: 'Gratuit',
      premiumPlan: 'Premium actif',
      myCourses: 'Mes cours et progression',
      noCourses: 'Aucun cours inscrit pour le moment.',
      browseCourses: 'Parcourir les cours',
      officialSubjects: 'Matières officielles',
      noSubjects: 'Définissez votre année scolaire pour voir vos matières.',
      recentResults: 'Derniers résultats de quiz',
      noResults: 'Aucun quiz complété pour le moment.',
      notifications: 'Notifications',
      noNotifications: 'Aucune notification récente.',
      coef: 'Coef.',
    },
    en: {
      welcome: 'Welcome',
      levelMissing: 'Academic level not selected yet',
      enrolledCount: 'Enrolled Courses',
      completedCount: 'Completed Lessons',
      quizzesCount: 'Quizzes Taken',
      subscription: 'Subscription',
      freePlan: 'Free Plan',
      premiumPlan: 'Premium Active',
      myCourses: 'My Courses & Progress',
      noCourses: 'You have not enrolled in any courses yet.',
      browseCourses: 'Browse Curriculum & Courses',
      officialSubjects: 'Official Subjects for Your Level',
      noSubjects: 'Select your year and stream in Settings to display your subjects.',
      recentResults: 'Recent Quiz Results',
      noResults: 'No quiz attempts recorded yet.',
      notifications: 'Notifications',
      noNotifications: 'No new notifications.',
      coef: 'Coef.',
    },
  }[locale];

  if (loading || !data) {
    return <TayssirSkeletonGrid count={4} />;
  }

  return (
    <div className="space-y-8">
      {onBack && (
        <BackButton locale={locale} onClick={onBack} label={TRANSLATIONS[locale].back} />
      )}
      {/* Header Welcome */}
      <div className="tayssir-card rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#101D42] dark:text-white">
            {copy.welcome}، {data.profile.fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {data.year
              ? `${pickLocalizedName(data.cycle, locale)} · ${pickLocalizedName(data.year, locale)}${
                  data.stream ? ` · ${pickLocalizedName(data.stream, locale)}` : ''
                }`
              : copy.levelMissing}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenCourses()}
          className="px-5 py-2.5 rounded-xl bg-[#1769E8] hover:bg-[#1358C7] text-white text-xs font-semibold cursor-pointer min-h-[42px]"
        >
          {copy.browseCourses}
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="tayssir-card rounded-2xl p-5">
          <BookOpen className="w-5 h-5 text-[#1769E8]" />
          <p className="mt-3 text-2xl font-bold tabular-nums text-[#101D42] dark:text-white">
            {data.enrolledCourses.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.enrolledCount}</p>
        </div>
        <div className="tayssir-card rounded-2xl p-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="mt-3 text-2xl font-bold tabular-nums text-[#101D42] dark:text-white">
            {data.completedLessonsTotal}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.completedCount}</p>
        </div>
        <div className="tayssir-card rounded-2xl p-5">
          <Award className="w-5 h-5 text-[#7652D6]" />
          <p className="mt-3 text-2xl font-bold tabular-nums text-[#101D42] dark:text-white">
            {data.recentAttempts.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.quizzesCount}</p>
        </div>
        <div className="tayssir-card rounded-2xl p-5">
          <Layers className="w-5 h-5 text-[#101D42] dark:text-sky-300" />
          <p className="mt-3 text-lg font-bold text-[#101D42] dark:text-white">
            {data.profile.subscriptionTier === 'premium' &&
            data.profile.subscriptionStatus === 'active'
              ? copy.premiumPlan
              : copy.freePlan}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.subscription}</p>
        </div>
      </div>

      {/* Courses & Official Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="tayssir-card rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#101D42] dark:text-white">
            {copy.myCourses}
          </h2>
          {data.enrolledCourses.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noCourses}</p>
          ) : (
            <div className="space-y-3">
              {data.enrolledCourses.map((c) => {
                const pct =
                  c.lessons_count > 0
                    ? Math.round((c.completed_count / c.lessons_count) * 100)
                    : 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onOpenCourses(c.id)}
                    className="w-full text-start p-4 rounded-xl border border-[#E9EDF5] dark:border-white/10 hover:border-[#1769E8] cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#101D42] dark:text-white">
                        {c.title}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[#1769E8]">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#E9EDF5] dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#1769E8]" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="tayssir-card rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#101D42] dark:text-white">
            {copy.officialSubjects}
          </h2>
          {data.subjects.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noSubjects}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {data.subjects.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-[#E9EDF5]/55 dark:bg-white/5 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-medium text-[#101D42] dark:text-white truncate">
                    {pickLocalizedName(s, locale)}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    {copy.coef} {s.coefficient}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Results & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="tayssir-card rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#101D42] dark:text-white">
            {copy.recentResults}
          </h2>
          {data.recentAttempts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noResults}</p>
          ) : (
            <div className="divide-y divide-[#E9EDF5] dark:divide-white/10">
              {data.recentAttempts.map((a) => (
                <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#101D42] dark:text-white truncate">
                      {a.quiz_title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {a.course_title}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-[#1769E8] shrink-0">
                    {a.percentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="tayssir-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#7652D6]" />
            <h2 className="text-base font-semibold text-[#101D42] dark:text-white">
              {copy.notifications}
            </h2>
          </div>
          {data.notifications.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noNotifications}</p>
          ) : (
            <div className="space-y-2.5">
              {data.notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl bg-[#E9EDF5]/55 dark:bg-white/5 space-y-1"
                >
                  <p className="text-xs font-semibold text-[#101D42] dark:text-white">{n.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
