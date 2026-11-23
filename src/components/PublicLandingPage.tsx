import { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  ExternalLink,
  Globe,
  GraduationCap,
  Layers,
  LogIn,
  Moon,
  Play,
  Send,
  ShieldCheck,
  Sun,
  UserCheck,
} from 'lucide-react';
import { apiRequest, PublicOverviewResponse, UserRole } from '../lib/api.ts';
import { Locale } from '../lib/i18n.ts';
import { PWAInstallButton } from './PWAInstallPrompt.tsx';
import { TayssirLogoMark } from './TayssirLoader.tsx';

interface PublicLandingPageProps {
  locale: Locale;
  darkMode: boolean;
  onChangeLocale: (locale: Locale) => void;
  onToggleTheme: () => void;
  onOpenLogin: (role?: UserRole) => void;
}

export function PublicLandingPage({
  locale,
  darkMode,
  onChangeLocale,
  onToggleTheme,
  onOpenLogin,
}: PublicLandingPageProps) {
  const [overview, setOverview] = useState<PublicOverviewResponse | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<PublicOverviewResponse>('/api/public/overview')
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const copy = {
    ar: {
      loginBtn: 'تسجيل الدخول',
      slogan: 'دروس أبسط في وقت أقل.',
      sloganSub: 'Learn Smarter. Live Simpler.',
      roleSectionLabel: 'بوابة الدخول',
      roles: [
        { id: 'student' as UserRole, label: 'الطالب', hint: 'دخول التلميذ' },
        { id: 'teacher' as UserRole, label: 'الأستاذ', hint: 'دخول الأستاذ' },
        { id: 'admin' as UserRole, label: 'المدير', hint: 'دخول الإدارة' },
      ],
      howTitle: 'كيف تشتغل المنصة',
      howSteps: [
        { num: '01', title: 'اختر الحساب', meta: 'طالب · أستاذ · مدير' },
        { num: '02', title: 'حدد مستواك', meta: 'ابتدائي · متوسط · ثانوي' },
        { num: '03', title: 'تعلّم بتركيز', meta: 'دروس · أمثلة · تمارين' },
        { num: '04', title: 'قيّم تقدمك', meta: 'اختبارات · نتائج فورية' },
      ],
      statsCycles: 'أطوار',
      statsYears: 'سنة',
      statsSubjects: 'مادة رسمية',
      menLink: 'وزارة التربية الوطنية',
      onpsLink: 'الديوان الوطني للمطبوعات',
      footerAboutTitle: 'من نحن',
      footerAboutBody: 'TAYSSIR — منصة تعليم إلكتروني جزائرية.',
      footerContactTitle: 'كيف تتواصل معنا',
      footerContactMissing: 'لم تُضف بيانات التواصل بعد.',
      footerTelegramTitle: 'قناة Telegram',
      footerTelegramMissing: 'لم يُربط رابط Telegram بعد.',
      footerTelegramOpen: 'فتح قناة Telegram',
    },
    fr: {
      loginBtn: 'Connexion',
      slogan: 'Des cours plus simples en moins de temps.',
      sloganSub: 'Learn Smarter. Live Simpler.',
      roleSectionLabel: 'Accès direct',
      roles: [
        { id: 'student' as UserRole, label: 'Élève', hint: 'Espace élève' },
        { id: 'teacher' as UserRole, label: 'Enseignant', hint: 'Espace prof' },
        { id: 'admin' as UserRole, label: 'Administrateur', hint: 'Console admin' },
      ],
      howTitle: 'Fonctionnement',
      howSteps: [
        { num: '01', title: 'Choisir le profil', meta: 'Élève · Enseignant · Admin' },
        { num: '02', title: 'Niveau officiel', meta: 'Primaire · Moyen · Secondaire' },
        { num: '03', title: 'Apprendre vite', meta: 'Cours · Exemples · Corrigés' },
        { num: '04', title: 'Suivre les scores', meta: 'Quiz · Progression réelle' },
      ],
      statsCycles: 'cycles',
      statsYears: 'niveaux',
      statsSubjects: 'matières',
      menLink: "Ministère de l'Éducation",
      onpsLink: 'ONPS Algérie',
      footerAboutTitle: 'À propos',
      footerAboutBody: 'TAYSSIR — Plateforme algérienne de e-learning.',
      footerContactTitle: 'Nous contacter',
      footerContactMissing: 'Coordonnées non encore configurées.',
      footerTelegramTitle: 'Chaîne Telegram',
      footerTelegramMissing: 'Lien Telegram non encore configuré.',
      footerTelegramOpen: 'Ouvrir Telegram',
    },
    en: {
      loginBtn: 'Sign In',
      slogan: 'Simpler lessons in less time.',
      sloganSub: 'Learn Smarter. Live Simpler.',
      roleSectionLabel: 'Account Access',
      roles: [
        { id: 'student' as UserRole, label: 'Student', hint: 'Student sign in' },
        { id: 'teacher' as UserRole, label: 'Teacher', hint: 'Teacher sign in' },
        { id: 'admin' as UserRole, label: 'Admin', hint: 'Admin console' },
      ],
      howTitle: 'How It Works',
      howSteps: [
        { num: '01', title: 'Pick Your Role', meta: 'Student · Teacher · Admin' },
        { num: '02', title: 'Official Level', meta: 'Primary · Middle · Secondary' },
        { num: '03', title: 'Focused Study', meta: 'Lessons · Examples · Practice' },
        { num: '04', title: 'Track Results', meta: 'Timed Quiz · Live Progress' },
      ],
      statsCycles: 'cycles',
      statsYears: 'grades',
      statsSubjects: 'subjects',
      menLink: 'Ministry of Education',
      onpsLink: 'ONPS Algeria',
      footerAboutTitle: 'About Us',
      footerAboutBody: 'TAYSSIR — Algerian digital learning platform.',
      footerContactTitle: 'Contact Us',
      footerContactMissing: 'Contact details not configured yet.',
      footerTelegramTitle: 'Telegram Channel',
      footerTelegramMissing: 'Telegram link not configured yet.',
      footerTelegramOpen: 'Open Telegram',
    },
  }[locale];

  const roleIcons = {
    student: {
      Icon: GraduationCap,
      gradient: 'linear-gradient(145deg, rgba(23,105,232,0.92) 0%, rgba(56,142,255,0.78) 100%)',
      glow: 'rgba(23, 105, 232, 0.28)',
    },
    teacher: {
      Icon: BookOpen,
      gradient: 'linear-gradient(145deg, rgba(118,82,214,0.92) 0%, rgba(154,116,245,0.78) 100%)',
      glow: 'rgba(118, 82, 214, 0.28)',
    },
    admin: {
      Icon: ShieldCheck,
      gradient: 'linear-gradient(145deg, rgba(16,29,66,0.94) 0%, rgba(39,65,134,0.82) 100%)',
      glow: 'rgba(16, 29, 66, 0.28)',
    },
  } as const;

  const stepIcons = [
    { Icon: UserCheck, color: 'text-[#1769E8] bg-[#1769E8]/12 dark:bg-[#1769E8]/22' },
    { Icon: Layers, color: 'text-[#7652D6] bg-[#7652D6]/12 dark:bg-[#7652D6]/22' },
    { Icon: Play, color: 'text-[#1769E8] bg-[#1769E8]/12 dark:bg-[#1769E8]/22' },
    { Icon: Award, color: 'text-[#101D42] dark:text-sky-300 bg-[#101D42]/10 dark:bg-white/10' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-[#080E1E] text-[#101D42] dark:text-slate-100">
      {/* Top Navigation Bar: ONLY Logo+Name & ONE Login Icon */}
      <header className="sticky top-0 z-40 tayssir-glass border-b border-[#E9EDF5] dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <TayssirLogoMark className="w-9 h-9" />
            <span className="font-display text-lg font-bold tracking-tight text-[#101D42] dark:text-white whitespace-nowrap truncate">
              TAYSSIR <span className="text-[#1769E8] font-semibold">· تيسير</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onOpenLogin('student')}
            aria-label={copy.loginBtn}
            title={copy.loginBtn}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#101D42] dark:bg-[#1769E8] text-white text-sm font-medium hover:bg-[#1769E8] dark:hover:bg-[#1358C7] transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[42px]"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            <span>{copy.loginBtn}</span>
          </button>
        </div>
      </header>

      {/* Main Minimalist iPhone-Style Showcase */}
      <main className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-65 dark:opacity-35"
          style={{
            background:
              'radial-gradient(55% 45% at 18% 22%, rgba(23,105,232,0.16), transparent 70%), radial-gradient(50% 45% at 84% 28%, rgba(118,82,214,0.16), transparent 70%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Brand + 3 Glass Login Icons (Student, Teacher, Admin) */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-3">
                  <TayssirLogoMark className="w-12 h-12 rounded-2xl" />
                  <div>
                    <p className="font-display text-lg font-bold text-[#101D42] dark:text-white">
                      TAYSSIR · تيسير
                    </p>
                    <p className="text-xs font-medium text-[#7652D6] dark:text-[#A58DF0]">
                      {copy.sloganSub}
                    </p>
                  </div>
                </div>

                <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#101D42] dark:text-white leading-tight [text-wrap:balance]">
                  {copy.slogan}
                </h1>
              </div>

              {/* 3 iOS Liquid Glass Login Icons */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {copy.roleSectionLabel}
                </p>
                <div className="grid grid-cols-3 gap-3 sm:gap-5 max-w-lg">
                  {copy.roles.map((r) => {
                    const style = roleIcons[r.id];
                    const Icon = style.Icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onOpenLogin(r.id)}
                        className="group tayssir-ios-glass rounded-[28px] p-4 sm:p-5 flex flex-col items-center text-center gap-3 cursor-pointer transition-transform duration-150 hover:-translate-y-1 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769E8]"
                      >
                        <div
                          className="tayssir-ios-squircle w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-white group-hover:scale-105"
                          style={{
                            background: style.gradient,
                            boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.55), 0 14px 28px -10px ${style.glow}`,
                          }}
                        >
                          <Icon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.9]" />
                        </div>
                        <div className="space-y-0.5 min-w-0 w-full">
                          <p className="font-display text-sm sm:text-base font-bold text-[#101D42] dark:text-white truncate">
                            {r.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">
                            {r.hint}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minimal Utility Controls (Language, Theme, PWA) */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <div
                  className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#E9EDF5] dark:bg-[#101D42] border border-[#E9EDF5] dark:border-white/10"
                  role="group"
                  aria-label="Language"
                >
                  <Globe className="w-3.5 h-3.5 mx-1.5 text-slate-500 dark:text-slate-400" />
                  {(['ar', 'fr', 'en'] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onChangeLocale(code)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        locale === code
                          ? 'bg-white dark:bg-[#1769E8] text-[#101D42] dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-[#101D42] dark:hover:text-white'
                      }`}
                    >
                      {code === 'ar' ? 'العربية' : code === 'fr' ? 'Français' : 'English'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-[#E9EDF5] dark:bg-[#101D42] text-[#101D42] dark:text-slate-100 border border-[#E9EDF5] dark:border-white/10 hover:opacity-90 transition-opacity cursor-pointer min-h-[38px]"
                >
                  {darkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>{locale === 'ar' ? 'فاتح' : locale === 'fr' ? 'Clair' : 'Light'}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-[#7652D6]" />
                      <span>{locale === 'ar' ? 'داكن' : locale === 'fr' ? 'Sombre' : 'Dark'}</span>
                    </>
                  )}
                </button>

                <PWAInstallButton locale={locale} compact />
              </div>
            </div>

            {/* Right Column: iPhone-Inspired Visual Flow ("كيف تشتغل المنصة") */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="w-full max-w-[390px] rounded-[42px] p-3 bg-[#101D42]/95 dark:bg-[#131F44] shadow-[0_28px_70px_-20px_rgba(16,29,66,0.45)] border border-white/15">
                <div className="tayssir-ios-glass rounded-[34px] p-5 sm:p-6 space-y-5 relative overflow-hidden">
                  {/* iPhone Dynamic Island Accent */}
                  <div className="flex justify-center">
                    <div
                      className="w-24 h-5 rounded-full bg-[#101D42] dark:bg-[#060A17] flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#1769E8]/70" />
                    </div>
                  </div>

                  {/* Screen Header */}
                  <div className="text-center space-y-1">
                    <h2 className="font-display text-lg font-bold text-[#101D42] dark:text-white">
                      {copy.howTitle}
                    </h2>
                    {overview && (
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-300 tabular-nums">
                        {overview.cycles.length} {copy.statsCycles} · {overview.years.length}{' '}
                        {copy.statsYears} · {overview.stats.subjectsCount} {copy.statsSubjects}
                      </p>
                    )}
                  </div>

                  {/* 4 iOS Glass Step Widgets */}
                  <div className="space-y-2.5">
                    {copy.howSteps.map((step, i) => {
                      const { Icon, color } = stepIcons[i];
                      return (
                        <div
                          key={step.num}
                          className="rounded-2xl bg-white/80 dark:bg-[#0B142E]/75 backdrop-blur-md border border-white/80 dark:border-white/10 p-3.5 flex items-center gap-3.5"
                        >
                          <div
                            className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 ${color}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#101D42] dark:text-white truncate">
                              {step.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">
                              {step.meta}
                            </p>
                          </div>
                          <span className="font-mono text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                            {step.num}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Official Sources Links (Minimal Typography) */}
                  <div className="pt-1 flex items-center justify-center gap-4 text-[11px] font-medium">
                    <a
                      href="https://www.education.gov.dz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#1769E8] dark:text-[#60A5FA] hover:underline"
                    >
                      <span>{copy.menLink}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <a
                      href="https://www.onps.dz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#7652D6] dark:text-[#A58DF0] hover:underline"
                    >
                      <span>{copy.onpsLink}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* iPhone Home Indicator */}
                  <div className="pt-1 flex justify-center" aria-hidden="true">
                    <div className="w-28 h-1 rounded-full bg-[#101D42]/20 dark:bg-white/25" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Strict Section 3 Footer: ONLY 3 Sections (About Us, Contact Us, Telegram Channel) */}
      <footer className="border-t border-[#E9EDF5] dark:border-white/10 bg-[#101D42] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. من نحن */}
          <div>
            <h3 className="text-sm font-semibold text-white">{copy.footerAboutTitle}</h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              {copy.footerAboutBody}
            </p>
          </div>

          {/* 2. كيف تتواصل معنا */}
          <div>
            <h3 className="text-sm font-semibold text-white">{copy.footerContactTitle}</h3>
            <div className="mt-2 text-xs text-slate-300 space-y-1">
              {overview?.settings.contactEmail || overview?.settings.contactPhone ? (
                <>
                  {overview.settings.contactEmail && (
                    <p>
                      <a
                        href={`mailto:${overview.settings.contactEmail}`}
                        className="text-sky-300 hover:underline"
                      >
                        {overview.settings.contactEmail}
                      </a>
                    </p>
                  )}
                  {overview.settings.contactPhone && (
                    <p className="font-mono tabular-nums">{overview.settings.contactPhone}</p>
                  )}
                </>
              ) : (
                <p className="text-slate-400">{copy.footerContactMissing}</p>
              )}
            </div>
          </div>

          {/* 3. قناة Telegram */}
          <div>
            <h3 className="text-sm font-semibold text-white">{copy.footerTelegramTitle}</h3>
            <div className="mt-2 text-xs">
              {overview?.settings.telegramUrl ? (
                <a
                  href={overview.settings.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{overview.settings.telegramLabel || copy.footerTelegramOpen}</span>
                </a>
              ) : (
                <p className="text-slate-400">{copy.footerTelegramMissing}</p>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
