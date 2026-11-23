import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  createTask,
  deleteTask,
  listTaskLists,
  listTasks,
  TaskItem,
  TaskListItem,
  updateTaskStatus,
} from '../../lib/workspace-api.ts';
import { PendingConfirmation } from '../ConfirmActionModal.tsx';
import { Locale, TRANSLATIONS } from '../../lib/i18n.ts';

interface TasksViewProps {
  accessToken: string;
  locale: Locale;
  requestConfirmation: (pending: PendingConfirmation) => void;
}

export function TasksView({
  accessToken,
  locale,
  requestConfirmation,
}: TasksViewProps) {
  const t = TRANSLATIONS[locale];
  const [lists, setLists] = useState<TaskListItem[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTaskLists(accessToken);
      setLists(data);
      if (data.length > 0 && !selectedListId) {
        setSelectedListId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task lists');
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedListId]);

  const loadTasks = useCallback(
    async (listId: string) => {
      if (!listId) return;
      setLoading(true);
      setError(null);
      try {
        const items = await listTasks(accessToken, listId);
        setTasks(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (selectedListId) {
      void loadTasks(selectedListId);
    }
  }, [selectedListId, loadTasks]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListId || !newTaskTitle.trim()) return;
    const title = newTaskTitle.trim();
    const notes = newTaskNotes.trim();
    requestConfirmation({
      title: locale === 'ar' ? `إضافة مهمة "${title}"؟` : `Create task "${title}"?`,
      description: notes || 'This task will be added to your selected Google Tasks list.',
      confirmLabel: locale === 'ar' ? 'إضافة المهمة' : 'Add Task',
      onConfirm: async () => {
        await createTask(accessToken, selectedListId, { title, notes });
        setNewTaskTitle('');
        setNewTaskNotes('');
        await loadTasks(selectedListId);
      },
    });
  };

  const handleToggle = (task: TaskItem) => {
    const nextStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    requestConfirmation({
      title:
        nextStatus === 'completed'
          ? locale === 'ar'
            ? `تحديد "${task.title}" كمكتملة؟`
            : `Mark "${task.title}" as completed?`
          : locale === 'ar'
          ? `إعادة فتح "${task.title}"؟`
          : `Reopen task "${task.title}"?`,
      description: 'This updates the task status in Google Tasks.',
      confirmLabel: locale === 'ar' ? 'تحديث الحالة' : 'Update Status',
      onConfirm: async () => {
        await updateTaskStatus(accessToken, selectedListId, task.id, nextStatus);
        await loadTasks(selectedListId);
      },
    });
  };

  const handleDelete = (task: TaskItem) => {
    requestConfirmation({
      title: locale === 'ar' ? `حذف المهمة "${task.title}"؟` : `Delete task "${task.title}"?`,
      description: 'This permanently deletes the task from Google Tasks.',
      confirmLabel: t.delete,
      destructive: true,
      onConfirm: async () => {
        await deleteTask(accessToken, selectedListId, task.id);
        await loadTasks(selectedListId);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Google Tasks</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {locale === 'ar'
              ? 'متابعة المهام اليومية وإنجازها عبر قوائم Google Tasks.'
              : 'Track action items, mark completions, and organize task lists.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectedListId && void loadTasks(selectedListId)}
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
          <div className="p-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {locale === 'ar' ? 'قوائم المهام' : 'Task Lists'}
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">{lists.length}</span>
          </div>
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelectedListId(l.id)}
              className={`w-full text-start p-4 text-sm font-medium cursor-pointer ${
                selectedListId === l.id
                  ? 'bg-blue-50/60 text-blue-800'
                  : 'text-slate-800 hover:bg-slate-50'
              }`}
            >
              {l.title}
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <form onSubmit={handleCreateTask} className="space-y-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder={locale === 'ar' ? 'عنوان المهمة الجديدة...' : 'New task title...'}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <button
                type="submit"
                disabled={!newTaskTitle.trim() || !selectedListId}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {locale === 'ar' ? 'إضافة' : 'Add Task'}
              </button>
            </div>
            <input
              type="text"
              value={newTaskNotes}
              onChange={(e) => setNewTaskNotes(e.target.value)}
              placeholder={locale === 'ar' ? 'ملاحظات اختيارية...' : 'Optional notes...'}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </form>

          {loading ? (
            <p className="text-sm text-slate-500">{t.loading}</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-slate-500">
              {locale === 'ar' ? 'لا توجد مهام في هذه القائمة.' : 'No tasks in this list.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tasks.map((task) => {
                const done = task.status === 'completed';
                return (
                  <li key={task.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(task)}
                        className="mt-0.5 text-slate-500 hover:text-blue-700 cursor-pointer shrink-0"
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            done ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.notes && (
                          <p className="text-xs text-slate-500 mt-0.5">{task.notes}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(task)}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
