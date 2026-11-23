import { useCallback, useEffect, useState } from 'react';
import {
  Bookmark,
  ExternalLink,
  FolderPlus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  createDriveFolder,
  DriveFile,
  listDriveFiles,
  trashDriveFile,
} from '../../lib/workspace-api.ts';
import { PendingConfirmation } from '../ConfirmActionModal.tsx';
import { Locale, TRANSLATIONS } from '../../lib/i18n.ts';

interface DriveViewProps {
  accessToken: string;
  locale: Locale;
  onPin: (item: { resourceId: string; title: string; url?: string }) => Promise<void>;
  onOpenSheet: (spreadsheetId: string) => void;
  requestConfirmation: (pending: PendingConfirmation) => void;
}

export function DriveView({
  accessToken,
  locale,
  onPin,
  onOpenSheet,
  requestConfirmation,
}: DriveViewProps) {
  const t = TRANSLATIONS[locale];
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(
    async (q = searchTerm) => {
      setLoading(true);
      setError(null);
      try {
        const items = await listDriveFiles(accessToken, q);
        setFiles(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Drive files');
      } finally {
        setLoading(false);
      }
    },
    [accessToken, searchTerm]
  );

  useEffect(() => {
    void loadFiles('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    const name = folderName.trim();
    requestConfirmation({
      title: locale === 'ar' ? `إنشاء مجلد "${name}"؟` : `Create folder "${name}" in Drive?`,
      description:
        locale === 'ar'
          ? 'سيتم إنشاء مجلد جديد في Google Drive.'
          : 'This creates a new folder in the root of your Google Drive.',
      confirmLabel: locale === 'ar' ? 'إنشاء المجلد' : 'Create Folder',
      onConfirm: async () => {
        await createDriveFolder(accessToken, name);
        setFolderName('');
        await loadFiles();
      },
    });
  };

  const handleTrash = (file: DriveFile) => {
    requestConfirmation({
      title:
        locale === 'ar'
          ? `نقل "${file.name}" إلى سلة المهملات؟`
          : `Move "${file.name}" to Trash?`,
      description:
        locale === 'ar'
          ? 'سيتم نقل هذا الملف إلى سلة المهملات في Google Drive.'
          : 'This will move the selected file to your Google Drive trash.',
      confirmLabel: locale === 'ar' ? 'نقل إلى السلة' : 'Move to Trash',
      destructive: true,
      onConfirm: async () => {
        await trashDriveFile(accessToken, file.id);
        await loadFiles();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Google Drive</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {locale === 'ar'
              ? 'البحث في الملفات، إنشاء المجلدات، التثبيت، أو نقل الملفات للسلة.'
              : 'Browse recent Drive files, create folders, open spreadsheets, or move files to trash.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadFiles()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t.refresh}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void loadFiles(searchTerm);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={locale === 'ar' ? 'ابحث باسم الملف...' : 'Search Drive by file name...'}
            className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            {locale === 'ar' ? 'بحث' : 'Search'}
          </button>
        </form>

        <form onSubmit={handleCreateFolder} className="flex gap-2">
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder={locale === 'ar' ? 'اسم المجلد الجديد...' : 'New folder name...'}
            className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            disabled={!folderName.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer disabled:opacity-50"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            {locale === 'ar' ? 'إنشاء مجلد' : 'New Folder'}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
              <tr>
                <th className="py-3 px-4 text-start">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                <th className="py-3 px-4 text-start">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="py-3 px-4 text-start">{locale === 'ar' ? 'آخر تعديل' : 'Modified'}</th>
                <th className="py-3 px-4 text-end">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-center text-slate-500">
                    {t.loading}
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-center text-slate-500">
                    {locale === 'ar' ? 'لا توجد ملفات مطابقة.' : 'No matching Drive files found.'}
                  </td>
                </tr>
              ) : (
                files.map((file) => {
                  const isSheet =
                    file.mimeType === 'application/vnd.google-apps.spreadsheet';
                  const shortType = file.mimeType.split('.').pop() || file.mimeType;
                  return (
                    <tr key={file.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                        {file.name}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">{shortType}</td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-500">
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSheet && (
                            <button
                              type="button"
                              onClick={() => onOpenSheet(file.id)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            >
                              {locale === 'ar' ? 'فتح كجدول' : 'Inspect Sheet'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              void onPin({
                                resourceId: file.id,
                                title: file.name,
                                url: file.webViewLink,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-blue-700 cursor-pointer"
                            title={t.pin}
                          >
                            <Bookmark className="w-4 h-4" />
                          </button>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-800"
                              title={t.open}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleTrash(file)}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                            title={t.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
