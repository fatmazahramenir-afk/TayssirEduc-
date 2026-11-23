import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Locale, TRANSLATIONS } from '../lib/i18n.ts';

interface BackButtonProps {
  locale: Locale;
  onClick: () => void;
  label?: string;
  className?: string;
}

export function BackButton({
  locale,
  onClick,
  label,
  className = '',
}: BackButtonProps) {
  const isRtl = locale === 'ar';
  const ArrowIcon = isRtl ? ArrowRight : ArrowLeft;
  const text = label || TRANSLATIONS[locale].back;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={text}
      className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E9EDF5] dark:border-white/15 bg-white/85 dark:bg-[#101D42]/85 backdrop-blur-md text-xs font-semibold text-[#101D42] dark:text-slate-100 hover:border-[#1769E8]/50 hover:text-[#1769E8] dark:hover:text-[#60A5FA] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769E8] min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer ${className}`}
    >
      <ArrowIcon
        className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
          isRtl
            ? 'group-hover:translate-x-0.5'
            : 'group-hover:-translate-x-0.5'
        }`}
      />
      <span>{text}</span>
    </button>
  );
}
