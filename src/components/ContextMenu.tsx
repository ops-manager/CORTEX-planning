import React, { useEffect, useRef } from 'react';
import { Shift } from '../types';
import { getShiftStyle } from '../utils/shiftUtils';
import { Copy, Clipboard, Trash2, Calendar, Coffee, Plane, RefreshCw, X, Code2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelectShift: (code: string) => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  onFillWeek: () => void;
  onExtractDateShifts?: () => void;
  shifts: Shift[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onSelectShift,
  onCopy,
  onPaste,
  onClear,
  onFillWeek,
  onExtractDateShifts,
  shifts
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust positioning so menu doesn't overflow the viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 340);

  return (
    <div
      ref={menuRef}
      id="spreadsheet-context-menu"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-56 bg-slate-900/98 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl p-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
        <span>Actions cellule</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Quick Shift Palette */}
      <div className="p-1 mb-1 bg-slate-950/60 rounded-lg border border-slate-800/80">
        <span className="block text-[10px] text-slate-400 mb-1 px-1 font-medium">Assigner un shift :</span>
        <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto pr-0.5">
          {shifts
            .filter(s => !s.hidden)
            .filter((s, idx, arr) => arr.findIndex(x => x.id === s.id) === idx)
            .map((s) => {
              const style = getShiftStyle(s.code, s.color);
              return (
                <button
                  key={s.id}
                  id={`context-shift-btn-${s.code}`}
                  onClick={() => {
                    onSelectShift(s.code);
                    onClose();
                  }}
                  style={style.customStyle}
                  className={`
                    px-1.5 py-1 rounded text-center font-mono-code font-bold text-[11px] border transition-transform active:scale-95
                    ${style.badgeClass}
                  `}
                  title={`${s.code} (${s.hours})${s.label ? ` - ${s.label}` : ''}`}
                >
                  {s.code}
                </button>
              );
            })}
        </div>
      </div>

      {/* Standard Operations */}
      <div className="space-y-0.5 border-t border-slate-800/80 pt-1">
        <button
          id="context-copy-btn"
          onClick={() => {
            onCopy();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            <span>Copier</span>
          </div>
          <kbd className="font-mono-code text-[10px] text-slate-400">Ctrl+C</kbd>
        </button>

        <button
          id="context-paste-btn"
          onClick={() => {
            onPaste();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clipboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Coller</span>
          </div>
          <kbd className="font-mono-code text-[10px] text-slate-400">Ctrl+V</kbd>
        </button>

        <button
          id="context-fill-week-btn"
          onClick={() => {
            onFillWeek();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span>Dupliquer sur 7 jours</span>
          </div>
        </button>

        {onExtractDateShifts && (
          <button
            id="context-extract-shifts-btn"
            onClick={() => {
              onExtractDateShifts();
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-blue-950/50 text-blue-300 hover:text-white transition-colors border-t border-slate-800/80 mt-1"
          >
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Extraire shifts date (API/JSON)</span>
            </div>
          </button>
        )}

        <button
          id="context-clear-btn"
          onClick={() => {
            onClear();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 transition-colors border-t border-slate-800/60 mt-1"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Supprimer</span>
          </div>
          <kbd className="font-mono-code text-[10px] text-rose-400/80">Del</kbd>
        </button>
      </div>
    </div>
  );
};
