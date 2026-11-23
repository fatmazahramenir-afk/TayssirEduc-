import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Send, Trash2 } from 'lucide-react';
import {
  GmailMessageSummary,
  listGmailMessages,
  sendGmailMessage,
  trashGmailMessage,
} from '../../lib/workspace-api.ts';
import { PendingConfirmation } from '../ConfirmActionModal.tsx';
import { Locale, TRANSLATIONS } from '../../lib/i18n.ts';

interface GmailViewProps {
  accessToken: string;
  locale: Locale;
  requestConfirmation: (pending: PendingConfirmation) => void;
}

export function GmailView({
  accessToken,
  locale,
  requestConfirmation,
}: GmailViewProps) {
  const t = TRANSLATIONS[locale];
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInbox = useCallback(
    async (q = searchQuery) => {
      setLoading(true);
      setError(null);
      try {
        const items = await listGmailMessages(accessToken, q);
        setMessages(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Gmail messages');
      } finally {
        setLoading(false);
      }
    },
    [accessToken, searchQuery]
  );

  useEffect(() => {
    void loadInbox('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    const payload = { to: to.trim(), subject: subject.trim(), body: body.trim() };
    requestConfirmation({
      title: locale === 'ar' ? `إرسال بريد إلى ${payload.to}؟` : `Send email to ${payload.to}?`,
      description: `Subject: ${payload.subject}\n\n${payload.body.slice(0, 200)}`,
      confirmLabel: locale === 'ar' ? 'إرسال البريد' : 'Send Email',
      onConfirm: async () => {
        await sendGmailMessage(accessToken, payload);
        setTo('');
        setSubject('');
        setBody('');
        await loadInbox();
      },
    });
  };

  const handleTrash = (msg: GmailMessageSummary) => {
    requestConfirmation({
      title:
        locale === 'ar'
          ? `نقل الرسالة "${msg.subject}" إلى المهملات؟`
          : `Move email "${msg.subject}" to Trash?`,
      description: `From: ${msg.from}`,
      confirmLabel: locale === 'ar' ? 'نقل للمهملات' : 'Move to Trash',
      destructive: true,
      onConfirm: async () => {
        await trashGmailMessage(accessToken, msg.id);
        await loadInbox();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Gmail</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {locale === 'ar'
              ? 'استعراض رسائل البريد الوارد، البحث، أو إرسال رسالة جديدة.'
              : 'Read recent inbox threads, search messages, and compose new emails.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadInbox()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t.refresh}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <form
          onSubmit={handleSend}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
        >
          <h2 className="text-base font-semibold text-slate-900">
            {locale === 'ar' ? 'رسالة جديدة' : 'Compose Email'}
          </h2>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={locale === 'ar' ? 'إلى (البريد الإلكتروني)' : 'Recipient email'}
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
          />
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={locale === 'ar' ? 'الموضوع' : 'Subject'}
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder={locale === 'ar' ? 'نص الرسالة...' : 'Write your message...'}
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {locale === 'ar' ? 'إرسال' : 'Send Email'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {locale === 'ar' ? 'البريد الوارد' : 'Inbox Messages'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void loadInbox(searchQuery);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'ar' ? 'بحث في Gmail...' : 'Search Gmail...'}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-md"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
              >
                {locale === 'ar' ? 'بحث' : 'Filter'}
              </button>
            </form>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-slate-500">{t.loading}</p>
          ) : messages.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              {locale === 'ar' ? 'لا توجد رسائل.' : 'No messages found.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {messages.map((msg) => (
                <li key={msg.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/70">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {msg.subject}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {msg.from} · {msg.date}
                    </p>
                    <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                      {msg.snippet}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTrash(msg)}
                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                    title={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
