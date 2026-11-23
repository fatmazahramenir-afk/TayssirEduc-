import { useEffect, useState } from 'react';
import {
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Shield,
  UserCheck,
} from 'lucide-react';
import {
  apiRequest,
  CycleItem,
  PublicOverviewResponse,
  StreamItem,
  TayssirUser,
  UserRole,
  YearItem,
} from '../lib/api.ts';
import { Locale, pickLocalizedName } from '../lib/i18n.ts';
import { BackButton } from './BackButton.tsx';
import { TayssirLogoMark, TayssirSpinner } from './TayssirLoader.tsx';

interface UnifiedAuthPageProps {
  locale: Locale;
  initialRole?: UserRole;
  onBackHome: () => void;
  onAuthenticated: (token: string, user: TayssirUser) => void;
}

export function UnifiedAuthPage({
  locale,
  initialRole = 'student',
  onBackHome,
  onAuthenticated,
}: UnifiedAuthPageProps) {
  const [accountType, setAccountType] = useState<UserRole>(initialRole);
  const [mode, setMode] = useState<'login' | 'register' | 'bootstrap'>('login');

  useEffect(() => {
    setAccountType(initialRole);
    setMode('login');
    setError(null);
  }, [initialRole]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bootstrapSecret, setBootstrapSecret] = useState('');

  // Student level selectors
  const [cycles, setCycles] = useState<CycleItem[]>([]);
  const [years, setYears] = useState<YearItem[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [cycleId, setCycleId] = useState('cycle-secondary');
  const [yearId, setYearId] = useState('year-3as');
  const [streamId, setStreamId] = useState('stream-3as-se');

  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [requiresBootstrapSecret, setRequiresBootstrapSecret] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<{ needsAdminBootstrap: boolean; requiresBootstrapSecret: boolean }>(
      '/api/auth/bootstrap-status'
    )
      .then((res) => {
        setNeedsBootstrap(res.needsAdminBootstrap);
        setRequiresBootstrapSecret(res.requiresBootstrapSecret);
      })
      .catch(() => {});

    void apiRequest<PublicOverviewResponse>('/api/public/overview')
      .then((data) => {
        setCycles(data.cycles);
        setYears(data.years);
        setStreams(data.streams);
      })
      .catch(() => {});
  }, []);

  const filteredYears = years.filter((y) => y.cycle_id === cycleId);
  const selectedYear = years.find((y) => y.id === yearId);
  const filteredStreams = streams.filter((s) => s.year_id === yearId);

  const handleSelectRole = (nextRole: UserRole) => {
    setAccountType(nextRole);
    setError(null);
    if (nextRole === 'admin') {
      setMode('login');
    } else if (mode === 'bootstrap') {
      setMode('login');
    }
  };

  const handleCycleChange = (nextCycle: string) => {
    setCycleId(nextCycle);
    const firstYear = years.find((y) => y.cycle_id === nextCycle);
    const nextY = firstYear?.id || '';
    setYearId(nextY);
    const firstStream = streams.find((s) => s.year_id === nextY);
    setStreamId(firstStream?.id || '');
  };

  const handleYearChange = (nextYear: string) => {
    setYearId(nextYear);
    const firstStream = streams.find((s) => s.year_id === nextYear);
    setStreamId(firstStream?.id || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (accountType === 'admin' && mode === 'bootstrap') {
        const res = await apiRequest<{ token: string; user: TayssirUser }>(
          '/api/auth/bootstrap-admin',
          {
            method: 'POST',
            body: {
              fullName,
              email,
              password,
              bootstrapSecret: requiresBootstrapSecret ? bootstrapSecret : undefined,
              preferredLocale: locale,
            },
          }
        );
        onAuthenticated(res.token, res.user);
        return;
      }

      if (mode === 'register' && (accountType === 'student' || accountType === 'teacher')) {
        const res = await apiRequest<{ token: string; user: TayssirUser }>(
          '/api/auth/register',
          {
            method: 'POST',
            body:
              accountType === 'student'
                ? {
                    accountType: 'student',
                    fullName,
                    password,
                    cycleId: cycleId || null,
                    yearId: yearId || null,
                    streamId: selectedYear?.has_streams ? streamId || null : null,
                    preferredLocale: locale,
                  }
                : {
                    accountType: 'teacher',
                    fullName,
                    email,
                    password,
                    preferredLocale: locale,
                  },
          }
        );
        onAuthenticated(res.token, res.user);
        return;
      }

      const res = await apiRequest<{ token: string; user: TayssirUser }>('/api/auth/login', {
        method: 'POST',
        body: {
          accountType,
          fullName,
          email: accountType === 'student' ? undefined : email,
          password,
        },
      });
      onAuthenticated(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const copy = {
    ar: {
      backHome: 'العودة إلى الرئيسية',
      title: 'تسجيل الدخول الموحد',
      subtitle: 'اختر نوع حسابك للمتابعة إلى منصة تيسير الآمنة.',
      roles: {
        student: { label: 'الطالب', desc: 'الاسم الكامل وكلمة المرور' },
        teacher: { label: 'الأستاذ', desc: 'البريد الإلكتروني والاسم وكلمة المرور' },
        admin: { label: 'المدير', desc: 'إدارة المنصة والصلاحيات' },
      },
      tabLogin: 'دخول',
      tabRegister: 'حساب جديد',
      fullName: 'الاسم الكامل',
      fullNamePlaceholder: 'مثال: أمين بن عبد الله',
      email: 'البريد الإلكتروني',
      emailPlaceholder: 'name@example.com',
      password: 'كلمة المرور',
      passwordPlaceholder: '••••••••',
      cycle: 'الطور التعليمي',
      year: 'السنة الدراسية',
      stream: 'الشعبة / الجذع المشترك',
      bootstrapBanner:
        'لم يتم إعداد حساب المدير الرئيسي بعد. يمكنك تهيئة أول حساب مدير الآن (إجراء لمرة واحدة فقط).',
      bootstrapBtn: 'تهيئة أول مدير',
      bootstrapSecretLabel: 'مفتاح التهيئة الآمن (Bootstrap Secret)',
      backToAdminLogin: 'العودة إلى دخول المدير',
      noAdminPublicReg: 'لا يمكن إنشاء حساب مدير عبر التسجيل العام.',
      submitLogin: 'دخول آمن إلى الحساب',
      submitRegister: 'إنشاء الحساب والدخول',
      submitBootstrap: 'إنشاء وتفعيل أول مدير',
    },
    fr: {
      backHome: "Retour à l'accueil",
      title: 'Connexion unifiée',
      subtitle: 'Sélectionnez votre type de compte pour accéder à TAYSSIR.',
      roles: {
        student: { label: 'Élève', desc: 'Nom complet & mot de passe' },
        teacher: { label: 'Enseignant', desc: 'E-mail, nom & mot de passe' },
        admin: { label: 'Administrateur', desc: 'Administration générale' },
      },
      tabLogin: 'Connexion',
      tabRegister: 'Créer un compte',
      fullName: 'Nom complet',
      fullNamePlaceholder: 'Ex : Amine Benabdallah',
      email: 'Adresse e-mail',
      emailPlaceholder: 'nom@exemple.dz',
      password: 'Mot de passe',
      passwordPlaceholder: '••••••••',
      cycle: 'Cycle scolaire',
      year: 'Année scolaire',
      stream: 'Filière / Tronc commun',
      bootstrapBanner:
        'Aucun administrateur n’est encore configuré. Initialisez le premier compte administrateur (action unique).',
      bootstrapBtn: 'Initialiser le 1er admin',
      bootstrapSecretLabel: 'Clé secrète Bootstrap',
      backToAdminLogin: 'Retour à la connexion admin',
      noAdminPublicReg: 'La création de compte administrateur est interdite via l’inscription publique.',
      submitLogin: 'Se connecter',
      submitRegister: 'Créer le compte',
      submitBootstrap: 'Créer le premier administrateur',
    },
    en: {
      backHome: 'Back to Home',
      title: 'Unified Sign In',
      subtitle: 'Choose your account type to access the TAYSSIR platform.',
      roles: {
        student: { label: 'Student', desc: 'Full name & password' },
        teacher: { label: 'Teacher', desc: 'Email, name & password' },
        admin: { label: 'Admin', desc: 'Platform administration' },
      },
      tabLogin: 'Sign In',
      tabRegister: 'Create Account',
      fullName: 'Full Name',
      fullNamePlaceholder: 'e.g. Amine Benabdallah',
      email: 'Email Address',
      emailPlaceholder: 'name@example.com',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      cycle: 'Educational Cycle',
      year: 'Academic Year',
      stream: 'Official Stream',
      bootstrapBanner:
        'No administrator account has been configured yet. Initialize the first administrator once.',
      bootstrapBtn: 'Initialize First Admin',
      bootstrapSecretLabel: 'Bootstrap Secret Key',
      backToAdminLogin: 'Back to Admin Sign In',
      noAdminPublicReg: 'Administrator accounts cannot be created via public registration.',
      submitLogin: 'Sign In Securely',
      submitRegister: 'Register & Continue',
      submitBootstrap: 'Create Initial Administrator',
    },
  }[locale];

  return (
    <div className="min-h-screen bg-[#E9EDF5]/50 dark:bg-[#080E1E] flex flex-col justify-center py-8 px-4">
      <div className="max-w-xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton locale={locale} onClick={onBackHome} label={copy.backHome} />
          <div className="flex items-center gap-2">
            <TayssirLogoMark className="w-8 h-8" />
            <span className="font-display font-bold text-sm text-[#101D42] dark:text-white">
              TAYSSIR
            </span>
          </div>
        </div>

        <div className="tayssir-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#101D42] dark:text-white">
              {copy.title}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              {copy.subtitle}
            </p>
          </div>

          {/* Account Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                { id: 'student', icon: GraduationCap, accent: 'text-[#1769E8]' },
                { id: 'teacher', icon: BookOpen, accent: 'text-[#7652D6]' },
                { id: 'admin', icon: Shield, accent: 'text-[#101D42] dark:text-sky-300' },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = accountType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectRole(item.id)}
                  className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer min-h-[44px] ${
                    active
                      ? 'border-[#1769E8] bg-[#1769E8]/8 dark:bg-[#1769E8]/20 shadow-sm'
                      : 'border-[#E9EDF5] dark:border-white/10 hover:border-slate-300 dark:hover:border-white/25'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${item.accent}`} />
                  <p className="mt-2 text-sm font-semibold text-[#101D42] dark:text-white">
                    {copy.roles[item.id].label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {copy.roles[item.id].desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Mode Tabs (Login vs Register for Student & Teacher; Bootstrap notice for Admin when uninitialized) */}
          {accountType !== 'admin' ? (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#E9EDF5] dark:bg-[#080E1E]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-[#1769E8] text-[#101D42] dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {copy.tabLogin}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-[#1769E8] text-[#101D42] dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {copy.tabRegister}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {needsBootstrap ? (
                <div className="rounded-2xl bg-[#7652D6]/10 border border-[#7652D6]/25 p-4 text-xs text-[#101D42] dark:text-slate-200 space-y-2.5">
                  <p className="leading-relaxed">{copy.bootstrapBanner}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'bootstrap' ? 'login' : 'bootstrap');
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#7652D6] dark:text-[#A58DF0] hover:underline cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>
                      {mode === 'bootstrap' ? copy.backToAdminLogin : copy.bootstrapBtn}
                    </span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {copy.noAdminPublicReg}
                </p>
              )}
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email ONLY for Teacher & Admin (NEVER asked from Student!) */}
            {(accountType === 'teacher' || accountType === 'admin') && (
              <div>
                <label className="block text-xs font-medium text-[#101D42] dark:text-slate-200 mb-1.5">
                  {copy.email}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={copy.emailPlaceholder}
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white focus:outline-none focus:border-[#1769E8]"
                />
              </div>
            )}

            {/* Full Name (All Roles) */}
            <div>
              <label className="block text-xs font-medium text-[#101D42] dark:text-slate-200 mb-1.5">
                {copy.fullName}
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={copy.fullNamePlaceholder}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white focus:outline-none focus:border-[#1769E8]"
              />
            </div>

            {/* Password with Show/Hide toggle */}
            <div>
              <label className="block text-xs font-medium text-[#101D42] dark:text-slate-200 mb-1.5">
                {copy.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={accountType === 'admin' && mode === 'bootstrap' ? 8 : 6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  className="w-full px-3.5 py-2.5 pe-11 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white focus:outline-none focus:border-[#1769E8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 end-0 px-3 flex items-center text-slate-400 hover:text-[#101D42] dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Student Registration Level Selectors */}
            {accountType === 'student' && mode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-[#101D42] dark:text-slate-200 mb-1.5">
                    {copy.cycle}
                  </label>
                  <select
                    value={cycleId}
                    onChange={(e) => handleCycleChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white focus:outline-none focus:border-[#1769E8]"
                  >
                    {cycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {pickLocalizedName(c, locale)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#101D42] dark:text-slate-200 mb-1.5">
                    {copy.year}
                  </label>
                  <select
                    value={yearId}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white focus:outline-none focus:border-[#1769E8]"
                  >
                    {filteredYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {pickLocalizedName(y, locale)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedYear?.has_streams === 1 && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#101D42] dark:text-slate-200 mb-1.5">
                      {copy.stream}
                    </label>
                    <select
                      value={streamId}
                      onChange={(e) => setStreamId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white focus:outline-none focus:border-[#1769E8]"
                    >
                      {filteredStreams.map((s) => (
                        <option key={s.id} value={s.id}>
                          {pickLocalizedName(s, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Admin Bootstrap Secret (only if configured on server) */}
            {accountType === 'admin' && mode === 'bootstrap' && requiresBootstrapSecret && (
              <div>
                <label className="block text-xs font-medium text-[#101D42] dark:text-slate-200 mb-1.5">
                  {copy.bootstrapSecretLabel}
                </label>
                <input
                  type="password"
                  required
                  value={bootstrapSecret}
                  onChange={(e) => setBootstrapSecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white dark:bg-[#080E1E] text-[#101D42] dark:text-white focus:outline-none focus:border-[#1769E8]"
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold text-white shadow-sm cursor-pointer disabled:opacity-60 min-h-[44px]"
              style={{
                background: 'linear-gradient(135deg, #1769E8 0%, #7652D6 100%)',
              }}
            >
              {busy ? (
                <TayssirSpinner />
              ) : (
                <UserCheck className="w-4 h-4 shrink-0" />
              )}
              <span>
                {mode === 'bootstrap'
                  ? copy.submitBootstrap
                  : mode === 'register'
                  ? copy.submitRegister
                  : copy.submitLogin}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
