import { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { Locale, TRANSLATIONS } from '../lib/i18n.ts';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

export function PWAInstallButton({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const t = TRANSLATIONS[locale].pwa;

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px] ${
          compact
            ? 'px-3 py-2 text-xs bg-[#1769E8] text-white hover:bg-[#1358C7]'
            : 'px-4 py-2 text-xs bg-[#1769E8] text-white hover:bg-[#1358C7] shadow-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{t.install}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border border-[#E9EDF5] dark:border-white/15 text-[#101D42] dark:text-slate-100 bg-white/80 dark:bg-[#101D42]/80 hover:bg-[#E9EDF5]/60 dark:hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>{t.installIos}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#101D42]/60 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#101D42] border border-[#E9EDF5] dark:border-white/15 p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-[#101D42] dark:text-white">
                  {t.iosTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-[#E9EDF5] dark:hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>{t.iosStep1}</p>
                <p>{t.iosStep2}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#1769E8] py-2.5 text-sm font-medium text-white hover:bg-[#1358C7] transition-colors cursor-pointer"
              >
                {t.close}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator({ locale }: { locale: Locale }) {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 start-4 z-50 flex items-center gap-2 rounded-xl bg-[#101D42] dark:bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg border border-white/15">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>{TRANSLATIONS[locale].pwa.offline}</span>
    </div>
  );
}
