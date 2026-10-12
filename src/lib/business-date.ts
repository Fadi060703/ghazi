export const DISPLAY_LOCALE = "ar-SY-u-ca-gregory-nu-latn";
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

export function getBusinessDate(timeZone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isBusinessDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return year >= MIN_YEAR && year <= MAX_YEAR && month >= 1 && month <= 12 &&
    day >= 1 && day <= daysInMonth(year, month);
}

export function isBusinessMonth(value: unknown): value is string {
  return typeof value === "string" && isBusinessDate(`${value}-01`);
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function changeDateParts(year: number, month: number, day: number): string {
  const boundedYear = Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
  const boundedMonth = Math.min(12, Math.max(1, month));
  return dateKey(boundedYear, boundedMonth, Math.min(
    Math.max(1, day), daysInMonth(boundedYear, boundedMonth),
  ));
}

export function shiftMonth(date: string, offset: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + offset, 1));
  return changeDateParts(target.getUTCFullYear(), target.getUTCMonth() + 1, day);
}

export function shiftDay(date: string, offset: number): string {
  const instant = new Date(`${date}T12:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + offset);
  const nextDate = instant.toISOString().slice(0, 10);
  return isBusinessDate(nextDate) ? nextDate : date;
}

export function formatDate(date: string, short = false): string {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: "UTC",
    weekday: short ? undefined : "long",
    day: "numeric",
    month: short ? "short" : "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function calendarDays(date: string): (string | null)[] {
  const [year, month] = date.split("-").map(Number);
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const count = daysInMonth(year, month);
  const cellCount = Math.ceil((offset + count) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= count ? dateKey(year, month, day) : null;
  });
}
