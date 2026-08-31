import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore,
  initializeFirestore,
  setLogLevel,
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
  query,
  where
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Agent, Shift, ApiToken, AppUser, UserRole, UserStatus, AccessControlSettings, PreApprovedEmail, ShiftSwapRequest, SwapRequestStatus } from './types';
import { API_IMPORTED_AGENTS, API_IMPORTED_SHIFTS, generateInitialSchedule } from './data/mockData';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Suppress internal stream recycling notices and debug logging
setLogLevel('silent');

if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (
      msg.includes('Disconnecting idle stream') ||
      msg.includes('Timed out waiting for new targets') ||
      msg.includes("GrpcConnection RPC 'Listen' stream")
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (
      msg.includes('Disconnecting idle stream') ||
      msg.includes('Timed out waiting for new targets') ||
      msg.includes("GrpcConnection RPC 'Listen' stream")
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

// Initialize Firestore with specific database ID from config if present
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || undefined;
export const db = firestoreDbId 
  ? getFirestore(app, firestoreDbId)
  : getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
 * Fetch all shifts directly from Firestore database ai-studio-05a03be6-da42-4223-bc36-3b30b710b29d
 */
export async function getShiftsFromFirestore(): Promise<Shift[]> {
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
    if (!loadedShifts.some(s => s.id === 'shift-repos-rh' || s.code?.toUpperCase() === 'RH')) {
      loadedShifts.push({ id: "shift-repos-rh", code: "RH", hours: "00:00 - 00:00", order: 19 });
    }
    if (!loadedShifts.some(s => s.id === 'shift-conge-ca' || s.code?.toUpperCase() === 'CA')) {
      loadedShifts.push({ id: "shift-conge-ca", code: "CA", hours: "00:00 - 00:00", order: 20 });
    }
    loadedShifts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return loadedShifts;
  } catch (err) {
    console.warn('Error fetching shifts from Firestore:', err);
    return API_IMPORTED_SHIFTS;
  }
}

/**
 * Real-time subscription to the shifts collection in Firestore (ai-studio-05a03be6-da42-4223-bc36-3b30b710b29d)
 */
export function subscribeToShifts(onUpdate: (shifts: Shift[]) => void): Unsubscribe {
  const shiftsCol = collection(db, SHIFTS_COLLECTION);
  return onSnapshot(
    shiftsCol,
    (snap) => {
      if (snap.empty) return;
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
      if (!loadedShifts.some(s => s.id === 'shift-repos-rh' || s.code?.toUpperCase() === 'RH')) {
        loadedShifts.push({ id: "shift-repos-rh", code: "RH", hours: "00:00 - 00:00", order: 19 });
      }
      if (!loadedShifts.some(s => s.id === 'shift-conge-ca' || s.code?.toUpperCase() === 'CA')) {
        loadedShifts.push({ id: "shift-conge-ca", code: "CA", hours: "00:00 - 00:00", order: 20 });
      }
      loadedShifts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      onUpdate(loadedShifts);
    },
    (err) => {
      console.warn('Real-time shifts subscription error:', err);
    }
  );
}

/**
 * Real-time subscription to the agents collection in Firestore
 */
export function subscribeToAgents(onUpdate: (agents: Agent[]) => void): Unsubscribe {
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
      console.warn('Real-time agents subscription error:', err);
    }
  );
}

/**
 * Real-time subscription to planning assignments in Firestore
 */
export function subscribeToPlanning(onUpdate: (planning: Record<string, string>) => void): Unsubscribe {
  const planningDocRef = doc(db, 'planning', 'current');
  return onSnapshot(
    planningDocRef,
    (snap) => {
      if (snap.exists() && snap.data()?.assignments) {
        onUpdate(snap.data().assignments);
      }
    },
    (err) => {
      console.warn('Real-time planning subscription error:', err);
    }
  );
}

/**
 * Initialize Firestore data and load from Firestore database ai-studio-05a03be6-da42-4223-bc36-3b30b710b29d
 */
export async function initializeFirestoreIfNeeded(): Promise<{
  agents: Agent[];
  shifts: Shift[];
  planning: Record<string, string>;
}> {
  try {
    const agentsCol = collection(db, AGENTS_COLLECTION);
    const shiftsCol = collection(db, SHIFTS_COLLECTION);

    const [agentsSnap, shiftsSnap] = await Promise.all([
      getDocs(agentsCol),
      getDocs(shiftsCol)
    ]);

    // Only seed initial default shifts if collection is genuinely empty in Firestore
    if (shiftsSnap.empty) {
      console.log('Seeding initial shifts to Firestore database...');
      const shiftsBatch = writeBatch(db);
      API_IMPORTED_SHIFTS.forEach(shift => {
        const ref = doc(db, SHIFTS_COLLECTION, shift.id);
        const { label, ...shiftData } = shift as any;
        shiftsBatch.set(ref, shiftData);
      });
      await shiftsBatch.commit().catch(e => console.warn('Could not seed initial shifts:', e));
    }

    // Only seed initial default agents if collection is genuinely empty in Firestore
    if (agentsSnap.empty) {
      console.log('Seeding initial agents to Firestore database...');
      const agentsBatch = writeBatch(db);
      API_IMPORTED_AGENTS.forEach(agent => {
        const ref = doc(db, AGENTS_COLLECTION, agent.id);
        agentsBatch.set(ref, agent);
      });
      await agentsBatch.commit().catch(e => console.warn('Could not seed initial agents:', e));
    }

    // Load agents from Firestore
    const refreshedAgentsSnap = agentsSnap.empty ? await getDocs(agentsCol) : agentsSnap;
    const agents: Agent[] = [];
    refreshedAgentsSnap.forEach(d => {
      agents.push({ id: d.id, ...d.data() } as Agent);
    });
    agents.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Load shifts from Firestore (guaranteeing it matches Firestore database ai-studio-05a03be6-da42-4223-bc36-3b30b710b29d)
    const refreshedShiftsSnap = shiftsSnap.empty ? await getDocs(shiftsCol) : shiftsSnap;
    const shifts: Shift[] = [];
    const seenShiftIds = new Set<string>();
    refreshedShiftsSnap.forEach(d => {
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

    // Ensure standard RH / CA rest shifts exist in the set
    if (!shifts.some(s => s.id === 'shift-repos-rh' || s.code?.toUpperCase() === 'RH')) {
      shifts.push({ id: "shift-repos-rh", code: "RH", hours: "00:00 - 00:00", order: 19 });
    }
    if (!shifts.some(s => s.id === 'shift-conge-ca' || s.code?.toUpperCase() === 'CA')) {
      shifts.push({ id: "shift-conge-ca", code: "CA", hours: "00:00 - 00:00", order: 20 });
    }
    shifts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    let planning: Record<string, string> = {};
    const planningSnap = await getDocs(collection(db, 'planning'));
    if (!planningSnap.empty) {
      const docData = planningSnap.docs.find(d => d.id === 'current');
      if (docData && docData.data().assignments) {
        planning = docData.data().assignments;
      }
    } else {
      // If planning is empty in Firestore, generate initial cycle
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
      planning = generateInitialSchedule(agents.length > 0 ? agents : API_IMPORTED_AGENTS, dateStrings);
      // Save initial planning to firestore
      const planningRef = doc(db, 'planning', 'current');
      setDoc(planningRef, {
        assignments: planning,
        updatedAt: new Date().toISOString()
      }).catch(e => console.warn('Could not auto-save initial planning to Firestore:', e));
    }

    return { agents: agents.length > 0 ? agents : API_IMPORTED_AGENTS, shifts, planning };
  } catch (error) {
    console.warn('Error reading from Firestore, falling back to local dataset:', error);
    return {
      agents: API_IMPORTED_AGENTS,
      shifts: API_IMPORTED_SHIFTS,
      planning: {}
    };
  }
}

/**
 * Reset all data in Firestore and replace with the imported API dataset
 */
export async function resetAllDataToFirestore(): Promise<{
  agents: Agent[];
  shifts: Shift[];
  planning: Record<string, string>;
}> {
  try {
    // 1. Clear any existing old documents
    const [existingAgents, existingShifts] = await Promise.all([
      getDocs(collection(db, AGENTS_COLLECTION)),
      getDocs(collection(db, SHIFTS_COLLECTION))
    ]);

    const deleteBatch = writeBatch(db);
    existingAgents.forEach(d => deleteBatch.delete(d.ref));
    existingShifts.forEach(d => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    // 2. Seed 26 Agents from live API
    const agentsBatch = writeBatch(db);
    API_IMPORTED_AGENTS.forEach(agent => {
      const ref = doc(db, AGENTS_COLLECTION, agent.id);
      agentsBatch.set(ref, agent);
    });
    await agentsBatch.commit();

    // 3. Seed 20 Shifts from live API
    const shiftsBatch = writeBatch(db);
    API_IMPORTED_SHIFTS.forEach(shift => {
      const ref = doc(db, SHIFTS_COLLECTION, shift.id);
      shiftsBatch.set(ref, shift);
    });
    await shiftsBatch.commit();

    // 4. Seed Planning with initial cycle
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

    const initPlanning = generateInitialSchedule(API_IMPORTED_AGENTS, dateStrings);
    const planningRef = doc(db, 'planning', 'current');
    await setDoc(planningRef, {
      assignments: initPlanning,
      updatedAt: new Date().toISOString()
    });

    console.log('Successfully initialized Firestore with live 26 agents & 20 shifts.');

    return {
      agents: API_IMPORTED_AGENTS,
      shifts: API_IMPORTED_SHIFTS,
      planning: initPlanning
    };
  } catch (err) {
    console.error('Failed to reset Firestore data:', err);
    return {
      agents: API_IMPORTED_AGENTS,
      shifts: API_IMPORTED_SHIFTS,
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
        batch.set(ref, {
          ...agent,
          order: idx + 1
        }, { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
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
    await setDoc(ref, agent);
  } catch (err) {
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
    await setDoc(ref, updates, { merge: true });
  } catch (err) {
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
        const { label, ...shiftData } = shift as any;
        batch.set(ref, {
          ...shiftData,
          order: idx
        }, { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
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
    const { label, ...shiftData } = shift as any;
    await setDoc(ref, shiftData);
  } catch (err) {
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
    const { label, ...shiftUpdates } = updates as any;
    await setDoc(ref, shiftUpdates, { merge: true });
  } catch (err) {
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
    console.error(`Error deleting shift ${id} from Firestore:`, err);
    throw err;
  }
}

// Debounced and serialized Firestore planning persistence to prevent write-stream exhaustion
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

  if (!pendingPlanningAssignments) {
    return;
  }

  if (isPlanningSaveInFlight) {
    // A write is already active; the finally block of the in-flight write will flush this pending state
    return;
  }

  const assignmentsToSave = { ...pendingPlanningAssignments };
  pendingPlanningAssignments = null;
  isPlanningSaveInFlight = true;

  try {
    const ref = doc(db, 'planning', 'current');
    await setDoc(ref, {
      assignments: assignmentsToSave,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err: any) {
    console.warn('Firestore planning sync throttled or transient error, scheduling retry:', err);
    // If write stream failed, re-queue assignments to avoid losing changes
    if (!pendingPlanningAssignments) {
      pendingPlanningAssignments = assignmentsToSave;
    }
  } finally {
    isPlanningSaveInFlight = false;
    // If new changes accumulated while the previous write was in flight, schedule next flush
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
 * Avoids exhausting the Firestore WriteStream queue on rapid cell edits, dragging, or pasting.
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

// Auto-flush pending writes when tab unloads / window closes
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingPlanningAssignments && !isPlanningSaveInFlight) {
      const assignments = pendingPlanningAssignments;
      pendingPlanningAssignments = null;
      try {
        const ref = doc(db, 'planning', 'current');
        setDoc(ref, {
          assignments,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
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
  try {
    const tokensCol = collection(db, API_TOKENS_COLLECTION);
    const snap = await getDocs(tokensCol);
    if (snap.empty) {
      // Initialize with default master token
      const defToken = DEFAULT_MASTER_API_TOKEN;
      await setDoc(doc(db, API_TOKENS_COLLECTION, defToken.id), defToken);
      return [defToken];
    }
    const tokens: ApiToken[] = [];
    snap.forEach(d => {
      tokens.push({ id: d.id, ...d.data() } as ApiToken);
    });
    return tokens.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
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
    // Generate secure randomized token format: cortex_live_sec_<32 hex chars>
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
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
      expiresAt: expiresAt || undefined,
      isActive: true
    };

    const ref = doc(db, API_TOKENS_COLLECTION, id);
    await setDoc(ref, newToken);
    return newToken;
  } catch (err) {
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
 * Fetch the Access Control and Auto-Approval settings from Firestore
 */
export async function getAccessControlSettings(): Promise<AccessControlSettings> {
  try {
    const accessDocRef = doc(db, SETTINGS_COLLECTION, ACCESS_CONTROL_DOC);
    const snap = await getDoc(accessDocRef);
    if (snap.exists()) {
      return { ...DEFAULT_ACCESS_CONTROL_SETTINGS, ...snap.data() } as AccessControlSettings;
    }
    // Seed default settings into Firestore
    await setDoc(accessDocRef, DEFAULT_ACCESS_CONTROL_SETTINGS);
    return DEFAULT_ACCESS_CONTROL_SETTINGS;
  } catch (err) {
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
    await setDoc(accessDocRef, updates, { merge: true });
  } catch (err) {
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
    console.warn('User doc get error:', e);
  }

  // Load access control settings
  const settings = await getAccessControlSettings();

  // Determine if this user is a super admin
  const isSuperAdmin =
    user.uid === SUPER_ADMIN_UID ||
    (user.uid && user.uid.startsWith('demo-manager')) ||
    (userEmail && (settings.adminEmails || []).map(e => e.toLowerCase()).includes(userEmail)) ||
    (userEmail && userEmail.includes('admin'));

  if (existingUserSnap && existingUserSnap.exists()) {
    const currentData = existingUserSnap.data() as AppUser;

    // Super admin override if needed
    const finalRole: UserRole = isSuperAdmin ? 'admin' : (currentData.role || 'viewer');
    const finalStatus: UserStatus = isSuperAdmin ? 'approved' : (currentData.status || 'pending');

    const updatedUser: AppUser = {
      ...currentData,
      uid: user.uid,
      email: userEmail || currentData.email,
      displayName: displayName || currentData.displayName,
      photoURL: user.photoURL || currentData.photoURL,
      role: finalRole,
      status: finalStatus,
      lastLoginAt: now
    };

    // Update lastLoginAt non-blockingly
    setDoc(userDocRef, {
      lastLoginAt: now,
      displayName: updatedUser.displayName,
      photoURL: updatedUser.photoURL,
      role: finalRole,
      status: finalStatus
    }, { merge: true }).catch(() => {});

    return updatedUser;
  }

  // New user registration & Auto-Approval Evaluation
  let assignedRole: UserRole = settings.defaultRole || 'manager';
  let assignedStatus: UserStatus = 'pending';
  let approvedAt: string | undefined = undefined;
  let approvedBy: string | undefined = undefined;
  let assignedAgentId: string | undefined = undefined;
  let assignedAgentName: string | undefined = undefined;

  // 1. Check Super Admin
  if (isSuperAdmin) {
    assignedRole = 'admin';
    assignedStatus = 'approved';
    approvedAt = now;
    approvedBy = 'system_super_admin';
  } 
  // 2. Check Pre-approved / Whitelisted emails
  else if (
    userEmail &&
    (settings.preApprovedEmails || []).some(
      (item) => item.email.toLowerCase() === userEmail
    )
  ) {
    const preApproved = (settings.preApprovedEmails || []).find(
      (item) => item.email.toLowerCase() === userEmail
    );
    assignedRole = preApproved?.role || settings.defaultRole || 'manager';
    assignedStatus = 'approved';
    approvedAt = now;
    approvedBy = `pre_approved_by_${preApproved?.addedBy || 'admin'}`;
    assignedAgentId = preApproved?.agentId;
    assignedAgentName = preApproved?.agentName;
  }
  // 3. Check Domain Whitelist
  else if (
    userEmail &&
    (settings.allowedDomains || []).length > 0 &&
    settings.allowedDomains.some((d) => {
      const cleanDomain = d.trim().toLowerCase();
      return userEmail.endsWith(cleanDomain.startsWith('@') ? cleanDomain : `@${cleanDomain}`);
    })
  ) {
    assignedRole = settings.defaultRole || 'manager';
    assignedStatus = 'approved';
    approvedAt = now;
    approvedBy = 'system_domain_whitelist';
  }
  // 4. Check Global Auto-Approval switch
  else if (settings.autoApprovalEnabled) {
    assignedRole = settings.defaultRole || 'manager';
    assignedStatus = 'approved';
    approvedAt = now;
    approvedBy = 'system_auto_approval';
  }

  const newUser: AppUser = {
    uid: user.uid,
    email: userEmail,
    displayName,
    photoURL: user.photoURL || undefined,
    role: assignedRole,
    status: assignedStatus,
    agentId: assignedAgentId,
    agentName: assignedAgentName,
    createdAt: now,
    lastLoginAt: now,
    approvedAt,
    approvedBy
  };

  try {
    await setDoc(userDocRef, newUser);
  } catch (err) {
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
      console.warn('User profile snapshot error:', err);
    }
  );
}

/**
 * Fetch all registered users from Firestore
 */
export async function getAllUsersFromFirestore(): Promise<AppUser[]> {
  try {
    const usersCol = collection(db, USERS_COLLECTION);
    const snap = await getDocs(usersCol);
    const users: AppUser[] = [];
    snap.forEach((d) => {
      users.push({ uid: d.id, ...d.data() } as AppUser);
    });
    return users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (err) {
    console.warn('Could not fetch all users from Firestore:', err);
    return [];
  }
}

/**
 * Real-time subscription to the entire users collection (for Admin Access Panel)
 */
export function subscribeToAllUsers(
  onUpdate: (users: AppUser[]) => void
): Unsubscribe {
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
      console.warn('All users snapshot error:', err);
    }
  );
}

/**
 * Update user permissions / approval status in Firestore (Admin action)
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
    const payload: any = { ...updates };
    if (updates.status === 'approved') {
      payload.approvedAt = new Date().toISOString();
      payload.approvedBy = adminIdentifier;
    }
    await setDoc(userDocRef, payload, { merge: true });
  } catch (err) {
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
    {
      email: cleanEmail,
      role,
      agentId: agentId || undefined,
      agentName: agentName || undefined,
      addedAt: new Date().toISOString(),
      addedBy: adminEmail
    }
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
    await setDoc(newDocRef, payload);
    return newDocRef.id;
  } catch (err) {
    console.error('Failed to create shift swap request in Firestore:', err);
    throw err;
  }
}

/**
 * Subscribe in real-time to all shift swap requests
 */
export function subscribeToSwapRequests(
  onUpdate: (requests: ShiftSwapRequest[]) => void
): Unsubscribe {
  const swapCol = collection(db, SWAP_REQUESTS_COLLECTION);
  return onSnapshot(
    swapCol,
    (snap) => {
      const list: ShiftSwapRequest[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ShiftSwapRequest);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('Swap requests snapshot listener error:', err);
    }
  );
}

/**
 * Target Agent responds to swap request: Accept -> moves to pending_manager; Refuse -> rejected_by_target
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
    await setDoc(swapDocRef, updates, { merge: true });
  } catch (err) {
    console.error(`Failed to respond to swap request ${requestId} as target:`, err);
    throw err;
  }
}

/**
 * Manager approves or rejects the swap request.
 * If approved: Automatically performs the shift swap in the Firestore planning document!
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
      // Manager rejected
      await setDoc(swapDocRef, {
        status: 'rejected_by_manager',
        managerUid: managerUser.uid,
        managerEmail: managerUser.email,
        managerName: managerUser.displayName || managerUser.email,
        managerDecisionAt: now,
        updatedAt: now
      }, { merge: true });
      return {};
    }

    // Manager approved -> Execute atomic shift swap on currentPlanning in Firestore
    const updatedPlanning = { ...currentPlanning };
    const requesterId = swapData.requesterAgentId;
    const targetId = swapData.targetAgentId;

    swapData.dates.forEach((dateStr) => {
      const requesterKey = `${requesterId}_${dateStr}`;
      const targetKey = `${targetId}_${dateStr}`;

      const requesterShift = currentPlanning[requesterKey] ?? swapData.requesterShifts[dateStr] ?? '';
      const targetShift = currentPlanning[targetKey] ?? swapData.targetShifts[dateStr] ?? '';

      // Invert shifts
      updatedPlanning[requesterKey] = targetShift;
      updatedPlanning[targetKey] = requesterShift;
    });

    // Save updated planning to Firestore
    await savePlanningToFirestore(updatedPlanning);

    // Mark swap request approved
    await setDoc(swapDocRef, {
      status: 'approved',
      managerUid: managerUser.uid,
      managerEmail: managerUser.email,
      managerName: managerUser.displayName || managerUser.email,
      managerDecisionAt: now,
      updatedAt: now
    }, { merge: true });

    return { updatedPlanning };
  } catch (err) {
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
    await setDoc(swapDocRef, {
      requesterNotified: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
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
    console.error(`Failed to delete swap request ${requestId}:`, err);
    throw err;
  }
}



