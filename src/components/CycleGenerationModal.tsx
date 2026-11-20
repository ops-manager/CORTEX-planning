import React, { useState, useMemo, useEffect } from 'react';
import { Agent, Shift } from '../types';
import { getShiftStyle } from '../utils/shiftUtils';
import { getDatesBetween, formatToDateStr, parseDateStr } from '../utils/dateUtils';
import { 
  Sparkles, 
  Calendar, 
  Users, 
  RefreshCw, 
  Lock, 
  Info, 
  Check, 
  AlertCircle, 
  X, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export interface CycleGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  shifts: Shift[];
  planning: Record<string, string>;
  visibleDateStrings?: string[];
  defaultTeam?: string;
  onApplyCycle: (updates: Record<string, string>, description: string) => void;
}

export const CycleGenerationModal: React.FC<CycleGenerationModalProps> = ({
  isOpen,
  onClose,
  agents = [],
  shifts = [],
  planning = {},
  visibleDateStrings = [],
  defaultTeam,
  onApplyCycle
}) => {
  // 1. Group agents by team and sort by order
  const { teamList, teamMap } = useMemo(() => {
    const map: Record<string, Agent[]> = {};
    const list: string[] = [];

    agents.forEach((ag) => {
      const t = ag.team || 'Sans Équipe';
      if (!map[t]) {
        map[t] = [];
        list.push(t);
      }
      map[t].push(ag);
    });

    list.forEach((t) => {
      map[t].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return { teamList: list, teamMap: map };
  }, [agents]);

  // Initial team: provided defaultTeam if present in teamList, else first team or 'ALL'
  const initialTeam = useMemo(() => {
    if (defaultTeam && defaultTeam !== 'ALL' && teamList.includes(defaultTeam)) {
      return defaultTeam;
    }
    return teamList[0] || 'ALL';
  }, [defaultTeam, teamList]);

  // State: Team selected
  const [selectedTeam, setSelectedTeam] = useState<string>(initialTeam);

  // Synchronize team when modal opens or defaultTeam changes
  useEffect(() => {
    if (isOpen) {
      if (defaultTeam && defaultTeam !== 'ALL' && teamList.includes(defaultTeam)) {
        setSelectedTeam(defaultTeam);
      } else if (teamList.length > 0 && !teamList.includes(selectedTeam)) {
        setSelectedTeam(teamList[0]);
      }
    }
  }, [isOpen, defaultTeam, teamList]);

  // State: Period From / To
  const defaultDates = useMemo(() => {
    if (visibleDateStrings && visibleDateStrings.length > 0) {
      return {
        start: visibleDateStrings[0],
        end: visibleDateStrings[visibleDateStrings.length - 1]
      };
    }
    const today = new Date();
    const future = new Date(today);
    future.setDate(today.getDate() + 30);
    return {
      start: formatToDateStr(today),
      end: formatToDateStr(future)
    };
  }, [visibleDateStrings]);

  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);

  // State: Cycle logic
  // Cycle length in days (e.g. 12 days)
  const [cycleLength, setCycleLength] = useState<number>(12);

  // Shifts sequence repeated (e.g. OFF,OFF,M2e,M2e,M1e,M1e,OFF,OFF,S3e,S3e,S1e,S1e)
  const [shiftsInput, setShiftsInput] = useState<string>(
    'OFF, OFF, M2e, M2e, M1e, M1e, OFF, OFF, S3e, S3e, S1e, S1e'
  );

  // Offset from the line below (e.g. -2)
  const [lineOffset, setLineOffset] = useState<number>(-2);

  // Start phase for first agent (1 to cycleLength)
  const [startPhase, setStartPhase] = useState<number>(1);

  // Form error message
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parse shifts sequence
  const parsedShifts = useMemo(() => {
    // If comma or semicolon is used as separator, allow individual shift codes to have internal spaces cleaned (e.g. "S1 h" -> "S1h")
    const hasDelimiters = shiftsInput.includes(',') || shiftsInput.includes(';');
    const tokens = hasDelimiters ? shiftsInput.split(/[,;]+/) : shiftsInput.split(/\s+/);
    return tokens
      .map((s) => s.replace(/\s+/g, '').trim())
      .filter((s) => s.length > 0);
  }, [shiftsInput]);

  // Normalize shifts array to exact cycleLength
  const effectiveCycle = useMemo(() => {
    if (parsedShifts.length === 0) return [];
    const res: string[] = [];
    for (let i = 0; i < cycleLength; i++) {
      res.push(parsedShifts[i % parsedShifts.length]);
    }
    return res;
  }, [parsedShifts, cycleLength]);

  // Calculate dates in the selected period
  const periodDates = useMemo(() => {
    return getDatesBetween(startDate, endDate);
  }, [startDate, endDate]);

  // Target agents based on selected team
  const targetAgents = useMemo(() => {
    if (selectedTeam === 'ALL') {
      const all: Agent[] = [];
      teamList.forEach((t) => {
        all.push(...(teamMap[t] || []));
      });
      return all;
    }
    return teamMap[selectedTeam] || [];
  }, [selectedTeam, teamList, teamMap]);

  // Top agent in the team
  const topAgent = targetAgents[0] || null;

  // Real-time calculation of impacted cells: how many to fill, how many skipped (preserved)
  const stats = useMemo(() => {
    let emptyCellsCount = 0;
    let existingCellsCount = 0;

    targetAgents.forEach((agent) => {
      periodDates.forEach((dateStr) => {
        const cellKey = `${agent.id}_${dateStr}`;
        const val = planning[cellKey];
        if (val && val.trim() !== '') {
          existingCellsCount++;
        } else {
          emptyCellsCount++;
        }
      });
    });

    return {
      totalCells: targetAgents.length * periodDates.length,
      emptyCellsCount,
      existingCellsCount
    };
  }, [targetAgents, periodDates, planning]);

  // Presets
  const handleApplyPreset = (name: string) => {
    if (name === '12d_user') {
      setCycleLength(12);
      setShiftsInput('OFF, OFF, M2e, M2e, M1e, M1e, OFF, OFF, S3e, S3e, S1e, S1e');
      setLineOffset(-2);
    } else if (name === '24_7_standard') {
      setCycleLength(6);
      setShiftsInput('M1, M1, S1, S1, RH, RH');
      setLineOffset(-2);
    } else if (name === '3x8') {
      setCycleLength(8);
      setShiftsInput('M1, M1, S1, S1, S3, S3, RH, RH');
      setLineOffset(-2);
    } else if (name === '5_2') {
      setCycleLength(7);
      setShiftsInput('M1, M1, M1, M1, M1, RH, RH');
      setLineOffset(0);
    }
  };

  // Shortcut for date ranges
  const handleDatePreset = (preset: string) => {
    const today = new Date();
    if (preset === 'visible' && visibleDateStrings.length > 0) {
      setStartDate(visibleDateStrings[0]);
      setEndDate(visibleDateStrings[visibleDateStrings.length - 1]);
    } else if (preset === 'current_month') {
      const year = today.getFullYear();
      const month = today.getMonth();
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      setStartDate(formatToDateStr(first));
      setEndDate(formatToDateStr(last));
    } else if (preset === 'next_month') {
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      setStartDate(formatToDateStr(first));
      setEndDate(formatToDateStr(last));
    } else if (preset === '30_days') {
      const start = new Date(today);
      const end = new Date(today);
      end.setDate(end.getDate() + 30);
      setStartDate(formatToDateStr(start));
      setEndDate(formatToDateStr(end));
    }
  };

  // Handle Form Submission
  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (periodDates.length === 0) {
      setErrorMsg('Veuillez sélectionner une période valide (Date Début <= Date Fin).');
      return;
    }

    if (targetAgents.length === 0) {
      setErrorMsg('Aucun agent disponible pour l\'équipe sélectionnée.');
      return;
    }

    if (effectiveCycle.length === 0 || parsedShifts.length === 0) {
      setErrorMsg('Veuillez spécifier les shifts du cycle.');
      return;
    }

    if (cycleLength < 1) {
      setErrorMsg('La durée du cycle doit être d\'au moins 1 jour.');
      return;
    }

    // Build the updates dictionary, skipping non-empty cells
    const updates: Record<string, string> = {};
    let populatedCount = 0;
    let skippedCount = 0;

    const basePhase = Math.max(0, startPhase - 1);

    targetAgents.forEach((agent, agentIndex) => {
      periodDates.forEach((dateStr, dayIndex) => {
        const cellKey = `${agent.id}_${dateStr}`;
        const existingVal = planning[cellKey];

        // Critical rule: skip cells that are not empty
        if (existingVal && existingVal.trim() !== '') {
          skippedCount++;
          return;
        }

        // Calculate shift index in cycle:
        // Top agent (agentIndex = 0) starts at basePhase, advances dayIndex
        // Successive agents (agentIndex > 0) are shifted by agentIndex * lineOffset
        const cycleIdx =
          (((basePhase + dayIndex + agentIndex * lineOffset) % cycleLength) + cycleLength) % cycleLength;
        const shiftCode = effectiveCycle[cycleIdx];

        if (shiftCode) {
          updates[cellKey] = shiftCode;
          populatedCount++;
        }
      });
    });

    const teamLabel = selectedTeam === 'ALL' ? 'Toutes les équipes' : `Équipe ${selectedTeam}`;
    const desc = `Génération cycle roulement (${teamLabel}, ${populatedCount} cellules générées, ${skippedCount} conservées)`;

    onApplyCycle(updates, desc);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="cycle-generation-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        id="cycle-generation-modal-container"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Pinned) */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                Auto-génération de planning par roulement
              </h2>
              <p className="text-[11px] text-slate-400">
                Période cible, équipe, cycle répétitif et non-écrasement des cellules remplies
              </p>
            </div>
          </div>
          <button
            id="close-cycle-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form wrapping scrollable content and pinned footer */}
        <form onSubmit={handleValidate} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Error notice */}
            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-center gap-2.5 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Target Period & Team */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Target Period (From / To) */}
              <div className="p-3.5 bg-slate-950/60 border border-blue-500/30 rounded-xl space-y-2.5 ring-1 ring-blue-500/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>Période cible / Target Period</span>
                  </label>
                  <span className="text-[11px] font-mono-code text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/50 font-semibold">
                    {periodDates.length} jour(s)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="cycle-start-date-input" className="block text-[10px] font-medium text-slate-300 mb-1">
                      Du / From (inclus) :
                    </label>
                    <input
                      id="cycle-start-date-input"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-blue-500/40 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono-code focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cycle-end-date-input" className="block text-[10px] font-medium text-slate-300 mb-1">
                      Au / To (inclus) :
                    </label>
                    <input
                      id="cycle-end-date-input"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-blue-500/40 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono-code focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Quick period presets */}
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-400">Raccourcis :</span>
                  {visibleDateStrings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleDatePreset('visible')}
                      className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                    >
                      Période affichée
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDatePreset('current_month')}
                    className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                  >
                    Mois en cours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDatePreset('next_month')}
                    className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                  >
                    Mois prochain
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDatePreset('30_days')}
                    className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                  >
                    +30 jours
                  </button>
                </div>
              </div>

              {/* Which team ? */}
              <div className="p-3.5 bg-slate-950/60 border border-emerald-500/30 rounded-xl space-y-2.5 ring-1 ring-emerald-500/10">
                <div className="flex items-center justify-between">
                  <label htmlFor="cycle-team-select" className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Équipe concernée / Target Team</span>
                  </label>
                  <span className="text-[11px] font-mono-code text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50 font-semibold">
                    {targetAgents.length} agent(s)
                  </span>
                </div>

                <div>
                  <select
                    id="cycle-team-select"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-500/40 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:border-emerald-400 focus:outline-none"
                  >
                    {teamList.map((teamName) => (
                      <option key={teamName} value={teamName}>
                        Équipe : {teamName} ({teamMap[teamName]?.length || 0} agents)
                      </option>
                    ))}
                    <option value="ALL">Toutes les équipes ({agents.length} agents)</option>
                  </select>
                </div>

                {/* First agent info */}
                <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="text-[9px] text-slate-400 block uppercase font-mono-code">Premier agent (Réf en haut) :</span>
                    <span className="font-semibold text-indigo-300 truncate text-[11px]">
                      {topAgent ? `${topAgent.name} (${topAgent.station || 'N/A'})` : 'Aucun agent'}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-950/70 text-indigo-200 border border-indigo-700/50 rounded font-mono-code shrink-0">
                    Ligne #1 Réf
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Cycle Logic for first agent */}
            <div className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b border-slate-800 pb-2">
                <div>
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Logique de cycle du 1er agent (en haut du tableau)</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Longueur de cycle, shifts répétés et décalage par rapport à la ligne du dessous
                  </p>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-slate-400 hidden sm:inline">Modèles :</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('12d_user')}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 rounded transition-colors"
                    title="Exemple 12 jours (OFF, OFF, M2e, M2e, M1e, M1e, OFF, OFF, S3e, S3e, S1e, S1e)"
                  >
                    12j (OFF/M/S)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('24_7_standard')}
                    className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors"
                  >
                    6j 24/7
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('5_2')}
                    className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors"
                  >
                    5/2
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Cycle length */}
                <div>
                  <label htmlFor="cycle-length-input" className="block text-[11px] font-medium text-slate-300 mb-1">
                    Durée du cycle (jours) :
                  </label>
                  <div className="relative">
                    <input
                      id="cycle-length-input"
                      type="number"
                      min={1}
                      max={60}
                      value={cycleLength}
                      onChange={(e) => setCycleLength(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono-code font-bold focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 pointer-events-none">
                      jours
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Ex: 12 jours
                  </span>
                </div>

                {/* 2. Offset from line below */}
                <div>
                  <label htmlFor="cycle-offset-input" className="block text-[11px] font-medium text-slate-300 mb-1">
                    Décalage ligne du dessous :
                  </label>
                  <div className="relative">
                    <input
                      id="cycle-offset-input"
                      type="number"
                      value={lineOffset}
                      onChange={(e) => setLineOffset(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono-code font-bold focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 pointer-events-none">
                      jours
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Ex: <code className="text-indigo-300 font-semibold">-2</code>
                  </span>
                </div>

                {/* 3. Initial phase for 1st agent */}
                <div>
                  <label htmlFor="cycle-phase-input" className="block text-[11px] font-medium text-slate-300 mb-1">
                    Démarrage 1er agent :
                  </label>
                  <div className="relative">
                    <input
                      id="cycle-phase-input"
                      type="number"
                      min={1}
                      max={cycleLength}
                      value={startPhase}
                      onChange={(e) => setStartPhase(Math.max(1, Math.min(cycleLength, parseInt(e.target.value) || 1)))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono-code font-bold focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 pointer-events-none">
                      / {cycleLength}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Jour initial dans le cycle
                  </span>
                </div>
              </div>

              {/* Shifts repeated sequence input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="cycle-shifts-sequence-input" className="text-[11px] font-medium text-slate-300">
                    Shifts répétés sur ce cycle (séparés par des virgules) :
                  </label>
                  <span className={`text-[10px] font-mono-code px-1.5 py-0.2 rounded ${
                    parsedShifts.length === cycleLength
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {parsedShifts.length} / {cycleLength} shifts configurés
                  </span>
                </div>

                <textarea
                  id="cycle-shifts-sequence-input"
                  rows={2}
                  value={shiftsInput}
                  onChange={(e) => setShiftsInput(e.target.value)}
                  placeholder="Ex: OFF, OFF, M2e, M2e, M1e, M1e, OFF, OFF, S3e, S3e, S1e, S1e"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono-code focus:border-indigo-500 focus:outline-none leading-relaxed"
                />

                {/* Quick shift inserter badges */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-slate-400">Ajouter shift :</span>
                  {['OFF', 'RH', 'CA', ...shifts.slice(0, 8).map((s) => s.code)]
                    .filter((v, idx, arr) => arr.indexOf(v) === idx)
                    .map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          const trimmed = shiftsInput.trim();
                          setShiftsInput(trimmed ? `${trimmed}, ${code}` : code);
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-bold font-mono-code bg-slate-800 hover:bg-indigo-900/60 hover:text-indigo-200 text-slate-300 border border-slate-700 rounded transition-colors"
                      >
                        +{code}
                      </button>
                    ))}
                </div>

                {/* Visual badges of the effective cycle */}
                <div className="mt-2.5 p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider font-mono-code">
                    Cycle du 1er agent (Jour 1 à {cycleLength}) :
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {effectiveCycle.map((code, idx) => {
                      const shiftObj = shifts.find((s) => s.code.toUpperCase() === code.toUpperCase());
                      const style = getShiftStyle(code, shiftObj?.color);
                      const isDayActive = idx + 1 === startPhase;

                      return (
                        <div
                          key={idx}
                          className={`flex flex-col items-center px-1.5 py-0.5 rounded border text-center transition-all ${
                            isDayActive ? 'ring-2 ring-indigo-400 bg-indigo-950/40' : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <span className="text-[8px] text-slate-400 font-mono-code">J{idx + 1}</span>
                          <span
                            className={`text-[10px] font-bold font-mono-code px-1.5 py-0.2 rounded mt-0.5 ${style.badgeClass}`}
                            style={style.customStyle}
                          >
                            {code}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Live Matrix Preview */}
            <div className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>Aperçu du roulement (Agents et premiers jours)</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Décalage ligne par ligne. Les cellules existantes sont verrouillées et préservées.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Nouveau
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Lock className="w-2.5 h-2.5" />
                    Existant préservé
                  </span>
                </div>
              </div>

              {/* Preview table with scroll */}
              <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-900/60 max-h-36">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="py-1 px-2.5 text-left font-medium sticky left-0 bg-slate-950 z-10 w-36">
                        Agent (Ordre)
                      </th>
                      {periodDates.slice(0, 10).map((dStr) => {
                        const dObj = parseDateStr(dStr);
                        const dayName = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][dObj.getDay()];
                        return (
                          <th key={dStr} className="py-1 px-1.5 text-center font-mono-code font-normal text-slate-300 min-w-[46px]">
                            <div>{dayName}</div>
                            <div className="text-[8px] text-slate-500">{dStr.slice(5)}</div>
                          </th>
                        );
                      })}
                      {periodDates.length > 10 && (
                        <th className="py-1 px-1.5 text-center text-slate-500 font-mono-code text-[9px]">
                          +{periodDates.length - 10} j
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono-code">
                    {targetAgents.slice(0, 4).map((ag, agentIdx) => {
                      const basePhase = Math.max(0, startPhase - 1);

                      return (
                        <tr key={ag.id} className="hover:bg-slate-800/30">
                          <td className="py-1 px-2.5 text-left font-medium text-slate-200 sticky left-0 bg-slate-900/95 z-10 truncate max-w-[130px]">
                            <div className="truncate font-sans text-[11px]">{ag.name}</div>
                            <div className="text-[8px] text-slate-500">
                              Ligne #{agentIdx + 1} {agentIdx === 0 ? '(Réf)' : `(décal. ${agentIdx * lineOffset}j)`}
                            </div>
                          </td>

                          {periodDates.slice(0, 10).map((dStr, dayIdx) => {
                            const cellKey = `${ag.id}_${dStr}`;
                            const existingVal = planning[cellKey];
                            const isAlreadyFilled = Boolean(existingVal && existingVal.trim() !== '');

                            const cycleIdx =
                              (((basePhase + dayIdx + agentIdx * lineOffset) % cycleLength) + cycleLength) % cycleLength;
                            const calculatedShift = effectiveCycle[cycleIdx] || '';

                            const displayShift = isAlreadyFilled ? existingVal : calculatedShift;
                            const shiftObj = shifts.find((s) => s.code.toUpperCase() === displayShift.toUpperCase());
                            const style = getShiftStyle(displayShift, shiftObj?.color);

                            return (
                              <td key={dStr} className="py-1 px-1 text-center">
                                {isAlreadyFilled ? (
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold border ${style.badgeClass} ring-1 ring-emerald-500/50`}
                                    style={style.customStyle}
                                    title={`Déjà renseigné : ${existingVal} (Ne sera PAS écrasé)`}
                                  >
                                    <Lock className="w-2 h-2 text-emerald-400 shrink-0" />
                                    {displayShift}
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-block px-1 py-0.5 rounded text-[9px] font-bold border ${style.badgeClass}`}
                                    style={style.customStyle}
                                    title={`Généré : ${calculatedShift}`}
                                  >
                                    {calculatedShift}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {periodDates.length > 10 && (
                            <td className="py-1 px-1.5 text-center text-slate-600 text-[9px]">
                              ...
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Safety & Impact Guarantee */}
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-emerald-200">
                  Règle de non-écrasement garantie
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Le système sautera systématiquement les cellules déjà remplies. Aucune affectation existante ne sera écrasée.
                </p>
                <div className="pt-0.5 flex flex-wrap items-center gap-3 text-[11px] font-mono-code">
                  <span className="text-blue-300 font-medium">
                    • <strong>{stats.emptyCellsCount}</strong> créneau(x) vide(s) à remplir
                  </span>
                  <span className="text-emerald-300 font-medium">
                    • <strong>{stats.existingCellsCount}</strong> créneau(x) déjà rempli(s) préservé(s)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer (Always visible, never clipped) */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800">
            <div className="text-xs text-slate-400 hidden sm:block">
              <span className="text-blue-300 font-bold">{stats.emptyCellsCount}</span> cellules seront générées sans écraser l'existant.
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                id="cancel-cycle-generation-btn"
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                id="validate-cycle-generation-btn"
                type="submit"
                disabled={stats.emptyCellsCount === 0}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-lg shadow-indigo-600/25 border border-indigo-400/30 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Valider et générer ({stats.emptyCellsCount})</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

