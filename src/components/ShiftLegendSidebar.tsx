import React, { useState, useMemo, useEffect } from 'react';
import { Shift, ShiftSeason } from '../types';
import { 
  getShiftStyle, 
  calculateShiftDurationHours, 
  getSeasonInfo 
} from '../utils/shiftUtils';
import { ShiftModal } from './ShiftModal';
import { 
  Layers, 
  Clock, 
  PanelRightClose, 
  PanelRightOpen,
  MousePointerClick,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Sun,
  Snowflake,
  Globe,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Filter,
  Minimize2,
  Maximize2,
  Stamp,
  Paintbrush,
  Check,
  X
} from 'lucide-react';

interface ShiftLegendSidebarProps {
  shifts: Shift[];
  activeStampShift: string | null;
  onSelectStampShift: (code: string | null) => void;
  onApplyShiftToSelection: (code: string) => void;
  hasActiveSelection: boolean;
  planning: Record<string, string>;
  isOpen: boolean;
  onToggleOpen: () => void;
  onCreateShift: (newShift: Shift) => Promise<void>;
  onUpdateShift: (id: string, updates: Partial<Shift>) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
  activeSeasonFilter?: ShiftSeason;
  onChangeSeasonFilter?: (season: ShiftSeason) => void;
  isAdminOrManager?: boolean;
}

export const ShiftLegendSidebar: React.FC<ShiftLegendSidebarProps> = ({
  shifts,
  activeStampShift,
  onSelectStampShift,
  onApplyShiftToSelection,
  hasActiveSelection,
  planning,
  isOpen,
  onToggleOpen,
  onCreateShift,
  onUpdateShift,
  onDeleteShift,
  activeSeasonFilter = 'all',
  onChangeSeasonFilter,
  isAdminOrManager = true
}) => {
  // Modal states
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Compact / Minimized View Mode State (Show only shift codes)
  const [isCompactView, setIsCompactView] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cortex_shift_sidebar_compact') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCompact = () => {
    setIsCompactView(prev => {
      const next = !prev;
      try {
        localStorage.setItem('cortex_shift_sidebar_compact', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Local season filter fallback if not managed externally
  const [localSeasonFilter, setLocalSeasonFilter] = useState<ShiftSeason>('all');
  const effectiveSeasonFilter = onChangeSeasonFilter ? activeSeasonFilter : localSeasonFilter;

  // Visibility tab: 'active' (visible) or 'hidden' (masqués)
  const [visibilityTab, setVisibilityTab] = useState<'active' | 'hidden'>('active');

  // Delete dialog state
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSeasonChange = (s: ShiftSeason) => {
    if (onChangeSeasonFilter) {
      onChangeSeasonFilter(s);
    } else {
      setLocalSeasonFilter(s);
    }
  };

  // Calculate live frequencies from current planning state
  const shiftCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(planning).forEach((code: string) => {
      if (code) {
        counts[code] = (counts[code] || 0) + 1;
      }
    });
    return counts;
  }, [planning]);

  // Counts of shifts per season and visibility
  const { activeCount, hiddenCount, winterCount, summerCount, allSeasonCount } = useMemo(() => {
    let active = 0;
    let hidden = 0;
    let winter = 0;
    let summer = 0;
    let allS = 0;

    shifts.forEach((s) => {
      if (s.hidden) {
        hidden++;
      } else {
        active++;
      }

      if (!s.season || s.season === 'all') {
        allS++;
      } else if (s.season === 'winter') {
        winter++;
      } else if (s.season === 'summer') {
        summer++;
      }
    });

    return {
      activeCount: active,
      hiddenCount: hidden,
      winterCount: winter,
      summerCount: summer,
      allSeasonCount: allS
    };
  }, [shifts]);

  // Filtered shifts based on active season filter & visibility tab
  const displayedShifts = useMemo(() => {
    const seenIds = new Set<string>();
    return shifts.filter((s) => {
      if (!s || !s.id || seenIds.has(s.id)) return false;
      seenIds.add(s.id);

      // 1. Visibility filter
      const isHidden = Boolean(s.hidden);
      if (visibilityTab === 'active' && isHidden) return false;
      if (visibilityTab === 'hidden' && !isHidden) return false;

      // 2. Season filter
      if (effectiveSeasonFilter === 'winter') {
        return s.season === 'winter' || s.season === 'all' || !s.season;
      }
      if (effectiveSeasonFilter === 'summer') {
        return s.season === 'summer' || s.season === 'all' || !s.season;
      }
      return true;
    });
  }, [shifts, visibilityTab, effectiveSeasonFilter]);

  const handleOpenCreate = () => {
    setEditingShift(null);
    setIsShiftModalOpen(true);
  };

  const handleOpenEdit = (shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingShift(shift);
    setIsShiftModalOpen(true);
  };

  const handleToggleHideShift = async (shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onUpdateShift(shift.id, { hidden: !shift.hidden });
    } catch (err) {
      console.error('Failed to toggle shift visibility:', err);
    }
  };

  const handleUnhideAll = async () => {
    const hiddenShifts = shifts.filter(s => s.hidden);
    for (const s of hiddenShifts) {
      await onUpdateShift(s.id, { hidden: false });
    }
  };

  const handleOpenDelete = (shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation();
    setShiftToDelete(shift);
  };

  const handleConfirmDelete = async () => {
    if (!shiftToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteShift(shiftToDelete.id);
      if (activeStampShift === shiftToDelete.code) {
        onSelectStampShift(null);
      }
      setShiftToDelete(null);
    } catch (err) {
      console.error('Failed to delete shift:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed right-3 top-20 z-30">
        <button
          id="open-legend-sidebar-btn"
          onClick={onToggleOpen}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg shadow-xl text-xs font-semibold transition-all hover:scale-105"
          title="Afficher la légende des shifts"
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Légende ({activeCount})</span>
          {effectiveSeasonFilter === 'winter' && <Snowflake className="w-3 h-3 text-cyan-400" />}
          {effectiveSeasonFilter === 'summer' && <Sun className="w-3 h-3 text-amber-400" />}
          <PanelRightOpen className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <aside
      id="shift-legend-sidebar"
      className="w-80 bg-slate-900 border-l border-slate-800/80 flex flex-col h-full flex-shrink-0 select-none overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              Légende des Shifts
              <span className="text-[10px] font-normal px-1.5 py-0.5 bg-slate-800 rounded-full text-slate-400 font-mono-code">
                {displayedShifts.length}/{shifts.length}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Couleurs, saisons & horaires</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isAdminOrManager && (
            <button
              id="add-new-shift-sidebar-btn"
              onClick={handleOpenCreate}
              title="Créer un nouveau code de shift"
              className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            id="close-legend-sidebar-btn"
            onClick={onToggleOpen}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Masquer la légende"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Season Filter Switch: TOUS | HIVER | ÉTÉ */}
      <div className="p-2.5 bg-slate-950/70 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Filter className="w-3 h-3 text-blue-400" />
            <span>Filtre Saison :</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {effectiveSeasonFilter === 'winter' ? 'Mode Hiver actif' : effectiveSeasonFilter === 'summer' ? 'Mode Été actif' : 'Toutes saisons'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            id="season-filter-all-btn"
            onClick={() => handleSeasonChange('all')}
            className={`
              flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-medium text-[11px] transition-colors
              ${effectiveSeasonFilter === 'all'
                ? 'bg-slate-800 text-white font-bold shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            <Globe className="w-3 h-3 text-slate-400" />
            <span>Tous</span>
          </button>

          <button
            id="season-filter-winter-btn"
            onClick={() => handleSeasonChange('winter')}
            className={`
              flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-medium text-[11px] transition-colors
              ${effectiveSeasonFilter === 'winter'
                ? 'bg-cyan-950/80 text-cyan-200 font-bold shadow-sm border border-cyan-700/60'
                : 'text-slate-400 hover:text-cyan-300'}
            `}
          >
            <Snowflake className="w-3 h-3 text-cyan-400" />
            <span>Hiver</span>
            {winterCount > 0 && (
              <span className="text-[9px] px-1 bg-cyan-900/60 text-cyan-300 rounded-full font-mono-code">
                {winterCount}
              </span>
            )}
          </button>

          <button
            id="season-filter-summer-btn"
            onClick={() => handleSeasonChange('summer')}
            className={`
              flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-medium text-[11px] transition-colors
              ${effectiveSeasonFilter === 'summer'
                ? 'bg-amber-950/80 text-amber-200 font-bold shadow-sm border border-amber-700/60'
                : 'text-slate-400 hover:text-amber-300'}
            `}
          >
            <Sun className="w-3 h-3 text-amber-400" />
            <span>Été</span>
            {summerCount > 0 && (
              <span className="text-[9px] px-1 bg-amber-900/60 text-amber-300 rounded-full font-mono-code">
                {summerCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Visibility Tabs & Compact Mode Toggle */}
      <div className="px-3 py-1.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs gap-1.5">
        <div className="flex items-center gap-1">
          <button
            id="sidebar-tab-active-shifts"
            onClick={() => setVisibilityTab('active')}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md font-medium text-[11px] transition-colors
              ${visibilityTab === 'active' 
                ? 'bg-slate-800 text-blue-300 font-bold border border-slate-700' 
                : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            <Eye className="w-3 h-3 text-emerald-400" />
            <span>Actifs</span>
            <span className="text-[10px] px-1 bg-slate-900 rounded-full text-slate-300 font-mono-code">
              {activeCount}
            </span>
          </button>

          <button
            id="sidebar-tab-hidden-shifts"
            onClick={() => setVisibilityTab('hidden')}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md font-medium text-[11px] transition-colors
              ${visibilityTab === 'hidden' 
                ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700' 
                : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            <EyeOff className="w-3 h-3 text-amber-400" />
            <span>Masqués</span>
            {hiddenCount > 0 && (
              <span className="text-[10px] px-1 bg-amber-950/60 text-amber-300 rounded-full font-mono-code">
                {hiddenCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1">
          {visibilityTab === 'hidden' && hiddenCount > 0 && (
            <button
              id="unhide-all-shifts-btn"
              onClick={handleUnhideAll}
              title="Tout réafficher dans la liste active"
              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 font-semibold hover:underline mr-1"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Tout réafficher
            </button>
          )}

          {/* Minimize / Compact View Mode Button */}
          <button
            id="toggle-compact-shifts-view-btn"
            onClick={handleToggleCompact}
            title={isCompactView ? "Afficher les cartes détaillées avec horaires" : "Réduire les cartes et afficher uniquement les codes"}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all border
              ${isCompactView 
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-sm font-bold' 
                : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-700/80 hover:border-slate-600'}
            `}
          >
            {isCompactView ? (
              <>
                <Maximize2 className="w-3 h-3 text-blue-400" />
                <span>Détaillé</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3 h-3 text-blue-400" />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mode Tampon Notice / Status */}
      <div className="p-2.5 bg-slate-950/70 border-b border-slate-800 text-xs">
        {activeStampShift ? (
          <div className="p-2.5 bg-blue-950/70 border border-blue-500/50 rounded-lg shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <div className="flex items-center gap-1.5 truncate">
                  <Stamp className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="text-[11px] text-blue-200">
                    Mode Tampon : <strong className="text-white font-mono-code bg-blue-600/60 px-1.5 py-0.5 rounded border border-blue-400/60">{activeStampShift}</strong>
                  </span>
                </div>
              </div>
              <button
                id="cancel-stamp-mode-btn"
                onClick={() => onSelectStampShift(null)}
                className="text-[10px] bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 px-2 py-1 rounded border border-slate-700 hover:border-rose-500/50 transition-colors flex items-center gap-1 flex-shrink-0"
                title="Désactiver le tampon (Échap)"
              >
                <X className="w-3 h-3" />
                <span>Quitter</span>
              </button>
            </div>
            <p className="text-[10px] text-blue-300/80 leading-tight">
              Cliquez sur n'importe quelle case du planning pour y appliquer ce shift. Appuyez sur <strong>Échap</strong> pour quitter.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Stamp className="w-3.5 h-3.5 text-blue-400" />
              <span>Cliquez un shift pour l'affecter, ou sur <strong>Tampon</strong>.</span>
            </div>
            <button
              onClick={handleOpenCreate}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5 flex-shrink-0"
            >
              <Plus className="w-3 h-3" /> Nouveau
            </button>
          </div>
        )}
      </div>

      {/* Shift Items List (Compact Grid or Detailed Cards) */}
      <div className="flex-1 overflow-y-auto p-2">
        {displayedShifts.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs space-y-2">
            <Layers className="w-8 h-8 mx-auto text-slate-700" />
            <p>
              {visibilityTab === 'hidden'
                ? 'Aucun shift masqué.'
                : 'Aucun shift ne correspond à ce filtre.'}
            </p>
            {visibilityTab === 'active' && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Créer un shift
              </button>
            )}
          </div>
        ) : isCompactView ? (
          /* Minimized Compact Grid: Shows all codes at a glance without scrolling */
          <div className="grid grid-cols-4 gap-1.5 auto-rows-max">
            {displayedShifts.map((shift) => {
              const style = getShiftStyle(shift.code, shift.color);
              const count = shiftCounts[shift.code] || 0;
              const isStampActive = activeStampShift === shift.code;
              const seasonInfo = getSeasonInfo(shift.season);

              return (
                <div
                  key={shift.id}
                  id={`compact-shift-item-${shift.code}`}
                  onClick={() => {
                    if (hasActiveSelection) {
                      onApplyShiftToSelection(shift.code);
                    }
                  }}
                  title={`${shift.code} : ${shift.label || shift.code} (${shift.hours || 'Horaires n/a'}) · ${count} dans planning · Clic pour appliquer à la sélection`}
                  className={`
                    group relative flex flex-col items-center justify-center p-1 rounded-lg border transition-all cursor-pointer select-none
                    ${isStampActive 
                      ? 'bg-blue-900/70 border-blue-400 ring-2 ring-blue-400 shadow-md scale-105 z-10' 
                      : shift.hidden
                        ? 'bg-slate-950/25 opacity-60 hover:opacity-100 border-dashed border-slate-800'
                        : 'bg-slate-950/50 hover:bg-slate-800/80 border-slate-800 hover:border-slate-600 hover:scale-105 shadow-sm'}
                  `}
                >
                  {/* Quick Stamp Button in Compact View */}
                  <button
                    id={`compact-stamp-toggle-shift-${shift.code}-btn`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStampShift(isStampActive ? null : shift.code);
                    }}
                    title={isStampActive ? "Désactiver le tampon" : `Activer le mode tampon pour ${shift.code}`}
                    className={`
                      absolute -top-1.5 -right-1.5 p-0.5 rounded-full border transition-all z-20
                      ${isStampActive 
                        ? 'bg-blue-600 text-white border-blue-300 ring-1 ring-blue-400 opacity-100' 
                        : 'bg-slate-900/90 text-slate-400 hover:text-blue-200 hover:bg-blue-950 border-slate-700 opacity-0 group-hover:opacity-100'}
                    `}
                  >
                    <Stamp className="w-2.5 h-2.5 text-blue-300" />
                  </button>

                  {/* Shift Code Badge */}
                  <span
                    className={`
                      w-full py-1 text-center rounded font-mono-code font-bold text-xs border tracking-wider shadow-sm truncate
                      ${style.badgeClass}
                    `}
                    style={style.customStyle}
                  >
                    {shift.code}
                  </span>

                  {/* Occurrences & Quick Indicator */}
                  <div className="w-full flex items-center justify-between px-0.5 mt-1 text-[9px] text-slate-400">
                    <span className="font-mono-code truncate max-w-[32px] text-slate-400 group-hover:text-slate-200">
                      {shift.hours ? shift.hours.split('-')[0] : ''}
                    </span>
                    {count > 0 ? (
                      <span className="px-1 bg-slate-800 group-hover:bg-slate-700 text-slate-300 rounded font-mono-code font-semibold">
                        {count}
                      </span>
                    ) : (
                      <span className="text-slate-600">0</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Detailed Cards View */
          <div className="divide-y divide-slate-800/60 space-y-1">
            {displayedShifts.map((shift) => {
              const style = getShiftStyle(shift.code, shift.color);
              const duration = calculateShiftDurationHours(shift.hours);
              const count = shiftCounts[shift.code] || 0;
              const isStampActive = activeStampShift === shift.code;
              const seasonInfo = getSeasonInfo(shift.season);

              return (
                <div
                  key={shift.id}
                  id={`shift-item-${shift.code}`}
                  onClick={() => {
                    if (hasActiveSelection) {
                      onApplyShiftToSelection(shift.code);
                    }
                  }}
                  title={hasActiveSelection ? `Appliquer ${shift.code} à la sélection` : `${shift.code} : ${shift.label || shift.code}`}
                  className={`
                    group p-2 rounded-lg border transition-all cursor-pointer text-xs flex flex-col gap-1.5 relative
                    ${isStampActive 
                      ? 'bg-blue-900/50 border-blue-400 ring-2 ring-blue-400 shadow-md scale-[1.01]' 
                      : shift.hidden
                        ? 'bg-slate-950/25 opacity-75 hover:opacity-100 border-dashed border-slate-800'
                        : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/70 hover:border-slate-700'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Shift Code Pill with dynamic styling */}
                      <span
                        className={`
                          px-2 py-0.5 rounded font-mono-code font-bold text-xs border tracking-wide shadow-sm
                          ${style.badgeClass}
                        `}
                        style={style.customStyle}
                      >
                        {shift.code}
                      </span>

                      <span className="font-medium text-slate-200 text-xs truncate max-w-[100px]">
                        {shift.label || shift.code}
                      </span>

                      {/* Season Tag Badge */}
                      {shift.season && shift.season !== 'all' && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full border font-medium flex items-center gap-0.5 ${seasonInfo.badgeClass}`}
                          title={`Shift de saison : ${seasonInfo.label}`}
                        >
                          <span>{seasonInfo.icon}</span>
                          <span>{seasonInfo.label}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Stamp Mode Toggle button */}
                      <button
                        id={`stamp-toggle-shift-${shift.code}-btn`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStampShift(isStampActive ? null : shift.code);
                        }}
                        title={isStampActive ? "Désactiver le tampon" : `Activer le mode tampon avec ${shift.code}`}
                        className={`
                          px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors
                          ${isStampActive 
                            ? 'bg-blue-600 text-white border-blue-400 shadow-xs' 
                            : 'bg-slate-800/90 hover:bg-blue-950 text-slate-300 hover:text-blue-200 border-slate-700 hover:border-blue-500/50'}
                        `}
                      >
                        <Stamp className="w-3 h-3 text-blue-400" />
                        <span>{isStampActive ? 'Actif' : 'Tampon'}</span>
                      </button>

                      {/* Occurrences count */}
                      <span
                        className="text-[10px] font-mono-code px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 group-hover:text-slate-200"
                        title="Nombre d'occurrences dans le planning"
                      >
                        {count}
                      </span>

                      {/* Action buttons: Hide/Unhide, Edit, Delete */}
                      {isAdminOrManager && (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                          {/* Hide / Unhide Toggle */}
                          <button
                            id={`hide-toggle-shift-${shift.code}-btn`}
                            onClick={(e) => handleToggleHideShift(shift, e)}
                            title={shift.hidden ? 'Réafficher ce shift' : 'Masquer ce shift'}
                            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-amber-300 rounded transition-colors"
                          >
                            {shift.hidden ? (
                              <Eye className="w-3 h-3 text-amber-400" />
                            ) : (
                              <EyeOff className="w-3 h-3" />
                            )}
                          </button>

                          {/* Edit Button */}
                          <button
                            id={`edit-shift-${shift.code}-btn`}
                            onClick={(e) => handleOpenEdit(shift, e)}
                            title="Modifier ce shift"
                            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-blue-300 rounded transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>

                          {/* Delete Button */}
                          <button
                            id={`delete-shift-${shift.code}-btn`}
                            onClick={(e) => handleOpenDelete(shift, e)}
                            title="Supprimer ce shift"
                            className="p-1 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-code">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{shift.hours || 'Non spécifié'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {shift.defaultPause && (
                        <span className="text-[10px] text-slate-500">
                          P: {shift.defaultPause}
                        </span>
                      )}
                      {duration > 0 && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          {duration}h
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer / Legend Quick Help */}
      {isAdminOrManager && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span>Raccourcis rapides</span>
            <button
              onClick={handleOpenCreate}
              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono-code"
            >
              <Plus className="w-3 h-3" /> Nouveau shift
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
            <div><kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono-code">Ctrl+C</kbd> Copier</div>
            <div><kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono-code">Ctrl+V</kbd> Coller</div>
            <div><kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono-code">Del</kbd> Effacer</div>
            <div><kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono-code">Poignée</kbd> Glisser</div>
          </div>
        </div>
      )}

      {/* Create / Edit Shift Modal */}
      {isShiftModalOpen && (
        <ShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          onSave={async (shiftData) => {
            if (editingShift) {
              await onUpdateShift(editingShift.id, shiftData);
            } else {
              await onCreateShift(shiftData);
            }
          }}
          initialShift={editingShift}
          existingShifts={shifts}
        />
      )}

      {/* Delete Confirmation Modal */}
      {shiftToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-100">Supprimer le shift ?</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer le shift code{' '}
              <strong className="text-white font-mono-code">{shiftToDelete.code}</strong> ({shiftToDelete.hours}) ?
              {shiftCounts[shiftToDelete.code] > 0 && (
                <span className="block mt-1 text-amber-400 font-semibold">
                  Attention: ce shift est actuellement affecté {shiftCounts[shiftToDelete.code]} fois dans le planning.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShiftToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
