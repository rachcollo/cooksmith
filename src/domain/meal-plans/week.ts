const dayFormatter = new Intl.DateTimeFormat('en-AU', { weekday: 'short' })
const fullFormatter = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const headingFormatter = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
function parseIsoDate(date: string): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
export function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate)
  date.setUTCDate(date.getUTCDate() + days)
  return toIsoDate(date)
}
export function startOfWeek(isoDate: string): string {
  const date = parseIsoDate(isoDate)
  const weekday = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - weekday + 1)
  return toIsoDate(date)
}
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}
export function previousWeek(weekStart: string): string {
  return addDays(weekStart, -7)
}
export function nextWeek(weekStart: string): string {
  return addDays(weekStart, 7)
}
export function currentWeek(today = new Date()): string {
  return startOfWeek(toIsoDate(today))
}
export function formatDisplayDate(isoDate: string): string {
  return fullFormatter.format(parseIsoDate(isoDate))
}
export function formatDayLabel(isoDate: string): string {
  return dayFormatter.format(parseIsoDate(isoDate))
}
export function formatWeekRange(weekStart: string): string {
  return `${headingFormatter.format(parseIsoDate(weekStart))} – ${headingFormatter.format(parseIsoDate(addDays(weekStart, 6)))}`
}
