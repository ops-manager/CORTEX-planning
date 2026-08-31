export type ShiftSeason = 'all' | 'winter' | 'summer';

export type UserRole = 'admin' | 'manager' | 'viewer';
export type UserStatus = 'approved' | 'pending' | 'rejected' | 'disabled';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  agentId?: string;
  agentName?: string;
  createdAt: string;
  lastLoginAt: string;
  approvedAt?: string;
  approvedBy?: string;
  requestReason?: string;
  notes?: string;
}

export interface PreApprovedEmail {
  email: string;
  role: UserRole;
  agentId?: string;
  agentName?: string;
  addedAt: string;
  addedBy: string;
}

export interface AccessControlSettings {
  autoApprovalEnabled: boolean;
  defaultRole: UserRole;
  allowedDomains: string[];
  adminEmails: string[];
  superAdminUid?: string;
  preApprovedEmails?: PreApprovedEmail[];
  allowManagersProgramme?: boolean;
}

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

export type SwapRequestStatus = 
  | 'pending_target'      // En attente d'acceptation par l'agent destinataire
  | 'rejected_by_target'  // Refusé par l'agent destinataire
  | 'pending_manager'     // Accepté par l'agent -> En attente de validation par un manager
  | 'rejected_by_manager' // Refusé par un manager
  | 'approved';           // Validé par un manager -> Échange appliqué automatiquement

export interface ShiftSwapRequest {
  id: string;
  requesterUid: string;
  requesterEmail: string;
  requesterName: string;
  requesterAgentId: string;
  requesterAgentName: string;
  targetAgentId: string;
  targetAgentName: string;
  targetUid?: string;
  targetEmail?: string;
  dates: string[]; // ['2026-08-31', '2026-09-01']
  requesterShifts: Record<string, string>; // dateStr -> shiftCode
  targetShifts: Record<string, string>; // dateStr -> shiftCode
  status: SwapRequestStatus;
  targetDecisionAt?: string;
  targetDecisionBy?: string;
  managerUid?: string;
  managerEmail?: string;
  managerName?: string;
  managerDecisionAt?: string;
  createdAt: string;
  updatedAt: string;
  requesterNotified?: boolean;
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
