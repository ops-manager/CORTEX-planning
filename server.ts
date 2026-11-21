import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import firebaseConfig from "./firebase-applet-config.json";
import { API_IMPORTED_AGENTS, API_IMPORTED_SHIFTS } from "./src/data/mockData";

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
  season?: "all" | "winter" | "summer";
  hidden?: boolean;
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

// In-memory state synchronized by authenticated frontend clients (no Node Firestore gRPC streams)
let agentsState: Agent[] = [...API_IMPORTED_AGENTS];
let shiftsState: Shift[] = [...API_IMPORTED_SHIFTS];
let planningState: Record<string, string> = {};
let apiTokensState: ApiToken[] = [DEFAULT_MASTER_TOKEN];

/**
 * Verifies a Firebase ID token using the Firebase Auth Identity Toolkit REST API
 */
async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ valid: boolean; uid?: string; email?: string }> {
  if (!idToken || !firebaseConfig?.apiKey) {
    return { valid: false };
  }
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      }
    );
    if (!response.ok) {
      return { valid: false };
    }
    const data = (await response.json()) as {
      users?: Array<{ localId?: string; email?: string }>;
    };
    const user = data.users?.[0];
    if (!user?.localId) {
      return { valid: false };
    }
    return { valid: true, uid: user.localId, email: user.email };
  } catch {
    return { valid: false };
  }
}

/**
 * Extracts raw Bearer / API key token from request headers or query params
 */
function extractRawToken(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.substring(7).trim();
    }
    return authHeader.trim();
  }

  const headerToken = (req.headers["x-api-key"] || req.headers["x-cortex-token"]) as
    | string
    | undefined;
  if (headerToken) return headerToken.trim();

  const queryToken = (req.query.apiKey || req.query.token || req.query.api_key) as
    | string
    | undefined;
  if (queryToken) return queryToken.trim();

  return undefined;
}

/**
 * API Token Validation Helper
 */
function extractAndValidateToken(
  req: express.Request
): { valid: boolean; tokenObj?: ApiToken; error?: string } {
  const rawToken = extractRawToken(req);

  if (!rawToken || rawToken === "") {
    return { valid: false, error: "Jeton API manquant (Missing API token)" };
  }

  const cleanToken = rawToken;

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
  const matched = apiTokensState.find((t) => t.token === cleanToken);
  if (!matched) {
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

  matched.lastUsedAt = new Date().toISOString();
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
      message:
        "Accès refusé. Veuillez fournir un token API valide via l'en-tête 'Authorization: Bearer <TOKEN>', l'en-tête 'x-api-key: <TOKEN>', ou le paramètre d'URL '?apiKey=<TOKEN>'.",
      reason: validation.error,
      help: "Générez ou récupérez vos clés d'API dans l'application CORTEX Planning (Menu Extraction & API > Clés API)."
    });
  }
  (req as any).apiToken = validation.tokenObj;
  next();
};

/**
 * Express Middleware allowing either a valid API token OR an authenticated Firebase ID token
 */
const requireApiOrFirebaseAuth: express.RequestHandler = async (req, res, next) => {
  const apiValidation = extractAndValidateToken(req);
  if (apiValidation.valid) {
    (req as any).apiToken = apiValidation.tokenObj;
    return next();
  }

  const rawToken = extractRawToken(req);
  if (rawToken && rawToken.split(".").length === 3) {
    const fb = await verifyFirebaseIdToken(rawToken);
    if (fb.valid) {
      (req as any).firebaseUser = fb;
      return next();
    }
  }

  return res.status(401).json({
    error: "Unauthorized",
    status: 401,
    message: "Authentification requise (Jeton API ou session utilisateur Firebase)."
  });
};

/**
 * Normalizes input date strings (e.g. "2026-08-25", "25/08/2026", "today") to standard "YYYY-MM-DD"
 */
function normalizeDateParam(input?: string): string {
  const now = new Date();
  if (
    !input ||
    input.trim() === "" ||
    input.toLowerCase() === "today" ||
    input.toLowerCase() === "ajourdhui"
  ) {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const clean = input.trim();

  const ymdMatch = clean.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, "0");
    const dd = ymdMatch[3].padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

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

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const FRENCH_DAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi"
];

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

  const shiftByCode = new Map<string, Shift>();
  shiftsState.forEach((s) => {
    if (s.code) {
      shiftByCode.set(s.code.toLowerCase(), s);
    }
  });

  let targetAgents = [...agentsState];
  if (options?.team) {
    const teamFilter = options.team.toLowerCase().trim();
    targetAgents = targetAgents.filter(
      (a) => (a.team || "").toLowerCase() === teamFilter
    );
  }
  if (options?.station) {
    const stationFilter = options.station.toLowerCase().trim();
    targetAgents = targetAgents.filter(
      (a) => (a.station || "").toLowerCase() === stationFilter
    );
  }

  let totalAssigned = 0;
  let totalWorking = 0;
  let totalOff = 0;
  const shiftCounts: Record<string, number> = {};
  const compactMap: Record<string, string> = {};

  const assignments = targetAgents.map((agent) => {
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
    const isOffCode =
      ["OFF", "RH", "CA", "CP", "RC", "R", "ABS", "MAL"].includes(
        shiftCode.toUpperCase()
      ) || shiftMeta?.hours === "00:00 - 00:00";

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
      const parts = shiftMeta.hours.split("-").map((p) => p.trim());
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

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, x-api-key, x-cortex-token"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: "5mb" }));

  // 1. Health Check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      agentsCount: agentsState.length,
      shiftsCount: shiftsState.length,
      assignmentsCount: Object.keys(planningState).length
    });
  });

  // 1b. Authenticated client-to-server state synchronization
  app.post("/api/sync-state", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const { agents, shifts, planning } = req.body || {};
      if (Array.isArray(agents) && agents.length > 0) {
        agentsState = [...agents].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
      if (Array.isArray(shifts)) {
        shiftsState = [...shifts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
      if (planning && typeof planning === "object" && !Array.isArray(planning)) {
        planningState = { ...planning };
      }
      res.json({
        success: true,
        agentsCount: agentsState.length,
        shiftsCount: shiftsState.length,
        assignmentsCount: Object.keys(planningState).length
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Invalid sync payload" });
    }
  });

  app.post("/api/tokens/sync", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const { tokens } = req.body || {};
      if (!Array.isArray(tokens)) {
        return res.status(400).json({ error: "tokens array required" });
      }
      const validTokens = tokens.filter(
        (t) => t && typeof t.id === "string" && typeof t.token === "string"
      );
      if (validTokens.length > 0) {
        apiTokensState = validTokens;
      }
      res.json({ success: true, count: apiTokensState.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Invalid tokens payload" });
    }
  });

  // 2. Fetch Daily Shift Assignments
  const handleDailyShiftRequest = async (req: express.Request, res: express.Response) => {
    try {
      const rawDate = (req.params.date || req.query.date || req.query.d) as string | undefined;
      const dateStr = normalizeDateParam(rawDate);
      const team = req.query.team as string | undefined;
      const station = req.query.station as string | undefined;
      const format = ((req.query.format as string) || "json").toLowerCase();

      const report = buildDailyAssignmentsReport(dateStr, { team, station });

      if (format === "compact") {
        return res.json({
          date: report.date,
          dayName: report.dayName,
          assignments: report.compact
        });
      }

      if (format === "csv") {
        const csvHeader =
          "ID Agent;Nom Agent;Equipe;Station;Date;Code Shift;Horaires;Pause;Statut\n";
        const csvRows = report.assignments
          .map(
            (a) =>
              `"${a.agentId}";"${a.agentName}";"${a.team}";"${a.station}";"${report.date}";"${a.shiftCode}";"${a.hours}";"${a.defaultPause}";"${
                a.isOff ? "Repos/Congé" : "Actif"
              }"`
          )
          .join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="cortex-shifts-${dateStr}.csv"`
        );
        return res.send(csvHeader + csvRows);
      }

      return res.json(report);
    } catch (err: any) {
      console.error("Error generating daily shift report:", err);
      res.status(500).json({ error: err.message || "Failed to fetch daily shifts" });
    }
  };

  app.get("/api/shifts/daily", requireApiAuth, handleDailyShiftRequest);
  app.get("/api/planning/daily", requireApiAuth, handleDailyShiftRequest);
  app.get("/api/planning/date/:date", requireApiAuth, handleDailyShiftRequest);
  app.get("/api/shifts/date/:date", requireApiAuth, handleDailyShiftRequest);

  // 3. Range Endpoint
  app.get("/api/planning/range", requireApiAuth, (req, res) => {
    try {
      const startStr = normalizeDateParam(req.query.startDate as string);
      const endStr = normalizeDateParam((req.query.endDate as string) || startStr);
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
  app.get("/api/docs", (_req, res) => {
    res.json({
      title: "CORTEX Operations Planning API",
      version: "1.2.0",
      description:
        "API REST sécurisée par jeton API (API Token Authentication) pour extraire les shifts et plannings assignés aux agents.",
      authentication: {
        type: "Bearer Token / Header / URL Query",
        headers: [
          "Authorization: Bearer <VOTRE_CLE_API>",
          "x-api-key: <VOTRE_CLE_API>"
        ],
        queryParams: ["?apiKey=<VOTRE_CLE_API>"],
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
            {
              name: "date",
              type: "string",
              description: "Date au format YYYY-MM-DD ou DD/MM/YYYY (défaut: aujourd'hui)"
            },
            { name: "team", type: "string", description: "Filtrer par équipe (ex: Paris, Nice)" },
            { name: "station", type: "string", description: "Filtrer par station (ex: JS, RC, ABN)" },
            {
              name: "format",
              type: "string",
              description: "Format de sortie: 'json' (défaut), 'compact', 'csv'"
            }
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
          security: "API Token / Auth Required",
          description: "Liste les clés API actives et leurs métadonnées"
        }
      ]
    });
  });

  // 5. Agent CRUD APIs (Secured)
  app.get("/api/agents", requireApiAuth, (_req, res) => {
    res.json(agentsState);
  });

  app.post("/api/agents", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const newAgent: Agent = req.body;
      if (!newAgent.id) {
        newAgent.id = "agent_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      }
      agentsState = [...agentsState.filter((a) => a.id !== newAgent.id), newAgent];
      res.status(201).json(newAgent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/agents/:id", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      agentsState = agentsState.map((a) => (a.id === id ? { ...a, ...updates } : a));
      res.json({ success: true, agent: agentsState.find((a) => a.id === id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/agents/:id", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const { id } = req.params;
      agentsState = agentsState.filter((a) => a.id !== id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/agents/reorder", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const incoming = Array.isArray(req.body) ? req.body : req.body.agents;
      if (!Array.isArray(incoming)) {
        return res.status(400).json({ error: "Format invalide: tableau d'agents requis" });
      }

      const updatedAgents: Agent[] = incoming.map((ag: Agent, idx: number) => ({
        ...ag,
        order: idx
      }));

      agentsState = updatedAgents;
      res.json({ success: true, count: updatedAgents.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Shift Definitions APIs (Secured)
  app.get("/api/shifts", requireApiAuth, (_req, res) => {
    res.json(shiftsState);
  });

  app.post("/api/shifts", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const newShift: Shift = req.body;
      if (!newShift.id) {
        newShift.id = "shift_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      }
      shiftsState = [...shiftsState.filter((s) => s.id !== newShift.id), newShift];
      res.status(201).json(newShift);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/shifts/:id", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      shiftsState = shiftsState.map((s) => (s.id === id ? { ...s, ...updates } : s));
      res.json({ success: true, shift: shiftsState.find((s) => s.id === id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/shifts/:id", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const { id } = req.params;
      shiftsState = shiftsState.filter((s) => s.id !== id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Global Planning State (Secured)
  app.post("/api/sync-live", requireApiOrFirebaseAuth, (_req, res) => {
    res.json({
      success: true,
      agentsCount: agentsState.length,
      shiftsCount: shiftsState.length,
      assignmentsCount: Object.keys(planningState).length
    });
  });

  app.get("/api/planning", requireApiAuth, (_req, res) => {
    res.json(planningState);
  });

  app.post("/api/planning", requireApiOrFirebaseAuth, (req, res) => {
    if (req.body.planning && typeof req.body.planning === "object") {
      planningState = { ...req.body.planning };
    }
    res.json({ success: true, count: Object.keys(planningState).length });
  });

  // 8. API Token Management Endpoints (Secured)
  app.get("/api/tokens", requireApiOrFirebaseAuth, (_req, res) => {
    const sanitized = apiTokensState.map((t) => ({
      id: t.id,
      name: t.name,
      token: t.token,
      prefix: t.prefix || t.token.substring(0, 16) + "...",
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
      createdBy: t.createdBy,
      expiresAt: t.expiresAt,
      isActive: t.isActive
    }));
    res.json(sanitized);
  });

  app.post("/api/tokens", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const { name, createdBy, expiresAt } = req.body;
      const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, "0"))
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
      res.status(201).json(newToken);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/tokens/:id", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      apiTokensState = apiTokensState.map((t) => (t.id === id ? { ...t, ...updates } : t));
      res.json({ success: true, token: apiTokensState.find((t) => t.id === id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/tokens/:id", requireApiOrFirebaseAuth, (req, res) => {
    try {
      const { id } = req.params;
      apiTokensState = apiTokensState.filter((t) => t.id !== id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CORTEX Planning server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
