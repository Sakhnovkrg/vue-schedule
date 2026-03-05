export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function snapToStep(minutes: number, step: number): number {
  return Math.round(minutes / step) * step
}

export function snapFloor(minutes: number, step: number): number {
  return Math.floor(minutes / step) * step
}

export function snapCeil(minutes: number, step: number): number {
  return Math.ceil(minutes / step) * step
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function clampMinutes(
  minutes: number,
  startHour: number,
  endHour: number
): number {
  return Math.max(startHour * 60, Math.min(endHour * 60, minutes))
}

export function hoursToTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function timeToHours(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}
