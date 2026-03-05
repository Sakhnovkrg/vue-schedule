<script setup lang="ts">
import { ref, computed, watch, inject, type ComputedRef } from 'vue'
import type { WorkingRange, SchedulerLocale } from '../types'
import { formatHour, snapFloor } from '../utils/time'
import { hasOverlap } from '../utils/collision'
import { formatDate } from '../utils/weeks'
import { en } from '../locales'
import { useDrag } from '../composables/useDrag'
import {
  useRangeInteraction,
  type CreatePreview,
} from '../composables/useRangeInteraction'
import SchedulerRange from './SchedulerRange.vue'

const props = withDefaults(
  defineProps<{
    ranges: WorkingRange[]
    weekDates: Date[]
    month: Date
    dayStartHour?: number
    startHour?: number
    endHour?: number
    stepMinutes?: number
    maxHeight?: number
    minColumnWidth?: number
    loading?: boolean
    readonly?: boolean
    selectedIds: Set<string>
  }>(),
  {
    dayStartHour: 0,
    startHour: 0,
    endHour: 24,
    stepMinutes: 30,
    maxHeight: 0,
    minColumnWidth: 0,
    loading: false,
    readonly: false,
  }
)

const locale = inject<ComputedRef<SchedulerLocale>>(
  'schedulerLocale',
  computed(() => en)
)

const emit = defineEmits<{
  'range-create': [range: Omit<WorkingRange, 'id'>]
  'range-update': [range: WorkingRange, previous: WorkingRange]
  'range-delete': [id: string]
  select: [id: string]
  'select-day': [day: number]
  'clear-selection': []
  'context-range': [e: MouseEvent, rangeId: string, day: number]
  'context-day': [e: MouseEvent, day: number]
  refresh: []
}>()

const columnRefs = ref<HTMLElement[]>([])
const localRanges = ref<WorkingRange[]>([])

watch(
  () => props.ranges,
  val => {
    localRanges.value = val.map(r => ({ ...r }))
  },
  { immediate: true, deep: true }
)

const hours = computed(() => {
  const h: number[] = []
  const total = props.endHour - props.startHour
  for (let i = 0; i < total; i++) {
    h.push((props.dayStartHour + props.startHour + i) % 24)
  }
  return h
})

const totalVisibleMinutes = computed(
  () => (props.endHour - props.startHour) * 60
)

function minutesToGridOffset(minutes: number): number {
  const gridStart = ((props.dayStartHour + props.startHour) % 24) * 60
  let offset = minutes - gridStart
  if (offset < -720) offset += 1440
  if (offset > 1440) offset -= 1440
  return offset
}

function gridOffsetToMinutes(offset: number): number {
  const gridStartMinutes = ((props.dayStartHour + props.startHour) % 24) * 60
  return (gridStartMinutes + offset) % 1440
}

const dayColumns = computed(() => {
  const m = props.month.getMonth()
  return props.weekDates.map((date, i) => {
    const inMonth = date.getMonth() === m
    const prevInMonth = i > 0 && props.weekDates[i - 1].getMonth() === m
    const nextInMonth =
      i < props.weekDates.length - 1 &&
      props.weekDates[i + 1].getMonth() === m
    return {
      index: i,
      name: locale.value.daysShort[i],
      date: date.getDate(),
      fullDate: formatDate(date),
      isToday: formatDate(date) === formatDate(new Date()),
      outOfMonth: !inMonth,
      monthBoundaryLeft: inMonth && !prevInMonth && i > 0,
      monthBoundaryRight: inMonth && !nextInMonth && i < 6,
    }
  })
})

function isRangeVisible(range: WorkingRange): boolean {
  const startOff = minutesToGridOffset(range.start)
  const endOff = minutesToGridOffset(range.end)
  return endOff > 0 && startOff < totalVisibleMinutes.value
}

function rangesForDay(day: number): WorkingRange[] {
  return localRanges.value.filter(r => r.day === day && isRangeVisible(r))
}

function rangeStyle(range: WorkingRange) {
  const startOff = Math.max(0, minutesToGridOffset(range.start))
  const endOff = Math.min(
    totalVisibleMinutes.value,
    minutesToGridOffset(range.end)
  )
  const top = (startOff / totalVisibleMinutes.value) * 100
  const height = ((endOff - startOff) / totalVisibleMinutes.value) * 100
  return {
    top: `${top}%`,
    height: `${height}%`,
  }
}

function previewStyle(preview: CreatePreview) {
  const offset = minutesToGridOffset(preview.start)
  const duration = preview.end - preview.start
  return {
    top: `${(offset / totalVisibleMinutes.value) * 100}%`,
    height: `${(duration / totalVisibleMinutes.value) * 100}%`,
  }
}

const interaction = useRangeInteraction(
  () => ({
    startHour: props.startHour,
    endHour: props.endHour,
    stepMinutes: props.stepMinutes,
    dayStartHour: props.dayStartHour,
  }),
  () => localRanges.value
)

function applyLocalUpdate(id: string, updates: Partial<WorkingRange>) {
  const idx = localRanges.value.findIndex(r => r.id === id)
  if (idx >= 0) {
    localRanges.value[idx] = { ...localRanges.value[idx], ...updates }
  }
}

function pixelToMinutes(y: number, colEl: HTMLElement): number {
  const rect = colEl.getBoundingClientRect()
  const relativeY = Math.max(0, Math.min(y - rect.top, rect.height))
  const ratio = relativeY / rect.height
  const gridOffset = ratio * totalVisibleMinutes.value
  return gridOffsetToMinutes(gridOffset)
}

function dayFromX(x: number): number {
  for (let i = 0; i < columnRefs.value.length; i++) {
    const rect = columnRefs.value[i].getBoundingClientRect()
    if (x >= rect.left && x <= rect.right) return i
  }
  return -1
}

const createDrag = useDrag({
  onMove(e: MouseEvent) {
    if (interaction.interactionMode.value !== 'create') return
    const col = columnRefs.value[interaction.createPreview.value?.day ?? 0]
    if (!col) return
    const minutes = pixelToMinutes(e.clientY, col)
    interaction.updateCreate(minutes)
  },
  onEnd() {
    const preview = interaction.finishCreate()
    if (preview) {
      const date = props.weekDates[preview.day]
      emit('range-create', {
        day: preview.day,
        date: formatDate(date),
        start: preview.start,
        end: preview.end,
      })
    }
  },
})

function onColumnMouseDown(e: MouseEvent, day: number) {
  if (e.button !== 0 || props.readonly) return

  emit('clear-selection')
  const col = columnRefs.value[day]
  if (!col) return
  const minutes = pixelToMinutes(e.clientY, col)
  const snapped = snapFloor(minutes, props.stepMinutes)

  const dayRanges = rangesForDay(day)
  if (hasOverlap(snapped, snapped + props.stepMinutes, dayRanges)) return

  interaction.startCreate(day, snapped)
  createDrag.startDrag(e)
}

const moveDrag = useDrag({
  onMove(e: MouseEvent) {
    if (interaction.interactionMode.value !== 'move') return
    const day = dayFromX(e.clientX)
    const col = columnRefs.value[Math.max(0, day)]
    if (!col) return
    const minutes = pixelToMinutes(e.clientY, col)
    interaction.updateMove(minutes, day >= 0 ? day : 0, applyLocalUpdate)
  },
  onEnd() {
    const result = interaction.finishMove()
    if (result) {
      emit('range-update', result.range, result.previous)
    }
  },
})

const copyMoveDrag = useDrag({
  onMove(e: MouseEvent) {
    if (interaction.interactionMode.value !== 'copy-move') return
    const day = dayFromX(e.clientX)
    const col = columnRefs.value[Math.max(0, day)]
    if (!col) return
    const minutes = pixelToMinutes(e.clientY, col)
    interaction.updateCopyMove(minutes, day >= 0 ? day : 0)
  },
  onEnd() {
    const preview = interaction.finishCopyMove()
    if (preview) {
      const date = props.weekDates[preview.day]
      emit('range-create', {
        day: preview.day,
        date: formatDate(date),
        start: preview.start,
        end: preview.end,
      })
    }
  },
})

function onRangeMoveStart(e: MouseEvent, rangeId: string) {
  if (props.readonly) return
  const range = localRanges.value.find(r => r.id === rangeId)
  if (!range) return
  const col = columnRefs.value[range.day]
  if (!col) return
  const minutes = pixelToMinutes(e.clientY, col)

  if (e.ctrlKey || e.metaKey) {
    interaction.startCopyMove(rangeId, minutes)
    copyMoveDrag.startDrag(e)
  } else {
    interaction.startMove(rangeId, minutes)
    moveDrag.startDrag(e)
  }
}

const resizeDrag = useDrag({
  onMove(e: MouseEvent) {
    if (
      interaction.interactionMode.value !== 'resize-top' &&
      interaction.interactionMode.value !== 'resize-bottom'
    )
      return
    const range = localRanges.value.find(
      r => r.id === interaction.activeRangeId.value
    )
    if (!range) return
    const col = columnRefs.value[range.day]
    if (!col) return
    const minutes = pixelToMinutes(e.clientY, col)
    interaction.updateResize(minutes, applyLocalUpdate)
  },
  onEnd() {
    const result = interaction.finishResize()
    if (result) {
      emit('range-update', result.range, result.previous)
    }
  },
})

function onRangeResizeStart(
  e: MouseEvent,
  rangeId: string,
  edge: 'top' | 'bottom'
) {
  if (props.readonly) return
  interaction.startResize(rangeId, edge)
  resizeDrag.startDrag(e)
}

function onRangeClick(_e: MouseEvent, rangeId: string) {
  emit('select', rangeId)
}

function onRangeDblClick(rangeId: string) {
  if (props.readonly) return
  emit('range-delete', rangeId)
}

function onRangeContext(e: MouseEvent, rangeId: string, day: number) {
  if (props.readonly) return
  emit('context-range', e, rangeId, day)
}

function onDayContext(e: MouseEvent, day: number) {
  if (props.readonly) return
  e.preventDefault()
  emit('context-day', e, day)
}

function onDayDblClick(day: number) {
  emit('select-day', day)
}

const gridMinWidth = computed(() => {
  if (!props.minColumnWidth) return undefined
  return 56 + props.minColumnWidth * 7 + 2
})

let lastTapTime = 0
let lastTapRangeId: string | null = null
const DOUBLE_TAP_DELAY = 300

let columnTouchStart: { x: number; y: number } | null = null

function onColumnTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    columnTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
}

function onColumnTouchEnd(e: TouchEvent, day: number) {
  if (e.changedTouches.length !== 1 || props.readonly) return

  if (interaction.interactionMode.value || touchDragActive) return

  const touch = e.changedTouches[0]
  if (columnTouchStart) {
    const dx = Math.abs(touch.clientX - columnTouchStart.x)
    const dy = Math.abs(touch.clientY - columnTouchStart.y)
    columnTouchStart = null
    if (dx > 8 || dy > 8) return
  }

  const col = columnRefs.value[day]
  if (!col) return

  emit('clear-selection')
  const minutes = pixelToMinutes(touch.clientY, col)
  const snapped = snapFloor(minutes, props.stepMinutes)

  const dayRanges = rangesForDay(day)
  if (hasOverlap(snapped, snapped + props.stepMinutes, dayRanges)) return

  const date = props.weekDates[day]
  emit('range-create', {
    day,
    date: formatDate(date),
    start: snapped,
    end: snapped + props.stepMinutes,
  })
}

const hoveredDay = ref<number | null>(null)

function onColumnMouseEnter(day: number) {
  hoveredDay.value = day
}

function onColumnMouseLeave() {
  hoveredDay.value = null
}

defineExpose({ hoveredDay })

let touchDragActive = false

function onRangeTouchStart(e: TouchEvent, rangeId: string) {
  if (e.touches.length !== 1 || props.readonly) return

  const now = Date.now()
  if (lastTapRangeId === rangeId && now - lastTapTime < DOUBLE_TAP_DELAY) {
    lastTapTime = 0
    lastTapRangeId = null
    emit('range-delete', rangeId)
    return
  }
  lastTapTime = now
  lastTapRangeId = rangeId

  e.preventDefault()
  e.stopPropagation()

  const range = localRanges.value.find(r => r.id === rangeId)
  if (!range) return
  const col = columnRefs.value[range.day]
  if (!col) return
  const touch = e.touches[0]
  const minutes = pixelToMinutes(touch.clientY, col)

  const rangeEl = (e.target as HTMLElement).closest(
    '.scheduler-range'
  ) as HTMLElement
  if (!rangeEl) return
  const rect = rangeEl.getBoundingClientRect()
  const edgeZone = Math.min(14, rect.height * 0.25)

  touchDragActive = true

  const clearFlag = () => {
    setTimeout(() => {
      touchDragActive = false
    }, 50)
    document.removeEventListener('touchend', clearFlag)
    document.removeEventListener('touchcancel', clearFlag)
  }
  document.addEventListener('touchend', clearFlag)
  document.addEventListener('touchcancel', clearFlag)

  if (touch.clientY - rect.top < edgeZone) {
    interaction.startResize(rangeId, 'top')
    resizeDrag.startDrag(e)
  } else if (rect.bottom - touch.clientY < edgeZone) {
    interaction.startResize(rangeId, 'bottom')
    resizeDrag.startDrag(e)
  } else {
    interaction.startMove(rangeId, minutes)
    moveDrag.startDrag(e)
  }
}
</script>

<template>
  <div
    class="scheduler-grid"
    :style="{
      ...(maxHeight ? { maxHeight: maxHeight + 'px', overflowY: 'auto' } : {}),
      ...(gridMinWidth ? { overflowX: 'auto' } : {}),
    }"
  >
    <div
      class="grid-header"
      :style="gridMinWidth ? { minWidth: gridMinWidth + 'px' } : undefined"
    >
      <div class="time-gutter header-gutter">
        <button class="refresh-btn" @click="emit('refresh')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path
              d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
            />
          </svg>
        </button>
      </div>
      <div
        v-for="col in dayColumns"
        :key="col.index"
        class="day-header header-cell"
        :class="{
          today: col.isToday,
          'out-of-month': col.outOfMonth,
          'month-boundary-left': col.monthBoundaryLeft,
          'month-boundary-right': col.monthBoundaryRight,
        }"
        @dblclick="onDayDblClick(col.index)"
        @contextmenu.prevent="onDayContext($event, col.index)"
      >
        <span class="day-name">{{ col.name }}</span>
        <span class="day-date">{{ col.date }}</span>
      </div>
    </div>

    <div
      class="grid-body"
      :style="gridMinWidth ? { minWidth: gridMinWidth + 'px' } : undefined"
    >
      <div class="time-gutter">
        <div v-for="hour in hours" :key="hour" class="hour-label">
          {{ formatHour(hour) }}
        </div>
      </div>

      <div
        v-for="col in dayColumns"
        :key="col.index"
        :ref="
          (el: any) => {
            if (el) columnRefs[col.index] = el as HTMLElement
          }
        "
        class="day-column"
        :class="{
          today: col.isToday,
          'out-of-month': col.outOfMonth,
          'month-boundary-left': col.monthBoundaryLeft,
          'month-boundary-right': col.monthBoundaryRight,
        }"
        @mouseenter="onColumnMouseEnter(col.index)"
        @mouseleave="onColumnMouseLeave"
        @mousedown="onColumnMouseDown($event, col.index)"
        @touchstart="onColumnTouchStart($event)"
        @touchend="onColumnTouchEnd($event, col.index)"
        @contextmenu.prevent="onDayContext($event, col.index)"
      >
        <div v-for="hour in hours" :key="hour" class="hour-cell" />

        <div
          v-for="range in rangesForDay(col.index)"
          :key="range.id"
          :data-range-id="range.id"
          @touchstart="onRangeTouchStart($event, range.id)"
        >
          <SchedulerRange
            :range="range"
            :style-obj="rangeStyle(range)"
            :selected="selectedIds.has(range.id)"
            :dragging="interaction.activeRangeId.value === range.id"
            :readonly="readonly"
            @mousedown-move="onRangeMoveStart($event, range.id)"
            @mousedown-resize="
              (e: MouseEvent, edge: 'top' | 'bottom') =>
                onRangeResizeStart(e, range.id, edge)
            "
            @click="onRangeClick($event, range.id)"
            @dblclick="onRangeDblClick(range.id)"
            @contextmenu="onRangeContext($event, range.id, col.index)"
          >
            <template v-if="$slots.range" #default="slotProps">
              <slot name="range" v-bind="slotProps" />
            </template>
          </SchedulerRange>
        </div>

        <div
          v-if="
            interaction.createPreview.value &&
            interaction.createPreview.value.day === col.index
          "
          class="create-preview"
          :style="previewStyle(interaction.createPreview.value)"
        />

        <div
          v-if="
            interaction.movePreview.value &&
            interaction.movePreview.value.day === col.index
          "
          class="move-preview"
          :style="previewStyle(interaction.movePreview.value)"
        />
      </div>
    </div>

    <Transition name="scheduler-fade">
      <div v-if="loading" class="scheduler-loading-overlay">
        <div class="scheduler-spinner" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.scheduler-grid {
  position: relative;
  border: 1px solid var(--scheduler-border-color, #d0d5dd);
  border-radius: var(--scheduler-radius, 8px);
  background: var(--scheduler-bg, #fff);
  user-select: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  -webkit-overflow-scrolling: touch;
}

.scheduler-grid::-webkit-scrollbar {
  width: 6px;
}

.scheduler-grid::-webkit-scrollbar-track {
  background: transparent;
}

.scheduler-grid::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.scheduler-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.35);
}

.grid-header {
  display: flex;
  border-bottom: 2px solid var(--scheduler-border-color, #d0d5dd);
  background: var(--scheduler-header-bg, #f9fafb);
  position: sticky;
  top: 0;
  z-index: 20;
}

.header-cell {
  flex: 1;
  text-align: center;
  padding: 10px 4px;
  font-size: 13px;
}

.day-header {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: default;
  border-right: 1px solid var(--scheduler-border-color, #d0d5dd);
}

.day-header:last-child {
  border-right: none;
}

.day-header.out-of-month .day-name,
.day-header.out-of-month .day-date {
  opacity: 0.5;
}

.day-header.today {
  background: var(--scheduler-today-bg, #eff8ff);
}

.day-name {
  font-weight: 600;
  color: #1a1a2e;
}

.day-date {
  color: #6b7280;
  font-size: 12px;
}

.grid-body {
  display: flex;
  position: relative;
}

.time-gutter {
  width: 56px;
  flex-shrink: 0;
  border-right: 1px solid var(--scheduler-border-color, #d0d5dd);
  position: sticky;
  left: 0;
  z-index: 5;
  background: var(--scheduler-bg, #fff);
}

.time-gutter.header-gutter {
  background: var(--scheduler-header-bg, #f9fafb);
  z-index: 21;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: var(--scheduler-radius, 8px);
  cursor: pointer;
  color: color-mix(in srgb, var(--scheduler-border-color, #d0d5dd) 50%, #000);
  transition: color 0.15s, background 0.15s;
}

.refresh-btn:hover {
  color: var(--scheduler-range-bg, #4a90d9);
  background: color-mix(in srgb, var(--scheduler-border-color, #d0d5dd) 30%, transparent);
}

.hour-label {
  height: 60px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 2px;
  font-size: 11px;
  color: #6b7280;
  border-bottom: 1px solid var(--scheduler-hour-line-color, #eef0f4);
}

.day-column {
  flex: 1;
  position: relative;
  border-right: 1px solid var(--scheduler-border-color, #d0d5dd);
}

.day-column:last-child {
  border-right: none;
}

.day-column.today {
  background: var(--scheduler-today-bg, #eff8ff);
}

.hour-cell {
  height: 60px;
  border-bottom: 1px solid var(--scheduler-hour-line-color, #eaecf0);
}

.hour-cell:last-child {
  border-bottom: none;
}

.month-boundary-left {
  border-left: 2px solid var(--scheduler-range-bg, #4a90d9);
}

.day-header.month-boundary-left::after {
  content: '';
  position: absolute;
  left: -2px;
  bottom: -2px;
  width: 2px;
  height: 2px;
  background: var(--scheduler-range-bg, #4a90d9);
}

.month-boundary-right {
  border-right: 2px solid var(--scheduler-range-bg, #4a90d9);
}

.day-header.month-boundary-right::after {
  content: '';
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 2px;
  height: 2px;
  background: var(--scheduler-range-bg, #4a90d9);
}


.create-preview {
  position: absolute;
  left: 2px;
  right: 2px;
  background: var(--scheduler-range-bg, #4a90d9);
  opacity: 0.4;
  border-radius: var(--scheduler-range-radius, 4px);
  pointer-events: none;
  z-index: 1;
}

.move-preview {
  position: absolute;
  left: 2px;
  right: 2px;
  background: var(--scheduler-range-bg, #4a90d9);
  opacity: 0.3;
  border-radius: 4px;
  border: 2px dashed var(--scheduler-range-border, #3572b0);
  pointer-events: none;
  z-index: 1;
}

.scheduler-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  border-radius: var(--scheduler-radius, 8px);
}

.scheduler-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--scheduler-border-color, #e0e4ea);
  border-top-color: var(--scheduler-range-bg, #4a90d9);
  border-radius: 50%;
  animation: scheduler-spin 0.7s linear infinite;
}

@keyframes scheduler-spin {
  to {
    transform: rotate(360deg);
  }
}

.scheduler-fade-enter-active,
.scheduler-fade-leave-active {
  transition: opacity 0.2s ease;
}

.scheduler-fade-enter-from,
.scheduler-fade-leave-to {
  opacity: 0;
}
</style>
