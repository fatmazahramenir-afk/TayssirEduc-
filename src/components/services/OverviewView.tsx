import { useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckSquare,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import {
  createStudyNote,
  deleteStudyNote,
  deleteWorkspacePin,
  NoteServiceKey,
  StudyNote,
  updateStudyNote,
  WorkspacePin,
  WorkspaceServiceKey,
} from '../../lib/firestore-service.ts';
import { Locale, TRANSLATIONS } from '../../lib/i18n.ts';

export type ActiveTab = 'overview' | WorkspaceServiceKey;

interface OverviewViewProps {
  uid: string;
  locale: Locale;
  pins: WorkspacePin[];
  notes: StudyNote[];
  onSelectTab: (tab: ActiveTab) => void;
}

const SERVICE_CARDS: Array<{
  key: WorkspaceServiceKey;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  icon: typeof FolderOpen;
}> = [
  {
    key: 'classroom',
    titleEn: 'Google Classroom',
    titleAr: 'Google Classroom',
    descEn: 'Courses, coursework assignments, and stream announcements.',
    descAr: 'إدارة الفصول الدراسية، الواجبات، ونشر الإعلانات.',
    icon: BookOpen,
  },
  {
    key: 'meet',
    titleEn: 'Google Meet',
    titleAr: 'Google Meet',
    descEn: 'Create live video meeting spaces and manage room links.',
    descAr: 'إنشاء غرف اجتماعات مباشرة وحفظ الروابط.',
    icon: Video,
  },
  {
    key: 'forms',
    titleEn: 'Google Forms',
    titleAr: 'Google Forms',
    descEn: 'Create quizzes or surveys and inspect submitted responses.',
    descAr: 'إنشاء النماذج والاختبارات واستعراض الردود.',
    icon: FileText,
  },
  {
    key: 'drive',
    titleEn: 'Google Drive',
    titleAr: 'Google Drive',
    descEn: 'Browse, search, organize folders, and pin documents.',
    descAr: 'تصفح الملفات، إنشاء المجلدات، وتثبيت المستندات.',
    icon: FolderOpen,
  },
  {
    key: 'sheets',
    titleEn: 'Google Sheets',
    titleAr: 'Google Sheets',
    descEn: 'Inspect sheet tabs, read tabular cells, and append rows.',
    descAr: 'قراءة الجداول وصفحاتها وإضافة صفوف جديدة.',
    icon: FileSpreadsheet,
  },
  {
    key: 'gmail',
    titleEn: 'Gmail',
    titleAr: 'Gmail',
    descEn: 'Read recent inbox threads and compose messages.',
    descAr: 'استعراض رسائل البريد الوارد وإرسال الرسائل.',
    icon: Mail,
  },
  {
    key: 'tasks',
    titleEn: 'Google Tasks',
    titleAr: 'Google Tasks',
    descEn: 'Manage task lists, deadlines, and completion states.',
    descAr: 'متابعة قوائم المهام، المواعيد، وحالة الإنجاز.',
    icon: CheckSquare,
  },
  {
    key: 'chat',
    titleEn: 'Google Chat',
    titleAr: 'Google Chat',
    descEn: 'Browse Workspace spaces and post team messages.',
    descAr: 'استعراض مساحات الدردشة وإرسال رسائل الفريق.',
    icon: MessageSquare,
  },
];

export function OverviewView({
  uid,
  locale,
  pins,
  notes,
  onSelectTab,
}: OverviewViewProps) {
  const t = TRANSLATIONS[locale];
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteService, setNoteService] = useState<NoteServiceKey>('general');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    setSavingNote(true);
    try {
      if (editingNoteId) {
        await updateStudyNote(editingNoteId, {
          title: noteTitle,
          content: noteContent,
          serviceKey: noteService,
        });
        setEditingNoteId(null);
      } else {
        await createStudyNote({
          ownerId: uid,
          title: noteTitle,
          content: noteContent,
          serviceKey: noteService,
        });
      }
      setNoteTitle('');
      setNoteContent('');
      setNoteService('general');
    } finally {
      setSavingNote(false);
    }
  };

  const handleEditNote = (note: StudyNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteService(note.serviceKey);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {locale === 'ar' ? 'مركز عمليات Google Workspace' : 'Google Workspace Command Center'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">
          {locale === 'ar'
            ? 'وصول موحّد إلى خدمات التعليم والإنتاجية الثماني مع حفظ العناصر المثبتة والملاحظات.'
            : 'Unified live access across all eight connected educational and productivity services, backed by persistent workspace pins and notes.'}
        </p>
      </div>

      {/* 8 Services Grid */}
      <section aria-label="Workspace services">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => onSelectTab(card.key)}
                className="text-start bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-600 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.open}
                  </span>
                </div>
                <h2 className="mt-4 text-sm font-semibold text-slate-900">
                  {locale === 'ar' ? card.titleAr : card.titleEn}
                </h2>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {locale === 'ar' ? card.descAr : card.descEn}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Two-Column Split: Pinned Workspace Resources + Operational Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Pinned Resources */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-slate-700" />
              <h2 className="text-base font-semibold text-slate-900">{t.pinnedItems}</h2>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {pins.length}
            </span>
          </div>

          {pins.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 leading-relaxed">{t.noPins}</p>
          ) : (
            <ul className="divide-y divide-slate-100 mt-2">
              {pins.map((pin) => (
                <li key={pin.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectTab(pin.serviceKey)}
                      className="text-sm font-medium text-slate-900 hover:text-blue-700 truncate block cursor-pointer text-start"
                    >
                      {pin.title}
                    </button>
                    <p className="mt-0.5 text-xs text-slate-500 font-mono truncate">
                      {pin.serviceKey} · {pin.resourceId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pin.url && (
                      <a
                        href={pin.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-500 hover:text-blue-700 rounded-md"
                        title={t.open}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void deleteWorkspacePin(pin.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Operational & Study Notes */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-slate-900">{t.studyNotes}</h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {notes.length}
            </span>
          </div>

          <form onSubmit={handleSaveNote} className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                maxLength={200}
                placeholder={locale === 'ar' ? 'عنوان الملاحظة' : 'Note title'}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                required
              />
              <select
                value={noteService}
                onChange={(e) => setNoteService(e.target.value as NoteServiceKey)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="general">{locale === 'ar' ? 'عام' : 'General'}</option>
                <option value="classroom">Classroom</option>
                <option value="meet">Meet</option>
                <option value="forms">Forms</option>
                <option value="drive">Drive</option>
                <option value="sheets">Sheets</option>
                <option value="gmail">Gmail</option>
                <option value="tasks">Tasks</option>
                <option value="chat">Chat</option>
              </select>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              maxLength={8000}
              rows={3}
              placeholder={
                locale === 'ar'
                  ? 'أضف تفاصيل تحضير الدرس أو متابعة العمل...'
                  : 'Add lesson prep details, grading reminders, or workflow notes...'
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              required
            />
            <div className="flex items-center justify-end gap-2">
              {editingNoteId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(null);
                    setNoteTitle('');
                    setNoteContent('');
                    setNoteService('general');
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  {t.confirmCancel}
                </button>
              )}
              <button
                type="submit"
                disabled={savingNote}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {editingNoteId
                  ? locale === 'ar'
                    ? 'تحديث الملاحظة'
                    : 'Update Note'
                  : t.addNote}
              </button>
            </div>
          </form>

          {notes.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">{t.noNotes}</p>
          ) : (
            <ul className="divide-y divide-slate-100 mt-5">
              {notes.map((note) => (
                <li key={note.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditNote(note)}
                      className="text-sm font-medium text-slate-900 hover:text-blue-700 text-start cursor-pointer"
                    >
                      {note.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteStudyNote(note.id)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{note.serviceKey}</p>
                  <p className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
