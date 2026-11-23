export class WorkspaceApiError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'WorkspaceApiError';
    this.status = status;
    this.details = details;
  }
}

async function apiFetch<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    let rawText = '';
    try {
      rawText = await res.text();
      const parsed = JSON.parse(rawText);
      errMsg = parsed?.error?.message || parsed?.message || errMsg;
    } catch {
      if (rawText) errMsg = rawText;
    }
    throw new WorkspaceApiError(errMsg, res.status, rawText);
  }

  if (res.status === 204) {
    return {} as T;
  }
  return (await res.json()) as T;
}

// ---------- Google Drive ----------
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  trashed?: boolean;
}

export async function listDriveFiles(
  accessToken: string,
  queryStr = ''
): Promise<DriveFile[]> {
  const qParts = ['trashed = false'];
  if (queryStr.trim()) {
    const safeTerm = queryStr.trim().replace(/['\\]/g, '');
    qParts.push(`name contains '${safeTerm}'`);
  }
  const params = new URLSearchParams({
    pageSize: '30',
    orderBy: 'modifiedTime desc',
    q: qParts.join(' and '),
    fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,trashed)',
  });
  const data = await apiFetch<{ files?: DriveFile[] }>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken
  );
  return data.files || [];
}

export async function listDriveFilesByMime(
  accessToken: string,
  mimeType: string
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    pageSize: '25',
    orderBy: 'modifiedTime desc',
    q: `trashed = false and mimeType = '${mimeType}'`,
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
  });
  const data = await apiFetch<{ files?: DriveFile[] }>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken
  );
  return data.files || [];
}

export async function createDriveFolder(
  accessToken: string,
  name: string
): Promise<DriveFile> {
  return apiFetch<DriveFile>('https://www.googleapis.com/drive/v3/files', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
}

export async function trashDriveFile(
  accessToken: string,
  fileId: string
): Promise<DriveFile> {
  const safeId = encodeURIComponent(fileId.trim());
  return apiFetch<DriveFile>(
    `https://www.googleapis.com/drive/v3/files/${safeId}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ trashed: true }),
    }
  );
}

// ---------- Google Sheets ----------
export interface SpreadsheetMeta {
  spreadsheetId: string;
  spreadsheetUrl?: string;
  properties: { title: string };
  sheets: Array<{
    properties: {
      sheetId: number;
      title: string;
      index: number;
    };
  }>;
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMeta> {
  const safeId = encodeURIComponent(spreadsheetId.trim());
  const params = new URLSearchParams({
    fields: 'spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,index)',
  });
  return apiFetch<SpreadsheetMeta>(
    `https://sheets.googleapis.com/v4/spreadsheets/${safeId}?${params.toString()}`,
    accessToken
  );
}

export async function getSheetValues(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  cellRange = 'A1:H30'
): Promise<{ range: string; values?: string[][] }> {
  const safeId = encodeURIComponent(spreadsheetId.trim());
  const escapedTitle = sheetTitle.replace(/'/g, "''");
  const fullRange = encodeURIComponent(`'${escapedTitle}'!${cellRange}`);
  return apiFetch<{ range: string; values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${fullRange}`,
    accessToken
  );
}

export async function appendSheetRow(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  rowValues: string[]
): Promise<unknown> {
  const safeId = encodeURIComponent(spreadsheetId.trim());
  const escapedTitle = sheetTitle.replace(/'/g, "''");
  const fullRange = encodeURIComponent(`'${escapedTitle}'!A1`);
  return apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${fullRange}:append?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );
}

// ---------- Gmail ----------
export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  labelIds: string[];
}

export async function listGmailMessages(
  accessToken: string,
  q = ''
): Promise<GmailMessageSummary[]> {
  const params = new URLSearchParams({ maxResults: '12' });
  if (q.trim()) params.set('q', q.trim());

  const list = await apiFetch<{ messages?: Array<{ id: string; threadId: string }> }>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    accessToken
  );

  const refs = list.messages || [];
  const details = await Promise.all(
    refs.map((ref) =>
      apiFetch<{
        id: string;
        threadId: string;
        snippet?: string;
        labelIds?: string[];
        payload?: { headers?: Array<{ name: string; value: string }> };
      }>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(
          ref.id
        )}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        accessToken
      )
    )
  );

  return details.map((msg) => {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    return {
      id: msg.id,
      threadId: msg.threadId,
      snippet: msg.snippet || '',
      subject: getHeader('Subject') || '(No subject)',
      from: getHeader('From') || 'Unknown sender',
      date: getHeader('Date') || '',
      labelIds: msg.labelIds || [],
    };
  });
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendGmailMessage(
  accessToken: string,
  params: { to: string; subject: string; body: string }
): Promise<{ id: string }> {
  const safeTo = params.to.replace(/[\r\n]/g, '').trim();
  const safeSubject = params.subject.replace(/[\r\n]/g, '').trim();
  const mime = [
    `To: ${safeTo}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(safeSubject)))}?=`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    params.body,
  ].join('\r\n');

  return apiFetch<{ id: string }>(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ raw: toBase64Url(mime) }),
    }
  );
}

export async function trashGmailMessage(
  accessToken: string,
  messageId: string
): Promise<unknown> {
  const safeId = encodeURIComponent(messageId.trim());
  return apiFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${safeId}/trash`,
    accessToken,
    { method: 'POST' }
  );
}

// ---------- Google Tasks ----------
export interface TaskListItem {
  id: string;
  title: string;
  updated?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
}

export async function listTaskLists(accessToken: string): Promise<TaskListItem[]> {
  const data = await apiFetch<{ items?: TaskListItem[] }>(
    'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
    accessToken
  );
  return data.items || [];
}

export async function listTasks(
  accessToken: string,
  taskListId: string
): Promise<TaskItem[]> {
  const safeId = encodeURIComponent(taskListId.trim());
  const data = await apiFetch<{ items?: TaskItem[] }>(
    `https://tasks.googleapis.com/tasks/v1/lists/${safeId}/tasks?showCompleted=true&maxResults=50`,
    accessToken
  );
  return data.items || [];
}

export async function createTask(
  accessToken: string,
  taskListId: string,
  params: { title: string; notes?: string; due?: string }
): Promise<TaskItem> {
  const safeId = encodeURIComponent(taskListId.trim());
  const body: Record<string, string> = { title: params.title.trim() };
  if (params.notes?.trim()) body.notes = params.notes.trim();
  if (params.due) body.due = new Date(params.due).toISOString();
  return apiFetch<TaskItem>(
    `https://tasks.googleapis.com/tasks/v1/lists/${safeId}/tasks`,
    accessToken,
    { method: 'POST', body: JSON.stringify(body) }
  );
}

export async function updateTaskStatus(
  accessToken: string,
  taskListId: string,
  taskId: string,
  status: 'needsAction' | 'completed'
): Promise<TaskItem> {
  const safeList = encodeURIComponent(taskListId.trim());
  const safeTask = encodeURIComponent(taskId.trim());
  return apiFetch<TaskItem>(
    `https://tasks.googleapis.com/tasks/v1/lists/${safeList}/tasks/${safeTask}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
}

export async function deleteTask(
  accessToken: string,
  taskListId: string,
  taskId: string
): Promise<void> {
  const safeList = encodeURIComponent(taskListId.trim());
  const safeTask = encodeURIComponent(taskId.trim());
  await apiFetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${safeList}/tasks/${safeTask}`,
    accessToken,
    { method: 'DELETE' }
  );
}

// ---------- Google Chat ----------
export interface ChatSpace {
  name: string;
  displayName?: string;
  spaceType?: string;
  singleUserBotDm?: boolean;
}

export interface ChatMessage {
  name: string;
  text?: string;
  createTime?: string;
  sender?: { name?: string; displayName?: string; type?: string };
}

export async function listChatSpaces(accessToken: string): Promise<ChatSpace[]> {
  const data = await apiFetch<{ spaces?: ChatSpace[] }>(
    'https://chat.googleapis.com/v1/spaces?pageSize=25',
    accessToken
  );
  return data.spaces || [];
}

export async function listChatMessages(
  accessToken: string,
  spaceName: string
): Promise<ChatMessage[]> {
  const normalized = spaceName.replace(/^spaces\//, '');
  const safeSpace = encodeURIComponent(normalized);
  const data = await apiFetch<{ messages?: ChatMessage[] }>(
    `https://chat.googleapis.com/v1/spaces/${safeSpace}/messages?pageSize=25`,
    accessToken
  );
  return data.messages || [];
}

export async function sendChatMessage(
  accessToken: string,
  spaceName: string,
  text: string
): Promise<ChatMessage> {
  const normalized = spaceName.replace(/^spaces\//, '');
  const safeSpace = encodeURIComponent(normalized);
  return apiFetch<ChatMessage>(
    `https://chat.googleapis.com/v1/spaces/${safeSpace}/messages`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ text: text.trim() }),
    }
  );
}

// ---------- Google Forms ----------
export interface GoogleFormDetail {
  formId: string;
  info?: { title?: string; documentTitle?: string; description?: string };
  responderUri?: string;
  items?: Array<{
    itemId?: string;
    title?: string;
    description?: string;
    questionItem?: {
      question?: {
        questionId?: string;
        required?: boolean;
      };
    };
  }>;
}

export interface FormResponseItem {
  responseId: string;
  createTime?: string;
  lastSubmittedTime?: string;
  respondentEmail?: string;
  answers?: Record<
    string,
    {
      questionId?: string;
      textAnswers?: { answers?: Array<{ value?: string }> };
    }
  >;
}

export async function getGoogleForm(
  accessToken: string,
  formId: string
): Promise<GoogleFormDetail> {
  const safeFormId = encodeURIComponent(formId.trim());
  return apiFetch<GoogleFormDetail>(
    `https://forms.googleapis.com/v1/forms/${safeFormId}`,
    accessToken
  );
}

export async function listFormResponses(
  accessToken: string,
  formId: string
): Promise<FormResponseItem[]> {
  const safeFormId = encodeURIComponent(formId.trim());
  const data = await apiFetch<{ responses?: FormResponseItem[] }>(
    `https://forms.googleapis.com/v1/forms/${safeFormId}/responses`,
    accessToken
  );
  return data.responses || [];
}

export async function createGoogleForm(
  accessToken: string,
  title: string
): Promise<GoogleFormDetail> {
  return apiFetch<GoogleFormDetail>('https://forms.googleapis.com/v1/forms', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      info: {
        title: title.trim(),
        documentTitle: title.trim(),
      },
    }),
  });
}

// ---------- Google Meet ----------
export interface MeetSpace {
  name: string;
  meetingUri: string;
  meetingCode: string;
  config?: {
    accessType?: string;
    entryPointAccess?: string;
  };
}

export async function createMeetSpace(
  accessToken: string,
  accessType: 'OPEN' | 'TRUSTED' | 'RESTRICTED' = 'TRUSTED'
): Promise<MeetSpace> {
  return apiFetch<MeetSpace>('https://meet.googleapis.com/v2/spaces', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      config: { accessType },
    }),
  });
}

export async function getMeetSpace(
  accessToken: string,
  spaceNameOrCode: string
): Promise<MeetSpace> {
  const trimmed = spaceNameOrCode.trim().replace(/^spaces\//, '');
  const safe = encodeURIComponent(trimmed);
  return apiFetch<MeetSpace>(`https://meet.googleapis.com/v2/spaces/${safe}`, accessToken);
}

// ---------- Google Classroom ----------
export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  courseState?: string;
  alternateLink?: string;
}

export interface ClassroomCourseWork {
  id: string;
  title: string;
  description?: string;
  state?: string;
  workType?: string;
  maxPoints?: number;
  alternateLink?: string;
  updateTime?: string;
}

export interface ClassroomAnnouncement {
  id: string;
  text: string;
  state?: string;
  updateTime?: string;
  alternateLink?: string;
}

export async function listClassroomCourses(
  accessToken: string
): Promise<ClassroomCourse[]> {
  const data = await apiFetch<{ courses?: ClassroomCourse[] }>(
    'https://classroom.googleapis.com/v1/courses?pageSize=25',
    accessToken
  );
  return data.courses || [];
}

export async function listCourseWork(
  accessToken: string,
  courseId: string
): Promise<ClassroomCourseWork[]> {
  const safeId = encodeURIComponent(courseId.trim());
  const data = await apiFetch<{ courseWork?: ClassroomCourseWork[] }>(
    `https://classroom.googleapis.com/v1/courses/${safeId}/courseWork?pageSize=25`,
    accessToken
  );
  return data.courseWork || [];
}

export async function listCourseAnnouncements(
  accessToken: string,
  courseId: string
): Promise<ClassroomAnnouncement[]> {
  const safeId = encodeURIComponent(courseId.trim());
  const data = await apiFetch<{ announcements?: ClassroomAnnouncement[] }>(
    `https://classroom.googleapis.com/v1/courses/${safeId}/announcements?pageSize=20`,
    accessToken
  );
  return data.announcements || [];
}

export async function createCourseAnnouncement(
  accessToken: string,
  courseId: string,
  text: string
): Promise<ClassroomAnnouncement> {
  const safeId = encodeURIComponent(courseId.trim());
  return apiFetch<ClassroomAnnouncement>(
    `https://classroom.googleapis.com/v1/courses/${safeId}/announcements`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        text: text.trim(),
        state: 'PUBLISHED',
      }),
    }
  );
}
