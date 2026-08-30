import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Agent, Shift, SelectionRange, CellCoord, DragFillState } from '../types';
import { DateItem, MonthGroup } from '../utils/dateUtils';
import { 
  getShiftStyle, 
  computeFillUpdates, 
  calculateShiftDurationHours,
  parseClipboardMatrix,
  formatMatrixToClipboardText,
  computePasteUpdates
} from '../utils/shiftUtils';
import { ContextMenu } from './ContextMenu';
import { 
  GripVertical, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Building2, 
  X,
  Sparkles,
  ClipboardCheck
} from 'lucide-react';

// In-memory global clipboard buffer ensuring copy/paste works 100% reliably in all iframe/browser contexts
let globalPlanningClipboard: { matrix: string[][]; text: string } | null = null;

interface PlanningGridProps {
  agents: Agent[];
  shifts: Shift[];
  dates: DateItem[];
  monthGroups: MonthGroup[];
  planning: Record<string, string>;
  onUpdatePlanning: (updates: Record<string, string>, actionDescription: string) => void;
  onReorderAgents: (newAgents: Agent[]) => void;
  activeStampShift: string | null;
  onCellContextMenu?: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void;
  selectionRange: SelectionRange | null;
  onSelectionChange: (range: SelectionRange | null) => void;
  onOpenDateExtractor?: (date: Date) => void;
}

export const PlanningGrid: React.FC<PlanningGridProps> = ({
  agents,
  shifts,
  dates,
  monthGroups,
  planning,
  onUpdatePlanning,
  onReorderAgents,
  activeStampShift,
  onCellContextMenu,
  selectionRange,
  onSelectionChange,
  onOpenDateExtractor
}) => {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});
  const [agentSearch, setAgentSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');

  // Drag-to-select state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectAnchor, setSelectAnchor] = useState<CellCoord | null>(null);

  // Fill handle state
  const [fillState, setFillState] = useState<DragFillState>({
    isDragging: false,
    sourceRange: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
    targetRange: null,
    direction: null
  });

  // Direct keyboard input buffer (e.g. typing "M1", "RH")
  const [typingBuffer, setTypingBuffer] = useState('');

  // Drag and drop for Agents & Teams
  const [draggedAgentId, setDraggedAgentId] = useState<string | null>(null);
  const [draggedTeamName, setDraggedTeamName] = useState<string | null>(null);
  const [dropTargetAgentId, setDropTargetAgentId] = useState<string | null>(null);
  const [dropTargetTeamName, setDropTargetTeamName] = useState<string | null>(null);

  // Copied cells visual feedback indicator
  const [copiedRange, setCopiedRange] = useState<{
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
    count: number;
  } | null>(null);

  // Context Menu State inside PlanningGrid
  const [contextMenuState, setContextMenuState] = useState<{
    x: number;
    y: number;
    rowIndex: number;
    colIndex: number;
  } | null>(null);

  // Group agents by team
  const teams = React.useMemo(() => {
    const teamMap: Record<string, Agent[]> = {};
    const teamOrder: string[] = [];

    agents.forEach(agent => {
      const teamName = agent.team || 'Sans Équipe';
      if (!teamMap[teamName]) {
        teamMap[teamName] = [];
        teamOrder.push(teamName);
      }
      teamMap[teamName].push(agent);
    });

    // Sort agents within team by order
    teamOrder.forEach(t => {
      teamMap[t].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return { teamMap, teamOrder };
  }, [agents]);

  // Flattened visible agents list matching row indices in grid
  const visibleAgents = React.useMemo(() => {
    const result: { agent: Agent; team: string; isFirstInTeam: boolean }[] = [];

    teams.teamOrder.forEach(teamName => {
      if (teamFilter !== 'ALL' && teamName !== teamFilter) return;
      if (collapsedTeams[teamName]) return;

      const teamAgents = teams.teamMap[teamName] || [];
      teamAgents.forEach((agent, index) => {
        // Apply search
        const matchesSearch = agent.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
                              agent.station.toLowerCase().includes(agentSearch.toLowerCase()) ||
                              agent.team.toLowerCase().includes(agentSearch.toLowerCase());

        if (matchesSearch) {
          result.push({
            agent,
            team: teamName,
            isFirstInTeam: index === 0
          });
        }
      });
    });

    return result;
  }, [teams, collapsedTeams, agentSearch, teamFilter]);

  const visibleAgentIds = React.useMemo(() => {
    return visibleAgents.map(v => v.agent.id);
  }, [visibleAgents]);

  const dateStrings = React.useMemo(() => {
    return dates.map(d => d.dateStr);
  }, [dates]);

  // Normalized selection bounding coordinates
  const bounds = React.useMemo(() => {
    if (!selectionRange) return null;
    return {
      minRow: Math.min(selectionRange.startRow, selectionRange.endRow),
      maxRow: Math.max(selectionRange.startRow, selectionRange.endRow),
      minCol: Math.min(selectionRange.startCol, selectionRange.endCol),
      maxCol: Math.max(selectionRange.startCol, selectionRange.endCol)
    };
  }, [selectionRange]);

  // Check if a cell is inside the active selection
  const isCellSelected = useCallback((row: number, col: number) => {
    if (!bounds) return false;
    return row >= bounds.minRow && row <= bounds.maxRow && col >= bounds.minCol && col <= bounds.maxCol;
  }, [bounds]);

  // Check if cell is the primary active anchor cell
  const isCellAnchor = useCallback((row: number, col: number) => {
    if (!selectionRange) return false;
    return row === selectionRange.startRow && col === selectionRange.startCol;
  }, [selectionRange]);

  // Scroll to Today
  const scrollToToday = useCallback(() => {
    const todayIndex = dates.findIndex(d => d.isToday);
    if (todayIndex !== -1 && gridContainerRef.current) {
      const colWidth = 46;
      const scrollPos = todayIndex * colWidth - 200;
      gridContainerRef.current.scrollTo({
        left: Math.max(0, scrollPos),
        behavior: 'smooth'
      });
    }
  }, [dates]);

  // Auto-scroll to today on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Execute Copy of current selection bounds
  const executeCopy = useCallback(() => {
    if (!bounds) return;
    const matrix: string[][] = [];
    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      const agentId = visibleAgentIds[r];
      const rowVals: string[] = [];
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const dateStr = dateStrings[c];
        rowVals.push(planning[`${agentId}_${dateStr}`] || '');
      }
      matrix.push(rowVals);
    }
    const text = formatMatrixToClipboardText(matrix);
    globalPlanningClipboard = { matrix, text };

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch {}

    const count = (bounds.maxRow - bounds.minRow + 1) * (bounds.maxCol - bounds.minCol + 1);
    setCopiedRange({ ...bounds, count });
  }, [bounds, visibleAgentIds, dateStrings, planning]);

  // Execute Paste starting from the active selection range or anchor cell
  const executePaste = useCallback(async (explicitText?: string) => {
    if (!selectionRange) return;

    let matrix: string[][] | null = null;

    if (explicitText && explicitText.length > 0) {
      matrix = parseClipboardMatrix(explicitText);
    } else {
      // 1. Try browser system clipboard first
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const sysText = await navigator.clipboard.readText();
          if (sysText && sysText.trim().length > 0) {
            matrix = parseClipboardMatrix(sysText);
          }
        }
      } catch {
        // Fallback silently if clipboard permissions are restricted in iframe
      }

      // 2. Fallback to in-memory global clipboard if system clipboard was empty or restricted
      if (!matrix && globalPlanningClipboard) {
        matrix = globalPlanningClipboard.matrix;
      }
    }

    if (!matrix || matrix.length === 0) return;

    const { updates, targetRange } = computePasteUpdates(
      matrix,
      selectionRange,
      visibleAgentIds,
      dateStrings
    );

    const updateCount = Object.keys(updates).length;
    if (updateCount > 0) {
      onUpdatePlanning(updates, `Coller plage (${updateCount} cellules)`);
      onSelectionChange(targetRange);
      setCopiedRange(null);
    }
  }, [selectionRange, visibleAgentIds, dateStrings, onUpdatePlanning, onSelectionChange]);

  // Clear current selection
  const executeClear = useCallback(() => {
    if (!bounds) return;
    const updates: Record<string, string> = {};
    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      const agentId = visibleAgentIds[r];
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const dateStr = dateStrings[c];
        updates[`${agentId}_${dateStr}`] = '';
      }
    }
    onUpdatePlanning(updates, 'Effacer sélection');
  }, [bounds, visibleAgentIds, dateStrings, onUpdatePlanning]);

  // Apply shift code to all selected cells
  const executeApplyShift = useCallback((code: string) => {
    if (!bounds) return;
    const updates: Record<string, string> = {};
    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      const agentId = visibleAgentIds[r];
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const dateStr = dateStrings[c];
        updates[`${agentId}_${dateStr}`] = code;
      }
    }
    onUpdatePlanning(updates, `Appliquer shift ${code} (${Object.keys(updates).length} cellules)`);
  }, [bounds, visibleAgentIds, dateStrings, onUpdatePlanning]);

  // Duplicate shift across 7 days for current agent row
  const executeFillWeek = useCallback((rowIndex: number, colIndex: number) => {
    const agentId = visibleAgentIds[rowIndex];
    if (!agentId) return;

    const sourceDate = dateStrings[colIndex];
    const sourceShift = planning[`${agentId}_${sourceDate}`] || 'M1';

    const updates: Record<string, string> = {};
    for (let i = 0; i < 7; i++) {
      const targetCol = colIndex + i;
      if (targetCol < dateStrings.length) {
        const dStr = dateStrings[targetCol];
        updates[`${agentId}_${dStr}`] = sourceShift;
      }
    }
    onUpdatePlanning(updates, `Dupliquer shift ${sourceShift} sur 7 jours`);
  }, [visibleAgentIds, dateStrings, planning, onUpdatePlanning]);

  // Native Window Paste Listener
  useEffect(() => {
    function handleNativePaste(e: ClipboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (!selectionRange) return;
      const clipText = e.clipboardData?.getData('text/plain');
      if (clipText) {
        e.preventDefault();
        executePaste(clipText);
      }
    }

    window.addEventListener('paste', handleNativePaste);
    return () => window.removeEventListener('paste', handleNativePaste);
  }, [selectionRange, executePaste]);

  // Native Window Copy Listener
  useEffect(() => {
    function handleNativeCopy(e: ClipboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (!bounds) return;
      const matrix: string[][] = [];
      for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
        const agentId = visibleAgentIds[r];
        const rowVals: string[] = [];
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          const dateStr = dateStrings[c];
          rowVals.push(planning[`${agentId}_${dateStr}`] || '');
        }
        matrix.push(rowVals);
      }
      const text = formatMatrixToClipboardText(matrix);
      globalPlanningClipboard = { matrix, text };
      if (e.clipboardData) {
        e.preventDefault();
        e.clipboardData.setData('text/plain', text);
      }
      const count = (bounds.maxRow - bounds.minRow + 1) * (bounds.maxCol - bounds.minCol + 1);
      setCopiedRange({ ...bounds, count });
    }

    window.addEventListener('copy', handleNativeCopy);
    return () => window.removeEventListener('copy', handleNativeCopy);
  }, [bounds, visibleAgentIds, dateStrings, planning]);

  // Keyboard navigation, copy, paste, delete, and direct typing
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (!selectionRange) return;

      const { startRow, startCol, endRow, endCol } = selectionRange;
      const maxR = visibleAgents.length - 1;
      const maxC = dates.length - 1;

      // 1. Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        executeCopy();
        return;
      }

      // 2. Paste (Ctrl+V / Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        executePaste();
        return;
      }

      // 3. Delete / Backspace -> Clear selection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        executeClear();
        return;
      }

      // 4. Arrow keys Navigation (with Shift for range expansion)
      let dRow = 0;
      let dCol = 0;
      if (e.key === 'ArrowUp') dRow = -1;
      else if (e.key === 'ArrowDown') dRow = 1;
      else if (e.key === 'ArrowLeft') dCol = -1;
      else if (e.key === 'ArrowRight') dCol = 1;
      else if (e.key === 'Tab') {
        e.preventDefault();
        dCol = e.shiftKey ? -1 : 1;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        dRow = e.shiftKey ? -1 : 1;
      }

      if (dRow !== 0 || dCol !== 0) {
        e.preventDefault();
        if (e.shiftKey && e.key.startsWith('Arrow')) {
          // Expand selection box
          const newEndRow = Math.max(0, Math.min(maxR, endRow + dRow));
          const newEndCol = Math.max(0, Math.min(maxC, endCol + dCol));
          onSelectionChange({
            startRow,
            startCol,
            endRow: newEndRow,
            endCol: newEndCol
          });
        } else {
          // Move single selection
          const newR = Math.max(0, Math.min(maxR, startRow + dRow));
          const newC = Math.max(0, Math.min(maxC, startCol + dCol));
          onSelectionChange({
            startRow: newR,
            startCol: newC,
            endRow: newR,
            endCol: newC
          });
        }
        return;
      }

      // 5. Direct typing for Shift Codes (e.g. M1, m1, s1, RH, CA)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const char = e.key;
        const newBuf = (typingBuffer + char).slice(0, 6);
        setTypingBuffer(newBuf);

        // First try exact match, then case-insensitive match
        const matchedShift = 
          shifts.find(s => s.code === newBuf) || 
          shifts.find(s => s.code.toLowerCase() === newBuf.toLowerCase());

        if (matchedShift) {
          executeApplyShift(matchedShift.code);
          setTypingBuffer('');
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectionRange, 
    bounds, 
    visibleAgents, 
    visibleAgentIds, 
    dateStrings, 
    dates, 
    planning, 
    shifts, 
    typingBuffer, 
    executeCopy,
    executePaste,
    executeClear,
    executeApplyShift,
    onSelectionChange
  ]);

  // Clear typing buffer after inactivity
  useEffect(() => {
    if (typingBuffer) {
      const timer = setTimeout(() => setTypingBuffer(''), 1200);
      return () => clearTimeout(timer);
    }
  }, [typingBuffer]);

  // Global mouse up for Drag-to-select and Fill Handle release
  useEffect(() => {
    function handleGlobalMouseUp() {
      if (isSelecting) {
        setIsSelecting(false);
      }

      if (fillState.isDragging && fillState.targetRange) {
        const updates = computeFillUpdates(
          fillState.sourceRange,
          fillState.targetRange,
          visibleAgentIds,
          dateStrings,
          planning
        );

        onUpdatePlanning(updates, `Recopie poignée (${Object.keys(updates).length} cellules)`);

        onSelectionChange({
          startRow: Math.min(fillState.sourceRange.startRow, fillState.targetRange.startRow),
          startCol: Math.min(fillState.sourceRange.startCol, fillState.targetRange.startCol),
          endRow: Math.max(fillState.sourceRange.endRow, fillState.targetRange.endRow),
          endCol: Math.max(fillState.sourceRange.endCol, fillState.targetRange.endCol)
        });

        setFillState({
          isDragging: false,
          sourceRange: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
          targetRange: null,
          direction: null
        });
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, fillState, visibleAgentIds, dateStrings, planning, onUpdatePlanning, onSelectionChange]);

  // Handle cell mouse down (Selection start or Stamp)
  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;

    if (activeStampShift) {
      const agentId = visibleAgentIds[row];
      const dateStr = dateStrings[col];
      onUpdatePlanning({ [`${agentId}_${dateStr}`]: activeStampShift }, `Tampon: ${activeStampShift}`);
      return;
    }

    if (e.shiftKey && selectionRange) {
      onSelectionChange({
        startRow: selectionRange.startRow,
        startCol: selectionRange.startCol,
        endRow: row,
        endCol: col
      });
    } else {
      setIsSelecting(true);
      setSelectAnchor({ rowIndex: row, colIndex: col });
      onSelectionChange({
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col
      });
    }
  };

  // Handle cell mouse over during Drag-to-select
  const handleCellMouseEnter = (row: number, col: number) => {
    if (isSelecting && selectAnchor) {
      onSelectionChange({
        startRow: selectAnchor.rowIndex,
        startCol: selectAnchor.colIndex,
        endRow: row,
        endCol: col
      });
    } else if (fillState.isDragging && bounds) {
      let targetRange: SelectionRange | null = null;
      let direction: 'down' | 'up' | 'right' | 'left' | null = null;

      if (row > bounds.maxRow) {
        direction = 'down';
        targetRange = {
          startRow: bounds.maxRow + 1,
          startCol: bounds.minCol,
          endRow: row,
          endCol: bounds.maxCol
        };
      } else if (row < bounds.minRow) {
        direction = 'up';
        targetRange = {
          startRow: row,
          startCol: bounds.minCol,
          endRow: bounds.minRow - 1,
          endCol: bounds.maxCol
        };
      } else if (col > bounds.maxCol) {
        direction = 'right';
        targetRange = {
          startRow: bounds.minRow,
          startCol: bounds.maxCol + 1,
          endRow: bounds.maxRow,
          endCol: col
        };
      } else if (col < bounds.minCol) {
        direction = 'left';
        targetRange = {
          startRow: bounds.minRow,
          startCol: col,
          endRow: bounds.maxRow,
          endCol: bounds.minCol - 1
        };
      }

      setFillState(prev => ({
        ...prev,
        targetRange,
        direction
      }));
    }
  };

  // Start dragging the Fill Handle
  const handleFillHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectionRange) return;

    setFillState({
      isDragging: true,
      sourceRange: { ...selectionRange },
      targetRange: null,
      direction: null
    });
  };

  // Toggle Collapse Team
  const toggleTeamCollapse = (teamName: string) => {
    setCollapsedTeams(prev => ({
      ...prev,
      [teamName]: !prev[teamName]
    }));
  };

  // Team Drag & Drop
  const handleTeamDragStart = (teamName: string, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', `team:${teamName}`);
    setDraggedTeamName(teamName);
  };

  const handleTeamDragOver = (teamName: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTeamName && draggedTeamName !== teamName) {
      setDropTargetTeamName(teamName);
    }
  };

  const handleTeamDrop = (targetTeamName: string) => {
    if (!draggedTeamName || draggedTeamName === targetTeamName) {
      setDraggedTeamName(null);
      setDropTargetTeamName(null);
      return;
    }

    const currentTeams = [...teams.teamOrder];
    const srcIdx = currentTeams.indexOf(draggedTeamName);
    const tgtIdx = currentTeams.indexOf(targetTeamName);

    if (srcIdx !== -1 && tgtIdx !== -1) {
      currentTeams.splice(srcIdx, 1);
      currentTeams.splice(tgtIdx, 0, draggedTeamName);

      const newAgentsList: Agent[] = [];
      let globalOrder = 1;
      currentTeams.forEach(tName => {
        const teamAgents = teams.teamMap[tName] || [];
        teamAgents.forEach((ag, agIdx) => {
          newAgentsList.push({
            ...ag,
            order: agIdx + 1
          });
          globalOrder++;
        });
      });

      onReorderAgents(newAgentsList);
    }

    setDraggedTeamName(null);
    setDropTargetTeamName(null);
  };

  // Agent Drag & Drop
  const handleAgentDragStart = (agentId: string, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', `agent:${agentId}`);
    setDraggedAgentId(agentId);
  };

  const handleAgentDragOver = (agentId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedAgentId && draggedAgentId !== agentId) {
      setDropTargetAgentId(agentId);
    }
  };

  const handleAgentDrop = (targetAgentId: string) => {
    if (!draggedAgentId || draggedAgentId === targetAgentId) {
      setDraggedAgentId(null);
      setDropTargetAgentId(null);
      return;
    }

    const srcAgent = agents.find(a => a.id === draggedAgentId);
    const tgtAgent = agents.find(a => a.id === targetAgentId);

    if (srcAgent && tgtAgent) {
      const newAgents = [...agents];
      const srcIdx = newAgents.findIndex(a => a.id === draggedAgentId);
      newAgents.splice(srcIdx, 1);

      const updatedSrcAgent = {
        ...srcAgent,
        team: tgtAgent.team
      };

      const tgtIdx = newAgents.findIndex(a => a.id === targetAgentId);
      newAgents.splice(tgtIdx, 0, updatedSrcAgent);

      const teamCounts: Record<string, number> = {};
      const reindexed = newAgents.map(ag => {
        teamCounts[ag.team] = (teamCounts[ag.team] || 0) + 1;
        return {
          ...ag,
          order: teamCounts[ag.team]
        };
      });

      onReorderAgents(reindexed);
    }

    setDraggedAgentId(null);
    setDropTargetAgentId(null);
  };

  // Compute selection stats for high visibility
  const selectionInfo = React.useMemo(() => {
    if (!bounds) return null;
    const rowCount = bounds.maxRow - bounds.minRow + 1;
    const colCount = bounds.maxCol - bounds.minCol + 1;
    const totalCells = rowCount * colCount;
    return { rowCount, colCount, totalCells };
  }, [bounds]);

  return (
    <div
      ref={gridContainerRef}
      id="spreadsheet-grid-viewport"
      className="flex-1 overflow-auto bg-slate-950 relative select-none"
    >
      <div className="inline-block min-w-full">
        <table className="border-collapse table-fixed text-xs font-mono-code w-max">
          {/* Header 1: Month Grouping Row (Sticky top: 0) */}
          <thead className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 shadow-md">
            <tr className="h-9">
              {/* Top-left frozen corner (Sticky left: 0) */}
              <th
                className="sticky left-0 z-30 bg-slate-900 border-r border-b border-slate-800 px-3 w-64 min-w-[260px] text-left text-xs font-semibold text-slate-300 shadow-sm"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-[12px] tracking-tight">Équipes & Agents</span>
                  </div>

                  {/* Team Quick Filter */}
                  <select
                    id="station-filter-dropdown"
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 font-medium focus:outline-none focus:border-blue-500 hover:border-slate-700 transition-colors cursor-pointer"
                    title="Filtrer par équipe"
                  >
                    <option value="ALL">Toutes équipes</option>
                    {teams.teamOrder.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
              </th>

              {/* Month Groups Spanning Columns */}
              {monthGroups.map((group, gIdx) => (
                <th
                  key={gIdx}
                  colSpan={group.colSpan}
                  className="border-r border-slate-800 px-2 text-center text-xs font-bold text-slate-200 bg-slate-900/95 tracking-wide"
                >
                  <div className="flex items-center justify-center gap-1.5 py-1">
                    <span className="text-blue-400 capitalize">{group.label}</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      ({group.colSpan} jours)
                    </span>
                  </div>
                </th>
              ))}
            </tr>

            {/* Header 2: Days Row (Sticky top: 36px) */}
            <tr className="h-10 bg-slate-900 border-b border-slate-800 text-[11px]">
              {/* Search input in frozen header column */}
              <th className="sticky left-0 z-30 bg-slate-900 border-r border-slate-800 px-2 text-left">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
                  <input
                    id="agent-filter-search-input"
                    type="text"
                    placeholder="Rechercher un agent..."
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    className="w-full pl-6 pr-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {agentSearch && (
                    <button
                      onClick={() => setAgentSearch('')}
                      className="absolute right-1.5 top-1.5 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </th>

              {/* Day Headers with High-Visibility Selection Indicator */}
              {dates.map((d, colIdx) => {
                const isSelectedInCol = bounds && colIdx >= bounds.minCol && colIdx <= bounds.maxCol;

                return (
                  <th
                    key={d.dateStr}
                    id={`header-day-${d.dateStr}`}
                    onClick={() => {
                      // Select entire column
                      onSelectionChange({
                        startRow: 0,
                        startCol: colIdx,
                        endRow: Math.max(0, visibleAgents.length - 1),
                        endCol: colIdx
                      });
                    }}
                    onDoubleClick={() => {
                      if (onOpenDateExtractor) {
                        onOpenDateExtractor(d.date);
                      }
                    }}
                    title={`Cliquez pour sélectionner la colonne, double-cliquez pour extraire les shifts du ${d.dateStr}`}
                    className={`
                      w-11 min-w-[44px] max-w-[44px] text-center border-r border-slate-800/80 p-0 font-medium transition-all cursor-pointer select-none
                      ${isSelectedInCol 
                        ? 'bg-blue-950/90 text-blue-200 border-b-2 border-b-blue-400 font-bold shadow-inner' 
                        : d.isToday 
                          ? 'bg-blue-950/40 border-b-2 border-b-blue-500' 
                          : d.isWeekend 
                            ? 'bg-slate-950/80 hover:bg-slate-800/60' 
                            : 'bg-slate-900 hover:bg-slate-800/60'}
                    `}
                  >
                    <div className="flex flex-col items-center justify-center py-1">
                      <span className={`text-[10px] ${isSelectedInCol ? 'text-blue-300 font-bold' : d.isWeekend ? 'text-slate-500' : 'text-slate-400'}`}>
                        {d.dayNameShort}
                      </span>
                      <span
                        className={`
                          text-xs font-bold leading-none mt-0.5 px-1 rounded transition-colors
                          ${isSelectedInCol 
                            ? 'bg-blue-500 text-white shadow-sm' 
                            : d.isToday 
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/50' 
                              : d.isWeekend 
                                ? 'text-slate-400' 
                                : 'text-slate-200'}
                        `}
                      >
                        {d.dayNumber}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body: Teams & Agents */}
          <tbody className="divide-y divide-slate-800/80">
            {teams.teamOrder.map((teamName) => {
              if (teamFilter !== 'ALL' && teamName !== teamFilter) {
                return null;
              }

              const teamAgents = teams.teamMap[teamName] || [];
              const isCollapsed = collapsedTeams[teamName];

              const matchingAgents = teamAgents.filter(ag => {
                const matchesSearch = ag.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
                                      ag.station.toLowerCase().includes(agentSearch.toLowerCase()) ||
                                      ag.team.toLowerCase().includes(agentSearch.toLowerCase());
                return matchesSearch;
              });

              if (matchingAgents.length === 0 && agentSearch) {
                return null;
              }

              return (
                <React.Fragment key={teamName}>
                  {/* Team Group Banner Header Row */}
                  <tr
                    id={`team-row-${teamName}`}
                    draggable
                    onDragStart={(e) => handleTeamDragStart(teamName, e)}
                    onDragOver={(e) => handleTeamDragOver(teamName, e)}
                    onDrop={() => handleTeamDrop(teamName)}
                    className={`
                      h-7 bg-slate-900/90 border-t border-b border-slate-700/80 font-sans transition-colors
                      ${dropTargetTeamName === teamName ? 'border-t-2 border-t-blue-500 bg-blue-950/40' : ''}
                    `}
                  >
                    {/* Frozen Left Team Banner Cell */}
                    <td
                      className="sticky left-0 z-10 bg-slate-900/95 border-r border-slate-800 px-2 text-left"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            id={`toggle-team-${teamName}`}
                            onClick={() => toggleTeamCollapse(teamName)}
                            className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <span
                            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300"
                            title="Glisser pour réordonner l'équipe"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-bold text-slate-200 tracking-wide text-[11px]">
                            {teamName}
                          </span>
                        </div>

                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded-full font-mono-code">
                          {teamAgents.length} agents
                        </span>
                      </div>
                    </td>

                    {/* Span across all date columns */}
                    <td
                      colSpan={dates.length}
                      className="bg-slate-950/40 border-r border-slate-800"
                    />
                  </tr>

                  {/* Agent Rows if team is not collapsed */}
                  {!isCollapsed && matchingAgents.map((agent) => {
                    const rowIndex = visibleAgents.findIndex(v => v.agent.id === agent.id);
                    const isRowSelected = bounds && rowIndex >= bounds.minRow && rowIndex <= bounds.maxRow;

                    let totalHours = 0;
                    dates.forEach(d => {
                      const code = planning[`${agent.id}_${d.dateStr}`];
                      const shift = shifts.find(s => s.code === code);
                      if (shift) {
                        totalHours += calculateShiftDurationHours(shift.hours);
                      }
                    });

                    return (
                      <tr
                        key={agent.id}
                        id={`agent-row-${agent.id}`}
                        draggable
                        onDragStart={(e) => handleAgentDragStart(agent.id, e)}
                        onDragOver={(e) => handleAgentDragOver(agent.id, e)}
                        onDrop={() => handleAgentDrop(agent.id)}
                        className={`
                          h-9 hover:bg-slate-900/60 transition-colors group
                          ${dropTargetAgentId === agent.id ? 'border-t-2 border-t-blue-500 bg-blue-950/30' : ''}
                          ${isRowSelected ? 'bg-blue-950/20' : ''}
                        `}
                      >
                        {/* Frozen Left Agent Card with high-visibility selection accent */}
                        <td
                          className={`
                            sticky left-0 z-10 border-r border-slate-800 px-2 text-left font-sans transition-colors
                            ${isRowSelected 
                              ? 'bg-slate-850 border-l-4 border-l-blue-500 shadow-sm' 
                              : 'bg-slate-900 border-l-4 border-l-transparent'}
                          `}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 flex-shrink-0"
                                title="Glisser pour réordonner l'agent"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>

                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${isRowSelected ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                                {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>

                              <div className="min-w-0 truncate">
                                <span className={`font-semibold text-xs truncate block ${isRowSelected ? 'text-white font-bold' : 'text-slate-200'}`}>
                                  {agent.name}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span
                                className="text-[9px] font-mono-code px-1 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700"
                                title={`Station: ${agent.station}`}
                              >
                                {agent.station}
                              </span>
                              <span
                                className="text-[9px] font-mono-code px-1 py-0.5 text-slate-400"
                                title="Total heures planifiées"
                              >
                                {totalHours}h
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date Shift Cells with High-Visibility Excel Selection & Perimeter Outlines */}
                        {dates.map((d, colIndex) => {
                          const key = `${agent.id}_${d.dateStr}`;
                          const shiftCode = planning[key] || '';
                          const shiftObj = shifts.find(s => s.code === shiftCode);
                          const shiftStyle = getShiftStyle(shiftCode, shiftObj?.color);

                          const selected = isCellSelected(rowIndex, colIndex);
                          const anchor = isCellAnchor(rowIndex, colIndex);

                          // Selection perimeter edges for Excel-style bounding border
                          const isTopEdge = bounds && selected && rowIndex === bounds.minRow;
                          const isBottomEdge = bounds && selected && rowIndex === bounds.maxRow;
                          const isLeftEdge = bounds && selected && colIndex === bounds.minCol;
                          const isRightEdge = bounds && selected && colIndex === bounds.maxCol;

                          // Bottom-right corner of the active selection (for Fill Handle)
                          const isBottomRightOfSelection = bounds &&
                            rowIndex === bounds.maxRow &&
                            colIndex === bounds.maxCol;

                          // Inside active Fill Handle preview
                          const isInFillTarget = fillState.isDragging &&
                            fillState.targetRange &&
                            rowIndex >= Math.min(fillState.targetRange.startRow, fillState.targetRange.endRow) &&
                            rowIndex <= Math.max(fillState.targetRange.startRow, fillState.targetRange.endRow) &&
                            colIndex >= Math.min(fillState.targetRange.startCol, fillState.targetRange.endCol) &&
                            colIndex <= Math.max(fillState.targetRange.startCol, fillState.targetRange.endCol);

                          // Inside copied source range (Marching ants animation)
                          const isInCopiedSource = copiedRange &&
                            rowIndex >= copiedRange.minRow &&
                            rowIndex <= copiedRange.maxRow &&
                            colIndex >= copiedRange.minCol &&
                            colIndex <= copiedRange.maxCol;

                          return (
                            <td
                              key={d.dateStr}
                              id={`cell-${agent.id}-${d.dateStr}`}
                              onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                              onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Retain multi-selection if clicking inside already selected bounds
                                let preserveSelection = false;
                                if (bounds) {
                                  if (
                                    rowIndex >= bounds.minRow &&
                                    rowIndex <= bounds.maxRow &&
                                    colIndex >= bounds.minCol &&
                                    colIndex <= bounds.maxCol
                                  ) {
                                    preserveSelection = true;
                                  }
                                }

                                if (!preserveSelection) {
                                  onSelectionChange({
                                    startRow: rowIndex,
                                    startCol: colIndex,
                                    endRow: rowIndex,
                                    endCol: colIndex
                                  });
                                }

                                setContextMenuState({
                                  x: e.clientX,
                                  y: e.clientY,
                                  rowIndex,
                                  colIndex
                                });

                                if (onCellContextMenu) {
                                  onCellContextMenu(e, rowIndex, colIndex);
                                }
                              }}
                              className={`
                                relative text-center p-0 cursor-pointer select-none transition-colors
                                ${d.isWeekend ? 'bg-slate-950/60' : 'bg-slate-950/20'}
                                ${d.isToday ? 'bg-blue-950/20' : ''}
                                ${selected ? 'bg-blue-600/35 z-10' : 'hover:bg-slate-800/40'}
                                ${anchor ? 'ring-2 ring-cyan-300 ring-inset bg-blue-600/50 shadow-inner z-20' : ''}
                                ${isTopEdge ? 'border-t-2 border-t-blue-400' : 'border-t border-t-slate-800/80'}
                                ${isBottomEdge ? 'border-b-2 border-b-blue-400' : 'border-b border-b-slate-800/80'}
                                ${isLeftEdge ? 'border-l-2 border-l-blue-400' : 'border-l border-l-slate-800/80'}
                                ${isRightEdge ? 'border-r-2 border-r-blue-400' : 'border-r border-r-slate-800/80'}
                                ${isInFillTarget ? 'marching-ants bg-blue-600/40 ring-2 ring-dashed ring-cyan-400 z-20' : ''}
                                ${isInCopiedSource ? 'ring-2 ring-dashed ring-emerald-400 z-20 bg-emerald-950/30' : ''}
                              `}
                            >
                              <div className="w-full h-full min-h-[34px] flex items-center justify-center px-0.5">
                                {shiftCode ? (
                                  <span
                                    className={`
                                      px-1.5 py-0.5 rounded text-[11px] font-bold border tracking-wider shadow-xs transition-transform
                                      ${shiftStyle.badgeClass}
                                      ${selected ? 'ring-1 ring-blue-300/60 shadow-sm' : ''}
                                    `}
                                    style={shiftStyle.customStyle}
                                    title={`${agent.name} · ${d.dateStr}\nShift: ${shiftCode} (${shiftObj?.hours || 'N/A'})`}
                                  >
                                    {shiftCode}
                                  </span>
                                ) : (
                                  <span className={`text-[10px] ${selected ? 'text-blue-300 font-bold' : 'text-slate-700'}`}>·</span>
                                )}
                              </div>

                              {/* EXCEL FILL HANDLE (Poignée de recopie high-visibility) */}
                              {isBottomRightOfSelection && (
                                <div
                                  id="excel-fill-handle"
                                  onMouseDown={handleFillHandleMouseDown}
                                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 ring-2 ring-white cursor-crosshair z-30 rounded-xs shadow-md hover:scale-125 transition-transform"
                                  title="Poignée de recopie : Glisser pour dupliquer ou étendre la séquence"
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Selection Feedback Indicator */}
      {selectionInfo && selectionInfo.totalCells > 1 && (
        <div
          id="selection-status-badge"
          className="fixed bottom-14 left-6 bg-slate-900/95 border border-blue-500/50 shadow-xl px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 z-30 font-mono-code text-blue-200 backdrop-blur-sm"
        >
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span>Sélection : <strong>{selectionInfo.rowCount}</strong> lig. × <strong>{selectionInfo.colCount}</strong> col. (<strong>{selectionInfo.totalCells}</strong> cellules)</span>
        </div>
      )}

      {/* Floating Copied Cells Feedback Indicator */}
      {copiedRange && (
        <div
          id="clipboard-status-badge"
          className="fixed bottom-14 right-6 bg-slate-900/95 border border-emerald-500/60 shadow-2xl px-3.5 py-2 rounded-xl text-xs flex items-center gap-2.5 z-40 font-mono-code text-emerald-200 backdrop-blur-md"
        >
          <ClipboardCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-bounce" />
          <span><strong>{copiedRange.count}</strong> cellule(s) copiée(s) · Clic sur destination puis <strong>Ctrl+V</strong> (ou Coller)</span>
          <button
            onClick={() => setCopiedRange(null)}
            className="ml-1 p-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            title="Masquer l'indicateur"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Typing buffer indicator floating badge */}
      {typingBuffer && (
        <div
          id="typing-buffer-indicator"
          className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-2xl font-mono-code font-bold text-xs flex items-center gap-2 z-50 animate-bounce"
        >
          <span>Saisie en cours :</span>
          <span className="bg-slate-900 px-2 py-0.5 rounded text-amber-300">{typingBuffer}</span>
        </div>
      )}

      {/* Internal Full-Featured Context Menu */}
      {contextMenuState && (
        <ContextMenu
          x={contextMenuState.x}
          y={contextMenuState.y}
          onClose={() => setContextMenuState(null)}
          onSelectShift={(code) => {
            executeApplyShift(code);
            setContextMenuState(null);
          }}
          onCopy={() => {
            executeCopy();
            setContextMenuState(null);
          }}
          onPaste={() => {
            executePaste();
            setContextMenuState(null);
          }}
          onClear={() => {
            executeClear();
            setContextMenuState(null);
          }}
          onFillWeek={() => {
            executeFillWeek(contextMenuState.rowIndex, contextMenuState.colIndex);
            setContextMenuState(null);
          }}
          onExtractDateShifts={() => {
            const dateItem = dates[contextMenuState.colIndex];
            if (dateItem && onOpenDateExtractor) {
              onOpenDateExtractor(dateItem.date);
            }
          }}
          shifts={shifts}
        />
      )}
    </div>
  );
};
