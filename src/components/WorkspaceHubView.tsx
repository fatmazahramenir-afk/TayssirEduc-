import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  BookOpen,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  LayoutGrid,
  LogOut,
  Mail,
  MessageSquare,
  Video,
} from 'lucide-react';
import { googleSignIn, initAuth, logout } from '../lib/firebase.ts';
import {
  createWorkspacePin,
  StudyNote,
  subscribeStudyNotes,
  subscribeWorkspacePins,
  upsertUserProfile,
  WorkspacePin,
  WorkspaceServiceKey,
} from '../lib/firestore-service.ts';
import { Locale, TRANSLATIONS } from '../lib/i18n.ts';
import { BackButton } from './BackButton.tsx';
import { ConfirmActionModal, PendingConfirmation } from './ConfirmActionModal.tsx';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';
import { ChatView } from './services/ChatView.tsx';
import { ClassroomView } from './services/ClassroomView.tsx';
import { DriveView } from './services/DriveView.tsx';
import { FormsView } from './services/FormsView.tsx';
import { GmailView } from './services/GmailView.tsx';
import { MeetView } from './services/MeetView.tsx';
import { ActiveTab, OverviewView } from './services/OverviewView.tsx';
import { SheetsView } from './services/SheetsView.tsx';
import { TasksView } from './services/TasksView.tsx';

export function WorkspaceHubView({
  locale,
  onBack,
}: {
  locale: Locale;
  onBack?: () => void;
}) {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string | null>(null);
  const [pins, setPins] = useState<WorkspacePin[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<string | null>(null);

  const t = TRANSLATIONS[locale];

  useEffect(() => {
    const unsub = initAuth(
      (firebaseUser, token) => {
        setFbUser(firebaseUser);
        setAccessToken(token);
        setAuthReady(true);
        if (firebaseUser.email) {
          void upsertUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            preferredLocale: locale === 'ar' ? 'ar' : 'en',
          });
        }
      },
      () => {
        setFbUser(null);
        setAccessToken(null);
        setAuthReady(true);
        setPins([]);
        setNotes([]);
      }
    );
    return unsub;
  }, [locale]);

  useEffect(() => {
    if (!authReady || !fbUser) return;
    const unsubPins = subscribeWorkspacePins(fbUser.uid, setPins);
    const unsubNotes = subscribeStudyNotes(fbUser.uid, setNotes);
    return () => {
      unsubPins();
      unsubNotes();
    };
  }, [authReady, fbUser]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      setFbUser(result.user);
      setAccessToken(result.accessToken);
      if (result.user.email) {
        await upsertUserProfile({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          preferredLocale: locale === 'ar' ? 'ar' : 'en',
        });
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePinResource = async (
    serviceKey: WorkspaceServiceKey,
    item: { resourceId: string; title: string; url?: string }
  ) => {
    if (!fbUser) return;
    await createWorkspacePin({
      ownerId: fbUser.uid,
      serviceKey,
      resourceId: item.resourceId,
      title: item.title,
      url: item.url,
    });
    setPinFeedback(
      locale === 'ar' ? `تم تثبيت "${item.title}"` : `Pinned "${item.title}"`
    );
    setTimeout(() => setPinFeedback(null), 2500);
  };

  const handleConfirmProceed = async () => {
    if (!pendingConfirm) return;
    setConfirmBusy(true);
    try {
      await pendingConfirm.onConfirm();
      setPendingConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const serviceTabs: Array<{ id: ActiveTab; label: string; icon: typeof LayoutGrid }> = [
    { id: 'overview', label: t.services.overview, icon: LayoutGrid },
    { id: 'classroom', label: t.services.classroom, icon: BookOpen },
    { id: 'meet', label: t.services.meet, icon: Video },
    { id: 'forms', label: t.services.forms, icon: FileText },
    { id: 'drive', label: t.services.drive, icon: FolderOpen },
    { id: 'sheets', label: t.services.sheets, icon: FileSpreadsheet },
    { id: 'gmail', label: t.services.gmail, icon: Mail },
    { id: 'tasks', label: t.services.tasks, icon: CheckSquare },
    { id: 'chat', label: t.services.chat, icon: MessageSquare },
  ];

  if (!authReady) {
    return (
      <div className="tayssir-card rounded-2xl p-6 text-sm text-slate-500">
        {t.loading}
      </div>
    );
  }

  if (!fbUser || !accessToken) {
    return (
      <div className="space-y-4">
        {onBack && (
          <BackButton locale={locale} onClick={onBack} label={t.back} />
        )}
        <div className="tayssir-card rounded-3xl p-8 max-w-2xl space-y-4">
          <h2 className="font-display text-xl font-bold text-[#101D42] dark:text-white">
            {t.reconnectTitle}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {fbUser ? t.reconnectSessionBody : t.reconnectBody}
          </p>
          {authError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              {authError}
            </p>
          )}
          <div className="pt-2">
            <GoogleSignInButton
              onClick={() => void handleGoogleLogin()}
              disabled={isLoggingIn}
              label={
                isLoggingIn
                  ? t.loading
                  : locale === 'ar'
                  ? 'تسجيل الدخول بـ Google'
                  : 'Sign in with Google'
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeTab !== 'overview' ? (
        <BackButton
          locale={locale}
          onClick={() => setActiveTab('overview')}
          label={t.backToOverview}
        />
      ) : onBack ? (
        <BackButton locale={locale} onClick={onBack} label={t.back} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {serviceTabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === item.id
                    ? 'bg-[#1769E8] text-white'
                    : 'bg-white dark:bg-[#101D42] border border-[#E9EDF5] dark:border-white/10 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#E9EDF5] dark:bg-white/10 text-[#101D42] dark:text-white cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.signOut}</span>
        </button>
      </div>

      {pinFeedback && (
        <div className="px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium rounded-xl">
          {pinFeedback}
        </div>
      )}

      {/* Existing Google Workspace Services preserved intact */}
      <div className="rounded-3xl bg-white p-5 sm:p-6 border border-[#E9EDF5] text-slate-900">
        {activeTab === 'overview' && (
          <OverviewView
            uid={fbUser.uid}
            locale={locale}
            pins={pins}
            notes={notes}
            onSelectTab={setActiveTab}
          />
        )}
        {activeTab === 'classroom' && (
          <ClassroomView
            accessToken={accessToken}
            locale={locale}
            onPin={(item) => handlePinResource('classroom', item)}
            requestConfirmation={setPendingConfirm}
          />
        )}
        {activeTab === 'meet' && (
          <MeetView
            accessToken={accessToken}
            locale={locale}
            onPin={(item) => handlePinResource('meet', item)}
            requestConfirmation={setPendingConfirm}
          />
        )}
        {activeTab === 'forms' && (
          <FormsView
            accessToken={accessToken}
            locale={locale}
            onPin={(item) => handlePinResource('forms', item)}
            requestConfirmation={setPendingConfirm}
          />
        )}
        {activeTab === 'drive' && (
          <DriveView
            accessToken={accessToken}
            locale={locale}
            onPin={(item) => handlePinResource('drive', item)}
            onOpenSheet={(sheetId) => {
              setSelectedSpreadsheetId(sheetId);
              setActiveTab('sheets');
            }}
            requestConfirmation={setPendingConfirm}
          />
        )}
        {activeTab === 'sheets' && (
          <SheetsView
            accessToken={accessToken}
            locale={locale}
            initialSpreadsheetId={selectedSpreadsheetId}
            onPin={(item) => handlePinResource('sheets', item)}
            requestConfirmation={setPendingConfirm}
          />
        )}
        {activeTab === 'gmail' && (
          <GmailView
            accessToken={accessToken}
            locale={locale}
            requestConfirmation={setPendingConfirm}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksView
            accessToken={accessToken}
            locale={locale}
            requestConfirmation={setPendingConfirm}
          />
        )}
        {activeTab === 'chat' && (
          <ChatView
            accessToken={accessToken}
            locale={locale}
            requestConfirmation={setPendingConfirm}
          />
        )}
      </div>

      <ConfirmActionModal
        pending={pendingConfirm}
        busy={confirmBusy}
        cancelLabel={t.confirmCancel}
        onCancel={() => !confirmBusy && setPendingConfirm(null)}
        onConfirm={() => void handleConfirmProceed()}
      />
    </div>
  );
}
