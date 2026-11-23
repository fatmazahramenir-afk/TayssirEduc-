import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  Database,
  Settings,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import {
  apiRequest,
  CycleItem,
  PlatformSettings,
  StreamItem,
  SubjectItem,
  TayssirUser,
  YearItem,
} from '../lib/api.ts';
import { Locale, pickLocalizedName, TRANSLATIONS } from '../lib/i18n.ts';
import { BackButton } from './BackButton.tsx';
import { TayssirSkeletonGrid, TayssirSpinner } from './TayssirLoader.tsx';

interface AdminDashboardData {
  users: TayssirUser[];
  stats: {
    studentsCount: number;
    teachersCount: number;
    adminsCount: number;
    coursesCount: number;
    lessonsCount: number;
    quizzesCount: number;
    attemptsCount: number;
    subjectsCount: number;
  };
  settings: PlatformSettings;
  recentAttempts: Array<{
    id: string;
    student_name: string;
    quiz_title: string;
    percentage: number;
    submitted_at: string;
  }>;
}

export function AdminDashboard({
  token,
  currentUser,
  locale,
  onBack,
}: {
  token: string;
  currentUser: TayssirUser;
  locale: Locale;
  onBack?: () => void;
}) {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [cycles, setCycles] = useState<CycleItem[]>([]);
  const [years, setYears] = useState<YearItem[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'users' | 'curriculum' | 'notifications' | 'settings'>('users');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add subject
  const [sCycleId, setSCycleId] = useState('cycle-secondary');
  const [sYearId, setSYearId] = useState('year-3as');
  const [sStreamId, setSStreamId] = useState('stream-3as-se');
  const [sCode, setSCode] = useState('');
  const [sNameAr, setSNameAr] = useState('');
  const [sNameFr, setSNameFr] = useState('');
  const [sCoef, setSCoef] = useState(2);

  // Notification
  const [nTitle, setNTitle] = useState('');
  const [nBody, setNBody] = useState('');
  const [nRole, setNRole] = useState<string>('');

  // Platform settings
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [telegramLabel, setTelegramLabel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, curr] = await Promise.all([
        apiRequest<AdminDashboardData>('/api/admin/dashboard', { token }),
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
      setContactEmail(dash.settings.contactEmail || '');
      setContactPhone(dash.settings.contactPhone || '');
      setTelegramUrl(dash.settings.telegramUrl || '');
      setTelegramLabel(dash.settings.telegramLabel || '');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggleUserStatus = async (u: TayssirUser) => {
    setBusy(true);
    try {
      await apiRequest(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        token,
        body: { status: u.status === 'active' ? 'suspended' : 'active' },
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSubscription = async (u: TayssirUser) => {
    setBusy(true);
    try {
      await apiRequest(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        token,
        body: {
          subscriptionTier: u.subscriptionTier === 'premium' ? 'free' : 'premium',
          subscriptionStatus: 'active',
        },
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setBusy(true);
    try {
      await apiRequest(`/api/admin/users/${id}`, { method: 'DELETE', token });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/admin/curriculum/subjects', {
        method: 'POST',
        token,
        body: {
          cycleId: sCycleId,
          yearId: sYearId,
          streamId: streams.some((s) => s.year_id === sYearId) ? sStreamId : null,
          code: sCode,
          nameAr: sNameAr,
          nameFr: sNameFr || sNameAr,
          coefficient: sCoef,
        },
      });
      setSCode('');
      setSNameAr('');
      setSNameFr('');
      setFeedback(locale === 'ar' ? 'تمت إضافة المادة الرسمية.' : 'Subject added.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiRequest('/api/admin/notifications', {
        method: 'POST',
        token,
        body: { title: nTitle, body: nBody, roleTarget: nRole || null },
      });
      setNTitle('');
      setNBody('');
      setFeedback(locale === 'ar' ? 'تم إرسال الإشعار.' : 'Notification sent.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        token,
        body: { contactEmail, contactPhone, telegramUrl, telegramLabel },
      });
      setFeedback(
        locale === 'ar'
          ? 'تم حفظ بيانات التواصل وقناة Telegram بنجاح.'
          : 'Contact and Telegram settings saved.'
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setBusy(false);
    }
  };

  const handleSeedOfficialUnits = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await apiRequest<{
        coursesCreated: number;
        lessonsCreated: number;
        quizzesCreated: number;
      }>('/api/admin/seed-algerian-curriculum', { method: 'POST', token });
      setFeedback(
        locale === 'ar'
          ? `تم تحميل ${res.coursesCreated} دورة و${res.lessonsCreated} درس و${res.quizzesCreated} اختبار من المنهاج الجزائري.`
          : `Loaded ${res.coursesCreated} courses, ${res.lessonsCreated} lessons, ${res.quizzesCreated} quizzes.`
      );
      await load();
    } finally {
      setBusy(false);
    }
  };

  const copy = {
    ar: {
      title: 'لوحة تحكم المدير',
      subtitle: 'الإدارة العامة للحسابات، الصلاحيات، المنهاج الجزائري، الاشتراكات، والإشعارات.',
      students: 'الطلاب',
      teachers: 'الأساتذة',
      courses: 'الدورات',
      attempts: 'الاختبارات المنجزة',
      tabUsers: 'المستخدمون والاشتراكات',
      tabCurriculum: 'المناهج والمواد',
      tabNotifications: 'الإشعارات',
      tabSettings: 'التواصل وTelegram',
      seedBtn: 'تحميل وحدات مرجعية للمنهاج الجزائري',
      saveSettings: 'حفظ الإعدادات',
      sendNotif: 'إرسال الإشعار',
      addSubject: 'إضافة مادة',
    },
    fr: {
      title: 'Administration Générale',
      subtitle: 'Gestion des comptes, abonnements, programme algérien et notifications.',
      students: 'Élèves',
      teachers: 'Enseignants',
      courses: 'Cours',
      attempts: 'Quiz passés',
      tabUsers: 'Comptes & Abonnements',
      tabCurriculum: 'Matières officielles',
      tabNotifications: 'Notifications',
      tabSettings: 'Contact & Telegram',
      seedBtn: 'Charger des unités de référence (Programme DZ)',
      saveSettings: 'Enregistrer',
      sendNotif: 'Diffuser',
      addSubject: 'Ajouter la matière',
    },
    en: {
      title: 'Administrator Console',
      subtitle: 'Manage accounts, roles, Algerian curriculum subjects, subscriptions, and settings.',
      students: 'Students',
      teachers: 'Teachers',
      courses: 'Courses',
      attempts: 'Quiz Attempts',
      tabUsers: 'Users & Plans',
      tabCurriculum: 'Curriculum',
      tabNotifications: 'Notifications',
      tabSettings: 'Contact & Telegram',
      seedBtn: 'Load Official Algerian Reference Units',
      saveSettings: 'Save Settings',
      sendNotif: 'Send Notification',
      addSubject: 'Add Subject',
    },
  }[locale];

  if (loading || !data) {
    return <TayssirSkeletonGrid count={4} />;
  }

  return (
    <div className="space-y-6">
      {tab !== 'users' ? (
        <BackButton
          locale={locale}
          onClick={() => {
            setTab('users');
            setError(null);
            setFeedback(null);
          }}
          label={copy.tabUsers}
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

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSeedOfficialUnits()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7652D6] hover:bg-[#6442C2] text-white text-xs font-semibold cursor-pointer min-h-[40px]"
        >
          <Database className="w-4 h-4" />
          <span>{copy.seedBtn}</span>
        </button>
      </div>

      {/* Real Platform Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="tayssir-card rounded-2xl p-5">
          <Users className="w-5 h-5 text-[#1769E8]" />
          <p className="mt-3 text-2xl font-bold tabular-nums text-[#101D42] dark:text-white">
            {data.stats.studentsCount}
          </p>
          <p className="text-xs text-slate-500">{copy.students}</p>
        </div>
        <div className="tayssir-card rounded-2xl p-5">
          <Shield className="w-5 h-5 text-[#7652D6]" />
          <p className="mt-3 text-2xl font-bold tabular-nums text-[#101D42] dark:text-white">
            {data.stats.teachersCount}
          </p>
          <p className="text-xs text-slate-500">{copy.teachers}</p>
        </div>
        <div className="tayssir-card rounded-2xl p-5">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <p className="mt-3 text-2xl font-bold tabular-nums text-[#101D42] dark:text-white">
            {data.stats.coursesCount}
          </p>
          <p className="text-xs text-slate-500">{copy.courses}</p>
        </div>
        <div className="tayssir-card rounded-2xl p-5">
          <Bell className="w-5 h-5 text-[#101D42] dark:text-sky-300" />
          <p className="mt-3 text-2xl font-bold tabular-nums text-[#101D42] dark:text-white">
            {data.stats.attemptsCount}
          </p>
          <p className="text-xs text-slate-500">{copy.attempts}</p>
        </div>
      </div>

      <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-[#E9EDF5] dark:bg-[#101D42]">
        {(
          [
            { id: 'users', label: copy.tabUsers, icon: Users },
            { id: 'curriculum', label: copy.tabCurriculum, icon: BookOpen },
            { id: 'notifications', label: copy.tabNotifications, icon: Bell },
            { id: 'settings', label: copy.tabSettings, icon: Settings },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === t.id
                  ? 'bg-white dark:bg-[#1769E8] text-[#101D42] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
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

      {tab === 'users' && (
        <div className="tayssir-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-[#E9EDF5]/70 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3.5 text-start font-semibold">Name</th>
                  <th className="p-3.5 text-start font-semibold">Role</th>
                  <th className="p-3.5 text-start font-semibold">Email</th>
                  <th className="p-3.5 text-start font-semibold">Plan</th>
                  <th className="p-3.5 text-start font-semibold">Status</th>
                  <th className="p-3.5 text-end font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EDF5] dark:divide-white/10">
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td className="p-3.5 font-medium text-[#101D42] dark:text-white">
                      {u.fullName}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{u.role}</td>
                    <td className="p-3.5 text-slate-500 font-mono">{u.email || '—'}</td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleToggleSubscription(u)}
                        className="px-2.5 py-1 rounded-lg bg-[#E9EDF5] dark:bg-white/10 font-medium cursor-pointer"
                      >
                        {u.subscriptionTier}
                      </button>
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        disabled={busy || u.id === currentUser.id}
                        onClick={() => void handleToggleUserStatus(u)}
                        className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                          u.status === 'active'
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50'
                            : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50'
                        }`}
                      >
                        {u.status}
                      </button>
                    </td>
                    <td className="p-3.5 text-end">
                      {u.id !== currentUser.id && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDeleteUser(u.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'curriculum' && (
        <div className="space-y-6">
          <form onSubmit={handleAddSubject} className="tayssir-card rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={sCycleId}
                onChange={(e) => {
                  setSCycleId(e.target.value);
                  const y = years.find((yr) => yr.cycle_id === e.target.value);
                  setSYearId(y?.id || '');
                }}
                className="px-3 py-2 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {pickLocalizedName(c, locale)}
                  </option>
                ))}
              </select>
              <select
                value={sYearId}
                onChange={(e) => setSYearId(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
              >
                {years
                  .filter((y) => y.cycle_id === sCycleId)
                  .map((y) => (
                    <option key={y.id} value={y.id}>
                      {pickLocalizedName(y, locale)}
                    </option>
                  ))}
              </select>
              {streams.some((s) => s.year_id === sYearId) && (
                <select
                  value={sStreamId}
                  onChange={(e) => setSStreamId(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
                >
                  {streams
                    .filter((s) => s.year_id === sYearId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {pickLocalizedName(s, locale)}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={sCode}
                onChange={(e) => setSCode(e.target.value)}
                placeholder="Code (e.g. MATH)"
                className="px-3 py-2 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
              />
              <input
                type="text"
                required
                value={sNameAr}
                onChange={(e) => setSNameAr(e.target.value)}
                placeholder="اسم المادة بالعربية"
                className="px-3 py-2 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
              />
              <input
                type="text"
                value={sNameFr}
                onChange={(e) => setSNameFr(e.target.value)}
                placeholder="Nom en français"
                className="px-3 py-2 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
              />
              <input
                type="number"
                min={1}
                max={10}
                value={sCoef}
                onChange={(e) => setSCoef(Number(e.target.value))}
                className="px-3 py-2 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-[#1769E8] text-white text-xs font-semibold cursor-pointer"
            >
              {copy.addSubject}
            </button>
          </form>

          <div className="tayssir-card rounded-2xl p-6">
            <p className="text-xs font-semibold text-slate-500 mb-3 tabular-nums">
              {subjects.length} subjects
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto">
              {subjects.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-[#E9EDF5] dark:border-white/10 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate font-medium text-[#101D42] dark:text-white">
                    {pickLocalizedName(s, locale)} ({s.coefficient})
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{s.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <form onSubmit={handleSendNotification} className="tayssir-card rounded-2xl p-6 space-y-4 max-w-xl">
          <input
            type="text"
            required
            value={nTitle}
            onChange={(e) => setNTitle(e.target.value)}
            placeholder={locale === 'ar' ? 'عنوان الإشعار' : 'Notification title'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />
          <textarea
            required
            rows={3}
            value={nBody}
            onChange={(e) => setNBody(e.target.value)}
            placeholder={locale === 'ar' ? 'نص الإشعار' : 'Notification message'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />
          <select
            value={nRole}
            onChange={(e) => setNRole(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          >
            <option value="">{locale === 'ar' ? 'الجميع' : 'Everyone'}</option>
            <option value="student">{locale === 'ar' ? 'الطلاب فقط' : 'Students only'}</option>
            <option value="teacher">{locale === 'ar' ? 'الأساتذة فقط' : 'Teachers only'}</option>
          </select>
          <div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1769E8] text-white text-xs font-semibold cursor-pointer"
            >
              {busy && <TayssirSpinner />}
              <span>{copy.sendNotif}</span>
            </button>
          </div>
        </form>
      )}

      {tab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="tayssir-card rounded-2xl p-6 space-y-4 max-w-xl">
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder={locale === 'ar' ? 'البريد الرسمي للتواصل' : 'Official Contact Email'}
            dir="ltr"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder={locale === 'ar' ? 'رقم الهاتف أو الدعم' : 'Support Phone'}
            dir="ltr"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />
          <input
            type="url"
            value={telegramUrl}
            onChange={(e) => setTelegramUrl(e.target.value)}
            placeholder="https://t.me/..."
            dir="ltr"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />
          <input
            type="text"
            value={telegramLabel}
            onChange={(e) => setTelegramLabel(e.target.value)}
            placeholder={locale === 'ar' ? 'اسم قناة Telegram' : 'Telegram Channel Name'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1769E8] text-white text-xs font-semibold cursor-pointer"
          >
            {busy && <TayssirSpinner />}
            <span>{copy.saveSettings}</span>
          </button>
        </form>
      )}
    </div>
  );
}
