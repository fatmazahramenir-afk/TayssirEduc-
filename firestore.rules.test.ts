/**
 * Security Rules Verification Specification for firestore.rules
 * Covers the 12 adversarial payloads defined in security_spec.md.
 */
export interface DirtyDozenCase {
  id: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: '01-unauth-user-read',
    operation: 'get',
    path: '/users/user_1',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '02-cross-user-profile-read',
    operation: 'get',
    path: '/users/victim_uid',
    auth: { uid: 'attacker_uid', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '03-user-collection-list',
    operation: 'list',
    path: '/users',
    auth: { uid: 'attacker_uid', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '04-unverified-email-write',
    operation: 'create',
    path: '/workspacePins/pin_1',
    auth: { uid: 'user_1', email_verified: false },
    payload: {
      ownerId: 'user_1',
      service: 'drive',
      resourceId: 'file_123',
      title: 'Test',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '05-identity-spoof-pin',
    operation: 'create',
    path: '/workspacePins/pin_2',
    auth: { uid: 'attacker_uid', email_verified: true },
    payload: {
      ownerId: 'victim_uid',
      serviceKey: 'drive',
      resourceId: 'file_123',
      title: 'Spoofed Pin',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '06-shadow-field-note',
    operation: 'create',
    path: '/studyNotes/note_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      ownerId: 'user_1',
      title: 'Note',
      content: 'Body',
      serviceKey: 'general',
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '07-timestamp-forgery',
    operation: 'create',
    path: '/studyNotes/note_2',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      ownerId: 'user_1',
      title: 'Note',
      content: 'Body',
      serviceKey: 'general',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '08-immutable-owner-update',
    operation: 'update',
    path: '/workspacePins/pin_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: { ownerId: 'other_uid' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '09-immutable-createdAt-update',
    operation: 'update',
    path: '/studyNotes/note_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: { createdAt: '2025-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '10-id-poisoning',
    operation: 'create',
    path: `/workspacePins/${'a'.repeat(500)}`,
    auth: { uid: 'user_1', email_verified: true },
    payload: { ownerId: 'user_1', serviceKey: 'drive', resourceId: '1', title: 'Bad ID' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '11-oversized-content',
    operation: 'create',
    path: '/studyNotes/note_3',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      ownerId: 'user_1',
      title: 'Huge Note',
      content: 'x'.repeat(9000),
      service: 'general',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: '12-unscoped-list-query',
    operation: 'list',
    path: '/workspacePins',
    auth: { uid: 'attacker_uid', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
