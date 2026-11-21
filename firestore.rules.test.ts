/**
 * Security Rules Specification Verification Suite ("Dirty Dozen" Payloads)
 * Intended for execution against the Firebase Firestore Rules Emulator (@firebase/rules-unit-testing).
 */

export const DIRTY_DOZEN_TEST_CASES = [
  {
    id: 1,
    name: 'Unauthenticated read on /agents/{agentId}',
    auth: null,
    operation: 'get',
    path: 'agents/48Y6YQBfczVLqA9qsDq5',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unauthenticated read on /planning/current',
    auth: null,
    operation: 'get',
    path: 'planning/current',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unauthenticated read on /api_tokens/token_default_master',
    auth: null,
    operation: 'get',
    path: 'api_tokens/token_default_master',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-user PII read on /users/{otherUid}',
    auth: { uid: 'viewer_1', email: 'viewer1@cortex.io', email_verified: true },
    operation: 'get',
    path: 'users/other_uid_123',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Non-admin list on /users',
    auth: { uid: 'manager_1', email: 'manager1@cortex.io', email_verified: true },
    operation: 'list',
    path: 'users',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Privilege escalation on create /users/{uid}',
    auth: { uid: 'attacker_uid', email: 'attacker@evil.com', email_verified: true },
    operation: 'create',
    path: 'users/attacker_uid',
    payload: {
      uid: 'attacker_uid',
      email: 'attacker@evil.com',
      displayName: 'Attacker',
      role: 'admin',
      status: 'approved',
      createdAt: '2026-11-20T00:00:00.000Z',
      lastLoginAt: '2026-11-20T00:00:00.000Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Privilege escalation on update /users/{uid}',
    auth: { uid: 'viewer_1', email: 'viewer1@cortex.io', email_verified: true },
    operation: 'update',
    path: 'users/viewer_1',
    payload: { role: 'admin', status: 'approved' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Shadow field injection on /agents/{id}',
    auth: { uid: 'manager_1', email: 'manager1@cortex.io', email_verified: true },
    operation: 'create',
    path: 'agents/agent_shadow_1',
    payload: {
      id: 'agent_shadow_1',
      name: 'Shadow Agent',
      team: 'Paris',
      order: 99,
      isSuperUser: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Spoofed SuperAdmin email with email_verified: false',
    auth: { uid: 'spoof_uid', email: 'ops.manager.gops@gmail.com', email_verified: false },
    operation: 'create',
    path: 'settings/access_control',
    payload: { autoApprovalEnabled: true, defaultRole: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Viewer attempting planning mutation',
    auth: { uid: 'viewer_1', email: 'viewer1@cortex.io', email_verified: true },
    operation: 'update',
    path: 'planning/current',
    payload: {
      assignments: { '48Y6YQBfczVLqA9qsDq5_2026-11-20': 'M1' },
      updatedAt: '2026-11-20T12:00:00.000Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Swap request identity spoofing',
    auth: { uid: 'viewer_1', email: 'viewer1@cortex.io', email_verified: true },
    operation: 'create',
    path: 'swap_requests/swap_spoof_1',
    payload: {
      id: 'swap_spoof_1',
      requesterUid: 'victim_uid',
      requesterAgentId: '48Y6YQBfczVLqA9qsDq5',
      targetAgentId: '8FQF9jq4AfFGFWskIKvh',
      dates: ['2026-11-20'],
      requesterShifts: { '2026-11-20': 'M1' },
      targetShifts: { '2026-11-20': 'S1' },
      status: 'pending_target',
      createdAt: '2026-11-20T12:00:00.000Z',
      updatedAt: '2026-11-20T12:00:00.000Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Resource poisoning via oversized shift ID or shift code',
    auth: { uid: 'manager_1', email: 'manager1@cortex.io', email_verified: true },
    operation: 'create',
    path: `shifts/${'A'.repeat(200)}`,
    payload: {
      id: 'A'.repeat(200),
      code: 'X'.repeat(500),
      hours: '08:00 - 16:00',
      order: 1,
    },
    expected: 'PERMISSION_DENIED',
  },
];

// Minimal structural assertion when executed directly in Node without emulator
if (DIRTY_DOZEN_TEST_CASES.length !== 12) {
  throw new Error('Expected exactly 12 Dirty Dozen security test cases.');
}
