// Date utilities - handles timezone issues with Airtable dates

/**
 * Parse Airtable date string as LOCAL date (not UTC)
 * Airtable returns dates as "YYYY-MM-DD" which JavaScript interprets as UTC midnight
 * This causes dates to appear as the previous day in timezones west of UTC
 */
export function parseLocalDate(dateString: string | Date | null | undefined): Date | null {
  if (!dateString) return null;
  
  // If it's already a Date object, return it
  if (dateString instanceof Date) return dateString;
  
  const str = String(dateString);
  
  // If it's just a date (YYYY-MM-DD), parse as local time
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }
  
  // If it has a time component, still parse to ensure local interpretation
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const [datePart] = str.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Fallback to standard parsing for other formats
  return new Date(dateString);
}

/**
 * Format date for display
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = parseLocalDate(dateString);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = parseLocalDate(dateString);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get relative date info for display badges
 */
export function getDueDateInfo(dateString: string | null | undefined): {
  text: string;
  isToday: boolean;
  isOverdue: boolean;
  isTomorrow: boolean;
  diffDays: number;
} | null {
  if (!dateString) return null;
  
  const date = parseLocalDate(dateString);
  if (!date) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isToday = diffDays === 0;
  const isOverdue = diffDays < 0;
  const isTomorrow = diffDays === 1;
  
  let text: string;
  if (isToday) {
    text = 'Today';
  } else if (isTomorrow) {
    text = 'Tomorrow';
  } else if (isOverdue) {
    text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (diffDays <= 7) {
    text = date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  return { text, isToday, isOverdue, isTomorrow, diffDays };
}

/**
 * Get today's date formatted for display
 */
export function getFormattedTodayDate(): string {
  const today = new Date();
  return today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Check if a date is today
 */
export function isToday(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const date = parseLocalDate(dateString);
  if (!date) return false;
  
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const date = parseLocalDate(dateString);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date < today;
}
