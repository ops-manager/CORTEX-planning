import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  writeBatch
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
import { Agent, Shift, ApiToken } from './types';
import { API_IMPORTED_AGENTS, API_IMPORTED_SHIFTS, generateInitialSchedule } from './data/mockData';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with specific database ID from config if present
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
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
 * Initialize Firestore data if empty or on initial reset
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

    // If Firestore is empty or contains old outdated small test data (< 5 agents), reset with full API dataset
    if (agentsSnap.empty || shiftsSnap.empty || agentsSnap.size < 5) {
      console.log('Initializing Firestore with full live API dataset (26 agents, 20 shifts)...');
      return await resetAllDataToFirestore();
    }

    const agents: Agent[] = [];
    agentsSnap.forEach(d => {
      agents.push({ id: d.id, ...d.data() } as Agent);
    });
    agents.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const shifts: Shift[] = [];
    const seenShiftIds = new Set<string>();
    shiftsSnap.forEach(d => {
      const data = d.data();
      const { label, ...rest } = data as any;
      const shiftId = d.id;
      if (!seenShiftIds.has(shiftId)) {
        seenShiftIds.add(shiftId);
        shifts.push({ id: shiftId, ...rest } as Shift);
      }
    });
    // Add standard RH / CA rest shifts if not present in database
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
      planning = generateInitialSchedule(agents, dateStrings);
      // Save initial planning to firestore
      const planningRef = doc(db, 'planning', 'current');
      setDoc(planningRef, {
        assignments: planning,
        updatedAt: new Date().toISOString()
      }).catch(e => console.warn('Could not auto-save initial planning to Firestore:', e));
    }

    return { agents, shifts, planning };
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

