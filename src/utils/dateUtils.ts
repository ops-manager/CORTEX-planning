export interface DateItem {
  date: Date;
  dateStr: string; // "YYYY-MM-DD"
  dayNumber: number;
  dayNameShort: string; // "Lun", "Mar", etc.
  monthName: string; // "Août", "Septembre", etc.
  year: number;
  isWeekend: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
}

export interface MonthGroup {
  monthName: string;
  year: number;
  label: string; // e.g. "Août 2026"
  colSpan: number;
  startIndex: number;
}

const FRENCH_DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const FRENCH_DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatToDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD into a Date object (at midnight local time)
 */
export function parseDateStr(str: string): Date {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if two dates represent the same calendar day
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Generate a continuous array of DateItems starting from a central date with range
 */
export function generateDateRange(centerDate: Date, pastDays: number = 10, futureDays: number = 50): DateItem[] {
  const result: DateItem[] = [];
  const today = new Date();
  
  const startDate = new Date(centerDate);
  startDate.setDate(startDate.getDate() - pastDays);

  const totalDays = pastDays + futureDays;

  for (let i = 0; i < totalDays; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);

    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isTodayFlag = isSameDay(current, today);
    const dateStr = formatToDateStr(current);

    result.push({
      date: current,
      dateStr,
      dayNumber: current.getDate(),
      dayNameShort: FRENCH_DAYS_SHORT[dayOfWeek],
      monthName: FRENCH_MONTHS[current.getMonth()],
      year: current.getFullYear(),
      isWeekend,
      isToday: isTodayFlag,
      dayOfWeek
    });
  }

  return result;
}

/**
 * Group sequential date items by Month for the top sticky header
 */
export function groupDatesByMonth(dates: DateItem[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  if (dates.length === 0) return groups;

  let currentMonth = dates[0].monthName;
  let currentYear = dates[0].year;
  let startIndex = 0;
  let count = 0;

  dates.forEach((item, index) => {
    if (item.monthName === currentMonth && item.year === currentYear) {
      count++;
    } else {
      groups.push({
        monthName: currentMonth,
        year: currentYear,
        label: `${currentMonth} ${currentYear}`,
        colSpan: count,
        startIndex
      });
      currentMonth = item.monthName;
      currentYear = item.year;
      startIndex = index;
      count = 1;
    }
  });

  if (count > 0) {
    groups.push({
      monthName: currentMonth,
      year: currentYear,
      label: `${currentMonth} ${currentYear}`,
      colSpan: count,
      startIndex
    });
  }

  return groups;
}

/**
 * Pretty print full date in French (e.g. "Samedi 29 Août 2026")
 */
export function formatFullFrenchDate(d: Date): string {
  const dayName = FRENCH_DAYS_FULL[d.getDay()];
  const dayNum = d.getDate();
  const monthName = FRENCH_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName} ${dayNum} ${monthName} ${year}`;
}
