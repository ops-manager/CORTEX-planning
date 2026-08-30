import React, { useRef } from 'react';
import { DatePickerPopover } from './DatePickerPopover';
import { ShiftSeason } from '../types';
import { 
  Undo2, 
  Redo2, 
  Sparkles, 
  Download, 
  Upload, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Activity, 
  Database,
  Users,
  Code2
} from 'lucide-react';

interface HeaderProps {
  currentCenterDate: Date;
  onSelectDate: (date: Date) => void;
  onJumpToday: () => void;
  onPrevRange: () => void;
  onNextRange: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAutoGeneratePattern: () => void;
  onExportCSV: () => void;
  onImportCSVFile: (file: File) => void;
  isBackendConnected?: boolean;
  isFirestoreConnected: boolean;
  totalAgentsCount: number;
  totalShiftsAssigned?: number;
  isLegendOpen: boolean;
  onToggleLegend: () => void;
  onOpenAgentManager: () => void;
  onOpenExtractorModal?: () => void;
  viewRangeDays?: number;
  onChangeViewRangeDays?: (days: number) => void;
  activeSeasonFilter?: ShiftSeason;
  onChangeSeasonFilter?: (season: ShiftSeason) => void;
  onClearSelection?: () => void;
  hasSelection?: boolean;
  onResetDataset?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCenterDate,
  onSelectDate,
  onJumpToday,
  onPrevRange,
  onNextRange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAutoGeneratePattern,
  onExportCSV,
  onImportCSVFile,
  isFirestoreConnected,
  totalAgentsCount,
  isLegendOpen,
  onToggleLegend,
  onOpenAgentManager,
  onOpenExtractorModal
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCSVFile(file);
    }
  };

  return (
    <header
      id="cortex-app-header"
      className="bg-slate-900/95 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-40 select-none shadow-md"
    >
      {/* Hidden File Input for CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,text/csv,text/plain"
        className="hidden"
        id="cortex-csv-file-input"
      />

      {/* Brand & App Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/40">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                CORTEX Planning
              </h1>
              <span className="text-[10px] uppercase font-mono-code font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                OPS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Planning & gestion des effectifs
            </p>
          </div>
        </div>

        {/* Firestore Persistence Live Badge */}
        <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-slate-800 text-xs">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isFirestoreConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isFirestoreConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-300 font-medium">
              {isFirestoreConnected ? 'Database Active' : 'Firestore Synchro...'}
            </span>
          </span>
        </div>
      </div>

      {/* Center: Date Picker, Aujourd'hui & Navigation */}
      <div className="flex items-center gap-2">
        <button
          id="today-nav-btn"
          onClick={onJumpToday}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 hover:shadow-blue-500/25"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Aujourd'hui</span>
        </button>

        <div className="flex items-center bg-slate-950/60 border border-slate-800 rounded-lg p-0.5">
          <button
            id="prev-week-btn"
            onClick={onPrevRange}
            title="Reculer de 7 jours"
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Date Picker Popover */}
          <DatePickerPopover
            currentDate={currentCenterDate}
            onSelectDate={onSelectDate}
          />

          <button
            id="next-week-btn"
            onClick={onNextRange}
            title="Avancer de 7 jours"
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right: Actions & Tools */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-950/60 border border-slate-800 rounded-lg p-0.5">
          <button
            id="undo-action-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Annuler (Ctrl+Z)"
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            id="redo-action-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Rétablir (Ctrl+Y)"
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Auto Fill Cyclic Rotation */}
        <button
          id="auto-fill-rotations-btn"
          onClick={onAutoGeneratePattern}
          title="Générer un cycle de roulement automatique 24/7"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 hover:text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Cycle 24/7</span>
        </button>

        {/* Import CSV */}
        <button
          id="import-csv-btn"
          onClick={handleImportClick}
          title="Importer un planning depuis un fichier CSV"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-blue-400" />
          <span>Importer</span>
        </button>

        {/* Export CSV */}
        <button
          id="export-csv-btn"
          onClick={onExportCSV}
          title="Exporter le planning au format CSV"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Exporter</span>
        </button>

        {/* API & Shifts Extractor Button */}
        {onOpenExtractorModal && (
          <button
            id="header-open-api-extractor-btn"
            onClick={onOpenExtractorModal}
            title="Extraire les shifts par date via REST API / JSON / CSV"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-950/60 hover:bg-blue-900/70 text-blue-300 hover:text-white border border-blue-700/60 rounded-lg text-xs font-semibold shadow-sm transition-all hover:shadow-blue-500/20 active:scale-95"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">API & Extraction</span>
          </button>
        )}

        {/* Manage Agents & Teams Panel */}
        <button
          id="header-open-agent-manager-btn"
          onClick={onOpenAgentManager}
          title="Gérer les effectifs et équipes"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden md:inline">Agents</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded-full font-mono-code">
            {totalAgentsCount}
          </span>
        </button>

        {/* Toggle Shift Legend */}
        <button
          id="header-toggle-legend-btn"
          onClick={onToggleLegend}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors
            ${isLegendOpen 
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}
          `}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Légende</span>
        </button>
      </div>
    </header>
  );
};
