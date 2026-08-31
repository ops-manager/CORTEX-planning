import type { CSSProperties } from 'react';
import { Shift, SelectionRange, ShiftSeason } from '../types';

export interface ShiftStyle {
  bg: string;
  text: string;
  border: string;
  glow?: string;
  badgeClass: string;
  darkBg: string;
  customStyle?: CSSProperties;
}

export interface ColorPreset {
  id: string;
  name: string;
  hex: string;
  badgeClass: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'amber',
    name: 'Matin (Ambre)',
    hex: '#f59e0b',
    badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-500/45',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-300',
    bgClass: 'bg-amber-500/20 hover:bg-amber-500/30'
  },
  {
    id: 'orange',
    name: 'Matin avancé (Orange)',
    hex: '#f97316',
    badgeClass: 'bg-orange-500/25 text-orange-200 border-orange-500/45',
    borderClass: 'border-orange-500/40',
    textClass: 'text-orange-300',
    bgClass: 'bg-orange-500/20 hover:bg-orange-500/30'
  },
  {
    id: 'yellow',
    name: 'Soleil / Été (Jaune)',
    hex: '#eab308',
    badgeClass: 'bg-yellow-500/25 text-yellow-200 border-yellow-500/45',
    borderClass: 'border-yellow-500/40',
    textClass: 'text-yellow-300',
    bgClass: 'bg-yellow-500/20 hover:bg-yellow-500/30'
  },
  {
    id: 'emerald',
    name: 'Journée (Émeraude)',
    hex: '#10b981',
    badgeClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/45',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-300',
    bgClass: 'bg-emerald-500/20 hover:bg-emerald-500/30'
  },
  {
    id: 'teal',
    name: 'Journée continue (Sarcelle)',
    hex: '#14b8a6',
    badgeClass: 'bg-teal-500/25 text-teal-200 border-teal-500/45',
    borderClass: 'border-teal-500/40',
    textClass: 'text-teal-300',
    bgClass: 'bg-teal-500/20 hover:bg-teal-500/30'
  },
  {
    id: 'cyan',
    name: 'Hiver / Glace (Cyan)',
    hex: '#06b6d4',
    badgeClass: 'bg-cyan-500/25 text-cyan-200 border-cyan-500/45',
    borderClass: 'border-cyan-500/40',
    textClass: 'text-cyan-300',
    bgClass: 'bg-cyan-500/20 hover:bg-cyan-500/30'
  },
  {
    id: 'sky',
    name: 'Congés / Détaché (Ciel)',
    hex: '#0ea5e9',
    badgeClass: 'bg-sky-500/25 text-sky-200 border-sky-500/45',
    borderClass: 'border-sky-500/40',
    textClass: 'text-sky-300',
    bgClass: 'bg-sky-500/20 hover:bg-sky-500/30'
  },
  {
    id: 'blue',
    name: 'Standard (Bleu)',
    hex: '#3b82f6',
    badgeClass: 'bg-blue-500/25 text-blue-200 border-blue-500/45',
    borderClass: 'border-blue-500/40',
    textClass: 'text-blue-300',
    bgClass: 'bg-blue-500/20 hover:bg-blue-500/30'
  },
  {
    id: 'indigo',
    name: 'Soirée (Indigo)',
    hex: '#6366f1',
    badgeClass: 'bg-indigo-500/25 text-indigo-200 border-indigo-500/45',
    borderClass: 'border-indigo-500/40',
    textClass: 'text-indigo-300',
    bgClass: 'bg-indigo-500/20 hover:bg-indigo-500/30'
  },
  {
    id: 'violet',
    name: 'Soir (Violet)',
    hex: '#8b5cf6',
    badgeClass: 'bg-violet-500/25 text-violet-200 border-violet-500/45',
    borderClass: 'border-violet-500/40',
    textClass: 'text-violet-300',
    bgClass: 'bg-violet-500/20 hover:bg-violet-500/30'
  },
  {
    id: 'purple',
    name: 'Soirée tardive (Pourpre)',
    hex: '#a855f7',
    badgeClass: 'bg-purple-500/25 text-purple-200 border-purple-500/45',
    borderClass: 'border-purple-500/40',
    textClass: 'text-purple-300',
    bgClass: 'bg-purple-500/20 hover:bg-purple-500/30'
  },
  {
    id: 'fuchsia',
    name: 'Nuit (Fuchsia)',
    hex: '#d946ef',
    badgeClass: 'bg-fuchsia-600/25 text-fuchsia-200 border-fuchsia-600/45',
    borderClass: 'border-fuchsia-600/40',
    textClass: 'text-fuchsia-300',
    bgClass: 'bg-fuchsia-600/20 hover:bg-fuchsia-600/30'
  },
  {
    id: 'rose',
    name: 'Astreinte / Spécial (Rose)',
    hex: '#f43f5e',
    badgeClass: 'bg-rose-500/25 text-rose-200 border-rose-500/45',
    borderClass: 'border-rose-500/40',
    textClass: 'text-rose-300',
    bgClass: 'bg-rose-500/20 hover:bg-rose-500/30'
  },
  {
    id: 'lime',
    name: 'Renfort été (Lime)',
    hex: '#84cc16',
    badgeClass: 'bg-lime-500/25 text-lime-200 border-lime-500/45',
    borderClass: 'border-lime-500/40',
    textClass: 'text-lime-300',
    bgClass: 'bg-lime-500/20 hover:bg-lime-500/30'
  },
  {
    id: 'slate',
    name: 'Repos / Inactif (Gris)',
    hex: '#64748b',
    badgeClass: 'bg-slate-800/70 text-slate-300 border-slate-700/70',
    borderClass: 'border-slate-700/60',
    textClass: 'text-slate-400',
    bgClass: 'bg-slate-800/50 hover:bg-slate-800/70'
  }
];

export const SHIFT_STYLE_MAP: Record<string, ShiftStyle> = {
  // Morning shifts (Amber / Orange / Yellow tones)
  M1A: {
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    badgeClass: 'bg-amber-600/30 text-amber-200 border-amber-500/50',
    darkBg: 'bg-amber-950/40'
  },
  M1: {
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-500/45',
    darkBg: 'bg-amber-950/40'
  },
  M2: {
    bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30',
    text: 'text-orange-300',
    border: 'border-orange-500/40',
    badgeClass: 'bg-orange-500/25 text-orange-200 border-orange-500/45',
    darkBg: 'bg-orange-950/40'
  },
  M2E: {
    bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30',
    text: 'text-orange-300',
    border: 'border-orange-500/40',
    badgeClass: 'bg-orange-500/25 text-orange-200 border-orange-500/45',
    darkBg: 'bg-orange-950/40'
  },
  M3: {
    bg: 'bg-orange-600/20 text-orange-300 border-orange-600/40 hover:bg-orange-600/30',
    text: 'text-orange-300',
    border: 'border-orange-600/40',
    badgeClass: 'bg-orange-600/25 text-orange-200 border-orange-600/45',
    darkBg: 'bg-orange-950/40'
  },
  M3H: {
    bg: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40 hover:bg-yellow-600/30',
    text: 'text-yellow-300',
    border: 'border-yellow-600/40',
    badgeClass: 'bg-yellow-600/25 text-yellow-200 border-yellow-600/45',
    darkBg: 'bg-yellow-950/40'
  },
  M4: {
    bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/30',
    text: 'text-yellow-300',
    border: 'border-yellow-500/40',
    badgeClass: 'bg-yellow-500/25 text-yellow-200 border-yellow-500/45',
    darkBg: 'bg-yellow-950/40'
  },
  M: {
    bg: 'bg-amber-400/20 text-amber-200 border-amber-400/40 hover:bg-amber-400/30',
    text: 'text-amber-200',
    border: 'border-amber-400/40',
    badgeClass: 'bg-amber-400/25 text-amber-100 border-amber-400/45',
    darkBg: 'bg-amber-950/40'
  },

  // Day shifts (Emerald / Teal / Green tones)
  J: {
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    badgeClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/45',
    darkBg: 'bg-emerald-950/40'
  },
  J1: {
    bg: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40 hover:bg-emerald-600/30',
    text: 'text-emerald-300',
    border: 'border-emerald-600/40',
    badgeClass: 'bg-emerald-600/25 text-emerald-200 border-emerald-600/45',
    darkBg: 'bg-emerald-950/40'
  },
  J1H: {
    bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30',
    text: 'text-teal-300',
    border: 'border-teal-500/40',
    badgeClass: 'bg-teal-500/25 text-teal-200 border-teal-500/45',
    darkBg: 'bg-teal-950/40'
  },
  J2: {
    bg: 'bg-teal-600/20 text-teal-300 border-teal-600/40 hover:bg-teal-600/30',
    text: 'text-teal-300',
    border: 'border-teal-600/40',
    badgeClass: 'bg-teal-600/25 text-teal-200 border-teal-600/45',
    darkBg: 'bg-teal-950/40'
  },

  // Afternoon / Evening shifts (Indigo / Violet / Purple tones)
  S: {
    bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30',
    text: 'text-indigo-300',
    border: 'border-indigo-500/40',
    badgeClass: 'bg-indigo-500/25 text-indigo-200 border-indigo-500/45',
    darkBg: 'bg-indigo-950/40'
  },
  S1: {
    bg: 'bg-indigo-600/20 text-indigo-300 border-indigo-600/40 hover:bg-indigo-600/30',
    text: 'text-indigo-300',
    border: 'border-indigo-600/40',
    badgeClass: 'bg-indigo-600/25 text-indigo-200 border-indigo-600/45',
    darkBg: 'bg-indigo-950/40'
  },
  S2: {
    bg: 'bg-violet-500/20 text-violet-300 border-violet-500/40 hover:bg-violet-500/30',
    text: 'text-violet-300',
    border: 'border-violet-500/40',
    badgeClass: 'bg-violet-500/25 text-violet-200 border-violet-500/45',
    darkBg: 'bg-violet-950/40'
  },
  S2H: {
    bg: 'bg-violet-600/20 text-violet-300 border-violet-600/40 hover:bg-violet-600/30',
    text: 'text-violet-300',
    border: 'border-violet-600/40',
    badgeClass: 'bg-violet-600/25 text-violet-200 border-violet-600/45',
    darkBg: 'bg-violet-950/40'
  },
  S2B: {
    bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30',
    text: 'text-purple-300',
    border: 'border-purple-500/40',
    badgeClass: 'bg-purple-500/25 text-purple-200 border-purple-500/45',
    darkBg: 'bg-purple-950/40'
  },
  S4: {
    bg: 'bg-purple-600/20 text-purple-300 border-purple-600/40 hover:bg-purple-600/30',
    text: 'text-purple-300',
    border: 'border-purple-600/40',
    badgeClass: 'bg-purple-600/25 text-purple-200 border-purple-600/45',
    darkBg: 'bg-purple-950/40'
  },
  S3A: {
    bg: 'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-600/40 hover:bg-fuchsia-600/30',
    text: 'text-fuchsia-300',
    border: 'border-fuchsia-600/40',
    badgeClass: 'bg-fuchsia-600/25 text-fuchsia-200 border-fuchsia-600/45',
    darkBg: 'bg-fuchsia-950/40'
  },
  S3: {
    bg: 'bg-fuchsia-700/20 text-fuchsia-300 border-fuchsia-700/40 hover:bg-fuchsia-700/30',
    text: 'text-fuchsia-300',
    border: 'border-fuchsia-700/40',
    badgeClass: 'bg-fuchsia-700/25 text-fuchsia-200 border-fuchsia-700/45',
    darkBg: 'bg-fuchsia-950/40'
  },

  // Rest & Leaves
  RH: {
    bg: 'bg-slate-800/50 text-slate-400 border-slate-700/60 hover:bg-slate-800/70',
    text: 'text-slate-400',
    border: 'border-slate-700/60',
    badgeClass: 'bg-slate-800/70 text-slate-300 border-slate-700/70',
    darkBg: 'bg-slate-900/60'
  },
  CA: {
    bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30',
    text: 'text-sky-300',
    border: 'border-sky-500/40',
    badgeClass: 'bg-sky-500/25 text-sky-200 border-sky-500/45',
    darkBg: 'bg-sky-950/40'
  }
};

export const DEFAULT_STYLE: ShiftStyle = {
  bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30',
  text: 'text-blue-300',
  border: 'border-blue-500/40',
  badgeClass: 'bg-blue-500/25 text-blue-200 border-blue-500/45',
  darkBg: 'bg-blue-950/40'
};

/**
 * Resolve shift style dynamically supporting both preset codes and custom colors/HEX
 */
export function getShiftStyle(code?: string, customColor?: string): ShiftStyle {
  // 1. If a custom color is specified (preset ID or HEX)
  if (customColor) {
    // Check if it matches a preset id
    const preset = COLOR_PRESETS.find(p => p.id === customColor.toLowerCase() || p.hex.toLowerCase() === customColor.toLowerCase());
    if (preset) {
      return {
        bg: preset.bgClass,
        text: preset.textClass,
        border: preset.borderClass,
        badgeClass: preset.badgeClass,
        darkBg: 'bg-slate-900/80'
      };
    }

    // If it's a raw HEX color (e.g. #ff4500)
    if (customColor.startsWith('#')) {
      const hex = customColor;
      return {
        bg: '',
        text: '',
        border: '',
        badgeClass: 'font-mono-code font-bold tracking-wide border',
        darkBg: 'bg-slate-900/80',
        customStyle: {
          backgroundColor: `${hex}26`, // 15% opacity
          borderColor: `${hex}80`, // 50% opacity
          color: hex
        }
      };
    }
  }

  // 2. Fallback to mapped default for known shift code
  if (!code) return DEFAULT_STYLE;
  return SHIFT_STYLE_MAP[code.toUpperCase()] || DEFAULT_STYLE;
}

/**
 * Filter shifts by Season ('all' | 'winter' | 'summer')
 */
export function filterShiftsBySeason(shifts: Shift[], seasonFilter: ShiftSeason): Shift[] {
  if (seasonFilter === 'all') return shifts;
  return shifts.filter(s => {
    if (!s.season || s.season === 'all') return true;
    return s.season === seasonFilter;
  });
}

/**
 * Helper to get label and icon for a season
 */
export function getSeasonInfo(season?: ShiftSeason): { label: string; icon: string; badgeClass: string } {
  switch (season) {
    case 'winter':
      return {
        label: 'Hiver',
        icon: '❄️',
        badgeClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50'
      };
    case 'summer':
      return {
        label: 'Été',
        icon: '☀️',
        badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-700/50'
      };
    default:
      return {
        label: 'Toute l\'année',
        icon: '🌐',
        badgeClass: 'bg-slate-800/60 text-slate-300 border-slate-700/50'
      };
  }
}

/**
 * Calculate decimal hours from shift hours string like "06:00 - 14:00" or "04:30 - 14:00"
 */
export function calculateShiftDurationHours(hoursStr?: string): number {
  if (!hoursStr || hoursStr.includes("00:00 - 00:00") || hoursStr.includes("00:00-00:00")) return 0;
  const parts = hoursStr.split('-').map(p => p.trim());
  if (parts.length !== 2) return 0;

  const [startH, startM] = parts[0].split(':').map(Number);
  const [endH, endM] = parts[1].split(':').map(Number);

  if (isNaN(startH) || isNaN(endH)) return 0;

  let startMinutes = startH * 60 + (startM || 0);
  let endMinutes = endH * 60 + (endM || 0);

  if (endMinutes < startMinutes) {
    // Overnight shift (e.g. 15:00 - 00:00 or 16:00 - 01:00)
    endMinutes += 24 * 60;
  }

  const durationHours = (endMinutes - startMinutes) / 60;
  return Math.max(0, durationHours);
}

/**
 * Excel-like smart fill algorithm
 */
export function computeFillUpdates(
  sourceRange: SelectionRange,
  targetRange: SelectionRange,
  visibleAgentIds: string[],
  dateStrings: string[],
  currentPlanning: Record<string, string>
): Record<string, string> {
  const updates: Record<string, string> = {};

  const srcMinRow = Math.min(sourceRange.startRow, sourceRange.endRow);
  const srcMaxRow = Math.max(sourceRange.startRow, sourceRange.endRow);
  const srcMinCol = Math.min(sourceRange.startCol, sourceRange.endCol);
  const srcMaxCol = Math.max(sourceRange.startCol, sourceRange.endCol);

  const srcHeight = srcMaxRow - srcMinRow + 1;
  const srcWidth = srcMaxCol - srcMinCol + 1;

  // Extract source grid 2D matrix
  const sourceMatrix: string[][] = [];
  for (let r = 0; r < srcHeight; r++) {
    const rowValues: string[] = [];
    const agentId = visibleAgentIds[srcMinRow + r];
    for (let c = 0; c < srcWidth; c++) {
      const dateStr = dateStrings[srcMinCol + c];
      const key = `${agentId}_${dateStr}`;
      rowValues.push(currentPlanning[key] || '');
    }
    sourceMatrix.push(rowValues);
  }

  const tgtMinRow = Math.min(targetRange.startRow, targetRange.endRow);
  const tgtMaxRow = Math.max(targetRange.startRow, targetRange.endRow);
  const tgtMinCol = Math.min(targetRange.startCol, targetRange.endCol);
  const tgtMaxCol = Math.max(targetRange.startCol, targetRange.endCol);

  for (let r = tgtMinRow; r <= tgtMaxRow; r++) {
    if (r < 0 || r >= visibleAgentIds.length) continue;
    const agentId = visibleAgentIds[r];

    for (let c = tgtMinCol; c <= tgtMaxCol; c++) {
      if (c < 0 || c >= dateStrings.length) continue;
      const dateStr = dateStrings[c];

      // Calculate relative source offset modulo source dimensions
      const relativeRow = ((r - srcMinRow) % srcHeight + srcHeight) % srcHeight;
      const relativeCol = ((c - srcMinCol) % srcWidth + srcWidth) % srcWidth;

      const fillValue = sourceMatrix[relativeRow]?.[relativeCol] || '';
      updates[`${agentId}_${dateStr}`] = fillValue;
    }
  }

  return updates;
}

/**
 * Parse clipboard text into a 2D grid matrix
 */
export function parseClipboardMatrix(rawText: string): string[][] {
  if (!rawText) return [];
  // Normalize Windows (\r\n), Mac (\r), and Linux (\n) line endings
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Strip only trailing empty newlines (do not strip internal empty cells)
  const trimmedEnd = normalized.replace(/\n+$/, '');
  if (!trimmedEnd && trimmedEnd !== '') return [];

  const lines = trimmedEnd.split('\n');
  return lines.map(line => line.split('\t'));
}

/**
 * Format a 2D grid matrix into tab-separated and newline-separated clipboard text
 */
export function formatMatrixToClipboardText(matrix: string[][]): string {
  if (!matrix || matrix.length === 0) return '';
  return matrix.map(row => row.join('\t')).join('\n');
}

/**
 * Compute updates to paste a 2D matrix starting at a target anchor cell or bounding area
 */
export function computePasteUpdates(
  matrix: string[][],
  targetAnchor: SelectionRange,
  visibleAgentIds: string[],
  dateStrings: string[]
): { updates: Record<string, string>; targetRange: SelectionRange } {
  const updates: Record<string, string> = {};
  if (!matrix || matrix.length === 0 || visibleAgentIds.length === 0 || dateStrings.length === 0) {
    return { updates, targetRange: targetAnchor };
  }

  const pasteH = matrix.length;
  const pasteW = Math.max(...matrix.map(row => row.length), 1);

  const tgtMinRow = Math.min(targetAnchor.startRow, targetAnchor.endRow);
  const tgtMaxRow = Math.max(targetAnchor.startRow, targetAnchor.endRow);
  const tgtMinCol = Math.min(targetAnchor.startCol, targetAnchor.endCol);
  const tgtMaxCol = Math.max(targetAnchor.startCol, targetAnchor.endCol);

  const targetH = tgtMaxRow - tgtMinRow + 1;
  const targetW = tgtMaxCol - tgtMinCol + 1;

  const applyH = Math.max(pasteH, targetH);
  const applyW = Math.max(pasteW, targetW);

  const startR = tgtMinRow;
  const startC = tgtMinCol;

  let maxUpdatedRow = startR;
  let maxUpdatedCol = startC;

  for (let r = 0; r < applyH; r++) {
    const curRow = startR + r;
    if (curRow >= visibleAgentIds.length) break;
    const agentId = visibleAgentIds[curRow];

    for (let c = 0; c < applyW; c++) {
      const curCol = startC + c;
      if (curCol >= dateStrings.length) break;
      const dateStr = dateStrings[curCol];

      const sourceRow = matrix[r % pasteH] || [];
      const val = sourceRow[c % (sourceRow.length || pasteW)] ?? '';

      updates[`${agentId}_${dateStr}`] = val.trim();
      maxUpdatedRow = Math.max(maxUpdatedRow, curRow);
      maxUpdatedCol = Math.max(maxUpdatedCol, curCol);
    }
  }

  return {
    updates,
    targetRange: {
      startRow: startR,
      startCol: startC,
      endRow: maxUpdatedRow,
      endCol: maxUpdatedCol
    }
  };
}

/**
 * Deduplicate a list of shifts to ensure unique IDs and clean rendering
 */
export function deduplicateShifts(rawShifts: Shift[]): Shift[] {
  if (!Array.isArray(rawShifts)) return [];
  const seenIds = new Set<string>();
  const result: Shift[] = [];

  for (const s of rawShifts) {
    if (!s || !s.id) continue;
    const cleanId = String(s.id).trim();
    if (!cleanId || seenIds.has(cleanId)) {
      continue;
    }

    seenIds.add(cleanId);
    result.push(s);
  }

  return result;
}
