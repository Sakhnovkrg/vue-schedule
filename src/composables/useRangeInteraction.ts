import { ref } from 'vue'
import type { WorkingRange } from '../types'
import { snapToStep, snapFloor } from '../utils/time'
import {
  hasOverlap,
  getMaxResizeTop,
  getMaxResizeBottom,
} from '../utils/collision'

export type InteractionMode =
  | 'create'
  | 'move'
  | 'copy-move'
  | 'resize-top'
  | 'resize-bottom'

export interface CreatePreview {
  day: number
  start: number
  end: number
}

interface InteractionProps {
  startHour: number
  endHour: number
  stepMinutes: number
  dayStartHour: number
}

export function useRangeInteraction(
  getProps: () => InteractionProps,
  getRanges: () => WorkingRange[]
) {
  const interactionMode = ref<InteractionMode | null>(null)
  const activeRangeId = ref<string | null>(null)
  const createPreview = ref<CreatePreview | null>(null)
  const movePreview = ref<CreatePreview | null>(null)

  let dragStartMinutes = 0
  let dragStartDay = 0
  let dragOffsetMinutes = 0
  let originalRange: WorkingRange | null = null
  let pendingDay: number | null = null

  function getGridBounds() {
    const { dayStartHour, startHour, endHour } = getProps()
    const minMin = ((dayStartHour + startHour) % 24) * 60
    const totalVisible = (endHour - startHour) * 60
    const maxMin = minMin + totalVisible
    return { minMin, maxMin }
  }

  function clamp(minutes: number): number {
    const { minMin, maxMin } = getGridBounds()
    if (maxMin > 1440) {
      if (minutes < minMin && minutes < maxMin - 1440) {
        return Math.max(minutes + 1440, minMin)
      }
      return Math.max(
        minMin,
        Math.min(maxMin, minutes < minMin ? minutes + 1440 : minutes)
      )
    }
    return Math.max(minMin, Math.min(maxMin, minutes))
  }

  function startCreate(day: number, startMinutes: number) {
    const { stepMinutes } = getProps()
    interactionMode.value = 'create'
    dragStartDay = day
    dragStartMinutes = snapFloor(startMinutes, stepMinutes)
    createPreview.value = {
      day,
      start: dragStartMinutes,
      end: dragStartMinutes + stepMinutes,
    }
  }

  function updateCreate(currentMinutes: number) {
    if (!createPreview.value) return
    const { stepMinutes } = getProps()
    const { minMin, maxMin } = getGridBounds()
    const clamped = clamp(currentMinutes)
    const snapped = snapToStep(clamped, stepMinutes)

    const start = Math.min(dragStartMinutes, snapped)
    const end = Math.max(dragStartMinutes, snapped)

    const finalEnd = end === start ? start + stepMinutes : end

    createPreview.value = {
      day: dragStartDay,
      start: Math.max(start, minMin),
      end: Math.min(finalEnd, maxMin),
    }
  }

  function finishCreate(): CreatePreview | null {
    const preview = createPreview.value
    if (!preview) return null

    const ranges = getRanges()
    const dayRanges = ranges.filter(r => r.day === preview.day)

    if (hasOverlap(preview.start, preview.end, dayRanges)) {
      createPreview.value = null
      interactionMode.value = null
      return null
    }

    createPreview.value = null
    interactionMode.value = null
    return { ...preview }
  }

  function startCopyMove(rangeId: string, mouseMinutes: number) {
    const range = getRanges().find(r => r.id === rangeId)
    if (!range) return

    interactionMode.value = 'copy-move'
    activeRangeId.value = rangeId
    originalRange = { ...range }
    dragOffsetMinutes = mouseMinutes - range.start
    createPreview.value = {
      day: range.day,
      start: range.start,
      end: range.end,
    }
  }

  function updateCopyMove(currentMinutes: number, currentDay: number) {
    if (!originalRange || !createPreview.value) return
    const { stepMinutes } = getProps()
    const { minMin, maxMin } = getGridBounds()

    const duration = originalRange.end - originalRange.start
    let newStart = snapToStep(
      clamp(currentMinutes) - dragOffsetMinutes,
      stepMinutes
    )
    newStart = Math.max(newStart, minMin)
    let newEnd = newStart + duration

    if (newEnd > maxMin) {
      newEnd = maxMin
      newStart = newEnd - duration
    }

    const day =
      currentDay >= 0 && currentDay <= 6 ? currentDay : originalRange.day
    createPreview.value = { day, start: newStart, end: newEnd }
  }

  function finishCopyMove(): CreatePreview | null {
    const preview = createPreview.value
    if (!preview) {
      interactionMode.value = null
      activeRangeId.value = null
      originalRange = null
      createPreview.value = null
      return null
    }

    const ranges = getRanges()
    const dayRanges = ranges.filter(r => r.day === preview.day)

    interactionMode.value = null
    activeRangeId.value = null
    originalRange = null
    createPreview.value = null

    if (hasOverlap(preview.start, preview.end, dayRanges)) {
      return null
    }

    return { ...preview }
  }

  function startMove(rangeId: string, mouseMinutes: number) {
    const range = getRanges().find(r => r.id === rangeId)
    if (!range) return

    interactionMode.value = 'move'
    activeRangeId.value = rangeId
    originalRange = { ...range }
    dragOffsetMinutes = mouseMinutes - range.start
  }

  function updateMove(
    currentMinutes: number,
    currentDay: number,
    applyFn: (_id: string, _updates: Partial<WorkingRange>) => void
  ) {
    if (!originalRange || !activeRangeId.value) return
    const { stepMinutes } = getProps()
    const { minMin, maxMin } = getGridBounds()

    const duration = originalRange.end - originalRange.start
    let newStart = snapToStep(
      clamp(currentMinutes) - dragOffsetMinutes,
      stepMinutes
    )
    newStart = Math.max(newStart, minMin)
    let newEnd = newStart + duration

    if (newEnd > maxMin) {
      newEnd = maxMin
      newStart = newEnd - duration
    }

    const day =
      currentDay >= 0 && currentDay <= 6 ? currentDay : originalRange.day
    pendingDay = day

    const dayRanges = getRanges().filter(
      r => r.day === day && r.id !== activeRangeId.value
    )

    if (day !== originalRange.day) {
      applyFn(activeRangeId.value, {
        start: originalRange.start,
        end: originalRange.end,
      })
      if (!hasOverlap(newStart, newEnd, dayRanges)) {
        movePreview.value = { day, start: newStart, end: newEnd }
      }
    } else {
      movePreview.value = null
      if (!hasOverlap(newStart, newEnd, dayRanges)) {
        applyFn(activeRangeId.value, { start: newStart, end: newEnd })
      }
    }
  }

  function finishMove(): {
    range: WorkingRange
    previous: WorkingRange
  } | null {
    const id = activeRangeId.value
    const preview = movePreview.value
    movePreview.value = null
    if (!id || !originalRange) {
      interactionMode.value = null
      activeRangeId.value = null
      pendingDay = null
      return null
    }

    const current = getRanges().find(r => r.id === id)
    const targetDay = pendingDay
    interactionMode.value = null
    activeRangeId.value = null
    pendingDay = null

    if (!current) {
      originalRange = null
      return null
    }

    const finalRange = preview
      ? { ...current, day: preview.day, start: preview.start, end: preview.end }
      : { ...current, day: targetDay != null ? targetDay : current.day }

    if (
      finalRange.start === originalRange.start &&
      finalRange.end === originalRange.end &&
      finalRange.day === originalRange.day
    ) {
      originalRange = null
      return null
    }

    const dayRanges = getRanges().filter(
      r => r.day === finalRange.day && r.id !== id
    )
    if (hasOverlap(finalRange.start, finalRange.end, dayRanges)) {
      originalRange = null
      return null
    }

    const previous = { ...originalRange }
    originalRange = null
    return { range: finalRange, previous }
  }

  function startResize(rangeId: string, edge: 'top' | 'bottom') {
    const range = getRanges().find(r => r.id === rangeId)
    if (!range) return

    interactionMode.value = edge === 'top' ? 'resize-top' : 'resize-bottom'
    activeRangeId.value = rangeId
    originalRange = { ...range }
  }

  function updateResize(
    currentMinutes: number,
    applyFn: (_id: string, _updates: Partial<WorkingRange>) => void
  ) {
    if (!activeRangeId.value || !originalRange) return
    const { stepMinutes } = getProps()
    const { minMin, maxMin } = getGridBounds()
    const ranges = getRanges()
    const snapped = snapToStep(clamp(currentMinutes), stepMinutes)

    if (interactionMode.value === 'resize-top') {
      const maxTop = getMaxResizeTop(
        activeRangeId.value,
        originalRange.day,
        ranges,
        minMin / 60
      )
      const newStart = Math.max(snapped, maxTop)
      if (newStart < originalRange.end - stepMinutes + 1) {
        applyFn(activeRangeId.value, { start: newStart })
      }
    } else if (interactionMode.value === 'resize-bottom') {
      const maxBottom = getMaxResizeBottom(
        activeRangeId.value,
        originalRange.day,
        ranges,
        maxMin / 60
      )
      const newEnd = Math.min(snapped, maxBottom)
      if (newEnd > originalRange.start + stepMinutes - 1) {
        applyFn(activeRangeId.value, { end: newEnd })
      }
    }
  }

  function finishResize(): {
    range: WorkingRange
    previous: WorkingRange
  } | null {
    return finishMove()
  }

  function cancelInteraction() {
    interactionMode.value = null
    activeRangeId.value = null
    createPreview.value = null
    movePreview.value = null
    originalRange = null
    pendingDay = null
  }

  return {
    interactionMode,
    activeRangeId,
    createPreview,
    movePreview,
    startCreate,
    updateCreate,
    finishCreate,
    startCopyMove,
    updateCopyMove,
    finishCopyMove,
    startMove,
    updateMove,
    finishMove,
    startResize,
    updateResize,
    finishResize,
    cancelInteraction,
  }
}
