/**
 * Date Utilities for Calendar & Booking Operations
 * Strictly operates on local calendar dates (YYYY-MM-DD) to prevent timezone drift.
 */

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Gets the Monday of the week for a given date.
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = day === 0 ? -6 : 1 - day; // Monday is 1
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Returns the 7 consecutive days (Monday to Sunday) for the given Monday.
 */
export function get7DaysOfWeek(monday: Date): {
  dateStr: string;
  dayName: string;
  dayNumber: string;
  monthName: string;
  isToday: boolean;
}[] {
  const days = [];
  const todayStr = formatLocalDate(new Date());

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = formatLocalDate(cur);
    days.push({
      dateStr,
      dayName: dayNames[i],
      dayNumber: String(cur.getDate()).padStart(2, '0'),
      monthName: monthNames[cur.getMonth()],
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

/**
 * Formats a week range header string, e.g. "09 Nov – 15 Nov 2026"
 */
export function formatWeekRangeHeader(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return '';
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const startDay = String(start.getDate()).padStart(2, '0');
  const startMonth = monthNames[start.getMonth()];

  const endDay = String(end.getDate()).padStart(2, '0');
  const endMonth = monthNames[end.getMonth()];
  const endYear = end.getFullYear();

  if (start.getMonth() === end.getMonth()) {
    return `${startDay} – ${endDay} ${startMonth} ${endYear}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
}

/**
 * Calculates which week of the month a Monday belongs to (e.g. "Week 2 of 5 — Nov 2026")
 */
export function getWeekLabel(monday: Date): { weekNumber: number; totalWeeks: number; monthYearLabel: string } {
  const year = monday.getFullYear();
  const month = monday.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // First day of month
  const firstDay = new Date(year, month, 1);
  const firstMonday = getMondayOfWeek(firstDay);

  // Approximate week index
  const diffDays = Math.round((monday.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.max(1, Math.min(5, Math.floor(diffDays / 7) + 1));

  return {
    weekNumber,
    totalWeeks: 5,
    monthYearLabel: `${monthNames[month]} ${year}`,
  };
}

export function formatCurrency(amount: number, symbol = '₹'): string {
  if (amount == null || isNaN(amount)) return `${symbol}0`;
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

/**
 * Determines if a given date string (YYYY-MM-DD) is in the past compared to local today.
 */
export function isDateInPast(dateStr: string): boolean {
  if (!dateStr) return false;
  const todayStr = formatLocalDate(new Date());
  return dateStr < todayStr;
}

/**
 * Returns tomorrow's date string (YYYY-MM-DD).
 */
export function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatLocalDate(tomorrow);
}

/**
 * Checks whether a given slot on a given date has already started or elapsed.
 * - Any date strictly before today is elapsed.
 * - Any date after today is NOT elapsed.
 * - For today:
 *   - 'morning': starts at 06:00 (6:00 AM) -> elapsed if current local time >= 06:00
 *   - 'evening': starts at 16:00 (4:00 PM) -> elapsed if current local time >= 16:00
 *   - 'full_day': starts at 06:00 (6:00 AM) -> elapsed if current local time >= 06:00
 */
export function isSlotElapsed(
  dateStr: string,
  slot: 'morning' | 'evening' | 'full_day'
): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const todayStr = formatLocalDate(now);

  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;

  // On today's date:
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (slot === 'morning' || slot === 'full_day') {
    return currentMinutes >= 6 * 60; // 06:00 AM
  }

  if (slot === 'evening') {
    return currentMinutes >= 16 * 60; // 04:00 PM (16:00)
  }

  return false;
}


