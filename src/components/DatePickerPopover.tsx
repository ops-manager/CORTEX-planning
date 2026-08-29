import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { formatToDateStr, parseDateStr, isSameDay } from '../utils/dateUtils';

interface DatePickerPopoverProps {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS_HEADER = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

export const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({
  currentDate,
  onSelectDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewYear(currentDate.getFullYear());
    setViewMonth(currentDate.getMonth());
  }, [currentDate]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Build calendar matrix (Monday-first)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
  
  // Day of week for 1st of month: 0 is Sunday, in France Monday is 0 so (day + 6) % 7
  const startingDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();

  const calendarCells: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = startingDay - 1; i >= 0; i--) {
    calendarCells.push({
      date: new Date(viewYear, viewMonth - 1, prevMonthLastDay - i),
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      date: new Date(viewYear, viewMonth, i),
      isCurrentMonth: true
    });
  }

  // Next month leading days to complete 35 or 42 cells
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      date: new Date(viewYear, viewMonth + 1, i),
      isCurrentMonth: false
    });
  }

  const today = new Date();

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        id="date-picker-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700/80 rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <CalendarIcon className="w-4 h-4 text-blue-400" />
        <span className="capitalize">
          {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
      </button>

      {isOpen && (
        <div
          id="date-picker-popover-menu"
          className="absolute z-50 mt-2 left-0 w-72 bg-slate-900/98 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-4 text-slate-200 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Month / Year & Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <button
              id="date-picker-prev-month-btn"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 font-semibold text-sm text-slate-100">
              <span>{MONTH_NAMES[viewMonth]}</span>
              <span className="text-slate-400">{viewYear}</span>
            </div>

            <button
              id="date-picker-next-month-btn"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-1.5">
            {DAYS_HEADER.map((d, i) => (
              <div key={i} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarCells.map((cell, idx) => {
              const isSelected = isSameDay(cell.date, currentDate);
              const isTodayCell = isSameDay(cell.date, today);

              return (
                <button
                  key={idx}
                  id={`calendar-day-${formatToDateStr(cell.date)}`}
                  onClick={() => {
                    onSelectDate(cell.date);
                    setIsOpen(false);
                  }}
                  className={`
                    h-7 w-7 rounded-lg flex items-center justify-center font-medium transition-all
                    ${!cell.isCurrentMonth ? 'text-slate-600 hover:text-slate-400' : 'text-slate-200'}
                    ${isSelected ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-400/50' : 'hover:bg-slate-800'}
                    ${isTodayCell && !isSelected ? 'border border-blue-500/50 text-blue-400 font-bold' : ''}
                  `}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Quick Shortcuts */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              id="date-picker-quick-today-btn"
              onClick={() => {
                onSelectDate(new Date());
                setIsOpen(false);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded font-medium transition-colors"
            >
              Aujourd'hui
            </button>

            <button
              id="date-picker-quick-next-month-btn"
              onClick={() => {
                const nextMonth = new Date(currentDate);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                onSelectDate(nextMonth);
                setIsOpen(false);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded font-medium transition-colors"
            >
              Mois suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
