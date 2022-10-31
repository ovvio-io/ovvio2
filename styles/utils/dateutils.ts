export function formatDateSince(date: Date) {
  let ms: number =
    'toMillis' in date ? (date as any).toMillis() : date.getTime();

  let diff = Date.now() - ms;
  ms = diff % 1000;
  diff = (diff - ms) / 1000;
  const seconds = diff % 60;
  diff = (diff - seconds) / 60;
  const minutes = diff % 60;
  diff = (diff - minutes) / 60;
  const hours = diff % 24;
  const days = (diff - hours) / 24;

  if (days) {
    if (days === 1) {
      return 'Yesterday';
    }
    return `${days} Days ago`;
  }
  if (hours) {
    return `${hours} Hours ago`;
  }
  if (minutes) {
    return `${minutes} Minutes ago`;
  }

  return `${seconds} Seconds ago`;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getLocaleMonths() {
  return MONTHS;
}

export function getLocaleWeekDays() {
  return DAYS;
}

export function getMonthName(index: number) {
  return MONTHS[index];
}

export function getShortMonthName(index: number) {
  return getMonthName(index).substring(0, 3);
}

export function getWeekDay(index: number) {
  return DAYS[index];
}

export function formatTimeDiff(date: Date) {
  const now = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  if (year === now.getFullYear()) {
    if (month === now.getMonth()) {
      const daysDiff = now.getDate() - day;
      if (daysDiff === 0) {
        return 'Today';
      }
      if (daysDiff === 1) {
        return 'Yesterday';
      }
    }
  }

  return date.toLocaleDateString(undefined, {
    dateStyle: 'medium',
  });
}
