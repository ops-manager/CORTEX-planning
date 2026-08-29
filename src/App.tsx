import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Agent, Shift, SelectionRange, HistoryAction, ShiftSeason } from './types';
import { API_IMPORTED_AGENTS, API_IMPORTED_SHIFTS, generateInitialSchedule } from './data/mockData';
import { 
  generateDateRange, 
  groupDatesByMonth, 
  formatToDateStr, 
  DateItem 
} from './utils/dateUtils';
import { deduplicateShifts } from './utils/shiftUtils';
import { Header } from './components/Header';
import { PlanningGrid } from './components/PlanningGrid';
import { ShiftLegendSidebar } from './components/ShiftLegendSidebar';
import { StatsBar } from './components/StatsBar';
import { ContextMenu } from './components/ContextMenu';
import { AgentManagerModal } from './components/AgentManagerModal';
import { 
  initializeFirestoreIfNeeded, 
  resetAllDataToFirestore, 
  savePlanningToFirestore, 
  saveAgentsToFirestore,
  createAgentInFirestore,
  updateAgentInFirestore,
  deleteAgentFromFirestore,
  createShiftInFirestore,
  updateShiftInFirestore,
  deleteShiftFromFirestore
} from './firebase';

export default function App() {
  // 1. Backend & Data States
  const [agents, setAgents] = useState<Agent[]>(API_IMPORTED_AGENTS);
  const [shifts, setShifts] = useState<Shift[]>(API_IMPORTED_SHIFTS);
  const [planning, setPlanning] = useState<Record<string, string>>({});
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2. Date Navigation States
  const [centerDate, setCenterDate] = useState<Date>(() => new Date());
  const [viewRangeDays, setViewRangeDays] = useState<number>(35);

  // 3. Selection & Tools States
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [activeStampShift, setActiveStampShift] = useState<string | null>(null);
  const [activeSeasonFilter, setActiveSeasonFilter] = useState<ShiftSeason>('all');
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(true);
  const [isStatsExpanded, setIsStatsExpanded] = useState<boolean>(false);
  const [isAgentManagerOpen, setIsAgentManagerOpen] = useState<boolean>(false);

  // 4. Undo / Redo History Stack
  const [historyStack, setHistoryStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  // 5. Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    rowIndex: number;
    colIndex: number;
  } | null>(null);

  // Generate Date Horizon
  const dates: DateItem[] = useMemo(() => {
    return generateDateRange(centerDate, 5, viewRangeDays);
  }, [centerDate, viewRangeDays]);

  const monthGroups = useMemo(() => {
    return groupDatesByMonth(dates);
  }, [dates]);

  const dateStrings = useMemo(() => {
    return dates.map(d => d.dateStr);
  }, [dates]);

  // Load from Firestore (or fallback to backend API) on initial mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        // 1. First attempt to initialize/load from Firestore
        const firestoreData = await initializeFirestoreIfNeeded();

        if (!isMounted) return;

        if (firestoreData && firestoreData.agents.length > 0) {
          setAgents(firestoreData.agents);
          setShifts(deduplicateShifts(firestoreData.shifts.length > 0 ? firestoreData.shifts : API_IMPORTED_SHIFTS));
          setPlanning(firestoreData.planning || {});
          setIsFirestoreConnected(true);
        } else {
          // Fallback to local default schedule if empty
          const initSchedule = generateInitialSchedule(API_IMPORTED_AGENTS, dateStrings);
          setAgents(API_IMPORTED_AGENTS);
          setShifts(deduplicateShifts(API_IMPORTED_SHIFTS));
          setPlanning(initSchedule);
        }
      } catch (err) {
        console.warn('Firestore load failed, using local imported API dataset:', err);
        const initSchedule = generateInitialSchedule(API_IMPORTED_AGENTS, dateStrings);
        if (isMounted) {
          setAgents(API_IMPORTED_AGENTS);
          setShifts(deduplicateShifts(API_IMPORTED_SHIFTS));
          setPlanning(initSchedule);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save changes to Firestore and localStorage
  const persistPlanning = useCallback((newPlanning: Record<string, string>) => {
    try {
      localStorage.setItem('cortex_planning_state', JSON.stringify(newPlanning));
      // Persist directly to Firestore
      savePlanningToFirestore(newPlanning).catch(err => {
        console.warn('Firestore planning sync error:', err);
      });
      // Also update Express backend for compatibility
      fetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planning: newPlanning })
      }).catch(() => {});
    } catch {}
  }, []);

  // Update planning with undo/redo record
  const handleUpdatePlanning = useCallback((
    updates: Record<string, string>,
    actionDescription: string = 'Modification planning'
  ) => {
    setPlanning(prev => {
      const nextPlanning = { ...prev, ...updates };

      const action: HistoryAction = {
        description: actionDescription,
        previousPlanning: { ...prev },
        newPlanning: nextPlanning
      };

      setHistoryStack(h => [...h.slice(-30), action]);
      setRedoStack([]);
      persistPlanning(nextPlanning);

      return nextPlanning;
    });
  }, [persistPlanning]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) return;
    const lastAction = historyStack[historyStack.length - 1];

    setPlanning(lastAction.previousPlanning);
    persistPlanning(lastAction.previousPlanning);

    setHistoryStack(h => h.slice(0, -1));
    setRedoStack(r => [...r, lastAction]);
  }, [historyStack, persistPlanning]);

  // Redo
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextAction = redoStack[redoStack.length - 1];

    setPlanning(nextAction.newPlanning);
    persistPlanning(nextAction.newPlanning);

    setRedoStack(r => r.slice(0, -1));
    setHistoryStack(h => [...h, nextAction]);
  }, [redoStack, persistPlanning]);

  // Reorder agents & teams with Firestore sync
  const handleReorderAgents = useCallback((newAgents: Agent[]) => {
    setAgents(newAgents);
    saveAgentsToFirestore(newAgents).catch(err => {
      console.warn('Firestore agents sync error:', err);
    });
    fetch('/api/agents/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agents: newAgents })
    }).catch(() => {});
  }, []);

  // Reset entire dataset to the imported API data with Firestore persistence
  const handleResetToApiDataset = useCallback(async () => {
    if (!window.confirm('Voulez-vous réinitialiser tout le jeu de données avec les agents et shifts de l\'API vers Firestore ?')) {
      return;
    }
    try {
      setIsLoading(true);
      const result = await resetAllDataToFirestore();
      setAgents(result.agents);
      setShifts(deduplicateShifts(result.shifts));
      setPlanning(result.planning);
      setHistoryStack([]);
      setRedoStack([]);
      setIsFirestoreConnected(true);
      localStorage.setItem('cortex_planning_state', JSON.stringify(result.planning));
    } catch (err) {
      console.error('Failed to reset dataset:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==========================================
  // AGENT CRUD HANDLERS
  // ==========================================
  const handleCreateAgent = useCallback(async (newAgent: Agent) => {
    try {
      // 1. Save to Firestore
      await createAgentInFirestore(newAgent);

      // 2. Also inform Express server
      fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      }).catch(() => {});

      // 3. Update local state
      setAgents(prev => {
        const next = [...prev, newAgent];
        return next;
      });
    } catch (err) {
      console.error('Failed to create agent:', err);
      throw err;
    }
  }, []);

  const handleUpdateAgent = useCallback(async (id: string, updates: Partial<Agent>) => {
    try {
      // 1. Update in Firestore
      await updateAgentInFirestore(id, updates);

      // 2. Update Express server
      fetch(`/api/agents/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).catch(() => {});

      // 3. Update local state
      setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    } catch (err) {
      console.error('Failed to update agent:', err);
      throw err;
    }
  }, []);

  const handleDeleteAgent = useCallback(async (id: string) => {
    try {
      // 1. Delete from Firestore
      await deleteAgentFromFirestore(id);

      // 2. Delete from Express server
      fetch(`/api/agents/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }).catch(() => {});

      // 3. Update local agents state
      setAgents(prev => prev.filter(a => a.id !== id));

      // 4. Clean up planning entries for this agent
      setPlanning(prev => {
        const next = { ...prev };
        let hasChanges = false;
        Object.keys(next).forEach(k => {
          if (k.startsWith(`${id}_`)) {
            delete next[k];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          persistPlanning(next);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to delete agent:', err);
      throw err;
    }
  }, [persistPlanning]);

  // ==========================================
  // SHIFT CRUD HANDLERS
  // ==========================================
  const handleCreateShift = useCallback(async (newShift: Shift) => {
    try {
      // 1. Save to Firestore (omitting label per Firestore schema)
      await createShiftInFirestore(newShift);

      // 2. Save to Express server
      fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShift)
      }).catch(() => {});

      // 3. Update local state ensuring uniqueness
      setShifts(prev => deduplicateShifts([...prev.filter(s => s.id !== newShift.id), newShift]));
    } catch (err) {
      console.error('Failed to create shift:', err);
      throw err;
    }
  }, []);

  const handleUpdateShift = useCallback(async (id: string, updates: Partial<Shift>) => {
    try {
      // 1. Update in Firestore
      await updateShiftInFirestore(id, updates);

      // 2. Update Express server
      fetch(`/api/shifts/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).catch(() => {});

      // 3. Update local state
      setShifts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err) {
      console.error('Failed to update shift:', err);
      throw err;
    }
  }, []);

  const handleDeleteShift = useCallback(async (id: string) => {
    try {
      // 1. Delete from Firestore
      await deleteShiftFromFirestore(id);

      // 2. Delete from Express server
      fetch(`/api/shifts/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }).catch(() => {});

      // 3. Update local state
      setShifts(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete shift:', err);
      throw err;
    }
  }, []);

  // Apply shift code to all currently selected cells
  const handleApplyShiftToSelection = useCallback((code: string) => {
    if (!selectionRange) return;

    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

    const updates: Record<string, string> = {};
    for (let r = minR; r <= maxR; r++) {
      const agent = agents[r];
      if (!agent) continue;
      for (let c = minC; c <= maxC; c++) {
        const dStr = dateStrings[c];
        if (!dStr) continue;
        updates[`${agent.id}_${dStr}`] = code;
      }
    }

    handleUpdatePlanning(updates, `Appliquer shift ${code} (${Object.keys(updates).length} cellules)`);
  }, [selectionRange, agents, dateStrings, handleUpdatePlanning]);

  // Clear selection cells
  const handleClearSelection = useCallback(() => {
    if (!selectionRange) return;
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

    const updates: Record<string, string> = {};
    for (let r = minR; r <= maxR; r++) {
      const agent = agents[r];
      if (!agent) continue;
      for (let c = minC; c <= maxC; c++) {
        const dStr = dateStrings[c];
        if (!dStr) continue;
        updates[`${agent.id}_${dStr}`] = '';
      }
    }

    handleUpdatePlanning(updates, 'Effacer sélection');
  }, [selectionRange, agents, dateStrings, handleUpdatePlanning]);

  // Auto Generate cyclical 24/7 rotation pattern
  const handleAutoGeneratePattern = useCallback(() => {
    const newSchedule = generateInitialSchedule(agents, dateStrings);
    handleUpdatePlanning(newSchedule, 'Génération cycle roulement');
  }, [agents, dateStrings, handleUpdatePlanning]);

  // Jump to Today
  const handleJumpToday = useCallback(() => {
    setCenterDate(new Date());
  }, []);

  // Prev / Next Range
  const handlePrevRange = useCallback(() => {
    setCenterDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const handleNextRange = useCallback(() => {
    setCenterDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    const headerRow = ['ID Agent', 'Nom Agent', 'Équipe', 'Station', ...dateStrings];
    const rows: string[][] = [headerRow];

    agents.forEach(agent => {
      const row = [
        agent.id,
        agent.name,
        agent.team,
        agent.station,
        ...dateStrings.map(dStr => planning[`${agent.id}_${dStr}`] || '')
      ];
      rows.push(row);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(';')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CORTEX_Planning_${formatToDateStr(centerDate)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [agents, dateStrings, planning, centerDate]);

  // Context Menu Open
  const handleCellContextMenu = useCallback((e: React.MouseEvent, rowIndex: number, colIndex: number) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIndex,
      colIndex
    });
    setSelectionRange({
      startRow: rowIndex,
      startCol: colIndex,
      endRow: rowIndex,
      endCol: colIndex
    });
  }, []);

  // Duplicate across 7 days from context menu
  const handleFillWeekFromContextMenu = useCallback(() => {
    if (!contextMenu) return;
    const agent = agents[contextMenu.rowIndex];
    if (!agent) return;

    const sourceDate = dateStrings[contextMenu.colIndex];
    const sourceShift = planning[`${agent.id}_${sourceDate}`] || 'M1';

    const updates: Record<string, string> = {};
    for (let i = 0; i < 7; i++) {
      const targetCol = contextMenu.colIndex + i;
      if (targetCol < dateStrings.length) {
        const dStr = dateStrings[targetCol];
        updates[`${agent.id}_${dStr}`] = sourceShift;
      }
    }

    handleUpdatePlanning(updates, `Dupliquer shift ${sourceShift} sur 7 jours`);
  }, [contextMenu, agents, dateStrings, planning, handleUpdatePlanning]);

  return (
    <div id="cortex-app-root" className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. TOP HEADER */}
      <Header
        currentCenterDate={centerDate}
        onSelectDate={(date) => setCenterDate(date)}
        onJumpToday={handleJumpToday}
        onPrevRange={handlePrevRange}
        onNextRange={handleNextRange}
        canUndo={historyStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAutoGeneratePattern={handleAutoGeneratePattern}
        onClearSelection={handleClearSelection}
        hasSelection={selectionRange !== null}
        onExportCSV={handleExportCSV}
        isBackendConnected={true}
        isFirestoreConnected={isFirestoreConnected}
        onResetDataset={handleResetToApiDataset}
        totalAgentsCount={agents.length}
        totalShiftsAssigned={Object.keys(planning).length}
        isLegendOpen={isLegendOpen}
        onToggleLegend={() => setIsLegendOpen(!isLegendOpen)}
        viewRangeDays={viewRangeDays}
        onChangeViewRangeDays={(days) => setViewRangeDays(days)}
        onOpenAgentManager={() => setIsAgentManagerOpen(true)}
        activeSeasonFilter={activeSeasonFilter}
        onChangeSeasonFilter={setActiveSeasonFilter}
      />

      {/* 2. MAIN BODY (Grid + Interactive Sidebar) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Central Spreadsheet Grid */}
        <PlanningGrid
          agents={agents}
          shifts={shifts}
          dates={dates}
          monthGroups={monthGroups}
          planning={planning}
          onUpdatePlanning={handleUpdatePlanning}
          onReorderAgents={handleReorderAgents}
          activeStampShift={activeStampShift}
          onCellContextMenu={handleCellContextMenu}
          selectionRange={selectionRange}
          onSelectionChange={setSelectionRange}
        />

        {/* Right Sidebar: Shift Legend with Shift CRUD */}
        <ShiftLegendSidebar
          shifts={shifts}
          activeStampShift={activeStampShift}
          onSelectStampShift={setActiveStampShift}
          onApplyShiftToSelection={handleApplyShiftToSelection}
          hasActiveSelection={selectionRange !== null}
          planning={planning}
          isOpen={isLegendOpen}
          onToggleOpen={() => setIsLegendOpen(!isLegendOpen)}
          onCreateShift={handleCreateShift}
          onUpdateShift={handleUpdateShift}
          onDeleteShift={handleDeleteShift}
          activeSeasonFilter={activeSeasonFilter}
          onChangeSeasonFilter={setActiveSeasonFilter}
        />
      </div>

      {/* 3. BOTTOM STATS & COVERAGE BAR */}
      <StatsBar
        agents={agents}
        shifts={shifts}
        dates={dates}
        planning={planning}
        isExpanded={isStatsExpanded}
        onToggleExpand={() => setIsStatsExpanded(!isStatsExpanded)}
      />

      {/* 4. AGENTS MANAGER MODAL (Full Agent CRUD) */}
      {isAgentManagerOpen && (
        <AgentManagerModal
          isOpen={isAgentManagerOpen}
          onClose={() => setIsAgentManagerOpen(false)}
          agents={agents}
          onCreateAgent={handleCreateAgent}
          onUpdateAgent={handleUpdateAgent}
          onDeleteAgent={handleDeleteAgent}
          onReorderAgents={handleReorderAgents}
        />
      )}

      {/* 5. CONTEXT MENU */}
      {contextMenu && contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onSelectShift={(code) => handleApplyShiftToSelection(code)}
          onCopy={() => {
            const agent = agents[contextMenu.rowIndex];
            const dStr = dateStrings[contextMenu.colIndex];
            const val = planning[`${agent?.id}_${dStr}`] || '';
            navigator.clipboard.writeText(val).catch(() => {});
          }}
          onPaste={() => {
            navigator.clipboard.readText().then(val => {
              if (val) handleApplyShiftToSelection(val.trim());
            }).catch(() => {});
          }}
          onClear={handleClearSelection}
          onFillWeek={handleFillWeekFromContextMenu}
          shifts={shifts}
        />
      )}
    </div>
  );
}
