import { useCallback, useEffect, useState } from 'react';
import { Bookmark, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import {
  appendSheetRow,
  DriveFile,
  getSheetValues,
  getSpreadsheetMetadata,
  listDriveFilesByMime,
  SpreadsheetMeta,
} from '../../lib/workspace-api.ts';
import { PendingConfirmation } from '../ConfirmActionModal.tsx';
import { Locale, TRANSLATIONS } from '../../lib/i18n.ts';

interface SheetsViewProps {
  accessToken: string;
  locale: Locale;
  initialSpreadsheetId?: string | null;
  onPin: (item: { resourceId: string; title: string; url?: string }) => Promise<void>;
  requestConfirmation: (pending: PendingConfirmation) => void;
}

export function SheetsView({
  accessToken,
  locale,
  initialSpreadsheetId,
  onPin,
  requestConfirmation,
}: SheetsViewProps) {
  const t = TRANSLATIONS[locale];
  const [spreadsheets, setSpreadsheets] = useState<DriveFile[]>([]);
  const [selectedId, setSelectedId] = useState(initialSpreadsheetId || '');
  const [manualId, setManualId] = useState('');
  const [meta, setMeta] = useState<SpreadsheetMeta | null>(null);
  const [selectedTab, setSelectedTab] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [newRowCsv, setNewRowCsv] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSpreadsheetId) {
      setSelectedId(initialSpreadsheetId);
    }
  }, [initialSpreadsheetId]);

  const loadSpreadsheets = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const files = await listDriveFilesByMime(
        accessToken,
        'application/vnd.google-apps.spreadsheet'
      );
      setSpreadsheets(files);
      if (files.length > 0 && !selectedId) {
        setSelectedId(files[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list spreadsheets');
    } finally {
      setLoadingList(false);
    }
  }, [accessToken, selectedId]);

  const loadMetadata = useCallback(
    async (spreadsheetId: string) => {
      if (!spreadsheetId.trim()) return;
      setLoadingSheet(true);
      setError(null);
      try {
        // Fetch metadata first to discover real tab names rather than assuming "Sheet1"
        const spreadsheet = await getSpreadsheetMetadata(accessToken, spreadsheetId);
        setMeta(spreadsheet);
        const firstTab = spreadsheet.sheets?.[0]?.properties?.title || '';
        setSelectedTab(firstTab);
        if (firstTab) {
          const valRes = await getSheetValues(accessToken, spreadsheetId, firstTab);
          setRows(valRes.values || []);
        } else {
          setRows([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load spreadsheet');
      } finally {
        setLoadingSheet(false);
      }
    },
    [accessToken]
  );

  const loadTabValues = useCallback(
    async (spreadsheetId: string, tabName: string) => {
      if (!spreadsheetId || !tabName) return;
      setLoadingSheet(true);
      setError(null);
      try {
        const valRes = await getSheetValues(accessToken, spreadsheetId, tabName);
        setRows(valRes.values || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sheet values');
      } finally {
        setLoadingSheet(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    void loadSpreadsheets();
  }, [loadSpreadsheets]);

  useEffect(() => {
    if (selectedId) {
      void loadMetadata(selectedId);
    }
  }, [selectedId, loadMetadata]);

  const handleAppendRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meta || !selectedTab || !newRowCsv.trim()) return;
    const values = newRowCsv.split(',').map((cell) => cell.trim());
    requestConfirmation({
      title:
        locale === 'ar'
          ? `إضافة صف جديد إلى "${selectedTab}"؟`
          : `Append row to "${meta.properties.title}" (${selectedTab})?`,
      description: `Values: ${values.join(' | ')}`,
      confirmLabel: locale === 'ar' ? 'إضافة الصف' : 'Append Row',
      onConfirm: async () => {
        await appendSheetRow(accessToken, meta.spreadsheetId, selectedTab, values);
        setNewRowCsv('');
        await loadTabValues(meta.spreadsheetId, selectedTab);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Google Sheets</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {locale === 'ar'
              ? 'استعراض الجداول، التبديل بين أوراق العمل، وإضافة صفوف بيانات.'
              : 'Inspect spreadsheet tabs, view cell ranges, and append new records.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSpreadsheets()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
          {t.refresh}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                {locale === 'ar' ? 'جداول البيانات' : 'Spreadsheets'}
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {spreadsheets.length}
              </span>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder={locale === 'ar' ? 'أو أدخل Spreadsheet ID' : 'Or enter Sheet ID'}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
              />
              <button
                type="button"
                onClick={() => manualId.trim() && setSelectedId(manualId.trim())}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
              >
                {t.open}
              </button>
            </div>
          </div>
          {loadingList ? (
            <p className="p-4 text-sm text-slate-500">{t.loading}</p>
          ) : spreadsheets.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              {locale === 'ar' ? 'لا توجد جداول في Drive.' : 'No spreadsheets found in Drive.'}
            </p>
          ) : (
            spreadsheets.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-start p-4 cursor-pointer transition-colors ${
                  selectedId === s.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">{s.id}</p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          {loadingSheet ? (
            <p className="text-sm text-slate-500">{t.loading}</p>
          ) : !meta ? (
            <p className="text-sm text-slate-500">
              {locale === 'ar'
                ? 'اختر جدول بيانات لعرض محتواه.'
                : 'Select a spreadsheet to inspect its sheets and rows.'}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {meta.properties.title}
                  </h2>
                  <p className="text-xs font-mono text-slate-500 mt-1 tabular-nums">
                    {meta.sheets.length} sheets · {rows.length} rows loaded
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void onPin({
                        resourceId: meta.spreadsheetId,
                        title: meta.properties.title,
                        url: meta.spreadsheetUrl,
                      })
                    }
                    className="p-2 text-slate-400 hover:text-blue-700 cursor-pointer"
                    title={t.pin}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                  {meta.spreadsheetUrl && (
                    <a
                      href={meta.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      {t.open} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Dynamic Sheet Tabs */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                {meta.sheets.map((sh) => (
                  <button
                    key={sh.properties.sheetId}
                    type="button"
                    onClick={() => {
                      setSelectedTab(sh.properties.title);
                      void loadTabValues(meta.spreadsheetId, sh.properties.title);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedTab === sh.properties.title
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sh.properties.title}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAppendRow} className="flex gap-2">
                <input
                  type="text"
                  value={newRowCsv}
                  onChange={(e) => setNewRowCsv(e.target.value)}
                  placeholder={
                    locale === 'ar'
                      ? 'أضف صفاً مفصولاً بفواصل (مثال: أحمد, الرياضيات, 18)'
                      : 'Append row comma-separated (e.g. Alice, Math, 95)'
                  }
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  disabled={!newRowCsv.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {locale === 'ar' ? 'إضافة صف' : 'Append Row'}
                </button>
              </form>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                {rows.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">
                    {locale === 'ar' ? 'هذه الورقة فارغة.' : 'No values found in range A1:H30.'}
                  </p>
                ) : (
                  <table className="w-full text-xs font-mono tabular-nums">
                    <tbody>
                      {rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={
                            rIdx === 0
                              ? 'bg-slate-50 font-semibold text-slate-800 border-b border-slate-200'
                              : 'border-b border-slate-100 last:border-b-0'
                          }
                        >
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 whitespace-nowrap max-w-xs truncate">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
