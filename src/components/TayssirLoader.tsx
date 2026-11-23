import { Loader2 } from 'lucide-react';
import { Locale } from '../lib/i18n.ts';

export const TAYSSIR_LOGO_SRC = '/assets/aistudio/IMG_20261122_142832_2de9b233.jpg';

export function TayssirLogoMark({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-xl overflow-hidden bg-white border border-[#E9EDF5] dark:border-white/15 shadow-sm shrink-0 flex items-center justify-center`}
    >
      <img
        src={TAYSSIR_LOGO_SRC}
        alt="TAYSSIR"
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain p-0.5"
      />
    </div>
  );
}

export function TayssirFullLoader({
  locale,
  label,
}: {
  locale: Locale;
  label?: string;
}) {
  const defaultLabel =
    locale === 'ar'
      ? 'جارٍ التحميل...'
      : locale === 'fr'
      ? 'Chargement en cours...'
      : 'Loading...';

  return (
    <div className="min-h-[320px] flex flex-col items-center justify-center p-8 text-center">
      <div className="relative flex items-center justify-center">
        <div
          className="tayssir-loader-ring absolute -inset-3 rounded-3xl opacity-30"
          style={{
            background: 'linear-gradient(135deg, #1769E8, #7652D6)',
          }}
        />
        <TayssirLogoMark className="w-16 h-16 relative z-10 rounded-2xl" />
      </div>
      <p className="mt-5 text-sm font-semibold text-[#101D42] dark:text-white tracking-tight">
        {label || defaultLabel}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {locale === 'ar' ? 'دروس أبسط في وقت أقل.' : 'Learn Smarter. Live Simpler.'}
      </p>
    </div>
  );
}

export function TayssirSpinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin motion-reduce:animate-none`} />;
}

export function TayssirSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="tayssir-card tayssir-skeleton rounded-2xl p-6 space-y-3"
        >
          <div className="h-4 w-28 rounded bg-[#E9EDF5] dark:bg-white/10" />
          <div className="h-6 w-3/4 rounded bg-[#E9EDF5] dark:bg-white/10" />
          <div className="h-4 w-full rounded bg-[#E9EDF5] dark:bg-white/10" />
          <div className="h-4 w-2/3 rounded bg-[#E9EDF5] dark:bg-white/10" />
        </div>
      ))}
    </div>
  );
}
