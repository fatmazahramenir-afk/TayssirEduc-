import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Send } from 'lucide-react';
import { FIREBASE_PROJECT_ID } from '../../lib/firebase.ts';
import {
  ChatMessage,
  ChatSpace,
  listChatMessages,
  listChatSpaces,
  sendChatMessage,
  WorkspaceApiError,
} from '../../lib/workspace-api.ts';
import { PendingConfirmation } from '../ConfirmActionModal.tsx';
import { Locale, TRANSLATIONS } from '../../lib/i18n.ts';

interface ChatViewProps {
  accessToken: string;
  locale: Locale;
  requestConfirmation: (pending: PendingConfirmation) => void;
}

export function ChatView({
  accessToken,
  locale,
  requestConfirmation,
}: ChatViewProps) {
  const t = TRANSLATIONS[locale];
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; isConfigOrAccountError: boolean } | null>(
    null
  );

  const consoleConfigUrl = `https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${FIREBASE_PROJECT_ID}`;

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listChatSpaces(accessToken);
      setSpaces(items);
      if (items.length > 0 && !selectedSpace) {
        setSelectedSpace(items[0]);
      }
    } catch (err) {
      const status = err instanceof WorkspaceApiError ? err.status : 0;
      const msg = err instanceof Error ? err.message : 'Failed to load Chat spaces';
      const isConfigOrAccountError =
        status === 404 ||
        status === 403 ||
        status === 400 ||
        msg.toLowerCase().includes('chat app not found') ||
        msg.toLowerCase().includes('workspace');
      setError({ message: msg, isConfigOrAccountError });
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedSpace]);

  const loadMessages = useCallback(
    async (spaceName: string) => {
      try {
        const items = await listChatMessages(accessToken, spaceName);
        setMessages(items);
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : 'Failed to load messages',
          isConfigOrAccountError: false,
        });
      }
    },
    [accessToken]
  );

  useEffect(() => {
    void loadSpaces();
  }, [loadSpaces]);

  useEffect(() => {
    if (selectedSpace) {
      void loadMessages(selectedSpace.name);
    }
  }, [selectedSpace, loadMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpace || !messageText.trim()) return;
    const text = messageText.trim();
    const space = selectedSpace;
    requestConfirmation({
      title:
        locale === 'ar'
          ? `إرسال رسالة في "${space.displayName || space.name}"؟`
          : `Send message to "${space.displayName || space.name}"?`,
      description: text,
      confirmLabel: locale === 'ar' ? 'إرسال الرسالة' : 'Send Message',
      onConfirm: async () => {
        await sendChatMessage(accessToken, space.name, text);
        setMessageText('');
        await loadMessages(space.name);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Google Chat</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {locale === 'ar'
              ? 'استعراض مساحات العمل في Google Chat وإرسال الرسائل.'
              : 'Browse Workspace Chat spaces and send messages to team rooms.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSpaces()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t.refresh}
        </button>
      </div>

      {error && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-sm text-amber-950">
          <p className="font-semibold">
            {locale === 'ar'
              ? 'يتطلب Google Chat API حساب Workspace وإعداد التطبيق'
              : 'Google Chat API Prerequisite Notice'}
          </p>
          <p className="text-xs leading-relaxed text-amber-900">{error.message}</p>
          {error.isConfigOrAccountError && (
            <div className="text-xs text-amber-900 space-y-1.5 pt-1">
              <p>
                {locale === 'ar'
                  ? '1. يتطلب حساب Google Workspace (Business/Enterprise)؛ حسابات @gmail.com الشخصية غير مدعومة.'
                  : '1. Calling Google Chat API requires a Business or Enterprise Google Workspace account (consumer @gmail.com accounts are not supported).'}
              </p>
              <p>
                {locale === 'ar'
                  ? '2. يجب تهيئة اسم ووصف تطبيق Google Chat من صفحة الإعدادات في Google Cloud Console:'
                  : '2. You must configure the Google Chat app profile (App name, Avatar URL, Description) in Google Cloud Console:'}{' '}
                <a
                  href={consoleConfigUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-blue-800 underline"
                >
                  Open Google Chat API Configuration <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div className="p-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {locale === 'ar' ? 'المساحات' : 'Spaces'}
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {spaces.length}
            </span>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-slate-500">{t.loading}</p>
          ) : spaces.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              {locale === 'ar' ? 'لا توجد مساحات متاحة.' : 'No Chat spaces available.'}
            </p>
          ) : (
            spaces.map((sp) => (
              <button
                key={sp.name}
                type="button"
                onClick={() => setSelectedSpace(sp)}
                className={`w-full text-start p-4 cursor-pointer ${
                  selectedSpace?.name === sp.name ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-medium text-slate-900 truncate">
                  {sp.displayName || sp.name}
                </p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  {sp.spaceType || 'SPACE'}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          {!selectedSpace ? (
            <p className="text-sm text-slate-500">
              {locale === 'ar'
                ? 'اختر مساحة لعرض الرسائل.'
                : 'Select a Chat space to view and send messages.'}
            </p>
          ) : (
            <>
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-semibold text-slate-900">
                  {selectedSpace.displayName || selectedSpace.name}
                </h2>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-500">No messages in this space yet.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.name} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs font-medium text-slate-600">
                        {m.sender?.displayName || m.sender?.name || 'Member'}
                      </p>
                      <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">
                        {m.text || '(Attachment)'}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSend} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={locale === 'ar' ? 'اكتب رسالة...' : 'Write a message...'}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {locale === 'ar' ? 'إرسال' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
