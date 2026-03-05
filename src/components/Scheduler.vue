<script setup lang="ts">
import { ref, computed, watch, provide, onMounted, onUnmounted } from 'vue'
import type { WorkingRange, SchedulerLocale } from '../types'
import { snapToStep } from '../utils/time'
import { en, builtinLocales } from '../locales'
import {
  getWeeksOfMonth,
  getCurrentWeekIndex,
  getWeekDates,
  formatDate,
} from '../utils/weeks'
import { useSelection } from '../composables/useSelection'
import { useClipboard } from '../composables/useClipboard'
import { useContextMenu } from '../composables/useContextMenu'
import SchedulerWeekSelector from './SchedulerWeekSelector.vue'
import SchedulerGrid from './SchedulerGrid.vue'
import SchedulerContextMenu from './SchedulerContextMenu.vue'

const props = withDefaults(
  defineProps<{
    ranges: WorkingRange[]
    month?: Date
    loading?: boolean
    readonly?: boolean
    locale?: string | SchedulerLocale
    dayStartHour?: number
    startHour?: number
    endHour?: number
    stepMinutes?: number
    maxHeight?: number
    minColumnWidth?: number
  }>(),
  {
    month: () => new Date(),
    loading: false,
    readonly: false,
    locale: 'en',
    dayStartHour: 0,
    startHour: 0,
    endHour: 24,
    stepMinutes: 30,
    maxHeight: 0,
    minColumnWidth: 0,
  }
)

const emit = defineEmits<{
  'range-create': [range: Omit<WorkingRange, 'id'>]
  'range-update': [range: WorkingRange, previous: WorkingRange]
  'range-delete': [id: string]
  'ranges-delete': [ids: string[]]
  'selection-change': [selectedIds: string[]]
  'clipboard-copy': [ranges: WorkingRange[]]
  'clipboard-paste': [ranges: WorkingRange[]]
  'month-change': [month: Date]
  'week-change': [start: Date, end: Date]
}>()

const internalRanges = computed(() =>
  props.ranges.map(r => ({
    ...r,
    start: snapToStep(r.start * 60, props.stepMinutes),
    end: snapToStep(r.end * 60, props.stepMinutes),
  }))
)

function toHours<T extends { start: number; end: number }>(range: T): T {
  return { ...range, start: range.start / 60, end: range.end / 60 }
}

const resolvedLocale = computed<SchedulerLocale>(() => {
  if (typeof props.locale === 'object') return props.locale
  return builtinLocales[props.locale] ?? en
})

provide('schedulerLocale', resolvedLocale)

const currentMonth = ref(new Date(props.month))

watch(
  () => props.month,
  val => {
    if (
      val.getMonth() !== currentMonth.value.getMonth() ||
      val.getFullYear() !== currentMonth.value.getFullYear()
    ) {
      currentMonth.value = new Date(val)
    }
  }
)

const monthLabel = computed(() => {
  const m = resolvedLocale.value.months[currentMonth.value.getMonth()]
  return `${m} ${currentMonth.value.getFullYear()}`
})

function prevMonth() {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() - 1)
  currentMonth.value = d
  emit('month-change', d)
}

function nextMonth() {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() + 1)
  currentMonth.value = d
  emit('month-change', d)
}

const weeks = computed(() => getWeeksOfMonth(currentMonth.value))
const activeWeekIndex = ref(0)

watch(
  currentMonth,
  () => {
    activeWeekIndex.value = getCurrentWeekIndex(currentMonth.value, weeks.value)
    const week = weeks.value[activeWeekIndex.value]
    if (week) {
      emit('week-change', week.start, week.end)
    }
  },
  { immediate: true }
)

const activeWeek = computed(() => weeks.value[activeWeekIndex.value])
const weekDates = computed(() =>
  activeWeek.value ? getWeekDates(activeWeek.value.start) : []
)

function onWeekSelect(index: number) {
  activeWeekIndex.value = index
  const week = weeks.value[index]
  if (week) {
    emit('week-change', week.start, week.end)
  }
}

function refresh() {
  const week = activeWeek.value
  if (week) {
    emit('week-change', week.start, week.end)
  }
}

const gridRef = ref<InstanceType<typeof SchedulerGrid> | null>(null)

const selection = useSelection()

watch(
  () => selection.selectedArray.value,
  ids => emit('selection-change', ids)
)

function onSelect(id: string) {
  selection.select(id)
}

function onSelectDay(day: number) {
  selection.selectDay(day, props.ranges)
}

function onClearSelection() {
  selection.clearSelection()
}

const clipboard = useClipboard()

function copySelected() {
  const selected = internalRanges.value.filter(r =>
    selection.selectedIds.value.has(r.id)
  )
  if (selected.length > 0) {
    clipboard.copy(selected)
    emit(
      'clipboard-copy',
      selected.map(r => toHours(r))
    )
  }
}

function pasteRanges(targetDay?: number) {
  const dates = weekDates.value.map(d => formatDate(d))
  const gridStart = ((props.dayStartHour + props.startHour) % 24) * 60
  const gridEnd = gridStart + (props.endHour - props.startHour) * 60
  const result = clipboard.paste(
    targetDay ?? null,
    null,
    internalRanges.value,
    gridStart,
    gridEnd,
    props.stepMinutes,
    dates
  )
  if (result) {
    emit(
      'clipboard-paste',
      result.map(r => toHours(r))
    )
  }
}

const contextMenu = useContextMenu()

function onContextRange(e: MouseEvent, rangeId: string, day: number) {
  if (!selection.selectedIds.value.has(rangeId)) {
    selection.select(rangeId)
  }
  contextMenu.showForRange(e, rangeId, day)
}

function onContextDay(e: MouseEvent, day: number) {
  contextMenu.showForDay(e, day)
}

function onContextCopy() {
  copySelected()
  contextMenu.hide()
}

function onContextDelete() {
  const ids = selection.selectedArray.value.filter(
    id => !props.ranges.find(r => r.id === id)?.pending
  )
  if (ids.length > 0) {
    emit('ranges-delete', ids)
    selection.clearSelection()
  }
  contextMenu.hide()
}

function onContextPaste() {
  pasteRanges(contextMenu.state.day ?? undefined)
  contextMenu.hide()
}

function onContextCopyDay() {
  if (contextMenu.state.day != null) {
    const dayRanges = internalRanges.value.filter(
      r => r.day === contextMenu.state.day
    )
    if (dayRanges.length > 0) {
      clipboard.copy(dayRanges)
      emit(
        'clipboard-copy',
        dayRanges.map(r => toHours(r))
      )
    }
  }
  contextMenu.hide()
}

function onContextClearDay() {
  if (contextMenu.state.day != null) {
    const dayIds = props.ranges
      .filter(r => r.day === contextMenu.state.day && !r.pending)
      .map(r => r.id)
    if (dayIds.length > 0) {
      emit('ranges-delete', dayIds)
    }
  }
  contextMenu.hide()
}

function onKeyDown(e: KeyboardEvent) {
  if (props.readonly) return
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    copySelected()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    const day = gridRef.value?.hoveredDay ?? undefined
    pasteRanges(day)
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    const ids = selection.selectedArray.value.filter(
      id => !props.ranges.find(r => r.id === id)?.pending
    )
    if (ids.length > 0) {
      emit('ranges-delete', ids)
      selection.clearSelection()
    }
  } else if (e.key === 'Escape') {
    selection.clearSelection()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})

function onRangeCreate(range: Omit<WorkingRange, 'id'>) {
  emit('range-create', toHours(range))
}

function onRangeUpdate(range: WorkingRange, previous: WorkingRange) {
  emit('range-update', toHours(range), toHours(previous))
}

function onRangeDelete(id: string) {
  const range = props.ranges.find(r => r.id === id)
  if (range?.pending) return
  emit('range-delete', id)
}
</script>

<template>
  <div class="scheduler" tabindex="0">
    <div class="scheduler-nav">
      <div class="scheduler-month-nav">
        <button class="scheduler-nav-btn" @click="prevMonth">&larr;</button>
        <span class="scheduler-month-label">{{ monthLabel }}</span>
        <button class="scheduler-nav-btn" @click="nextMonth">&rarr;</button>
      </div>
      <SchedulerWeekSelector
        :weeks="weeks"
        :active-index="activeWeekIndex"
        :month="currentMonth"
        @select="onWeekSelect"
      />
    </div>

    <SchedulerGrid
      ref="gridRef"
      :ranges="internalRanges"
      :week-dates="weekDates"
      :month="currentMonth"
      :day-start-hour="dayStartHour"
      :start-hour="startHour"
      :end-hour="endHour"
      :step-minutes="stepMinutes"
      :max-height="maxHeight"
      :min-column-width="minColumnWidth"
      :loading="loading"
      :readonly="readonly"
      :selected-ids="selection.selectedIds.value"
      @range-create="onRangeCreate"
      @range-update="onRangeUpdate"
      @range-delete="onRangeDelete"
      @select="onSelect"
      @select-day="onSelectDay"
      @clear-selection="onClearSelection"
      @context-range="onContextRange"
      @context-day="onContextDay"
      @refresh="refresh"
    >
      <template v-if="$slots.range" #range="{ range, timeLabel }">
        <slot name="range" :range="toHours(range)" :time-label="timeLabel" />
      </template>
    </SchedulerGrid>

    <SchedulerContextMenu
      :state="contextMenu.state"
      :has-clipboard="clipboard.hasData()"
      @copy="onContextCopy"
      @delete="onContextDelete"
      @paste="onContextPaste"
      @copy-day="onContextCopyDay"
      @clear-day="onContextClearDay"
    />
  </div>
</template>

<style scoped>
.scheduler {
  outline: none;
  font-family: inherit;
}

.scheduler-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
  flex-wrap: wrap;
}

.scheduler-month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scheduler-nav-btn {
  padding: 6px 14px;
  border: 1px solid var(--scheduler-border-color, #d0d5dd);
  background: var(--scheduler-bg, #fff);
  border-radius: var(--scheduler-radius, 8px);
  cursor: pointer;
  font-size: 15px;
  font-family: inherit;
  color: #344054;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.scheduler-nav-btn:hover {
  background: var(--scheduler-header-bg, #f7f8fa);
}

@media (max-width: 600px) {
  .scheduler-nav {
    flex-direction: column;
    align-items: stretch;
  }

  .scheduler-month-nav {
    justify-content: space-between;
  }
}

.scheduler-month-label {
  font-size: 15px;
  font-weight: 600;
  min-width: 150px;
  text-align: center;
  text-transform: capitalize;
  color: #1a1a2e;
}
</style>
