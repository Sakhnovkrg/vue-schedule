import { ref } from 'vue'
import type { WorkingRange, ClipboardData } from '../types'
import { findFreeSlotBelow } from '../utils/collision'

export function useClipboard() {
  const clipboardData = ref<ClipboardData | null>(null)

  function copy(ranges: WorkingRange[]) {
    if (ranges.length === 0) return

    const minDay = Math.min(...ranges.map(r => r.day))

    clipboardData.value = {
      sourceDay: minDay,
      ranges: ranges.map(r => ({
        dayOffset: r.day - minDay,
        start: r.start,
        end: r.end,
      })),
    }
  }

  function paste(
    targetDay: number | null,
    targetMinutes: number | null,
    allRanges: WorkingRange[],
    startMinutes: number,
    endMinutes: number,
    step: number,
    weekDates: string[]
  ): WorkingRange[] | null {
    if (!clipboardData.value) return null

    const result: WorkingRange[] = []
    const baseDay = targetDay ?? clipboardData.value.sourceDay

    for (const item of clipboardData.value.ranges) {
      const day = baseDay + item.dayOffset
      if (day < 0 || day > 6) continue

      const duration = item.end - item.start
      let start: number

      if (targetMinutes != null && clipboardData.value.ranges.length === 1) {
        start = targetMinutes
      } else {
        start = item.start
      }

      const existingInDay = [
        ...allRanges.filter(r => r.day === day),
        ...result.filter(r => r.day === day),
      ]

      const slot = findFreeSlotBelow(
        start,
        duration,
        day,
        existingInDay,
        startMinutes,
        endMinutes,
        step
      )

      if (!slot) continue

      result.push({
        id: generateId(),
        day,
        date: weekDates[day] || '',
        start: slot.start,
        end: slot.end,
      })
    }

    return result.length > 0 ? result : null
  }

  function hasData(): boolean {
    return clipboardData.value !== null
  }

  return { clipboardData, copy, paste, hasData }
}

let idCounter = 0
function generateId(): string {
  return `range_${Date.now()}_${idCounter++}`
}
