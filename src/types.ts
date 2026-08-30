export type ShiftSeason = 'all' | 'winter' | 'summer';

export interface Agent {
  id: string;
  name: string;
  team: string;
  order: number;
  station: string;
  defaultMissionId?: string;
  ownerId?: string;
}

export interface Shift {
  id: string;
  code: string;
  hours: string;
  order: number;
  label?: string;
  color?: string;
  season?: ShiftSeason;
  hidden?: boolean;
  defaultMissionId?: string;
  defaultPause?: string;
  ownerId?: string;
}

export interface CellCoord {
  rowIndex: number; // Index in flattened visible agent list
  colIndex: number; // Index in dates array
}

export interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface DragFillState {
  isDragging: boolean;
  sourceRange: SelectionRange;
  targetRange: SelectionRange | null;
  direction: 'down' | 'up' | 'right' | 'left' | null;
}

export interface HistoryAction {
  description: string;
  previousPlanning: Record<string, string>;
  newPlanning: Record<string, string>;
}

export interface ShiftStats {
  totalHours: number;
  shiftCounts: Record<string, number>;
  workedDays: number;
  restDays: number;
}

export interface DailyCoverage {
  dateStr: string;
  morning: number;
  day: number;
  evening: number;
  night: number;
  rest: number;
  leaves: number;
  totalActive: number;
}

export interface ApiToken {
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
