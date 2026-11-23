# Firestore Security Specification

## 1. Data Invariants
1. **User Profile Isolation (`users/{userId}`)**: Only the verified owner (`request.auth.uid == userId`) can read, create, update, or delete their own profile. Collection listing (`list`) is disabled to prevent user enumeration and PII leaks.
2. **Owner-Bound Pins (`workspacePins/{pinId}`)**: Every pinned Workspace resource must carry `ownerId == request.auth.uid`, valid service enum, bounded strings, and server timestamps (`request.time`).
3. **Owner-Bound Notes (`studyNotes/{noteId}`)**: Every operational note must carry `ownerId == request.auth.uid`, bounded title/content, and immutable `ownerId`/`createdAt`.
4. **Path Hardening**: All document IDs (`userId`, `pinId`, `noteId`) must match `^[a-zA-Z0-9_\\-]+$` and have length 1..128.
5. **Verified Identity**: All writes require `request.auth != null && request.auth.token.email_verified == true`.

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /users/user_1` with `auth == null` -> DENIED.
2. **Cross-User Profile Read**: `GET /users/victim_uid` as `attacker_uid` -> DENIED.
3. **User Enumeration**: `LIST /users` as any signed-in user -> DENIED.
4. **Unverified Email Write**: `CREATE /workspacePins/pin_1` with `email_verified: false` -> DENIED.
5. **Identity Spoofing on Pin Create**: `CREATE /workspacePins/pin_2` with `ownerId: "victim_uid"` while signed in as `attacker_uid` -> DENIED.
6. **Shadow / Ghost Field Injection**: `CREATE /studyNotes/note_1` with extra field `isAdmin: true` -> DENIED.
7. **Timestamp Forgery**: `CREATE /studyNotes/note_2` with client-backdated `createdAt` (`!= request.time`) -> DENIED.
8. **Immutable Owner Tampering**: `UPDATE /workspacePins/pin_1` attempting to change `ownerId` -> DENIED.
9. **Immutable CreatedAt Tampering**: `UPDATE /studyNotes/note_1` attempting to modify `createdAt` -> DENIED.
10. **ID Poisoning**: `CREATE /workspacePins/<1500-char-id>` -> DENIED.
11. **Oversized String Exhaustion**: `CREATE /studyNotes/note_3` with `content` > 8000 chars -> DENIED.
12. **Unfiltered List Query**: `LIST /workspacePins` without `where('ownerId', '==', uid)` -> DENIED.
