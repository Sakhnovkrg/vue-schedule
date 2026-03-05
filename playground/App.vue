<script setup lang="ts">
import { ref } from 'vue'
import Scheduler from '../src/components/Scheduler.vue'
import type { WorkingRange } from '../src/types'
import { hoursToTime, timeToHours } from '../src/utils/time'
import { getWeekDates, formatDate } from '../src/utils/weeks'
import {
  getRangesForWeek,
  createRange as apiCreate,
  updateRange as apiUpdate,
  deleteRange as apiDelete,
  createRanges as apiCreateMany,
  type ApiWorkingRange,
} from './mockApi'

const DOCTOR_ID = 1

const locale = ref('en')
const dayStartHour = ref(8)
const startHour = ref(0)
const endHour = ref(12)
const stepMinutes = ref(30)

const ranges = ref<WorkingRange[]>([])
const loading = ref(false)

const currentWeekDates = ref<string[]>([])

async function loadRanges() {
  if (currentWeekDates.value.length === 0) return
  loading.value = true
  try {
    const apiRanges = await getRangesForWeek(DOCTOR_ID, currentWeekDates.value)
    ranges.value = apiRanges.map(toInternal)
  } finally {
    loading.value = false
  }
}

function onMonthChange() {}

function onWeekChange(start: Date) {
  currentWeekDates.value = getWeekDates(start).map(d => formatDate(d))
  loadRanges()
}

function toInternal(r: ApiWorkingRange): WorkingRange {
  const date = new Date(r.work_date + 'T00:00:00')
  const dayOfWeek = date.getDay()
  const day = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  return {
    id: String(r.id),
    day,
    date: r.work_date,
    start: timeToHours(r.start_time),
    end: timeToHours(r.end_time),
  }
}

let tempId = 0

async function onRangeCreate(range: Omit<WorkingRange, 'id'>) {
  const localId = `_tmp_${++tempId}`
  const optimistic: WorkingRange = {
    id: localId,
    day: range.day,
    date: range.date,
    start: range.start,
    end: range.end,
    pending: true,
  }
  ranges.value.push(optimistic)

  const created = await apiCreate({
    doctor_id: DOCTOR_ID,
    work_date: range.date,
    start_time: hoursToTime(range.start),
    end_time: hoursToTime(range.end),
  })

  const idx = ranges.value.findIndex(r => r.id === localId)
  if (idx >= 0) {
    ranges.value[idx] = toInternal(created)
  }
}

async function onRangeUpdate(range: WorkingRange, previous: WorkingRange) {
  const weekDates =
    currentWeekDates.value.length > 0
      ? getWeekDates(new Date(currentWeekDates.value[0] + 'T00:00:00'))
      : []
  const date = weekDates[range.day]
  const workDate = date ? formatDate(date) : range.date

  const idx = ranges.value.findIndex(r => r.id === range.id)
  if (idx >= 0) {
    ranges.value[idx] = { ...range, date: workDate, pending: true }
  }

  const result = await apiUpdate(Number(range.id), {
    work_date: workDate,
    start_time: hoursToTime(range.start),
    end_time: hoursToTime(range.end),
  })

  const idx2 = ranges.value.findIndex(r => r.id === range.id)
  if (idx2 >= 0) {
    if (result) {
      ranges.value[idx2] = { ...ranges.value[idx2], pending: false }
    } else {
      ranges.value[idx2] = { ...previous }
    }
  }
}

async function onRangeDelete(id: string) {
  const idx = ranges.value.findIndex(r => r.id === id)
  if (idx >= 0) {
    ranges.value[idx] = { ...ranges.value[idx], pending: true }
  }

  await apiDelete(Number(id))
  ranges.value = ranges.value.filter(r => r.id !== id)
}

async function onRangesDelete(ids: string[]) {
  const idSet = new Set(ids)
  ranges.value = ranges.value.map(r =>
    idSet.has(r.id) ? { ...r, pending: true } : r
  )

  await Promise.all(ids.map(id => apiDelete(Number(id))))
  ranges.value = ranges.value.filter(r => !idSet.has(r.id))
}

async function onClipboardPaste(newRanges: WorkingRange[]) {
  const localIds: string[] = []
  const optimistic: WorkingRange[] = []
  for (const r of newRanges) {
    const localId = `_tmp_${++tempId}`
    localIds.push(localId)
    optimistic.push({
      id: localId,
      day: r.day,
      date: r.date,
      start: r.start,
      end: r.end,
      pending: true,
    })
  }
  ranges.value = [...ranges.value, ...optimistic]

  const apiRanges = newRanges.map(r => ({
    doctor_id: DOCTOR_ID,
    work_date: r.date,
    start_time: hoursToTime(r.start),
    end_time: hoursToTime(r.end),
  }))
  const created = await apiCreateMany(apiRanges)

  const localIdSet = new Set(localIds)
  ranges.value = ranges.value.filter(r => !localIdSet.has(r.id))
  ranges.value.push(...created.map(toInternal))
}
</script>

<template>
  <div class="demo">
    <h1>
      <a href="https://github.com/Sakhnovkrg/vue-schedule" target="_blank"
        >Vue Schedule Demo</a
      >
    </h1>

    <div class="settings">
      <div class="locale-switcher">
        <button
          v-for="l in ['en', 'ru', 'kk']"
          :key="l"
          class="locale-btn"
          :class="{ active: locale === l }"
          @click="locale = l"
        >
          {{ l.toUpperCase() }}
        </button>
      </div>
      <label>
        Day start
        <select v-model.number="dayStartHour">
          <option v-for="h in 24" :key="h - 1" :value="h - 1">
            {{ h - 1 }}:00
          </option>
        </select>
      </label>
      <label>
        Hours
        <select v-model.number="endHour">
          <option v-for="h in 24" :key="h" :value="h">
            {{ h }}
          </option>
        </select>
      </label>
      <label>
        Step
        <select v-model.number="stepMinutes">
          <option :value="10">10 min</option>
          <option :value="15">15 min</option>
          <option :value="30">30 min</option>
          <option :value="60">60 min</option>
        </select>
      </label>
    </div>

    <Scheduler
      :ranges="ranges"
      :loading="loading"
      :day-start-hour="dayStartHour"
      :start-hour="startHour"
      :end-hour="endHour"
      :step-minutes="stepMinutes"
      :locale="locale"
      :max-height="400"
      :min-column-width="80"
      @range-create="onRangeCreate"
      @range-update="onRangeUpdate"
      @range-delete="onRangeDelete"
      @ranges-delete="onRangesDelete"
      @clipboard-paste="onClipboardPaste"
      @month-change="onMonthChange"
      @week-change="onWeekChange"
    />

    <div class="hints">
      <p><strong>Hints:</strong></p>
      <ul>
        <li>Drag on empty space — create a range</li>
        <li>Drag a range — move it</li>
        <li>Drag range edge — resize</li>
        <li>Double-click a range — delete</li>
        <li>Double-click a day header — select all day ranges</li>
        <li>Ctrl+C / Ctrl+V — copy / paste</li>
        <li>Delete — remove selected</li>
        <li>Right-click — context menu</li>
      </ul>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
  background: #f0f2f5;
  color: #1a1a2e;
}

.demo {
  --scheduler-range-bg: #2cc5a0;
  --scheduler-range-border: #21a888;
  --scheduler-range-selected-bg: #1a9e7e;
  --scheduler-border-color: #e0e4ea;
  --scheduler-bg: #fff;
  --scheduler-header-bg: #f7f8fa;
  --scheduler-today-bg: #edfaf6;
  --scheduler-hour-line-color: #eef0f4;

  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

h1 {
  margin-bottom: 16px;
  font-size: 22px;
  font-weight: 700;
}

h1 a {
  color: #1a1a2e;
  text-decoration: none;
}

h1 a:hover {
  color: #2cc5a0;
}

.settings {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.settings label {
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

.settings select {
  padding: 4px 8px;
  border: 1px solid #e0e4ea;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: #1a1a2e;
  background: #fff;
}

.settings select:focus {
  outline: none;
  border-color: #2cc5a0;
}

.locale-switcher {
  display: flex;
  gap: 2px;
  background: #e0e4ea;
  border-radius: 8px;
  padding: 2px;
}

.locale-btn {
  padding: 4px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: #6b7280;
  transition: all 0.15s;
}

.locale-btn:hover {
  color: #1a1a2e;
}

.locale-btn.active {
  background: #fff;
  color: #1a1a2e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.hints {
  margin-top: 20px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e0e4ea;
  border-radius: 10px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

.hints strong {
  color: #1a1a2e;
}

.hints ul {
  margin-top: 8px;
  padding-left: 20px;
}

.hints li {
  margin-bottom: 4px;
}
</style>
