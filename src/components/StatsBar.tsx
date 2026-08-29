import React from 'react';
import { Agent, Shift, ShiftStats } from '../types';
import { DateItem } from '../utils/dateUtils';
import { calculateShiftDurationHours } from '../utils/shiftUtils';
import { Users, Clock, ShieldAlert, BarChart3, ChevronUp, ChevronDown } from 'lucide-react';

interface StatsBarProps {
  agents: Agent[];
  shifts: Shift[];
  dates: DateItem[];
  planning: Record<string, string>;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  agents,
  shifts,
  dates,
  planning,
  isExpanded,
  onToggleExpand
}) => {
  // Aggregate daily coverage
  const dailyCoverage = React.useMemo(() => {
    return dates.map(d => {
      let morning = 0;
      let day = 0;
      let evening = 0;
      let night = 0;
      let rest = 0;
      let leave = 0;

      agents.forEach(a => {
        const code = planning[`${a.id}_${d.dateStr}`] || '';
        if (code === 'M1' || code === 'M2') morning++;
        else if (code === 'J1' || code === 'J2') day++;
        else if (code === 'S1' || code === 'S2') evening++;
        else if (code === 'N1') night++;
        else if (code === 'RH') rest++;
        else if (code === 'CA' || code === 'MAL' || code === 'FORM') leave++;
      });

      const totalActive = morning + day + evening + night;
      return {
        dateItem: d,
        morning,
        day,
        evening,
        night,
        rest,
        leave,
        totalActive,
        isUnderstaffed: totalActive < 2 // alert if under 2 active agents
      };
    });
  }, [agents, dates, planning]);

  // Overall totals
  const totalWorkedShifts = React.useMemo(() => {
    let count = 0;
    Object.values(planning).forEach((code: string) => {
      if (code && code !== 'RH' && code !== 'CA' && code !== 'MAL') count++;
    });
    return count;
  }, [planning]);

  return (
    <div
      id="cortex-stats-bar"
      className="bg-slate-900/95 border-t border-slate-800 text-slate-200 select-none flex-shrink-0 z-30 shadow-lg"
    >
      {/* Mini summary strip */}
      <div className="px-4 py-2 flex items-center justify-between text-xs border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Couverture Opérationnelle</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 font-mono-code">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Matin (M)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Journée (J)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Soirée (S)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Nuit (N)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400 font-mono-code">
            <strong className="text-white">{agents.length}</strong> agents · <strong className="text-emerald-400">{totalWorkedShifts}</strong> vacations planifiées
          </span>

          <button
            id="toggle-stats-expanded-btn"
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <span>{isExpanded ? 'Réduire' : 'Détails par jour'}</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded daily coverage timeline row matching the grid horizontally */}
      {isExpanded && (
        <div className="p-3 bg-slate-950/90 overflow-x-auto max-h-48">
          <div className="flex gap-1.5 min-w-max">
            {dailyCoverage.map((item, idx) => (
              <div
                key={idx}
                id={`daily-coverage-${item.dateItem.dateStr}`}
                className={`
                  w-20 p-2 rounded-lg border flex flex-col gap-1 text-[10px] font-mono-code transition-colors
                  ${item.dateItem.isToday ? 'border-blue-500 bg-blue-950/20' : item.dateItem.isWeekend ? 'border-slate-800 bg-slate-900/50' : 'border-slate-800/80 bg-slate-900'}
                  ${item.isUnderstaffed ? 'ring-1 ring-rose-500/40' : ''}
                `}
              >
                <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-1">
                  <span className={item.dateItem.isToday ? 'text-blue-400 font-extrabold' : 'text-slate-300'}>
                    {item.dateItem.dayNameShort} {item.dateItem.dayNumber}
                  </span>
                  <span className={`px-1 rounded text-[9px] ${item.totalActive > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {item.totalActive}p
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[9px] text-slate-400">
                  <div className="flex justify-between">
                    <span className="text-amber-400">M:</span>
                    <span>{item.morning}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-400">J:</span>
                    <span>{item.day}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-400">S:</span>
                    <span>{item.evening}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">N:</span>
                    <span>{item.night}</span>
                  </div>
                </div>

                {item.rest > 0 && (
                  <div className="text-[8px] text-slate-400 text-center border-t border-slate-800/60 pt-0.5">
                    {item.rest} RH · {item.leave} Abs
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
