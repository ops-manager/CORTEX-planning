import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import {
  Agent,
  Shift,
  ApiToken,
  AppUser,
  UserRole,
  UserStatus,
  AccessControlSettings,
  ShiftSwapRequest
} from './types';
import { API_IMPORTED_AGENTS, generateInitialSchedule } from './data/mockData';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Suppress noisy internal stream recycling notices
setLogLevel('silent');

if (typeof window !== 'undefined') {
  const isIdleStreamNoise = (args: any[]) => {
    try {
      const msg = args
        .map((a) => {
          if (typeof a === 'string') return a;
          if (a instanceof Error) return `${a.name}: ${a.message} ${a.stack || ''}`;
          try {
            return `${a?.message || ''} ${String(a)} ${JSON.stringify(a)}`;
          } catch {
            return String(a);
          }
        })
        .join(' ');

      return (
        msg.includes('Disconnecting idle stream') ||
        msg.includes('Timed out waiting for new targets') ||
        msg.includes("GrpcConnection RPC 'Listen' stream") ||
        msg.includes("RPC 'Listen' stream") ||
        (msg.includes('GrpcConnection') && msg.includes('CANCELLED'))
      );
    } catch {
      return false;
    }
  };

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (isIdleStreamNoise(args)) return;
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (isIdleStreamNoise(args)) return;
    originalConsoleWarn.apply(console, args);
  };

  const originalConsoleInfo = console.info;
  console.info = (...args: any[]) => {
    if (isIdleStreamNoise(args)) return;
    originalConsoleInfo.apply(console, args);
  };

  const originalConsoleLog = console.log;
  console.log = (...args: any[]) => {
    if (isIdleStreamNoise(args)) return;
    originalConsoleLog.apply(console, args);
  };
}

// Initialize Firestore with specific database ID and ignoreUndefinedProperties
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || undefined;
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    },
    firestoreDbId
  );
} catch {
  firestoreInstance = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
}
export const db = firestoreInstance;

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isPermissionDeniedError(err: unknown): boolean {
  const code = (err as any)?.code || '';
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    code === 'permission-denied' ||
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('PERMISSION_DENIED')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate live connection to Firestore server
 */
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

/**
 * Strip undefined fields before writing to Firestore
 */
export function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned as Partial<T>;
}

/**
 * Get current authenticated user's Firebase ID token for server API calls
 */
export async function getCurrentUserIdToken(): Promise<string | null> {
  try {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign in with Email and Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Email Login Error:', error);
    throw error;
  }
}

/**
 * Register with Email and Password
 */
export async function registerWithEmail(email: string, pass: string): Promise<User> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Email Register Error:', error);
    throw error;
  }
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
}

export const AGENTS_COLLECTION = 'agents';
export const SHIFTS_COLLECTION = 'shifts';
export const PLANNING_DOC = 'planning/current';
export const API_TOKENS_COLLECTION = 'api_tokens';
export const SWAP_REQUESTS_COLLECTION = 'swap_requests';

export const DEFAULT_MASTER_API_TOKEN: ApiToken = {
  id: 'token_default_master',
  name: 'Default Production Token',
  token: 'cortex_live_sec_9e7a4b82d1c3',
  prefix: 'cortex_live_sec_9e7...',
  createdAt: '2026-08-30T00:00:00.000Z',
  createdBy: 'System Admin',
  isActive: true
};

/**
 * Fetch all shifts directly from Firestore
 */
export async function getShiftsFromFirestore(): Promise<Shift[]> {
  if (!auth.currentUser) return [];
  try {
    const shiftsCol = collection(db, SHIFTS_COLLECTION);
    const snap = await getDocs(shiftsCol);
    const loadedShifts: Shift[] = [];
    const seenIds = new Set<string>();
    snap.forEach((d) => {
      const data = d.data();
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        loadedShifts.push({
          id: d.id,
          code: data.code || d.id,
          hours: data.hours || '00:00 - 00:00',
          order: data.order ?? 0,
          label: data.label || '',
          color: data.color || '',
          season: data.season || 'all',
          hidden: Boolean(data.hidden),
          defaultPause: data.defaultPause || '',
          defaultMissionId: data.defaultMissionId || '',
          ownerId: data.ownerId || '',
          ...data
        } as Shift);
      }
    });
    loadedShifts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return loadedShifts;
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.LIST, SHIFTS_COLLECTION);
    }
    console.warn('Error fetching shifts from Firestore:', err);
    return [];
  }
}

/**
 * Real-time subscription to the shifts collection in Firestore
 */
export function subscribeToShifts(onUpdate: (shifts: Shift[]) => void): Unsubscribe {
  if (!auth.currentUser) return () => {};
  const shiftsCol = collection(db, SHIFTS_COLLECTION);
  return onSnapshot(
    shiftsCol,
    (snap) => {
      const loadedShifts: Shift[] = [];
      const seenIds = new Set<string>();
      snap.forEach((d) => {
        const data = d.data();
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          loadedShifts.push({
            id: d.id,
            code: data.code || d.id,
            hours: data.hours || '00:00 - 00:00',
            order: data.order ?? 0,
            label: data.label || '',
            color: data.color || '',
            season: data.season || 'all',
            hidden: Boolean(data.hidden),
            defaultPause: data.defaultPause || '',
            defaultMissionId: data.defaultMissionId || '',
            ownerId: data.ownerId || '',
            ...data
          } as Shift);
        }
      });
      loadedShifts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      onUpdate(loadedShifts);
    },
    (err) => {
      if (isPermissionDeniedError(err)) {
        handleFirestoreError(err, OperationType.LIST, SHIFTS_COLLECTION);
      }
      console.warn('Real-time shifts subscription error:', err);
    }
  );
}

/**
 * Real-time subscription to the agents collection in Firestore
 */
export function subscribeToAgents(onUpdate: (agents: Agent[]) => void): Unsubscribe {
  if (!auth.currentUser) return () => {};
  const agentsCol = collection(db, AGENTS_COLLECTION);
  return onSnapshot(
    agentsCol,
    (snap) => {
      if (snap.empty) return;
      const loadedAgents: Agent[] = [];
      snap.forEach((d) => {
        loadedAgents.push({ id: d.id, ...d.data() } as Agent);
      });
      loadedAgents.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      onUpdate(loadedAgents);
    },
    (err) => {
      if (isPermissionDeniedError(err)) {
        handleFirestoreError(err, OperationType.LIST, AGENTS_COLLECTION);
      }
      console.warn('Real-time agents subscription error:', err);
    }
  );
}

/**
 * Real-time subscription to planning assignments in Firestore
 */
export function subscribeToPlanning(onUpdate: (planning: Record<string, string>) => void): Unsubscribe {
  if (!auth.currentUser) return () => {};
  const planningDocRef = doc(db, 'planning', 'current');
  return onSnapshot(
    planningDocRef,
    (snap) => {
      if (snap.exists() && snap.data()?.assignments) {
        onUpdate(snap.data().assignments);
      }
    },
    (err) => {
      if (isPermissionDeniedError(err)) {
        handleFirestoreError(err, OperationType.GET, PLANNING_DOC);
      }
      console.warn('Real-time planning subscription error:', err);
    }
  );
}

/**
 * Initialize Firestore data and load from Firestore
 */
export async function initializeFirestoreIfNeeded(): Promise<{
  agents: Agent[];
  shifts: Shift[];
  planning: Record<string, string>;
}> {
  if (!auth.currentUser) {
    return {
      agents: API_IMPORTED_AGENTS,
      shifts: [],
      planning: {}
    };
  }

  try {
    const agentsCol = collection(db, AGENTS_COLLECTION);
    const shiftsCol = collection(db, SHIFTS_COLLECTION);
    const planningRef = doc(db, 'planning', 'current');

    const [agentsSnap, shiftsSnap, planningSnap] = await Promise.all([
      getDocs(agentsCol),
      getDocs(shiftsCol),
      getDoc(planningRef)
    ]);

    const agents: Agent[] = [];
    agentsSnap.forEach((d) => {
      agents.push({ id: d.id, ...d.data() } as Agent);
    });
    agents.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const shifts: Shift[] = [];
    const seenShiftIds = new Set<string>();
    shiftsSnap.forEach((d) => {
      const data = d.data();
      const shiftId = d.id;
      if (!seenShiftIds.has(shiftId)) {
        seenShiftIds.add(shiftId);
        shifts.push({
          id: shiftId,
          code: data.code || shiftId,
          hours: data.hours || '00:00 - 00:00',
          order: data.order ?? 0,
          label: data.label || '',
          color: data.color || '',
          season: data.season || 'all',
          hidden: Boolean(data.hidden),
          defaultPause: data.defaultPause || '',
          defaultMissionId: data.defaultMissionId || '',
          ownerId: data.ownerId || '',
          ...data
        } as Shift);
      }
    });
    shifts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    let planning: Record<string, string> = {};
    if (planningSnap.exists() && planningSnap.data()?.assignments) {
      planning = planningSnap.data().assignments;
    }

    return { agents: agents.length > 0 ? agents : API_IMPORTED_AGENTS, shifts, planning };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      handleFirestoreError(error, OperationType.GET, 'agents|shifts|planning/current');
    }
    console.warn('Error reading from Firestore:', error);
    return {
      agents: API_IMPORTED_AGENTS,
      shifts: [],
      planning: {}
    };
  }
}

/**
 * Reset all data in Firestore without modifying or resetting custom shifts
 */
export async function resetAllDataToFirestore(): Promise<{
  agents: Agent[];
  shifts: Shift[];
  planning: Record<string, string>;
}> {
  const uid = auth.currentUser?.uid || SUPER_ADMIN_UID;
  try {
    const existingAgents = await getDocs(collection(db, AGENTS_COLLECTION));
    const deleteBatch = writeBatch(db);
    existingAgents.forEach((d) => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    const agentsBatch = writeBatch(db);
    const seededAgents = API_IMPORTED_AGENTS.map((agent) => ({
      ...agent,
      ownerId: uid
    }));
    seededAgents.forEach((agent) => {
      const ref = doc(db, AGENTS_COLLECTION, agent.id);
      agentsBatch.set(ref, stripUndefined(agent));
    });
    await agentsBatch.commit();

    const currentShifts = await getShiftsFromFirestore();

    const dateStrings: string[] = [];
    const today = new Date();
    for (let i = -5; i <= 35; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateStrings.push(`${yyyy}-${mm}-${dd}`);
    }

    const initPlanning = generateInitialSchedule(seededAgents, dateStrings);
    const planningRef = doc(db, 'planning', 'current');
    await setDoc(planningRef, {
      assignments: initPlanning,
      updatedAt: new Date().toISOString()
    });

    return {
      agents: seededAgents,
      shifts: currentShifts,
      planning: initPlanning
    };
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.WRITE, PLANNING_DOC);
    }
    console.error('Failed to reset Firestore data:', err);
    return {
      agents: API_IMPORTED_AGENTS,
      shifts: [],
      planning: {}
    };
  }
}

// Serialized batch writing for agents to prevent write stream exhaustion
let isSavingAgentsInFlight = false;
let pendingAgentsToSave: Agent[] | null = null;

/**
 * Save agents list batch to Firestore (e.g. after reordering or adding)
 */
export async function saveAgentsToFirestore(agents: Agent[]): Promise<void> {
  pendingAgentsToSave = agents;
  if (isSavingAgentsInFlight) return;
  isSavingAgentsInFlight = true;

  try {
    while (pendingAgentsToSave) {
      const currentBatch = pendingAgentsToSave;
      pendingAgentsToSave = null;
      const batch = writeBatch(db);
      currentBatch.forEach((agent, idx) => {
        const ref = doc(db, AGENTS_COLLECTION, agent.id);
        const resolvedOrder = typeof agent.order === 'number' ? agent.order : idx;
        batch.set(
          ref,
          stripUndefined({
            ...agent,
            order: resolvedOrder
          }),
          { merge: true }
        );
      });
      await batch.commit();
    }
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.WRITE, AGENTS_COLLECTION);
    }
    console.warn('Error saving agents to Firestore:', err);
  } finally {
    isSavingAgentsInFlight = false;
  }
}

/**
 * Create a new agent in Firestore
 */
export async function createAgentInFirestore(agent: Agent): Promise<void> {
  try {
    const ref = doc(db, AGENTS_COLLECTION, agent.id);
    const payload = stripUndefined({
      ...agent,
      ownerId: agent.ownerId || auth.currentUser?.uid || ''
    });
    await setDoc(ref, payload);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.CREATE, `${AGENTS_COLLECTION}/${agent.id}`);
    }
    console.error('Error creating agent in Firestore:', err);
    throw err;
  }
}

/**
 * Update an existing agent in Firestore
 */
export async function updateAgentInFirestore(id: string, updates: Partial<Agent>): Promise<void> {
  try {
    const ref = doc(db, AGENTS_COLLECTION, id);
    await setDoc(ref, stripUndefined(updates), { merge: true });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.UPDATE, `${AGENTS_COLLECTION}/${id}`);
    }
    console.error(`Error updating agent ${id} in Firestore:`, err);
    throw err;
  }
}

/**
 * Delete an agent from Firestore
 */
export async function deleteAgentFromFirestore(id: string): Promise<void> {
  try {
    const ref = doc(db, AGENTS_COLLECTION, id);
    await deleteDoc(ref);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.DELETE, `${AGENTS_COLLECTION}/${id}`);
    }
    console.error(`Error deleting agent ${id} from Firestore:`, err);
    throw err;
  }
}

// Serialized batch writing for shifts to prevent write stream exhaustion
let isSavingShiftsInFlight = false;
let pendingShiftsToSave: Shift[] | null = null;

/**
 * Save shifts list batch to Firestore
 */
export async function saveShiftsToFirestore(shifts: Shift[]): Promise<void> {
  pendingShiftsToSave = shifts;
  if (isSavingShiftsInFlight) return;
  isSavingShiftsInFlight = true;

  try {
    while (pendingShiftsToSave) {
      const currentBatch = pendingShiftsToSave;
      pendingShiftsToSave = null;
      const batch = writeBatch(db);
      currentBatch.forEach((shift, idx) => {
        const ref = doc(db, SHIFTS_COLLECTION, shift.id);
        batch.set(
          ref,
          stripUndefined({
            ...shift,
            order: idx
          }),
          { merge: true }
        );
      });
      await batch.commit();
    }
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.WRITE, SHIFTS_COLLECTION);
    }
    console.warn('Error saving shifts to Firestore:', err);
  } finally {
    isSavingShiftsInFlight = false;
  }
}

/**
 * Create a new shift in Firestore
 */
export async function createShiftInFirestore(shift: Shift): Promise<void> {
  try {
    const ref = doc(db, SHIFTS_COLLECTION, shift.id);
    const payload = stripUndefined({
      ...shift,
      ownerId: shift.ownerId || auth.currentUser?.uid || ''
    });
    await setDoc(ref, payload);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.CREATE, `${SHIFTS_COLLECTION}/${shift.id}`);
    }
    console.error('Error creating shift in Firestore:', err);
    throw err;
  }
}

/**
 * Update an existing shift in Firestore
 */
export async function updateShiftInFirestore(id: string, updates: Partial<Shift>): Promise<void> {
  try {
    const ref = doc(db, SHIFTS_COLLECTION, id);
    await setDoc(ref, stripUndefined(updates), { merge: true });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.UPDATE, `${SHIFTS_COLLECTION}/${id}`);
    }
    console.error(`Error updating shift ${id} in Firestore:`, err);
    throw err;
  }
}

/**
 * Delete a shift from Firestore
 */
export async function deleteShiftFromFirestore(id: string): Promise<void> {
  try {
    const ref = doc(db, SHIFTS_COLLECTION, id);
    await deleteDoc(ref);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.DELETE, `${SHIFTS_COLLECTION}/${id}`);
    }
    console.error(`Error deleting shift ${id} from Firestore:`, err);
    throw err;
  }
}

// Debounced and serialized Firestore planning persistence
let pendingPlanningAssignments: Record<string, string> | null = null;
let isPlanningSaveInFlight = false;
let planningDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Flush any pending debounced planning writes to Firestore immediately
 */
export async function flushPlanningSaveToFirestore(): Promise<void> {
  if (planningDebounceTimer) {
    clearTimeout(planningDebounceTimer);
    planningDebounceTimer = null;
  }

  if (!pendingPlanningAssignments || !auth.currentUser) {
    return;
  }

  if (isPlanningSaveInFlight) {
    return;
  }

  const assignmentsToSave = { ...pendingPlanningAssignments };
  pendingPlanningAssignments = null;
  isPlanningSaveInFlight = true;

  try {
    const ref = doc(db, 'planning', 'current');
    await setDoc(
      ref,
      {
        assignments: assignmentsToSave,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err: any) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.UPDATE, PLANNING_DOC);
    }
    console.warn('Firestore planning sync throttled or transient error, scheduling retry:', err);
    if (!pendingPlanningAssignments) {
      pendingPlanningAssignments = assignmentsToSave;
    }
  } finally {
    isPlanningSaveInFlight = false;
    if (pendingPlanningAssignments) {
      if (planningDebounceTimer) clearTimeout(planningDebounceTimer);
      planningDebounceTimer = setTimeout(() => {
        flushPlanningSaveToFirestore().catch(() => {});
      }, 500);
    }
  }
}

/**
 * Queue a planning save with debouncing (800ms) and serialized in-flight execution.
 */
export function queuePlanningSaveToFirestore(
  allAssignments: Record<string, string>,
  immediate: boolean = false
): void {
  pendingPlanningAssignments = allAssignments;

  if (planningDebounceTimer) {
    clearTimeout(planningDebounceTimer);
    planningDebounceTimer = null;
  }

  if (immediate) {
    flushPlanningSaveToFirestore().catch(() => {});
  } else {
    planningDebounceTimer = setTimeout(() => {
      flushPlanningSaveToFirestore().catch(() => {});
    }, 800);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingPlanningAssignments && !isPlanningSaveInFlight && auth.currentUser) {
      const assignments = pendingPlanningAssignments;
      pendingPlanningAssignments = null;
      try {
        const ref = doc(db, 'planning', 'current');
        setDoc(
          ref,
          {
            assignments,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        ).catch(() => {});
      } catch {}
    }
  });
}

/**
 * Save planning assignments updates to Firestore (debounced)
 */
export async function savePlanningToFirestore(
  allAssignments: Record<string, string>
): Promise<void> {
  queuePlanningSaveToFirestore(allAssignments, false);
}

/**
 * Fetch all API tokens from Firestore
 */
export async function getApiTokensFromFirestore(): Promise<ApiToken[]> {
  if (!auth.currentUser) return [DEFAULT_MASTER_API_TOKEN];
  try {
    const tokensCol = collection(db, API_TOKENS_COLLECTION);
    const snap = await getDocs(tokensCol);
    if (snap.empty) {
      const defToken = stripUndefined(DEFAULT_MASTER_API_TOKEN);
      await setDoc(doc(db, API_TOKENS_COLLECTION, DEFAULT_MASTER_API_TOKEN.id), defToken);
      return [DEFAULT_MASTER_API_TOKEN];
    }
    const tokens: ApiToken[] = [];
    snap.forEach((d) => {
      tokens.push({ id: d.id, ...d.data() } as ApiToken);
    });
    return tokens.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.LIST, API_TOKENS_COLLECTION);
    }
    console.warn('Error fetching API tokens from Firestore:', err);
    return [DEFAULT_MASTER_API_TOKEN];
  }
}

/**
 * Create a new API token in Firestore
 */
export async function createApiTokenInFirestore(
  name: string,
  createdBy: string = 'Admin User',
  expiresAt?: string
): Promise<ApiToken> {
  try {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const tokenSecret = `cortex_live_sec_${randomHex}`;
    const id = `token_${Date.now()}_${randomHex.substring(0, 6)}`;
    const prefix = `${tokenSecret.substring(0, 20)}...`;

    const newToken: ApiToken = {
      id,
      name: name.trim() || 'API Token',
      token: tokenSecret,
      prefix,
      createdAt: new Date().toISOString(),
      createdBy,
      ...(expiresAt ? { expiresAt } : {}),
      isActive: true
    };

    const ref = doc(db, API_TOKENS_COLLECTION, id);
    await setDoc(ref, stripUndefined(newToken));
    return newToken;
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.CREATE, API_TOKENS_COLLECTION);
    }
    console.error('Error creating API token in Firestore:', err);
    throw err;
  }
}

/**
 * Toggle API token active status
 */
export async function toggleApiTokenInFirestore(id: string, isActive: boolean): Promise<void> {
  try {
    const ref = doc(db, API_TOKENS_COLLECTION, id);
    await setDoc(ref, { isActive }, { merge: true });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.UPDATE, `${API_TOKENS_COLLECTION}/${id}`);
    }
    console.error(`Error updating API token ${id}:`, err);
    throw err;
  }
}

/**
 * Delete / Revoke API token from Firestore
 */
export async function deleteApiTokenFromFirestore(id: string): Promise<void> {
  try {
    const ref = doc(db, API_TOKENS_COLLECTION, id);
    await deleteDoc(ref);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.DELETE, `${API_TOKENS_COLLECTION}/${id}`);
    }
    console.error(`Error deleting API token ${id}:`, err);
    throw err;
  }
}

// ============================================================================
// DATABASE ACCESS PERMISSIONS & AUTO-APPROVAL SYSTEM
// ============================================================================

export const USERS_COLLECTION = 'users';
export const SETTINGS_COLLECTION = 'settings';
export const ACCESS_CONTROL_DOC = 'access_control';
export const SUPER_ADMIN_UID = 'nJxGjmZvHxZNnaIV5BXiRjiq0Cv2';
export const DEFAULT_ADMIN_EMAILS = ['ops.manager.gops@gmail.com', 'admin@cortex.io', 'superadmin@cortex.io'];

export const DEFAULT_ACCESS_CONTROL_SETTINGS: AccessControlSettings = {
  autoApprovalEnabled: true,
  defaultRole: 'manager',
  allowedDomains: [],
  adminEmails: DEFAULT_ADMIN_EMAILS,
  superAdminUid: SUPER_ADMIN_UID,
  preApprovedEmails: [
    {
      email: 'ops.manager.gops@gmail.com',
      role: 'admin',
      addedAt: '2026-08-30T00:00:00.000Z',
      addedBy: 'System'
    }
  ],
  allowManagersProgramme: true
};

/**
 * Fetch the Access Control and Auto-Approval settings from Firestore (read-only on fetch)
 */
export async function getAccessControlSettings(): Promise<AccessControlSettings> {
  if (!auth.currentUser) return DEFAULT_ACCESS_CONTROL_SETTINGS;
  try {
    const accessDocRef = doc(db, SETTINGS_COLLECTION, ACCESS_CONTROL_DOC);
    const snap = await getDoc(accessDocRef);
    if (snap.exists()) {
      return { ...DEFAULT_ACCESS_CONTROL_SETTINGS, ...snap.data() } as AccessControlSettings;
    }
    return DEFAULT_ACCESS_CONTROL_SETTINGS;
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/${ACCESS_CONTROL_DOC}`);
    }
    console.warn('Could not read access_control settings from Firestore, using defaults:', err);
    return DEFAULT_ACCESS_CONTROL_SETTINGS;
  }
}

/**
 * Save / Update Access Control and Auto-Approval settings
 */
export async function saveAccessControlSettings(
  updates: Partial<AccessControlSettings>
): Promise<void> {
  try {
    const accessDocRef = doc(db, SETTINGS_COLLECTION, ACCESS_CONTROL_DOC);
    await setDoc(accessDocRef, stripUndefined({ ...DEFAULT_ACCESS_CONTROL_SETTINGS, ...updates }), {
      merge: true
    });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/${ACCESS_CONTROL_DOC}`);
    }
    console.error('Error updating access control settings in Firestore:', err);
    throw err;
  }
}

/**
 * Subscribe in real-time to access control settings
 */
export function subscribeToAccessControlSettings(
  onUpdate: (settings: AccessControlSettings) => void
): Unsubscribe {
  if (!auth.currentUser) return () => {};
  const accessDocRef = doc(db, SETTINGS_COLLECTION, ACCESS_CONTROL_DOC);
  return onSnapshot(
    accessDocRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ ...DEFAULT_ACCESS_CONTROL_SETTINGS, ...snap.data() } as AccessControlSettings);
      } else {
        onUpdate(DEFAULT_ACCESS_CONTROL_SETTINGS);
      }
    },
    (err) => {
      if (isPermissionDeniedError(err)) {
        handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/${ACCESS_CONTROL_DOC}`);
      }
      console.warn('Access control snapshot listener warning:', err);
      onUpdate(DEFAULT_ACCESS_CONTROL_SETTINGS);
    }
  );
}

/**
 * Sync logged-in user profile, check permissions and process Auto-Approval logic.
 */
export async function syncUserProfileAndCheckAccess(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<AppUser> {
  const userEmail = (user.email || '').toLowerCase().trim();
  const displayName = user.displayName || userEmail.split('@')[0] || 'Utilisateur';
  const now = new Date().toISOString();

  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  let existingUserSnap;
  try {
    existingUserSnap = await getDoc(userDocRef);
  } catch (e) {
    if (isPermissionDeniedError(e)) {
      handleFirestoreError(e, OperationType.GET, `${USERS_COLLECTION}/${user.uid}`);
    }
    console.warn('User doc get error:', e);
  }

  const settings = await getAccessControlSettings();
  const isVerifiedEmail = Boolean(auth.currentUser?.emailVerified);
  const isSuperAdmin =
    user.uid === SUPER_ADMIN_UID ||
    (userEmail === 'ops.manager.gops@gmail.com' && isVerifiedEmail);

  // If superadmin is logging in and access_control hasn't been persisted yet, seed it safely
  if (isSuperAdmin) {
    try {
      const accessSnap = await getDoc(doc(db, SETTINGS_COLLECTION, ACCESS_CONTROL_DOC));
      if (!accessSnap.exists()) {
        await setDoc(doc(db, SETTINGS_COLLECTION, ACCESS_CONTROL_DOC), stripUndefined(DEFAULT_ACCESS_CONTROL_SETTINGS));
      }
    } catch {
      // ignore non-critical seed error
    }
  }

  if (existingUserSnap && existingUserSnap.exists()) {
    const currentData = existingUserSnap.data() as AppUser;
    const finalRole: UserRole = isSuperAdmin ? 'admin' : currentData.role || 'viewer';
    const finalStatus: UserStatus = isSuperAdmin ? 'approved' : currentData.status || 'pending';

    const updatedUser: AppUser = {
      ...currentData,
      uid: user.uid,
      email: userEmail || currentData.email,
      displayName: displayName || currentData.displayName,
      ...(user.photoURL || currentData.photoURL ? { photoURL: user.photoURL || currentData.photoURL } : {}),
      role: finalRole,
      status: finalStatus,
      lastLoginAt: now
    };

    // Only update allowed safe fields (never write role/status on non-admin login)
    const loginPatch: Record<string, any> = {
      lastLoginAt: now,
      displayName: updatedUser.displayName
    };
    if (updatedUser.photoURL) {
      loginPatch.photoURL = updatedUser.photoURL;
    }
    if (isSuperAdmin) {
      loginPatch.role = finalRole;
      loginPatch.status = finalStatus;
    }

    setDoc(userDocRef, loginPatch, { merge: true }).catch((err) => {
      if (isPermissionDeniedError(err)) {
        handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${user.uid}`);
      }
    });

    return updatedUser;
  }

  // New user registration & Auto-Approval Evaluation
  let assignedRole: UserRole = 'viewer';
  let assignedStatus: UserStatus = 'pending';
  let approvedAt: string | undefined = undefined;
  let approvedBy: string | undefined = undefined;
  let assignedAgentId: string | undefined = undefined;
  let assignedAgentName: string | undefined = undefined;

  if (isSuperAdmin) {
    assignedRole = 'admin';
    assignedStatus = 'approved';
    approvedAt = now;
    approvedBy = 'system_super_admin';
  } else if (settings.autoApprovalEnabled) {
    // Only auto-assign non-admin default roles cleanly matching Firestore rules
    const safeDefaultRole: UserRole =
      settings.defaultRole === 'manager' || settings.defaultRole === 'viewer'
        ? settings.defaultRole
        : 'manager';
    assignedRole = safeDefaultRole;
    assignedStatus = 'approved';
    approvedAt = now;
    approvedBy = 'system_auto_approval';

    const preApproved = (settings.preApprovedEmails || []).find(
      (item) => item.email.toLowerCase() === userEmail
    );
    if (preApproved) {
      assignedAgentId = preApproved.agentId;
      assignedAgentName = preApproved.agentName;
    }
  }

  const newUser: AppUser = {
    uid: user.uid,
    email: userEmail,
    displayName,
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    role: assignedRole,
    status: assignedStatus,
    ...(assignedAgentId ? { agentId: assignedAgentId } : {}),
    ...(assignedAgentName ? { agentName: assignedAgentName } : {}),
    createdAt: now,
    lastLoginAt: now,
    ...(approvedAt ? { approvedAt } : {}),
    ...(approvedBy ? { approvedBy } : {})
  };

  try {
    await setDoc(userDocRef, stripUndefined(newUser));
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.CREATE, `${USERS_COLLECTION}/${user.uid}`);
    }
    console.warn('Could not save new user document to Firestore:', err);
  }

  return newUser;
}

/**
 * Subscribe in real-time to a specific user profile document
 */
export function subscribeToUserProfile(
  uid: string,
  onUpdate: (user: AppUser | null) => void
): Unsubscribe {
  if (!auth.currentUser) return () => {};
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ uid: snap.id, ...snap.data() } as AppUser);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      if (isPermissionDeniedError(err)) {
        handleFirestoreError(err, OperationType.GET, `${USERS_COLLECTION}/${uid}`);
      }
      console.warn('User profile snapshot error:', err);
    }
  );
}

/**
 * Fetch all registered users from Firestore
 */
export async function getAllUsersFromFirestore(): Promise<AppUser[]> {
  if (!auth.currentUser) return [];
  try {
    const usersCol = collection(db, USERS_COLLECTION);
    const snap = await getDocs(usersCol);
    const users: AppUser[] = [];
    snap.forEach((d) => {
      users.push({ uid: d.id, ...d.data() } as AppUser);
    });
    return users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.LIST, USERS_COLLECTION);
    }
    console.warn('Could not fetch all users from Firestore:', err);
    return [];
  }
}

/**
 * Real-time subscription to the entire users collection (for Admin Access Panel)
 */
export function subscribeToAllUsers(onUpdate: (users: AppUser[]) => void): Unsubscribe {
  if (!auth.currentUser) return () => {};
  const usersCol = collection(db, USERS_COLLECTION);
  return onSnapshot(
    usersCol,
    (snap) => {
      const users: AppUser[] = [];
      snap.forEach((d) => {
        users.push({ uid: d.id, ...d.data() } as AppUser);
      });
      users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(users);
    },
    (err) => {
      if (isPermissionDeniedError(err)) {
        handleFirestoreError(err, OperationType.LIST, USERS_COLLECTION);
      }
      console.warn('All users snapshot error:', err);
    }
  );
}

/**
 * Update user permissions / approval status in Firestore
 */
export async function updateUserAccessInFirestore(
  targetUid: string,
  updates: {
    role?: UserRole;
    status?: UserStatus;
    notes?: string;
    requestReason?: string;
    agentId?: string | null;
    agentName?: string | null;
  },
  adminIdentifier: string = 'Admin'
): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, targetUid);
    const payload: any = { ...stripUndefined(updates) };
    if (updates.status === 'approved') {
      payload.approvedAt = new Date().toISOString();
      payload.approvedBy = adminIdentifier;
    }
    await setDoc(userDocRef, payload, { merge: true });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${targetUid}`);
    }
    console.error(`Failed to update access for user ${targetUid}:`, err);
    throw err;
  }
}

/**
 * Delete a user profile from Firestore
 */
export async function deleteUserFromFirestore(targetUid: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, targetUid);
    await deleteDoc(userDocRef);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.DELETE, `${USERS_COLLECTION}/${targetUid}`);
    }
    console.error(`Failed to delete user ${targetUid}:`, err);
    throw err;
  }
}

/**
 * Add a pre-approved email invitation with designated role and optional associated agent
 */
export async function addPreApprovedEmailInFirestore(
  email: string,
  role: UserRole,
  adminEmail: string,
  agentId?: string,
  agentName?: string
): Promise<void> {
  const settings = await getAccessControlSettings();
  const cleanEmail = email.toLowerCase().trim();
  const currentList = settings.preApprovedEmails || [];

  const updatedList = [
    ...currentList.filter((item) => item.email.toLowerCase() !== cleanEmail),
    stripUndefined({
      email: cleanEmail,
      role,
      agentId: agentId || undefined,
      agentName: agentName || undefined,
      addedAt: new Date().toISOString(),
      addedBy: adminEmail
    }) as any
  ];

  await saveAccessControlSettings({ preApprovedEmails: updatedList });
}

/**
 * Remove a pre-approved email invitation
 */
export async function removePreApprovedEmailInFirestore(email: string): Promise<void> {
  const settings = await getAccessControlSettings();
  const cleanEmail = email.toLowerCase().trim();
  const currentList = settings.preApprovedEmails || [];

  const updatedList = currentList.filter((item) => item.email.toLowerCase() !== cleanEmail);
  await saveAccessControlSettings({ preApprovedEmails: updatedList });
}

// ==========================================
// SHIFT SWAP REQUESTS WORKFLOW & PERSISTENCE
// ==========================================

/**
 * Create a new shift swap request in Firestore
 */
export async function createSwapRequestInFirestore(
  requestData: Omit<ShiftSwapRequest, 'id'>
): Promise<string> {
  try {
    const swapCol = collection(db, SWAP_REQUESTS_COLLECTION);
    const newDocRef = doc(swapCol);
    const payload: ShiftSwapRequest = {
      id: newDocRef.id,
      ...requestData,
      createdAt: requestData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(newDocRef, stripUndefined(payload));
    return newDocRef.id;
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.CREATE, SWAP_REQUESTS_COLLECTION);
    }
    console.error('Failed to create shift swap request in Firestore:', err);
    throw err;
  }
}

/**
 * Subscribe in real-time to all shift swap requests
 */
export function subscribeToSwapRequests(onUpdate: (requests: ShiftSwapRequest[]) => void): Unsubscribe {
  if (!auth.currentUser) return () => {};
  const swapCol = collection(db, SWAP_REQUESTS_COLLECTION);
  return onSnapshot(
    swapCol,
    (snap) => {
      const list: ShiftSwapRequest[] = [];
      snap.forEach((d) => {
        const raw = d.data() || {};
        list.push({
          id: d.id,
          ...raw,
          dates: Array.isArray(raw.dates) ? raw.dates : raw.date ? [raw.date] : [],
          requesterShifts: raw.requesterShifts || {},
          targetShifts: raw.targetShifts || {}
        } as ShiftSwapRequest);
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (err) => {
      if (isPermissionDeniedError(err)) {
        handleFirestoreError(err, OperationType.LIST, SWAP_REQUESTS_COLLECTION);
      }
      console.warn('Swap requests snapshot listener error:', err);
    }
  );
}

/**
 * Target Agent responds to swap request: Accept -> pending_manager; Refuse -> rejected_by_target
 */
export async function respondToSwapRequestAsTarget(
  requestId: string,
  accepted: boolean,
  targetUser: AppUser
): Promise<void> {
  try {
    const swapDocRef = doc(db, SWAP_REQUESTS_COLLECTION, requestId);
    const now = new Date().toISOString();
    const updates: Partial<ShiftSwapRequest> = {
      status: accepted ? 'pending_manager' : 'rejected_by_target',
      targetDecisionAt: now,
      targetDecisionBy: targetUser.displayName || targetUser.agentName || targetUser.email,
      targetUid: targetUser.uid,
      targetEmail: targetUser.email,
      updatedAt: now
    };
    await setDoc(swapDocRef, stripUndefined(updates), { merge: true });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.UPDATE, `${SWAP_REQUESTS_COLLECTION}/${requestId}`);
    }
    console.error(`Failed to respond to swap request ${requestId} as target:`, err);
    throw err;
  }
}

/**
 * Manager approves or rejects the swap request.
 */
export async function respondToSwapRequestAsManager(
  requestId: string,
  approved: boolean,
  managerUser: AppUser,
  currentPlanning: Record<string, string>
): Promise<{ updatedPlanning?: Record<string, string> }> {
  try {
    const swapDocRef = doc(db, SWAP_REQUESTS_COLLECTION, requestId);
    const snap = await getDoc(swapDocRef);
    if (!snap.exists()) {
      throw new Error(`Demande d'échange ${requestId} introuvable`);
    }

    const swapData = snap.data() as ShiftSwapRequest;
    const now = new Date().toISOString();

    if (!approved) {
      await setDoc(
        swapDocRef,
        {
          status: 'rejected_by_manager',
          managerUid: managerUser.uid,
          managerEmail: managerUser.email,
          managerName: managerUser.displayName || managerUser.email,
          managerDecisionAt: now,
          updatedAt: now
        },
        { merge: true }
      );
      return {};
    }

    const updatedPlanning = { ...currentPlanning };
    const requesterId = swapData.requesterAgentId;
    const targetId = swapData.targetAgentId;

    swapData.dates.forEach((dateStr) => {
      const requesterKey = `${requesterId}_${dateStr}`;
      const targetKey = `${targetId}_${dateStr}`;

      const requesterShift = currentPlanning[requesterKey] ?? swapData.requesterShifts[dateStr] ?? '';
      const targetShift = currentPlanning[targetKey] ?? swapData.targetShifts[dateStr] ?? '';

      updatedPlanning[requesterKey] = targetShift;
      updatedPlanning[targetKey] = requesterShift;
    });

    await savePlanningToFirestore(updatedPlanning);

    await setDoc(
      swapDocRef,
      {
        status: 'approved',
        managerUid: managerUser.uid,
        managerEmail: managerUser.email,
        managerName: managerUser.displayName || managerUser.email,
        managerDecisionAt: now,
        updatedAt: now
      },
      { merge: true }
    );

    return { updatedPlanning };
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.UPDATE, `${SWAP_REQUESTS_COLLECTION}/${requestId}`);
    }
    console.error(`Failed to execute manager decision on swap ${requestId}:`, err);
    throw err;
  }
}

/**
 * Mark that the requesting agent has seen / acknowledged the outcome notification
 */
export async function acknowledgeSwapNotification(requestId: string): Promise<void> {
  try {
    const swapDocRef = doc(db, SWAP_REQUESTS_COLLECTION, requestId);
    await setDoc(
      swapDocRef,
      {
        requesterNotified: true,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.UPDATE, `${SWAP_REQUESTS_COLLECTION}/${requestId}`);
    }
    console.warn(`Failed to acknowledge swap notification ${requestId}:`, err);
  }
}

/**
 * Delete a swap request (admin/manager cleanup)
 */
export async function deleteSwapRequestInFirestore(requestId: string): Promise<void> {
  try {
    const swapDocRef = doc(db, SWAP_REQUESTS_COLLECTION, requestId);
    await deleteDoc(swapDocRef);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.DELETE, `${SWAP_REQUESTS_COLLECTION}/${requestId}`);
    }
    console.error(`Failed to delete swap request ${requestId}:`, err);
    throw err;
  }
}
