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

// Load agents and shifts directly from Firestore database ai-studio-05a03be6-da42-4223-bc36-3b30b710b29d
async function loadFromFirestore() {
  try {
    const [agentsSnap, shiftsSnap, planningSnap] = await Promise.all([
      getDocs(collection(firestoreDb, 'agents')),
      getDocs(collection(firestoreDb, 'shifts')),
      getDocs(collection(firestoreDb, 'planning'))
    ]);

    if (!agentsSnap.empty) {
      const loadedAgents: Agent[] = [];
      agentsSnap.forEach(d => {
        loadedAgents.push({ id: d.id, ...d.data() } as Agent);
      });
      loadedAgents.sort((a, b) => (a.order || 0) - (b.order || 0));
      agentsState = loadedAgents;
      console.log(`Loaded ${agentsState.length} agents from Firestore database: ${firebaseConfig.firestoreDatabaseId}`);
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
      console.log(`Loaded ${shiftsState.length} shifts from Firestore database: ${firebaseConfig.firestoreDatabaseId}`);
    }

    if (!planningSnap.empty) {
      const docData = planningSnap.docs.find(d => d.id === 'current');
      if (docData && docData.data().assignments) {
        planningState = docData.data().assignments;
        console.log(`Loaded ${Object.keys(planningState).length} assignments from Firestore`);
      }
    }
  } catch (err) {
    console.warn(`Could not load from Firestore database ${firebaseConfig.firestoreDatabaseId}, using fallback:`, err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Trigger non-blocking Firestore sync
  loadFromFirestore();

  // 1. Health Check endpoint: GET /api/health -> { status: "ok" }
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 2. Get All Agents: GET /api/agents
  app.get("/api/agents", (req, res) => {
    res.json(agentsState);
  });

  // Create Agent: POST /api/agents
  app.post("/api/agents", async (req, res) => {
    try {
      const newAgent: Agent = req.body;
      if (!newAgent.id) {
        newAgent.id = "agent_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      }
      agentsState.push(newAgent);
      // Sync to Firestore
      const agentRef = doc(firestoreDb, 'agents', newAgent.id);
      await setDoc(agentRef, newAgent);
      res.status(201).json(newAgent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Agent: PUT /api/agents/:id
  app.put("/api/agents/:id", async (req, res) => {
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

  // Delete Agent: DELETE /api/agents/:id
  app.delete("/api/agents/:id", async (req, res) => {
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

  // 3. Get All Shifts: GET /api/shifts
  app.get("/api/shifts", (req, res) => {
    res.json(shiftsState);
  });

  // Create Shift: POST /api/shifts
  app.post("/api/shifts", async (req, res) => {
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

  // Update Shift: PUT /api/shifts/:id
  app.put("/api/shifts/:id", async (req, res) => {
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

  // Delete Shift: DELETE /api/shifts/:id
  app.delete("/api/shifts/:id", async (req, res) => {
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

  // 4. Force Live Re-fetch from Firestore: POST /api/sync-live
  app.post("/api/sync-live", async (req, res) => {
    await loadFromFirestore();
    res.json({ success: true, agentsCount: agentsState.length, shiftsCount: shiftsState.length });
  });

  // Auxiliary API endpoints for updates
  app.post("/api/agents/reorder", (req, res) => {
    if (Array.isArray(req.body.agents)) {
      agentsState = req.body.agents;
    }
    res.json({ success: true, agents: agentsState });
  });

  app.post("/api/agents/reset", (req, res) => {
    agentsState = [...defaultAgents];
    shiftsState = [...defaultShifts];
    planningState = {};
    res.json({ success: true, agents: agentsState, shifts: shiftsState });
  });

  app.get("/api/planning", (req, res) => {
    res.json(planningState);
  });

  app.post("/api/planning", (req, res) => {
    if (req.body.planning && typeof req.body.planning === "object") {
      planningState = { ...planningState, ...req.body.planning };
    }
    res.json({ success: true, count: Object.keys(planningState).length });
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
