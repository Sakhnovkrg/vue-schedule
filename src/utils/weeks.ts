import type { WeekInfo } from '../types'

function getWeekStart(date: Date, weekStartsOn: number): Date {
  const d = new Date(date)
  const dayOfWeek = d.getDay()
  const diff = (dayOfWeek - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeeksOfMonth(
  month: Date,
  weekStartsOn: number = 1
): WeekInfo[] {
  const year = month.getFullYear()
  const m = month.getMonth()

  const lastDay = new Date(year, m + 1, 0)
  const firstMonday = getWeekStart(new Date(year, m, 1), weekStartsOn)

  const weeks: WeekInfo[] = []

  for (let i = 0; i < 6; i++) {
    const weekStart = new Date(firstMonday)
    weekStart.setDate(weekStart.getDate() + i * 7)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    if (weekStart > lastDay) break

    weeks.push({
      index: weeks.length,
      start: weekStart,
      end: weekEnd,
      label: `${weekStart.getDate()}–${weekEnd.getDate()}`,
    })
  }

  return weeks
}

export function getCurrentWeekIndex(_month: Date, weeks: WeekInfo[]): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const week of weeks) {
    if (today >= week.start && today <= week.end) {
      return week.index
    }
  }
  return 0
}

export function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getDayName(dayIndex: number): string {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return names[dayIndex]
}
