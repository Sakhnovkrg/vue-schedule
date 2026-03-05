import type { WorkingRange } from '../types'

export function hasOverlap(
  start: number,
  end: number,
  ranges: WorkingRange[],
  excludeId?: string
): boolean {
  return ranges.some(r => r.id !== excludeId && start < r.end && end > r.start)
}

export function clampToFreeSpace(
  start: number,
  end: number,
  day: number,
  ranges: WorkingRange[],
  startHour: number,
  endHour: number,
  excludeId?: string
): { start: number; end: number } | null {
  const dayRanges = ranges
    .filter(r => r.day === day && r.id !== excludeId)
    .sort((a, b) => a.start - b.start)

  const minBound = startHour * 60
  const maxBound = endHour * 60
  const duration = end - start

  let s = Math.max(start, minBound)
  let e = s + duration

  if (e > maxBound) {
    e = maxBound
    s = e - duration
  }
  if (s < minBound) {
    s = minBound
    e = s + duration
  }

  if (!hasOverlap(s, e, dayRanges)) {
    return { start: s, end: e }
  }

  return null
}

export function findFreeSlotBelow(
  afterMinutes: number,
  duration: number,
  day: number,
  ranges: WorkingRange[],
  _startMinutes: number,
  endMinutes: number,
  step: number
): { start: number; end: number } | null {
  const dayRanges = ranges
    .filter(r => r.day === day)
    .sort((a, b) => a.start - b.start)

  const maxBound = endMinutes

  for (let s = afterMinutes; s + duration <= maxBound; s += step) {
    if (!hasOverlap(s, s + duration, dayRanges)) {
      return { start: s, end: s + duration }
    }
  }

  return null
}

export function getMaxResizeTop(
  rangeId: string,
  day: number,
  ranges: WorkingRange[],
  startHour: number
): number {
  const dayRanges = ranges
    .filter(r => r.day === day && r.id !== rangeId)
    .sort((a, b) => a.start - b.start)

  const currentRange = ranges.find(r => r.id === rangeId)
  if (!currentRange) return startHour * 60

  let maxTop = startHour * 60
  for (const r of dayRanges) {
    if (r.end <= currentRange.start) {
      maxTop = r.end
    }
  }
  return maxTop
}

export function getMaxResizeBottom(
  rangeId: string,
  day: number,
  ranges: WorkingRange[],
  endHour: number
): number {
  const dayRanges = ranges
    .filter(r => r.day === day && r.id !== rangeId)
    .sort((a, b) => a.start - b.start)

  const currentRange = ranges.find(r => r.id === rangeId)
  if (!currentRange) return endHour * 60

  for (const r of dayRanges) {
    if (r.start >= currentRange.end) {
      return r.start
    }
  }
  return endHour * 60
}
