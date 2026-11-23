import { useCallback, useEffect, useState } from 'react';
import { Bookmark, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import {
  createGoogleForm,
  DriveFile,
  FormResponseItem,
  getGoogleForm,
  GoogleFormDetail,
  listDriveFilesByMime,
  listFormResponses,
} from '../../lib/workspace-api.ts';
import { PendingConfirmation } from '../ConfirmActionModal.tsx';
import { Locale, TRANSLATIONS } from '../../lib/i18n.ts';

interface FormsViewProps {
  accessToken: string;
  locale: Locale;
  onPin: (item: { resourceId: string; title: string; url?: string }) => Promise<void>;
  requestConfirmation: (pending: PendingConfirmation) => void;
}

export function FormsView({
  accessToken,
  locale,
  onPin,
  requestConfirmation,
}: FormsViewProps) {
  const t = TRANSLATIONS[locale];
  const [driveForms, setDriveForms] = useState<DriveFile[]>([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [manualId, setManualId] = useState('');
  const [newFormTitle, setNewFormTitle] = useState('');
  const [formDetail, setFormDetail] = useState<GoogleFormDetail | null>(null);
  const [responses, setResponses] = useState<FormResponseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFormList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const files = await listDriveFilesByMime(
        accessToken,
        'application/vnd.google-apps.form'
      );
      setDriveForms(files);
      if (files.length > 0 && !selectedFormId) {
        setSelectedFormId(files[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list forms');
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedFormId]);

  const loadFormDetails = useCallback(
    async (formId: string) => {
      if (!formId.trim()) return;
      setDetailLoading(true);
      setError(null);
      try {
        const [detail, resps] = await Promise.all([
          getGoogleForm(accessToken, formId),
          listFormResponses(accessToken, formId).catch(() => []),
        ]);
        setFormDetail(detail);
        setResponses(resps);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form details');
      } finally {
        setDetailLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    void loadFormList();
  }, [loadFormList]);

  useEffect(() => {
    if (selectedFormId) {
      void loadFormDetails(selectedFormId);
    }
  }, [selectedFormId, loadFormDetails]);

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormTitle.trim()) return;
    const title = newFormTitle.trim();
    requestConfirmation({
      title: locale === 'ar' ? `إنشاء نموذج "${title}"؟` : `Create Google Form "${title}"?`,
      description:
        locale === 'ar'
          ? 'سيتم إنشاء نموذج Google Form جديد في حسابك.'
          : 'This creates a new Google Form in your Google Drive account.',
      confirmLabel: locale === 'ar' ? 'إنشاء النموذج' : 'Create Form',
      onConfirm: async () => {
        const created = await createGoogleForm(accessToken, title);
        setNewFormTitle('');
        setSelectedFormId(created.formId);
        await loadFormList();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Google Forms</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {locale === 'ar'
              ? 'إنشاء نماذج الاختبارات والاستبيانات واستعراض الأسئلة والردود.'
              : 'Create forms and quizzes, inspect question structures, and review submitted responses.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadFormList()}
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
        <div className="space-y-4">
          <form
            onSubmit={handleCreateForm}
            className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5"
          >
            <label className="block text-xs font-semibold text-slate-800">
              {locale === 'ar' ? 'نموذج جديد' : 'New Google Form'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                placeholder={locale === 'ar' ? 'عنوان النموذج...' : 'Form title...'}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <button
                type="submit"
                disabled={!newFormTitle.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {locale === 'ar' ? 'إنشاء' : 'Create'}
              </button>
            </div>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  {locale === 'ar' ? 'النماذج المتاحة' : 'Your Forms'}
                </h2>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {driveForms.length}
                </span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder={locale === 'ar' ? 'أو أدخل Form ID' : 'Or enter Form ID'}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                />
                <button
                  type="button"
                  onClick={() => manualId.trim() && setSelectedFormId(manualId.trim())}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
                >
                  {t.open}
                </button>
              </div>
            </div>
            {loading ? (
              <p className="p-4 text-sm text-slate-500">{t.loading}</p>
            ) : driveForms.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">
                {locale === 'ar' ? 'لا توجد نماذج في Drive.' : 'No forms found in Drive.'}
              </p>
            ) : (
              driveForms.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFormId(f.id)}
                  className={`w-full text-start p-4 cursor-pointer transition-colors ${
                    selectedFormId === f.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-900 truncate">{f.name}</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">{f.id}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          {detailLoading ? (
            <p className="text-sm text-slate-500">{t.loading}</p>
          ) : !formDetail ? (
            <p className="text-sm text-slate-500">
              {locale === 'ar'
                ? 'اختر نموذجاً لاستعراض محتواه وردوده.'
                : 'Select or enter a Form ID to inspect its questions and responses.'}
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {formDetail.info?.title || 'Untitled Form'}
                  </h2>
                  <p className="text-xs font-mono text-slate-500 mt-1 tabular-nums">
                    {(formDetail.items || []).length} items · {responses.length} responses
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void onPin({
                        resourceId: formDetail.formId,
                        title: formDetail.info?.title || 'Google Form',
                        url: formDetail.responderUri,
                      })
                    }
                    className="p-2 text-slate-400 hover:text-blue-700 cursor-pointer"
                    title={t.pin}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                  {formDetail.responderUri && (
                    <a
                      href={formDetail.responderUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      {t.open} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  {locale === 'ar' ? 'الأسئلة والعناصر' : 'Questions & Items'}
                </h3>
                {(formDetail.items || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No items in this form yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {(formDetail.items || []).map((item, idx) => (
                      <li key={item.itemId || idx} className="py-2.5">
                        <p className="text-sm font-medium text-slate-900">
                          <span className="font-mono text-slate-400 me-2 tabular-nums">
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          {item.title || 'Untitled item'}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  {locale === 'ar' ? 'الردود المستلمة' : 'Recent Responses'}
                </h3>
                {responses.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {locale === 'ar' ? 'لا توجد ردود مسجلة.' : 'No responses recorded yet.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {responses.slice(0, 15).map((r) => (
                      <li key={r.responseId} className="py-2.5 text-sm">
                        <p className="font-mono text-xs text-slate-500 tabular-nums">
                          {r.respondentEmail || r.responseId} ·{' '}
                          {r.lastSubmittedTime
                            ? new Date(r.lastSubmittedTime).toLocaleString()
                            : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
