import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface Agent {
  id: string;
  name: string;
  station: string;
  team: string;
  defaultMissionId?: string;
  order: number;
  ownerId?: string;
  code?: string;
}

interface Shift {
  id: string;
  code: string;
  hours: string;
  defaultMissionId?: string;
  defaultPause?: string;
  order: number;
  ownerId?: string;
  label?: string;
  color?: string;
}

interface ApiToken {
  id: string;
  name: string;
  token: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  createdBy?: string;
  expiresAt?: string;
  isActive: boolean;
}

const DEFAULT_MASTER_TOKEN: ApiToken = {
  id: "token_default_master",
  name: "Default Production Key",
  token: "cortex_live_sec_9e7a4b82d1c3",
  prefix: "cortex_live_sec_9e7...",
  createdAt: "2026-08-30T00:00:00.000Z",
  createdBy: "System Admin",
  isActive: true
};

// Live dataset imported from https://dispatch-ops.ai.studio/api/agents
const defaultAgents: Agent[] = [
  { id: "48Y6YQBfczVLqA9qsDq5", code: "N/A", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Ahmed", station: "ABN", order: 0, team: "Paris", defaultMissionId: "" },
  { id: "8FQF9jq4AfFGFWskIKvh", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Coline", station: "CC", order: 1, team: "Paris", defaultMissionId: "" },
  { id: "o3GnbvINA3CqIZe6OisA", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Adam", station: "AME", order: 2, team: "Paris", defaultMissionId: "" },
  { id: "9pSZsdqh08NeZ9UQ0chJ", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Amira", station: "AD", order: 3, team: "Paris", defaultMissionId: "" },
  { id: "AbYxB1oNTwBblIaYhHes", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Amin", station: "AO", order: 4, team: "Paris", defaultMissionId: "" },
  { id: "EWe8yuLNVkN4ROfP1baK", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Océane", station: "OT", order: 6, team: "Paris", defaultMissionId: "" },
  { id: "IUFiHbVPLh7pvtQzwTlO", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Éléonore", station: "EL", order: 7, defaultMissionId: "ey7PzbgV54Y4fJhBXrEq", team: "Paris" },
  { id: "KIrV9VL5v2NoEpGhLK7Z", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", station: "RC", name: "Romain", order: 8, team: "Paris", defaultMissionId: "" },
  { id: "NeCWYNEIvNOoUJ9TbG54", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Richard", station: "RD", defaultMissionId: "HDaUU0HGhOzZdwuJMQG4", order: 9, team: "Paris" },
  { id: "NppxcVp4SND3oCyqdZPI", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Élodie", station: "EV", defaultMissionId: "cUH8UM9ZSfBidoZt5dxc", order: 10, team: "Paris" },
  { id: "Pj8hTxkguVRWHyy22LTM", code: "N/A", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Jessy", station: "JS", order: 11, team: "Paris", defaultMissionId: "" },
  { id: "UwjPL3HiQ3DEvKZU8YIa", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", name: "Yosra", station: "YD", defaultMissionId: "cUH8UM9ZSfBidoZt5dxc", order: 12, team: "Paris" },
  { id: "ywT65mctUCOFgcFmeHYM", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 13, name: "Youssef", station: "YE", defaultMissionId: "p4PPae3hEluY3kNpMmK8", team: "Paris" },
  { id: "yFA7e0oEA5nqe6uHUZPB", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 14, name: "Roshan", station: "RCH", defaultMissionId: "p4PPae3hEluY3kNpMmK8", team: "Paris" },
  { id: "Pv8pSXN1d4jypx2yuvtH", defaultMissionId: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 17, name: "Coralie", station: "COH", team: "Paris" },
  { id: "baeo0POVhkdaEih8oFuR", defaultMissionId: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 18, name: "Nizar", station: "NF", team: "Paris" },
  { id: "AxKOCN4fhlJrhCynZ4QS", defaultMissionId: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 19, name: "Yasmine", station: "YL", team: "Paris" },
  { id: "KE6OfnvCkT70RzKg2iYE", team: "Paris", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 26, name: "Chakib", station: "CHB", defaultMissionId: "p4PPae3hEluY3kNpMmK8" },
  { id: "OsTOooSX9x6aKJB9XY3o", defaultMissionId: "", team: "Paris", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 27, name: "Nicolas", station: "NME" },
  { id: "C6aluUe2tlhlKh8fYKy6", team: "Paris", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 28, name: "Samantha", station: "SSA", defaultMissionId: "p4PPae3hEluY3kNpMmK8" },
  { id: "8saImrVI56R5HggPVEGq", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 20, name: "Nairie", station: "NB", team: "Nice", defaultMissionId: "cUH8UM9ZSfBidoZt5dxc" },
  { id: "b70RZpSk5LjEZfVxoIZf", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 21, name: "Emilien", station: "EO", team: "Nice", defaultMissionId: "p4PPae3hEluY3kNpMmK8" },
  { id: "6wr3vJfFb0ZHIJjPPt1l", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 22, name: "Naim", station: "NBH", team: "Nice", defaultMissionId: "p4PPae3hEluY3kNpMmK8" },
  { id: "ik8eGfzpSYf4iJGIHELR", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 23, name: "Vasile", station: "VST", team: "Nice", defaultMissionId: "p4PPae3hEluY3kNpMmK8" },
  { id: "IuePAkwySTnMJrcm45Oc", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 24, name: "Chloé", station: "CH", team: "Nice", defaultMissionId: "p4PPae3hEluY3kNpMmK8" },
  { id: "VQwpxlcqeyaLkQlmRRwZ", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", order: 25, name: "Christian", station: "CZ", team: "Nice", defaultMissionId: "p4PPae3hEluY3kNpMmK8" }
];

// Live dataset imported from https://dispatch-ops.ai.studio/api/shifts
const defaultShifts: Shift[] = [
  { id: "BqyY66YgVtPQPGGsUmX3", defaultMissionId: "", defaultPause: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "04:30 - 14:00", code: "M1a", order: 0 },
  { id: "GEpJXxHhQqcMz1F48Djn", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", code: "M1", hours: "05:00 - 14:30", defaultMissionId: "", defaultPause: "09:00", order: 1 },
  { id: "KSxdHzdODj58vEdxbOEY", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", code: "M2", hours: "06:00 - 15:30", defaultMissionId: "", defaultPause: "10:00", order: 2 },
  { id: "WsFQUrR8nq9O8b7pz8ph", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", code: "M3", hours: "07:00 - 16:30", defaultMissionId: "", defaultPause: "11:00", order: 3 },
  { id: "EjoDQeiPBmiwkKNav7EO", hours: "08:00 - 16:00", defaultMissionId: "", defaultPause: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", code: "M", order: 4 },
  { id: "X87zBEuRF5JZy0Bl8BFp", defaultMissionId: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "08:00 - 16:30", code: "M3h", defaultPause: "13:30", order: 5 },
  { id: "xvey29FtMXxKxDokQRS7", defaultMissionId: "", defaultPause: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "08:00 - 17:30", code: "M4", order: 6 },
  { id: "oEpuZ3tgiuzxXvvLnfXc", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "09:00 - 17:00", code: "J", defaultPause: "12:00", defaultMissionId: "", order: 7 },
  { id: "fJq5rj715ioTplzZQMfl", defaultMissionId: "", defaultPause: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "09:00 - 17:30", code: "J1h", order: 8 },
  { id: "40oSGJ7zXP7xcFMa34rq", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", code: "J1", defaultMissionId: "", hours: "09:00 - 18:30", defaultPause: "12:30", order: 9 },
  { id: "CKBXf36Rf3Ne3z2HwS5j", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", code: "J2", hours: "07:00 - 18:30", defaultMissionId: "", defaultPause: "11:30", order: 10 },
  { id: "2zu2Jyn1qlSJAB7SSJyZ", defaultMissionId: "", defaultPause: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "11:00 - 19:30", code: "S2h", order: 11 },
  { id: "L86LlyzlK7kR4XOrxy9D", defaultMissionId: "", defaultPause: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "11:00 - 20:30", code: "S2b", order: 12 },
  { id: "t7gRsZ6CgyHacgGvMRbt", defaultMissionId: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "12:00 - 20:00", code: "S", defaultPause: "17:30", order: 13 },
  { id: "NgHcfkmnqjtOyrC5UgDN", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", code: "S2", hours: "12:00 - 21:30", defaultMissionId: "", defaultPause: "18:00", order: 14 },
  { id: "D4v2LI7jZegXF0dbhen4", defaultMissionId: "", defaultPause: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "13:00 - 22:30", code: "S4", order: 15 },
  { id: "J0LylrCesbXJX3DGoX6k", code: "S1", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "14:00 - 23:30", defaultMissionId: "", defaultPause: "20:00", order: 16 },
  { id: "glcvJIYK6IbSulxE0yTt", defaultMissionId: "", defaultPause: "", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", hours: "15:00 - 00:00", code: "S3a", order: 17 },
  { id: "cWc8Ax89pIv7kGtfes8k", ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2", code: "S3", hours: "16:00 - 01:00", defaultMissionId: "", defaultPause: "21:00", order: 18 },
  { id: "shift-repos-rh", code: "RH", hours: "00:00 - 00:00", order: 19 },
  { id: "shift-conge-ca", code: "CA", hours: "00:00 - 00:00", order: 20 }
];

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase in server using existing database ai-studio-05a03be6-da42-4223-bc36-3b30b710b29d
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const firestoreDb = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

let agentsState: Agent[] = [...defaultAgents];
let shiftsState: Shift[] = [...defaultShifts];
let planningState: Record<string, string> = {};
let apiTokensState: ApiToken[] = [DEFAULT_MASTER_TOKEN];

// Load agents, shifts, planning and API tokens directly from Firestore
async function loadFromFirestore() {
  try {
    const [agentsSnap, shiftsSnap, planningSnap, tokensSnap] = await Promise.all([
      getDocs(collection(firestoreDb, 'agents')),
      getDocs(collection(firestoreDb, 'shifts')),
      getDocs(collection(firestoreDb, 'planning')),
      getDocs(collection(firestoreDb, 'api_tokens'))
    ]);

    if (!agentsSnap.empty) {
      const loadedAgents: Agent[] = [];
      agentsSnap.forEach(d => {
        loadedAgents.push({ id: d.id, ...d.data() } as Agent);
      });
      loadedAgents.sort((a, b) => (a.order || 0) - (b.order || 0));
      agentsState = loadedAgents;
    }

    if (!shiftsSnap.empty) {
      const loadedShifts: Shift[] = [];
      const seenShiftIds = new Set<string>();
      shiftsSnap.forEach(d => {
        const data = d.data();
        const { label, ...rest } = data as any;
        const shiftId = d.id;
        if (!seenShiftIds.has(shiftId)) {
          seenShiftIds.add(shiftId);
          loadedShifts.push({ id: shiftId, ...rest } as Shift);
        }
      });
      if (!loadedShifts.some(s => s.id === 'shift-repos-rh' || s.code?.toUpperCase() === 'RH')) {
        loadedShifts.push({ id: "shift-repos-rh", code: "RH", hours: "00:00 - 00:00", order: 19 });
      }
      if (!loadedShifts.some(s => s.id === 'shift-conge-ca' || s.code?.toUpperCase() === 'CA')) {
        loadedShifts.push({ id: "shift-conge-ca", code: "CA", hours: "00:00 - 00:00", order: 20 });
      }
      loadedShifts.sort((a, b) => (a.order || 0) - (b.order || 0));
      shiftsState = loadedShifts;
    }

    if (!planningSnap.empty) {
      const docData = planningSnap.docs.find(d => d.id === 'current');
      if (docData && docData.data().assignments) {
        planningState = docData.data().assignments;
      }
    }

    if (!tokensSnap.empty) {
      const loadedTokens: ApiToken[] = [];
      tokensSnap.forEach(d => {
        loadedTokens.push({ id: d.id, ...d.data() } as ApiToken);
      });
      apiTokensState = loadedTokens;
    } else {
      // Seed initial default master token
      try {
        await setDoc(doc(firestoreDb, 'api_tokens', DEFAULT_MASTER_TOKEN.id), DEFAULT_MASTER_TOKEN);
        apiTokensState = [DEFAULT_MASTER_TOKEN];
      } catch (err) {
        console.warn('Could not seed default master token to Firestore:', err);
      }
    }
  } catch (err) {
    console.warn(`Could not load from Firestore database ${firebaseConfig.firestoreDatabaseId}, using memory cache:`, err);
  }
}

/**
 * Token Validation Helper
 */
function extractAndValidateToken(req: express.Request): { valid: boolean; tokenObj?: ApiToken; error?: string } {
  let rawToken: string | undefined;

  // 1. Authorization header: "Bearer <token>" or "<token>"
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      rawToken = authHeader.substring(7).trim();
    } else {
      rawToken = authHeader.trim();
    }
  }

  // 2. Custom header: x-api-key or x-cortex-token
  if (!rawToken) {
    rawToken = (req.headers["x-api-key"] || req.headers["x-cortex-token"]) as string | undefined;
  }

  // 3. Query params: ?apiKey=<token> or ?token=<token> or ?api_key=<token>
  if (!rawToken) {
    rawToken = (req.query.apiKey || req.query.token || req.query.api_key) as string | undefined;
  }

  if (!rawToken || rawToken.trim() === "") {
    return { valid: false, error: "Jeton API manquant (Missing API token)" };
  }

  const cleanToken = rawToken.trim();

  // Check master token from env if set
  const envToken = process.env.CORTEX_API_TOKEN || process.env.API_SECRET_TOKEN;
  if (envToken && cleanToken === envToken.trim()) {
    return {
      valid: true,
      tokenObj: {
        id: "token_env_master",
        name: "Environment Master Key",
        token: envToken,
        prefix: envToken.substring(0, 15) + "...",
        createdAt: new Date().toISOString(),
        isActive: true
      }
    };
  }

  // Match against loaded tokens in apiTokensState
  const matched = apiTokensState.find(t => t.token === cleanToken);
  if (!matched) {
    // Fallback: check DEFAULT_MASTER_TOKEN
    if (cleanToken === DEFAULT_MASTER_TOKEN.token) {
      return { valid: true, tokenObj: DEFAULT_MASTER_TOKEN };
    }
    return { valid: false, error: "Jeton API invalide ou non reconnu" };
  }

  if (!matched.isActive) {
    return { valid: false, error: "Ce jeton API est désactivé ou révoqué" };
  }

  if (matched.expiresAt && new Date(matched.expiresAt).getTime() < Date.now()) {
    return { valid: false, error: "Ce jeton API a expiré" };
  }

  // Update lastUsedAt in memory & Firestore
  matched.lastUsedAt = new Date().toISOString();
  setDoc(doc(firestoreDb, 'api_tokens', matched.id), { lastUsedAt: matched.lastUsedAt }, { merge: true }).catch(() => {});

  return { valid: true, tokenObj: matched };
}

/**
 * Express Middleware to require API Token Authentication
 */
const requireApiAuth: express.RequestHandler = (req, res, next) => {
  const validation = extractAndValidateToken(req);
  if (!validation.valid) {
    return res.status(401).json({
      error: "Unauthorized",
      status: 401,
      message: "Accès refusé. Veuillez fournir un token API valide via l'en-tête 'Authorization: Bearer <TOKEN>', l'en-tête 'x-api-key: <TOKEN>', ou le paramètre d'URL '?apiKey=<TOKEN>'.",
      reason: validation.error,
      help: "Générez ou récupérez vos clés d'API dans l'application CORTEX Planning (Menu Extraction & API > Clés API)."
    });
  }
  (req as any).apiToken = validation.tokenObj;
  next();
};

/**
 * Normalizes input date strings (e.g. "2026-08-25", "25/08/2026", "today") to standard "YYYY-MM-DD"
 */
function normalizeDateParam(input?: string): string {
  const now = new Date();
  if (!input || input.trim() === "" || input.toLowerCase() === "today" || input.toLowerCase() === "ajourdhui") {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const clean = input.trim();

  // Check YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, "0");
    const dd = ymdMatch[3].padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Check DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, "0");
    const mm = dmyMatch[2].padStart(2, "0");
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback to today
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const FRENCH_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/**
 * Builds full daily assignments report for a specific date
 */
function buildDailyAssignmentsReport(
  dateStr: string,
  options?: { team?: string; station?: string }
) {
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  const targetDate = new Date(yyyy, mm - 1, dd);
  const dayName = FRENCH_DAYS[targetDate.getDay()] || "Inconnu";

  // Build shift dictionary for quick lookup
  const shiftByCode = new Map<string, Shift>();
  shiftsState.forEach(s => {
    if (s.code) {
      shiftByCode.set(s.code.toLowerCase(), s);
    }
  });

  // Filter agents if specified
  let targetAgents = [...agentsState];
  if (options?.team) {
    const teamFilter = options.team.toLowerCase().trim();
    targetAgents = targetAgents.filter(a => (a.team || "").toLowerCase() === teamFilter);
  }
  if (options?.station) {
    const stationFilter = options.station.toLowerCase().trim();
    targetAgents = targetAgents.filter(a => (a.station || "").toLowerCase() === stationFilter);
  }

  let totalAssigned = 0;
  let totalWorking = 0;
  let totalOff = 0;
  const shiftCounts: Record<string, number> = {};
  const compactMap: Record<string, string> = {};

  const assignments = targetAgents.map(agent => {
    const key = `${agent.id}_${dateStr}`;
    const shiftCode = planningState[key] || "";

    if (shiftCode) {
      totalAssigned++;
      shiftCounts[shiftCode] = (shiftCounts[shiftCode] || 0) + 1;
      compactMap[agent.name] = shiftCode;
    } else {
      compactMap[agent.name] = "";
    }

    const shiftMeta = shiftByCode.get(shiftCode.toLowerCase());
    const isOffCode = ["OFF", "RH", "CA", "CP", "RC", "R", "ABS", "MAL"].includes(shiftCode.toUpperCase()) ||
      (shiftMeta?.hours === "00:00 - 00:00");

    if (shiftCode) {
      if (isOffCode) {
        totalOff++;
      } else {
        totalWorking++;
      }
    }

    let startTime = "";
    let endTime = "";
    if (shiftMeta?.hours && shiftMeta.hours.includes("-")) {
      const parts = shiftMeta.hours.split("-").map(p => p.trim());
      startTime = parts[0] || "";
      endTime = parts[1] || "";
    }

    return {
      agentId: agent.id,
      agentName: agent.name,
      station: agent.station || "",
      team: agent.team || "",
      order: agent.order ?? 0,
      shiftCode: shiftCode,
      shiftLabel: shiftMeta?.label || (shiftCode ? shiftCode : "Non assigné"),
      hours: shiftMeta?.hours || (isOffCode ? "00:00 - 00:00" : ""),
      startTime,
      endTime,
      defaultPause: shiftMeta?.defaultPause || "",
      isOff: isOffCode
    };
  });

  return {
    date: dateStr,
    dayName,
    isoTimestamp: targetDate.toISOString(),
    totalAgents: targetAgents.length,
    totalAssigned,
    totalWorking,
    totalOff,
    shiftCounts,
    compact: compactMap,
    assignments
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS Headers for seamless integration with external apps
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json());

  // Trigger non-blocking Firestore sync at server start
  loadFromFirestore();

  // 1. Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      agentsCount: agentsState.length, 
      shiftsCount: shiftsState.length, 
      assignmentsCount: Object.keys(planningState).length 
    });
  });

  // 2. Fetch Daily Shift Assignments (PRIMARY ENDPOINT requested by user)
  // Supports: /api/shifts/daily?date=2026-08-25, /api/planning/daily, /api/planning/date/:date
  const handleDailyShiftRequest = async (req: express.Request, res: express.Response) => {
    try {
      // Refresh planning state from Firestore if available
      await loadFromFirestore();

      const rawDate = (req.params.date || req.query.date || req.query.d) as string | undefined;
      const dateStr = normalizeDateParam(rawDate);
      const team = req.query.team as string | undefined;
      const station = req.query.station as string | undefined;
      const format = (req.query.format as string || "json").toLowerCase();

      const report = buildDailyAssignmentsReport(dateStr, { team, station });

      if (format === "compact") {
        return res.json({
          date: report.date,
          dayName: report.dayName,
          assignments: report.compact
        });
      }

      if (format === "csv") {
        const csvHeader = "ID Agent;Nom Agent;Equipe;Station;Date;Code Shift;Horaires;Pause;Statut\n";
        const csvRows = report.assignments.map(a => 
          `"${a.agentId}";"${a.agentName}";"${a.team}";"${a.station}";"${report.date}";"${a.shiftCode}";"${a.hours}";"${a.defaultPause}";"${a.isOff ? 'Repos/Congé' : 'Actif'}"`
        ).join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="cortex-shifts-${dateStr}.csv"`);
        return res.send(csvHeader + csvRows);
      }

      return res.json(report);
    } catch (err: any) {
      console.error("Error generating daily shift report:", err);
      res.status(500).json({ error: err.message || "Failed to fetch daily shifts" });
    }
  };

  // Main daily routes (Secured with API Token)
  app.get("/api/shifts/daily", requireApiAuth, handleDailyShiftRequest);
  app.get("/api/planning/daily", requireApiAuth, handleDailyShiftRequest);
  app.get("/api/planning/date/:date", requireApiAuth, handleDailyShiftRequest);
  app.get("/api/shifts/date/:date", requireApiAuth, handleDailyShiftRequest);

  // 3. Range Endpoint: GET /api/planning/range?startDate=2026-08-25&endDate=2026-08-31 (Secured)
  app.get("/api/planning/range", requireApiAuth, async (req, res) => {
    try {
      await loadFromFirestore();
      const startStr = normalizeDateParam(req.query.startDate as string);
      const endStr = normalizeDateParam(req.query.endDate as string || startStr);
      const team = req.query.team as string | undefined;
      const station = req.query.station as string | undefined;

      const [sy, sm, sd] = startStr.split("-").map(Number);
      const [ey, em, ed] = endStr.split("-").map(Number);
      const startDate = new Date(sy, sm - 1, sd);
      const endDate = new Date(ey, em - 1, ed);

      const daysReports = [];
      const cur = new Date(startDate);
      while (cur <= endDate) {
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, "0");
        const dd = String(cur.getDate()).padStart(2, "0");
        const dStr = `${yyyy}-${mm}-${dd}`;
        daysReports.push(buildDailyAssignmentsReport(dStr, { team, station }));
        cur.setDate(cur.getDate() + 1);
      }

      res.json({
        startDate: startStr,
        endDate: endStr,
        totalDays: daysReports.length,
        days: daysReports
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. OpenAPI / API Integration Documentation endpoint
  app.get("/api/docs", (req, res) => {
    res.json({
      title: "CORTEX Operations Planning API",
      version: "1.2.0",
      description: "API REST sécurisée par jeton API (API Token Authentication) pour extraire les shifts et plannings assignés aux agents.",
      authentication: {
        type: "Bearer Token / Header / URL Query",
        headers: [
          "Authorization: Bearer <VOTRE_CLE_API>",
          "x-api-key: <VOTRE_CLE_API>"
        ],
        queryParams: [
          "?apiKey=<VOTRE_CLE_API>"
        ],
        errorResponse: {
          status: 401,
          error: "Unauthorized",
          message: "Accès refusé. Veuillez fournir un token API valide."
        }
      },
      endpoints: [
        {
          method: "GET",
          path: "/api/shifts/daily",
          security: "API Token Required",
          description: "Récupère tous les shifts assignés aux agents pour une date donnée.",
          parameters: [
            { name: "date", type: "string", description: "Date au format YYYY-MM-DD ou DD/MM/YYYY (défaut: aujourd'hui)" },
            { name: "team", type: "string", description: "Filtrer par équipe (ex: Paris, Nice)" },
            { name: "station", type: "string", description: "Filtrer par station (ex: JS, RC, ABN)" },
            { name: "format", type: "string", description: "Format de sortie: 'json' (défaut), 'compact', 'csv'" }
          ],
          example: "/api/shifts/daily?date=2026-08-30"
        },
        {
          method: "GET",
          path: "/api/planning/range",
          security: "API Token Required",
          description: "Récupère les shifts sur une période de dates (startDate et endDate)"
        },
        {
          method: "GET",
          path: "/api/agents",
          security: "API Token Required",
          description: "Liste tous les agents"
        },
        {
          method: "GET",
          path: "/api/shifts",
          security: "API Token Required",
          description: "Liste tous les types de shifts définis et leurs horaires"
        },
        {
          method: "GET",
          path: "/api/tokens",
          security: "API Token Required",
          description: "Liste les clés API actives et leurs métadonnées"
        }
      ]
    });
  });

  // 5. Agent CRUD APIs (Secured)
  app.get("/api/agents", requireApiAuth, (req, res) => {
    res.json(agentsState);
  });

  app.post("/api/agents", requireApiAuth, async (req, res) => {
    try {
      const newAgent: Agent = req.body;
      if (!newAgent.id) {
        newAgent.id = "agent_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      }
      agentsState.push(newAgent);
      const agentRef = doc(firestoreDb, 'agents', newAgent.id);
      await setDoc(agentRef, newAgent);
      res.status(201).json(newAgent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/agents/:id", requireApiAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      agentsState = agentsState.map(a => a.id === id ? { ...a, ...updates } : a);
      const agentRef = doc(firestoreDb, 'agents', id);
      await setDoc(agentRef, updates, { merge: true });
      res.json({ success: true, agent: agentsState.find(a => a.id === id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/agents/:id", requireApiAuth, async (req, res) => {
    try {
      const { id } = req.params;
      agentsState = agentsState.filter(a => a.id !== id);
      const agentRef = doc(firestoreDb, 'agents', id);
      await deleteDoc(agentRef);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Shift Definitions APIs (Secured)
  app.get("/api/shifts", requireApiAuth, (req, res) => {
    res.json(shiftsState);
  });

  app.post("/api/shifts", requireApiAuth, async (req, res) => {
    try {
      const newShift: Shift = req.body;
      if (!newShift.id) {
        newShift.id = "shift_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      }
      const { label, ...cleanShift } = newShift as any;
      shiftsState.push(cleanShift as Shift);
      const shiftRef = doc(firestoreDb, 'shifts', cleanShift.id);
      await setDoc(shiftRef, cleanShift);
      res.status(201).json(cleanShift);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/shifts/:id", requireApiAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { label, ...updates } = req.body;
      shiftsState = shiftsState.map(s => s.id === id ? { ...s, ...updates } : s);
      const shiftRef = doc(firestoreDb, 'shifts', id);
      await setDoc(shiftRef, updates, { merge: true });
      res.json({ success: true, shift: shiftsState.find(s => s.id === id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/shifts/:id", requireApiAuth, async (req, res) => {
    try {
      const { id } = req.params;
      shiftsState = shiftsState.filter(s => s.id !== id);
      const shiftRef = doc(firestoreDb, 'shifts', id);
      await deleteDoc(shiftRef);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Sync and Global Planning State (Secured)
  app.post("/api/sync-live", requireApiAuth, async (req, res) => {
    await loadFromFirestore();
    res.json({ 
      success: true, 
      agentsCount: agentsState.length, 
      shiftsCount: shiftsState.length,
      assignmentsCount: Object.keys(planningState).length
    });
  });

  app.get("/api/planning", requireApiAuth, (req, res) => {
    res.json(planningState);
  });

  app.post("/api/planning", requireApiAuth, (req, res) => {
    if (req.body.planning && typeof req.body.planning === "object") {
      planningState = { ...planningState, ...req.body.planning };
    }
    res.json({ success: true, count: Object.keys(planningState).length });
  });

  // 8. API Token Management Endpoints
  // GET /api/tokens (List tokens)
  app.get("/api/tokens", async (req, res) => {
    try {
      await loadFromFirestore();
      // Return token metadata
      const sanitized = apiTokensState.map(t => ({
        id: t.id,
        name: t.name,
        token: t.token,
        prefix: t.prefix || (t.token.substring(0, 16) + "..."),
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
        createdBy: t.createdBy,
        expiresAt: t.expiresAt,
        isActive: t.isActive
      }));
      res.json(sanitized);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tokens (Generate new API key)
  app.post("/api/tokens", async (req, res) => {
    try {
      const { name, createdBy, expiresAt } = req.body;
      const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      const tokenSecret = `cortex_live_sec_${randomHex}`;
      const id = `token_${Date.now()}_${randomHex.substring(0, 6)}`;
      const prefix = `${tokenSecret.substring(0, 20)}...`;

      const newToken: ApiToken = {
        id,
        name: (name || "Clé API Application").trim(),
        token: tokenSecret,
        prefix,
        createdAt: new Date().toISOString(),
        createdBy: (createdBy || "Admin").trim(),
        expiresAt: expiresAt || undefined,
        isActive: true
      };

      apiTokensState.push(newToken);
      const tokenRef = doc(firestoreDb, 'api_tokens', id);
      await setDoc(tokenRef, newToken);

      res.status(201).json(newToken);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/tokens/:id (Toggle status or rename)
  app.put("/api/tokens/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      apiTokensState = apiTokensState.map(t => t.id === id ? { ...t, ...updates } : t);
      const tokenRef = doc(firestoreDb, 'api_tokens', id);
      await setDoc(tokenRef, updates, { merge: true });
      res.json({ success: true, token: apiTokensState.find(t => t.id === id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/tokens/:id (Revoke API key)
  app.delete("/api/tokens/:id", async (req, res) => {
    try {
      const { id } = req.params;
      apiTokensState = apiTokensState.filter(t => t.id !== id);
      const tokenRef = doc(firestoreDb, 'api_tokens', id);
      await deleteDoc(tokenRef);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CORTEX Planning server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

