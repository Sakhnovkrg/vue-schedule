export interface WorkingRange {
  id: string
  day: number
  date: string
  start: number
  end: number
  pending?: boolean
}

export interface SchedulerProps {
  ranges: WorkingRange[]
  month: Date
  dayStartHour?: number
  startHour?: number
  endHour?: number
  stepMinutes?: number
}

export interface WeekInfo {
  index: number
  start: Date
  end: Date
  label: string
}

export interface ClipboardData {
  ranges: {
    dayOffset: number
    start: number
    end: number
  }[]
  sourceDay: number
}

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  type: 'range' | 'day' | null
  rangeId: string | null
  day: number | null
}

export interface SchedulerLocale {
  months: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ]
  daysShort: [string, string, string, string, string, string, string]
  copy: string
  delete: string
  paste: string
  copyDay: string
  clearDay: string
}
