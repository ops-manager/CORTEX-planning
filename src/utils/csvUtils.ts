import { Agent } from '../types';

/**
 * Remove accents/diacritics and normalize for comparison
 */
function normalizeString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Parse date string from various common formats into standard YYYY-MM-DD
 * Supports:
 * - DD/MM/YYYY or D/M/YYYY (e.g. 25/08/2026, 01/09/2026, 1/9/2026)
 * - DD-MM-YYYY or D-M-YYYY
 * - YYYY-MM-DD
 * - YYYY/MM/DD
 * - DD.MM.YYYY
 */
export function normalizeDateHeader(headerStr: string): string | null {
  if (!headerStr) return null;
  const clean = headerStr.replace(/^["']|["']$/g, '').trim();

  // 1. Check YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    const mNum = parseInt(mm, 10);
    const dNum = parseInt(dd, 10);
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    const dNum = parseInt(dd, 10);
    const mNum = parseInt(mm, 10);
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // 3. Fallback: Check if Date can parse it directly
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000 && parsed.getFullYear() <= 2100) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

/**
 * Robust CSV parser supporting semicolons, commas, tabs, and double-quoted fields.
 */
export function parseCSV(rawText: string): string[][] {
  if (!rawText) return [];

  // Remove potential UTF-8 / UTF-16 BOM and trim leading empty spaces
  let text = rawText
    .replace(/^\uFEFF/, '')
    .replace(/^\uFFFE/, '')
    .replace(/^\xEF\xBB\xBF/, '');

  // Normalize newlines
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Auto-detect delimiter from the first non-empty line (preferring semicolon if present)
  const lines = text.split('\n');
  const firstLine = lines.find(l => l.trim().length > 0) || '';
  
  let delimiter = ';';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount > semicolonCount && tabCount > commaCount) {
    delimiter = '\t';
  } else if (commaCount > semicolonCount) {
    delimiter = ',';
  } else {
    delimiter = ';';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote ("")
        currentField += '"';
        i++; // skip next quote
      } else {
        // Toggle quote mode
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField.trim());
      // Only push non-empty rows
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Add last field if any remains
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface CSVImportResult {
  updates: Record<string, string>;
  cellsCount: number;
  agentsMatchedCount: number;
  dateRange: { start: string; end: string } | null;
  warnings: string[];
}

/**
 * Import planning data from CSV according to the CORTEX CSV export model.
 * Format: ['ID Agent', 'Nom Agent', 'Équipe', 'Station', Dates...]
 */
export function processPlanningCSV(
  csvText: string,
  existingAgents: Agent[]
): CSVImportResult {
  const rows = parseCSV(csvText);
  const updates: Record<string, string> = {};
  const warnings: string[] = [];

  if (rows.length < 2) {
    return {
      updates: {},
      cellsCount: 0,
      agentsMatchedCount: 0,
      dateRange: null,
      warnings: ['Le fichier CSV est vide ou ne contient pas de données valides.']
    };
  }

  const header = rows[0].map(h => h.replace(/^["']|["']$/g, '').trim());

  // Detect Date columns across all headers
  const dateColIndices: { colIndex: number; dateStr: string }[] = [];

  header.forEach((colName, index) => {
    // Check if column is a date header
    const normalizedDate = normalizeDateHeader(colName);
    if (normalizedDate) {
      dateColIndices.push({ colIndex: index, dateStr: normalizedDate });
    }
  });

  if (dateColIndices.length === 0) {
    return {
      updates: {},
      cellsCount: 0,
      agentsMatchedCount: 0,
      dateRange: null,
      warnings: ['Aucune colonne de date (ex: 25/08/2026 ou 2026-08-25) détectée dans les en-têtes.']
    };
  }

  // Sort detected dates chronologically
  dateColIndices.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  const startDate = dateColIndices[0].dateStr;
  const endDate = dateColIndices[dateColIndices.length - 1].dateStr;

  // Build robust lookup maps for existing agents
  const agentById = new Map<string, Agent>();
  const agentByName = new Map<string, Agent>();
  const agentByNormalizedName = new Map<string, Agent>();
  const agentByStation = new Map<string, Agent>();

  existingAgents.forEach(ag => {
    if (ag.id) {
      agentById.set(ag.id.toLowerCase().trim(), ag);
    }
    if (ag.name) {
      agentByName.set(ag.name.toLowerCase().trim(), ag);
      agentByNormalizedName.set(normalizeString(ag.name), ag);
    }
    if (ag.station) {
      agentByStation.set(ag.station.toLowerCase().trim(), ag);
    }
  });

  let matchedAgentsCount = 0;
  const matchedAgentIds = new Set<string>();

  // Process data rows
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rowId = (row[0] || '').replace(/^["']|["']$/g, '').trim();
    const rowName = (row[1] || '').replace(/^["']|["']$/g, '').trim();
    const rowStation = (row[3] || '').replace(/^["']|["']$/g, '').trim();

    // 1. Match agent by ID
    let matchedAgent = rowId ? agentById.get(rowId.toLowerCase()) : undefined;

    // 2. Match agent by Exact Name
    if (!matchedAgent && rowName) {
      matchedAgent = agentByName.get(rowName.toLowerCase());
    }

    // 3. Match agent by Normalized Name (accent insensitive, e.g. Élodie == Elodie)
    if (!matchedAgent && rowName) {
      matchedAgent = agentByNormalizedName.get(normalizeString(rowName));
    }

    // 4. Match agent by Station/Trigramme (e.g. JS, RC, ABN, AME)
    if (!matchedAgent && rowStation) {
      matchedAgent = agentByStation.get(rowStation.toLowerCase());
    }

    // 5. Fallback: Partial name substring match
    if (!matchedAgent && rowName) {
      const normRow = normalizeString(rowName);
      matchedAgent = existingAgents.find(ag => {
        const normAg = normalizeString(ag.name);
        return normAg.includes(normRow) || normRow.includes(normAg);
      });
    }

    if (!matchedAgent) {
      // If row has some shift data, warn about unmapped agent
      const hasAnyData = row.slice(4).some(val => val && val.trim().length > 0);
      if (hasAnyData || rowName || rowId) {
        warnings.push(`Ligne ${r + 1}: Agent non reconnu ("${rowName || rowId || rowStation}")`);
      }
      continue;
    }

    if (!matchedAgentIds.has(matchedAgent.id)) {
      matchedAgentIds.add(matchedAgent.id);
      matchedAgentsCount++;
    }

    // Apply shifts for all dates in this row
    for (const { colIndex, dateStr } of dateColIndices) {
      const rawVal = (row[colIndex] || '').replace(/^["']|["']$/g, '').trim();
      updates[`${matchedAgent.id}_${dateStr}`] = rawVal;
    }
  }

  return {
    updates,
    cellsCount: Object.keys(updates).length,
    agentsMatchedCount: matchedAgentsCount,
    dateRange: { start: startDate, end: endDate },
    warnings: warnings.slice(0, 5) // keep max 5 warnings for clean feedback
  };
}

