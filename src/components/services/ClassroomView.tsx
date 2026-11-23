import { useCallback, useEffect, useState } from 'react';
import { Bookmark, ExternalLink, RefreshCw, Send } from 'lucide-react';
import {
  ClassroomAnnouncement,
  ClassroomCourse,
  ClassroomCourseWork,
  createCourseAnnouncement,
  listClassroomCourses,
  listCourseAnnouncements,
  listCourseWork,
} from '../../lib/workspace-api.ts';
import { PendingConfirmation } from '../ConfirmActionModal.tsx';
import { Locale, TRANSLATIONS } from '../../lib/i18n.ts';

interface ClassroomViewProps {
  accessToken: string;
  locale: Locale;
  onPin: (item: { resourceId: string; title: string; url?: string }) => Promise<void>;
  requestConfirmation: (pending: PendingConfirmation) => void;
}

export function ClassroomView({
  accessToken,
  locale,
  onPin,
  requestConfirmation,
}: ClassroomViewProps) {
  const t = TRANSLATIONS[locale];
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ClassroomCourse | null>(null);
  const [courseWork, setCourseWork] = useState<ClassroomCourseWork[]>([]);
  const [announcements, setAnnouncements] = useState<ClassroomAnnouncement[]>([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listClassroomCourses(accessToken);
      setCourses(items);
      if (items.length > 0 && !selectedCourse) {
        setSelectedCourse(items[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Classroom courses');
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedCourse]);

  const loadDetails = useCallback(
    async (courseId: string) => {
      setDetailLoading(true);
      setError(null);
      try {
        const [work, anns] = await Promise.all([
          listCourseWork(accessToken, courseId),
          listCourseAnnouncements(accessToken, courseId),
        ]);
        setCourseWork(work);
        setAnnouncements(anns);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course details');
      } finally {
        setDetailLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (selectedCourse) {
      void loadDetails(selectedCourse.id);
    }
  }, [selectedCourse, loadDetails]);

  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !announcementText.trim()) return;
    const textToPost = announcementText.trim();
    const course = selectedCourse;
    requestConfirmation({
      title:
        locale === 'ar'
          ? `نشر إعلان في "${course.name}"؟`
          : `Publish announcement to "${course.name}"?`,
      description: textToPost,
      confirmLabel: locale === 'ar' ? 'نشر الإعلان' : 'Publish Announcement',
      onConfirm: async () => {
        await createCourseAnnouncement(accessToken, course.id, textToPost);
        setAnnouncementText('');
        await loadDetails(course.id);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Google Classroom</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {locale === 'ar'
              ? 'استعراض الفصول، الواجبات الدراسية، ونشر الإعلانات.'
              : 'Browse enrolled and taught courses, inspect coursework, and publish stream announcements.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCourses()}
          disabled={loading}
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
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {locale === 'ar' ? 'الفصول الدراسية' : 'Courses'}
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {courses.length}
            </span>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-slate-500">{t.loading}</div>
          ) : courses.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">
              {locale === 'ar'
                ? 'لم يتم العثور على فصول في Google Classroom.'
                : 'No Google Classroom courses found for this account.'}
            </div>
          ) : (
            courses.map((course) => {
              const active = selectedCourse?.id === course.id;
              return (
                <div
                  key={course.id}
                  className={`p-4 flex items-start justify-between gap-2 transition-colors ${
                    active ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCourse(course)}
                    className="text-start flex-1 min-w-0 cursor-pointer"
                  >
                    <p className="text-sm font-medium text-slate-900 truncate">{course.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      {[course.section, course.courseState].filter(Boolean).join(' · ')}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void onPin({
                        resourceId: course.id,
                        title: course.name,
                        url: course.alternateLink,
                      })
                    }
                    className="p-1.5 text-slate-400 hover:text-blue-700 cursor-pointer"
                    title={t.pin}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selectedCourse ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
              {locale === 'ar'
                ? 'اختر فصلاً دراسياً لعرض تفاصيله.'
                : 'Select a course to view its coursework and announcements.'}
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {selectedCourse.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      ID: {selectedCourse.id} · {selectedCourse.courseState || 'ACTIVE'}
                    </p>
                  </div>
                  {selectedCourse.alternateLink && (
                    <a
                      href={selectedCourse.alternateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
                    >
                      {t.open} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <form onSubmit={handlePublishAnnouncement} className="mt-5 space-y-3">
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    rows={2}
                    placeholder={
                      locale === 'ar'
                        ? 'اكتب إعلاناً جديداً لطلاب الفصل...'
                        : 'Write a stream announcement for this course...'
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!announcementText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {locale === 'ar' ? 'نشر إعلان' : 'Post Announcement'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {locale === 'ar' ? 'الواجبات والأنشطة' : 'Coursework'}
                    </h3>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {courseWork.length}
                    </span>
                  </div>
                  {detailLoading ? (
                    <p className="mt-3 text-sm text-slate-500">{t.loading}</p>
                  ) : courseWork.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">
                      {locale === 'ar' ? 'لا توجد واجبات منشورة.' : 'No coursework items yet.'}
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 mt-2">
                      {courseWork.map((w) => (
                        <li key={w.id} className="py-3">
                          <p className="text-sm font-medium text-slate-900">{w.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                            {[w.workType, w.maxPoints !== undefined ? `${w.maxPoints} pts` : null, w.state]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {locale === 'ar' ? 'أحدث الإعلانات' : 'Announcements'}
                    </h3>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {announcements.length}
                    </span>
                  </div>
                  {detailLoading ? (
                    <p className="mt-3 text-sm text-slate-500">{t.loading}</p>
                  ) : announcements.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">
                      {locale === 'ar' ? 'لا توجد إعلانات بعد.' : 'No announcements yet.'}
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 mt-2">
                      {announcements.map((a) => (
                        <li key={a.id} className="py-3">
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{a.text}</p>
                          {a.updateTime && (
                            <p className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
                              {new Date(a.updateTime).toLocaleString()}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
