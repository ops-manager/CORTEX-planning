# CORTEX Planning — Firestore Security Specification

## 1. Data Invariants
1. **Global Deny-by-Default**: Every unmatched Firestore path is denied (`match /{document=**} { allow read, write: if false; }`).
2. **PII Isolation (`users`)**: User documents contain PII (`email`, `displayName`, `photoURL`) and RBAC fields (`role`, `status`). Only the owning user (`request.auth.uid == userId`) or a verified Admin can `get` a user profile, and only a verified Admin can `list` all users.
3. **No Self-Escalation**: A regular user creating their own profile cannot self-assign `role: 'admin'`. Updating `role`, `status`, `approvedAt`, `approvedBy`, or `notes` is restricted strictly to verified Admins.
4. **Verified Email for SuperAdmin**: Email-based SuperAdmin privileges (`ops.manager.gops@gmail.com`) strictly require `request.auth.token.email_verified == true`.
5. **Path Variable Hardening**: Every single-document `get`, `create`, `update`, and `delete` checks `isValidId(docId)` (`^[a-zA-Z0-9_\-]+$`, length `1..128`).
6. **Manager-Only Planning & Catalog Writes**: Only approved Managers or Admins can create, update, or delete `agents`, `shifts`, `planning`, or `api_tokens`. Viewers have read-only access to shared planning collections.
7. **Swap Request Workflow State Machine**:
   - Creation requires `requesterUid == request.auth.uid` and `status == 'pending_target'`.
   - Terminal statuses (`approved`, `rejected_by_target`, `rejected_by_manager`) cannot transition back to active states unless overridden by an Admin/Manager.
   - Requesters can only update `requesterNotified`; target agents can only respond (`pending_target` -> `pending_manager` or `rejected_by_target`); managers can approve/reject.
8. **Zero Public Open Reads/Writes**: No collection uses `allow read: if true;` or `allow write: if true;`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated read on `/agents/48Y6YQBfczVLqA9qsDq5`**: `request.auth == null`.
2. **Unauthenticated read on `/planning/current`**: `request.auth == null`.
3. **Unauthenticated read on `/api_tokens/token_default_master`**: `request.auth == null`.
4. **Cross-user PII read on `/users/otherUid`**: Signed-in non-admin user attempting `get` on another user's profile.
5. **Non-admin list on `/users`**: Signed-in `manager` or `viewer` attempting `list` on `/users`.
6. **Privilege Escalation on Create (`/users/{uid}`)**: Non-admin user creating their own doc with `{ role: 'admin', status: 'approved' }`.
7. **Privilege Escalation on Update (`/users/{uid}`)**: Non-admin user updating `{ role: 'admin' }` on their own doc.
8. **Shadow Field Injection on `/agents/{id}`**: Manager creating an agent with extra ghost field `{ isSuperUser: true }`.
9. **Spoofed SuperAdmin Email**: User with `token.email == 'ops.manager.gops@gmail.com'` and `token.email_verified == false` attempting admin write.
10. **Viewer Planning Mutation**: Approved user with `role: 'viewer'` writing to `/planning/current`.
11. **Swap Request Identity Spoofing**: Approved user creating `/swap_requests/{id}` with `requesterUid: 'victim_uid'`.
12. **Resource Poisoning / Oversized ID or String**: Creating `/shifts/{1500_char_id}` or passing a 10KB string into `shift.code`.
