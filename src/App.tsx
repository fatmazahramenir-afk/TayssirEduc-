import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Globe,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { BackButton } from './components/BackButton.tsx';
import { CoursesAndLessonsView } from './components/CoursesAndLessonsView.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallPrompt.tsx';
import { PublicLandingPage } from './components/PublicLandingPage.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { TayssirLogoMark, TayssirSpinner } from './components/TayssirLoader.tsx';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';
import { UnifiedAuthPage } from './components/UnifiedAuthPage.tsx';
import { WorkspaceHubView } from './components/WorkspaceHubView.tsx';
import {
  apiRequest,
  CycleItem,
  StreamItem,
  TayssirUser,
  UserRole,
  YearItem,
} from './lib/api.ts';
import { Locale, pickLocalizedName, TRANSLATIONS } from './lib/i18n.ts';

type AppSection = 'dashboard' | 'courses' | 'workspace' | 'settings';

function getRequestedProtectedSectionFromHash(): AppSection | null {
  const hash = window.location.hash.replace('#', '').trim();
  if (hash === 'dashboard' || hash === 'courses' || hash === 'workspace' || hash === 'settings') {
    return hash;
  }
  return null;
}

function SettingsView({
  token,
  user,
  locale,
  darkMode,
  onChangeLocale,
  onToggleTheme,
  onUserUpdated,
  onBack,
}: {
  token: string;
  user: TayssirUser;
  locale: Locale;
  darkMode: boolean;
  onChangeLocale: (next: Locale) => void;
  onToggleTheme: () => void;
  onUserUpdated: (updated: TayssirUser) => void;
  onBack?: () => void;
}) {
  const [cycles, setCycles] = useState<CycleItem[]>([]);
  const [years, setYears] = useState<YearItem[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [cycleId, setCycleId] = useState(user.cycleId || 'cycle-secondary');
  const [yearId, setYearId] = useState(user.yearId || 'year-3as');
  const [streamId, setStreamId] = useState(user.streamId || '');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<{ cycles: CycleItem[]; years: YearItem[]; streams: StreamItem[] }>(
      '/api/curriculum',
      { token }
    )
      .then((res) => {
        setCycles(res.cycles);
        setYears(res.years);
        setStreams(res.streams);
      })
      .catch(() => {});
  }, [token]);

  const handleSaveAcademic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      const hasStreams = years.find((y) => y.id === yearId)?.has_streams === 1;
      const res = await apiRequest<{ user: TayssirUser }>('/api/auth/preferences', {
        method: 'PATCH',
        token,
        body: {
          preferredLocale: locale,
          cycleId,
          yearId,
          streamId: hasStreams ? streamId || null : null,
        },
      });
      onUserUpdated(res.user);
      setSavedMsg(locale === 'ar' ? 'تم حفظ التعديلات بنجاح.' : 'Preferences saved.');
    } finally {
      setSaving(false);
    }
  };

  const t = TRANSLATIONS[locale];

  return (
    <div className="space-y-6 max-w-2xl">
      {onBack && (
        <BackButton locale={locale} onClick={onBack} label={t.back} />
      )}
      <h1 className="font-display text-2xl font-bold text-[#101D42] dark:text-white">
        {t.nav.settings}
      </h1>

      <div className="tayssir-card rounded-2xl p-6 space-y-5">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.roles[user.role]} · {user.subscriptionTier.toUpperCase()}
          </p>
          <p className="mt-1 text-base font-semibold text-[#101D42] dark:text-white">
            {user.fullName}
          </p>
          {user.email && (
            <p className="text-xs font-mono text-slate-500 mt-0.5">{user.email}</p>
          )}
        </div>

        <div className="pt-4 border-t border-[#E9EDF5] dark:border-white/10 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#E9EDF5] dark:bg-[#080E1E]">
            {(['ar', 'fr', 'en'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onChangeLocale(code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  locale === code
                    ? 'bg-white dark:bg-[#1769E8] text-[#101D42] dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {code === 'ar' ? 'العربية' : code === 'fr' ? 'Français' : 'English'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E9EDF5] dark:border-white/15 text-xs font-semibold cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#7652D6]" />}
            <span>{darkMode ? t.themes.light : t.themes.dark}</span>
          </button>

          <PWAInstallButton locale={locale} compact />
        </div>
      </div>

      {user.role === 'student' && (
        <form onSubmit={handleSaveAcademic} className="tayssir-card rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#101D42] dark:text-white">
            {locale === 'ar' ? 'المستوى والشعبة الرسمية' : 'Official Academic Level'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={cycleId}
              onChange={(e) => {
                setCycleId(e.target.value);
                const firstY = years.find((y) => y.cycle_id === e.target.value);
                setYearId(firstY?.id || '');
                const firstS = streams.find((s) => s.year_id === firstY?.id);
                setStreamId(firstS?.id || '');
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
              value={yearId}
              onChange={(e) => {
                setYearId(e.target.value);
                const firstS = streams.find((s) => s.year_id === e.target.value);
                setStreamId(firstS?.id || '');
              }}
              className="px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
            >
              {years
                .filter((y) => y.cycle_id === cycleId)
                .map((y) => (
                  <option key={y.id} value={y.id}>
                    {pickLocalizedName(y, locale)}
                  </option>
                ))}
            </select>

            {streams.some((s) => s.year_id === yearId) && (
              <select
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                className="sm:col-span-2 px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E]"
              >
                {streams
                  .filter((s) => s.year_id === yearId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {pickLocalizedName(s, locale)}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {savedMsg && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{savedMsg}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1769E8] text-white text-xs font-semibold cursor-pointer"
          >
            {saving && <TayssirSpinner />}
            <span>{locale === 'ar' ? 'حفظ المستوى' : 'Save Level'}</span>
          </button>
        </form>
      )}
    </div>
  );
}

function TayssirShell() {
  const [locale, setLocale] = useState<Locale>('ar');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(() =>
    Boolean(getRequestedProtectedSectionFromHash())
  );
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('student');
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<AppSection | null>(() =>
    getRequestedProtectedSectionFromHash()
  );

  // In-memory session token (never stored in localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<TayssirUser | null>(null);

  const [section, setSection] = useState<AppSection>('dashboard');
  const [sectionHistory, setSectionHistory] = useState<AppSection[]>([]);
  const [initialCourseId, setInitialCourseId] = useState<string | null>(null);

  const navigateToSection = (next: AppSection, courseId?: string | null) => {
    if (next !== section) {
      setSectionHistory((prev) => [...prev.slice(-14), section]);
      setSection(next);
    }
    if (next === 'courses') {
      setInitialCourseId(courseId || null);
    } else {
      setInitialCourseId(null);
    }
  };

  const goBack = () => {
    if (sectionHistory.length > 0) {
      const prevSection = sectionHistory[sectionHistory.length - 1];
      setSectionHistory((prev) => prev.slice(0, -1));
      setSection(prevSection);
      if (prevSection !== 'courses') setInitialCourseId(null);
      return;
    }
    if (section !== 'dashboard') {
      setSection('dashboard');
      setInitialCourseId(null);
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', darkMode ? '#080E1E' : '#101D42');
    }
  }, [darkMode]);

  useEffect(() => {
    const onHashChange = () => {
      const target = getRequestedProtectedSectionFromHash();
      if (target) {
        if (!token || !user) {
          setRedirectAfterLogin(target);
          setShowAuthScreen(true);
        } else {
          setSection(target);
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [token, user]);

  const handleChangeLocale = (next: Locale) => {
    setLocale(next);
    if (token) {
      void apiRequest<{ user: TayssirUser }>('/api/auth/preferences', {
        method: 'PATCH',
        token,
        body: { preferredLocale: next },
      })
        .then((res) => setUser(res.user))
        .catch(() => {});
    }
  };

  const handleAuthenticated = (nextToken: string, nextUser: TayssirUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextUser.preferredLocale) {
      setLocale(nextUser.preferredLocale);
    }
    setShowAuthScreen(false);
    setSection(redirectAfterLogin || 'dashboard');
    setRedirectAfterLogin(null);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setShowAuthScreen(false);
    setSection('dashboard');
    setSectionHistory([]);
    setInitialCourseId(null);
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const canGoBack = section !== 'dashboard' || sectionHistory.length > 0;
  const CompactBackIcon = locale === 'ar' ? ArrowRight : ArrowLeft;

  const t = TRANSLATIONS[locale];

  // Unauthenticated Visitor View
  if (!token || !user) {
    return (
      <>
        {showAuthScreen ? (
          <UnifiedAuthPage
            locale={locale}
            initialRole={authInitialRole}
            onBackHome={() => {
              setShowAuthScreen(false);
              setRedirectAfterLogin(null);
            }}
            onAuthenticated={handleAuthenticated}
          />
        ) : (
          <PublicLandingPage
            locale={locale}
            darkMode={darkMode}
            onChangeLocale={handleChangeLocale}
            onToggleTheme={() => setDarkMode((prev) => !prev)}
            onOpenLogin={(role) => {
              setAuthInitialRole(role || 'student');
              setShowAuthScreen(true);
            }}
          />
        )}
        <OfflineIndicator locale={locale} />
      </>
    );
  }

  // Authenticated Role-Protected Shell (Desktop Sidebar + Tablet/Mobile Adaptive + Mobile Bottom Nav)
  const navItems: Array<{ id: AppSection; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'courses', label: t.nav.courses, icon: BookOpen },
    { id: 'workspace', label: t.nav.workspace, icon: Briefcase },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#080E1E] text-[#101D42] dark:text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Sidebar (macOS-inspired Glass Sidebar) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:justify-between tayssir-glass border-e border-[#E9EDF5] dark:border-white/10 p-5 shrink-0 sticky top-0 h-screen">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <TayssirLogoMark className="w-9 h-9" />
            <div className="min-w-0">
              <p className="font-display text-base font-bold text-[#101D42] dark:text-white truncate">
                TAYSSIR
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {t.roles[user.role]}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1769E8] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-[#E9EDF5]/70 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#E9EDF5] dark:border-white/10">
          <div className="px-2">
            <p className="text-xs font-semibold text-[#101D42] dark:text-white truncate">
              {user.fullName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user.subscriptionTier === 'premium' ? 'Premium' : 'Free'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleChangeLocale(locale === 'ar' ? 'fr' : locale === 'fr' ? 'en' : 'ar')
              }
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-[#E9EDF5] dark:border-white/15 text-xs font-medium cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="font-mono uppercase">{locale}</span>
            </button>
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label="Toggle theme"
              className="p-2 rounded-xl border border-[#E9EDF5] dark:border-white/15 cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#7652D6]" />}
            </button>
          </div>

          <PWAInstallButton locale={locale} compact />

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#E9EDF5] dark:bg-white/10 text-xs font-semibold text-[#101D42] dark:text-white hover:opacity-90 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Mobile / Tablet Compact Top Bar */}
      <header className="lg:hidden sticky top-0 z-30 tayssir-glass border-b border-[#E9EDF5] dark:border-white/10 px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {canGoBack && (
            <button
              type="button"
              onClick={goBack}
              aria-label={t.back}
              className="p-2 -ms-1 rounded-lg text-[#101D42] dark:text-white hover:bg-[#E9EDF5]/70 dark:hover:bg-white/10 min-w-[40px] min-h-[40px] inline-flex items-center justify-center cursor-pointer shrink-0"
            >
              <CompactBackIcon className="w-5 h-5" />
            </button>
          )}
          <TayssirLogoMark className="w-8 h-8" />
          <span className="font-display text-sm font-bold truncate">
            TAYSSIR · {t.roles[user.role]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              handleChangeLocale(locale === 'ar' ? 'fr' : locale === 'fr' ? 'en' : 'ar')
            }
            className="px-2.5 py-1.5 rounded-lg border border-[#E9EDF5] dark:border-white/15 text-xs font-mono uppercase cursor-pointer"
          >
            {locale}
          </button>
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className="p-2 rounded-lg border border-[#E9EDF5] dark:border-white/15 cursor-pointer"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#7652D6]" />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-lg bg-[#E9EDF5] dark:bg-white/10 cursor-pointer"
            aria-label={t.signOut}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 max-w-6xl w-full mx-auto">
        {section === 'dashboard' && user.role === 'student' && (
          <StudentDashboard
            token={token}
            locale={locale}
            onOpenCourses={(cId) => navigateToSection('courses', cId)}
            onBack={canGoBack ? goBack : undefined}
          />
        )}
        {section === 'dashboard' && user.role === 'teacher' && (
          <TeacherDashboard
            token={token}
            user={user}
            locale={locale}
            onOpenCourse={(cId) => navigateToSection('courses', cId)}
            onBack={canGoBack ? goBack : undefined}
          />
        )}
        {section === 'dashboard' && user.role === 'admin' && (
          <AdminDashboard
            token={token}
            currentUser={user}
            locale={locale}
            onBack={canGoBack ? goBack : undefined}
          />
        )}
        {section === 'courses' && (
          <CoursesAndLessonsView
            token={token}
            user={user}
            locale={locale}
            initialCourseId={initialCourseId}
            onBack={goBack}
          />
        )}
        {section === 'workspace' && (
          <WorkspaceHubView locale={locale} onBack={goBack} />
        )}
        {section === 'settings' && (
          <SettingsView
            token={token}
            user={user}
            locale={locale}
            darkMode={darkMode}
            onChangeLocale={handleChangeLocale}
            onToggleTheme={() => setDarkMode((prev) => !prev)}
            onUserUpdated={setUser}
            onBack={goBack}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation (Safe-area aware, <= 15% mobile height) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 tayssir-glass border-t border-[#E9EDF5] dark:border-white/10 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToSection(item.id)}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium min-h-[44px] cursor-pointer ${
                  active
                    ? 'text-[#1769E8] dark:text-[#60A5FA]'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate max-w-[72px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator locale={locale} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TayssirShell />
    </ErrorBoundary>
  );
}
