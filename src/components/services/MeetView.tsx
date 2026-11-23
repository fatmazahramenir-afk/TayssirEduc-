import { useState } from 'react';
import { Bookmark, Copy, ExternalLink, Search, Video } from 'lucide-react';
import { createMeetSpace, getMeetSpace, MeetSpace } from '../../lib/workspace-api.ts';
import { PendingConfirmation } from '../ConfirmActionModal.tsx';
import { Locale, TRANSLATIONS } from '../../lib/i18n.ts';

interface MeetViewProps {
  accessToken: string;
  locale: Locale;
  onPin: (item: { resourceId: string; title: string; url?: string }) => Promise<void>;
  requestConfirmation: (pending: PendingConfirmation) => void;
}

export function MeetView({
  accessToken,
  locale,
  onPin,
  requestConfirmation,
}: MeetViewProps) {
  const t = TRANSLATIONS[locale];
  const [accessType, setAccessType] = useState<'OPEN' | 'TRUSTED' | 'RESTRICTED'>('TRUSTED');
  const [createdSpaces, setCreatedSpaces] = useState<MeetSpace[]>([]);
  const [lookupInput, setLookupInput] = useState('');
  const [lookedUpSpace, setLookedUpSpace] = useState<MeetSpace | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);

  const handleCreateMeet = () => {
    requestConfirmation({
      title: locale === 'ar' ? 'إنشاء غرفة Google Meet جديدة؟' : 'Create new Google Meet space?',
      description:
        locale === 'ar'
          ? `سيتم إنشاء رابط اجتماع جديد بمستوى وصول (${accessType}).`
          : `This will create a new Google Meet space in your account with access level "${accessType}".`,
      confirmLabel: locale === 'ar' ? 'إنشاء الاجتماع' : 'Create Meeting',
      onConfirm: async () => {
        setError(null);
        const space = await createMeetSpace(accessToken, accessType);
        setCreatedSpaces((prev) => [space, ...prev]);
      },
    });
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupInput.trim()) return;
    setLoadingLookup(true);
    setError(null);
    try {
      const space = await getMeetSpace(accessToken, lookupInput);
      setLookedUpSpace(space);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up Meet space');
      setLookedUpSpace(null);
    } finally {
      setLoadingLookup(false);
    }
  };

  const copyUri = async (space: MeetSpace) => {
    await navigator.clipboard.writeText(space.meetingUri);
    setCopiedCode(space.meetingCode);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Google Meet</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {locale === 'ar'
            ? 'إنشاء مساحات اجتماعات فورية، التحقق من إعداداتها، وتثبيت روابط الدروس.'
            : 'Create live Google Meet conference spaces, inspect existing meeting codes, and pin room links.'}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            {locale === 'ar' ? 'إنشاء مساحة اجتماع' : 'Create Meeting Space'}
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {locale === 'ar' ? 'سياسة الدخول' : 'Access Type'}
            </label>
            <select
              value={accessType}
              onChange={(e) =>
                setAccessType(e.target.value as 'OPEN' | 'TRUSTED' | 'RESTRICTED')
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="TRUSTED">TRUSTED — Invited & workspace users</option>
              <option value="OPEN">OPEN — Anyone with link can knock/join</option>
              <option value="RESTRICTED">RESTRICTED — Invited participants only</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleCreateMeet}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
          >
            <Video className="w-4 h-4" />
            {locale === 'ar' ? 'إنشاء رابط Meet' : 'Create Meet Space'}
          </button>

          {createdSpaces.length > 0 && (
            <ul className="divide-y divide-slate-100 pt-2">
              {createdSpaces.map((sp) => (
                <li key={sp.name} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium text-slate-900">
                      {sp.meetingCode}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{sp.meetingUri}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void copyUri(sp)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 inline me-1" />
                      {copiedCode === sp.meetingCode ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void onPin({
                          resourceId: sp.meetingCode || sp.name,
                          title: `Meet ${sp.meetingCode}`,
                          url: sp.meetingUri,
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-blue-700 cursor-pointer"
                      title={t.pin}
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <a
                      href={sp.meetingUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-blue-700 hover:text-blue-800"
                      title={t.open}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            {locale === 'ar' ? 'الاستعلام عن غرفة اجتماع' : 'Inspect Existing Space'}
          </h2>
          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              placeholder={
                locale === 'ar'
                  ? 'رمز الاجتماع أو معرف المساحة (مثل abc-defg-hij)'
                  : 'Meeting code or space ID (e.g. abc-defg-hij)'
              }
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={loadingLookup || !lookupInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              {loadingLookup ? t.loading : locale === 'ar' ? 'فحص' : 'Lookup'}
            </button>
          </form>

          {lookedUpSpace && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-sm">
              <p className="font-mono font-medium text-slate-900">{lookedUpSpace.name}</p>
              <p className="text-slate-600">
                Code: <span className="font-mono">{lookedUpSpace.meetingCode}</span> · Access:{' '}
                <span className="font-mono">{lookedUpSpace.config?.accessType || 'DEFAULT'}</span>
              </p>
              <a
                href={lookedUpSpace.meetingUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 font-medium hover:underline"
              >
                {lookedUpSpace.meetingUri} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
