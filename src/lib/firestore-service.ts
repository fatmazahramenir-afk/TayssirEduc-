import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase.ts';
import { handleFirestoreError, OperationType } from './firestore-errors.ts';

export type WorkspaceServiceKey =
  | 'drive'
  | 'sheets'
  | 'gmail'
  | 'tasks'
  | 'chat'
  | 'forms'
  | 'meet'
  | 'classroom';

export type NoteServiceKey = 'general' | WorkspaceServiceKey;

export interface WorkspacePin {
  id: string;
  ownerId: string;
  serviceKey: WorkspaceServiceKey;
  resourceId: string;
  title: string;
  url?: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StudyNote {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  serviceKey: NoteServiceKey;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const id = `${prefix}_${Date.now()}_${rand}`;
  return VALID_ID_REGEX.test(id) ? id.slice(0, 128) : `${prefix}_${Date.now()}`;
}

function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export async function upsertUserProfile(params: {
  uid: string;
  email: string;
  displayName?: string | null;
  preferredLocale?: 'en' | 'ar';
}): Promise<'en' | 'ar'> {
  const userPath = `users/${params.uid}`;
  const userRef = doc(db, 'users', params.uid);
  try {
    const existing = await getDoc(userRef);
    const safeEmail = clampString(params.email, 254);
    const safeName = params.displayName ? clampString(params.displayName, 120) : undefined;

    if (existing.exists()) {
      const data = existing.data();
      const locale: 'en' | 'ar' = data?.preferredLocale === 'ar' ? 'ar' : 'en';
      const updatePayload: Record<string, unknown> = {
        email: safeEmail,
        preferredLocale: params.preferredLocale ?? locale,
        updatedAt: serverTimestamp(),
      };
      if (safeName !== undefined) {
        updatePayload.displayName = safeName;
      }
      await updateDoc(userRef, updatePayload);
      return (params.preferredLocale ?? locale);
    }

    const locale: 'en' | 'ar' = params.preferredLocale ?? 'en';
    const createPayload: Record<string, unknown> = {
      uid: params.uid,
      email: safeEmail,
      preferredLocale: locale,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (safeName) {
      createPayload.displayName = safeName;
    }
    await setDoc(userRef, createPayload);
    return locale;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateUserLocale(uid: string, locale: 'en' | 'ar'): Promise<void> {
  const userPath = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      preferredLocale: locale,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export function subscribeWorkspacePins(
  uid: string,
  onData: (pins: WorkspacePin[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = 'workspacePins';
  const q = query(collection(db, colPath), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: WorkspacePin[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WorkspacePin, 'id'>),
        }))
        .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function createWorkspacePin(params: {
  ownerId: string;
  serviceKey: WorkspaceServiceKey;
  resourceId: string;
  title: string;
  url?: string;
  notes?: string;
}): Promise<void> {
  const id = makeSafeId('pin');
  const path = `workspacePins/${id}`;
  const payload: Record<string, unknown> = {
    ownerId: params.ownerId,
    serviceKey: params.serviceKey,
    resourceId: clampString(params.resourceId, 256) || 'resource',
    title: clampString(params.title, 200) || 'Untitled Resource',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (params.url && params.url.trim()) {
    payload.url = clampString(params.url, 1024);
  }
  if (params.notes && params.notes.trim()) {
    payload.notes = clampString(params.notes, 2000);
  }
  try {
    await setDoc(doc(db, 'workspacePins', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteWorkspacePin(pinId: string): Promise<void> {
  const path = `workspacePins/${pinId}`;
  try {
    await deleteDoc(doc(db, 'workspacePins', pinId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeStudyNotes(
  uid: string,
  onData: (notes: StudyNote[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = 'studyNotes';
  const q = query(collection(db, colPath), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: StudyNote[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<StudyNote, 'id'>),
        }))
        .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function createStudyNote(params: {
  ownerId: string;
  title: string;
  content: string;
  serviceKey: NoteServiceKey;
}): Promise<void> {
  const id = makeSafeId('note');
  const path = `studyNotes/${id}`;
  try {
    await setDoc(doc(db, 'studyNotes', id), {
      ownerId: params.ownerId,
      title: clampString(params.title, 200) || 'Untitled Note',
      content: clampString(params.content, 8000) || '-',
      serviceKey: params.serviceKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStudyNote(
  noteId: string,
  updates: { title: string; content: string; serviceKey: NoteServiceKey }
): Promise<void> {
  const path = `studyNotes/${noteId}`;
  try {
    await updateDoc(doc(db, 'studyNotes', noteId), {
      title: clampString(updates.title, 200) || 'Untitled Note',
      content: clampString(updates.content, 8000) || '-',
      serviceKey: updates.serviceKey,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStudyNote(noteId: string): Promise<void> {
  const path = `studyNotes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'studyNotes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
