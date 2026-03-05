# @sakhnovkrg/vue-schedule

Weekly scheduler component for Vue 3. A days-by-hours grid with full drag interaction for building work schedules.

[Demo](https://sakhnovkrg.github.io/vue-schedule/) | [README на русском](./README_RU.md)

## Installation

```bash
npm install @sakhnovkrg/vue-schedule
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Scheduler } from '@sakhnovkrg/vue-schedule'
import '@sakhnovkrg/vue-schedule/style'
import type { WorkingRange } from '@sakhnovkrg/vue-schedule'

const ranges = ref<WorkingRange[]>([])

function onRangeCreate(range: Omit<WorkingRange, 'id'>) {
  // POST to server, add to ranges
}

function onRangeUpdate(range: WorkingRange, previous: WorkingRange) {
  // PUT to server, update in ranges
}

function onRangeDelete(id: string) {
  // DELETE from server, remove from ranges
}

function onRangesDelete(ids: string[]) {
  // Batch DELETE, remove from ranges
}

function onClipboardPaste(newRanges: WorkingRange[]) {
  // POST array to server, add to ranges
}

function onWeekChange(start: Date, end: Date) {
  // Load ranges for the new week
}
</script>

<template>
  <Scheduler
    :ranges="ranges"
    :day-start-hour="8"
    :end-hour="12"
    :step-minutes="30"
    :max-height="500"
    @range-create="onRangeCreate"
    @range-update="onRangeUpdate"
    @range-delete="onRangeDelete"
    @ranges-delete="onRangesDelete"
    @clipboard-paste="onClipboardPaste"
    @week-change="onWeekChange"
  />
</template>
```

## WorkingRange

```ts
interface WorkingRange {
  id: string
  day: number // 0=Mon .. 6=Sun
  date: string // "2025-02-03"
  start: number // start hour (9 = 9:00, 9.5 = 9:30)
  end: number // end hour (18 = 18:00, 17.5 = 17:30)
  pending?: boolean // optimistic UI flag
}
```

Set `pending: true` to show a pulsing spinner on a range. Useful for optimistic updates — add the range to `ranges` with `pending: true`, then remove the flag after the API responds.

## Props

| Prop             | Type                        | Default      | Description                                                                                               |
| ---------------- | --------------------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| `ranges`         | `WorkingRange[]`            | —            | Array of ranges (required)                                                                                |
| `month`          | `Date`                      | `new Date()` | Initial month. Month navigation is built into the component                                               |
| `loading`        | `boolean`                   | `false`      | Shows a loading overlay on the grid                                                                       |
| `readonly`       | `boolean`                   | `false`      | View-only mode: create, move, resize, delete and clipboard are disabled. Slots remain interactive         |
| `locale`         | `string \| SchedulerLocale` | `'en'`       | Locale key (`'en'`, `'ru'`, `'kk'`) or a custom `SchedulerLocale` object                                  |
| `dayStartHour`   | `number`                    | `0`          | Hour at which the Y axis begins (e.g. `8` starts the grid at 8:00; after 23:00 it wraps to 0:00, 1:00...) |
| `startHour`      | `number`                    | `0`          | Offset from `dayStartHour` in hours. E.g. `dayStartHour=8, startHour=2` → grid starts at 10:00            |
| `endHour`        | `number`                    | `24`         | Total hours to display. E.g. `dayStartHour=8, endHour=12` → grid from 8:00 to 20:00                       |
| `stepMinutes`    | `number`                    | `30`         | Grid step in minutes (5, 10, 15, 30, 60)                                                                  |
| `maxHeight`      | `number`                    | —            | Max height in px; enables vertical scroll with a sticky header                                            |
| `minColumnWidth` | `number`                    | `0`          | Min day column width in px; enables horizontal scroll when needed                                         |

## Events

| Event              | Payload                                       | Description                                                                                          |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `range-create`     | `Omit<WorkingRange, 'id'>`                    | Range created (drag on empty space or click)                                                         |
| `range-update`     | `range: WorkingRange, previous: WorkingRange` | Range moved or resized                                                                               |
| `range-delete`     | `id: string`                                  | Single range deleted (double-click)                                                                  |
| `ranges-delete`    | `ids: string[]`                               | Multiple ranges deleted (Delete key, clear day)                                                      |
| `clipboard-paste`  | `WorkingRange[]`                              | Pasted from clipboard (Ctrl+V, context menu). IDs are temporary — replace with server-generated ones |
| `clipboard-copy`   | `WorkingRange[]`                              | Copied to clipboard (informational)                                                                  |
| `selection-change` | `string[]`                                    | Selection changed                                                                                    |
| `month-change`     | `month: Date`                                 | Month switched via navigation buttons                                                                |
| `week-change`      | `start: Date, end: Date`                      | Week switched (fires on initial load too)                                                            |

## Interactions

### Desktop

- **Drag on empty space** — create a range
- **Click on empty space** — create a single-step range
- **Drag a range** — move (including across days)
- **Ctrl+Drag a range** — duplicate
- **Drag top/bottom edge** — resize
- **Double-click a range** — delete
- **Double-click a day header** — select all ranges for that day
- **Ctrl+C** — copy selected
- **Ctrl+V** — paste (into the day under the cursor)
- **Delete / Backspace** — delete selected
- **Right-click** — context menu (copy, delete, paste, copy day, clear day)
- **Escape** — clear selection

### Touch

- **Tap on empty space** — create a single-step range
- **Drag a range** — move
- **Drag top/bottom edge** — resize
- **Double-tap a range** — delete

## Slot `#range`

Override range content. Slot props:

- `range` — `WorkingRange` object (start/end in hours)
- `timeLabel` — formatted string like `"09:00 – 18:00"`

```vue
<Scheduler :ranges="ranges">
  <template #range="{ range, timeLabel }">
    <div style="color: #fff; font-size: 11px; text-align: center">
      <div>{{ timeLabel }}</div>
      <div>{{ getPatientName(range.id) }}</div>
    </div>
  </template>
</Scheduler>
```

Without the slot, a default time label is displayed.

## Localization

Built-in locales: `en` (default), `ru`, `kk`.

```vue
<!-- Built-in locale -->
<Scheduler :ranges="ranges" locale="ru" />

<!-- Custom locale -->
<Scheduler :ranges="ranges" :locale="myLocale" />
```

```ts
import type { SchedulerLocale } from '@sakhnovkrg/vue-schedule'

const myLocale: SchedulerLocale = {
  months: ['January', 'February', ...],
  daysShort: ['Mon', 'Tue', 'Wed', ...],
  copy: 'Copy',
  delete: 'Delete',
  paste: 'Paste',
  copyDay: 'Copy day',
  clearDay: 'Clear day',
}
```

The `locale` prop is reactive — changing it re-renders the UI instantly.

## CSS Variables

Customizable via CSS custom properties on the parent element:

```css
.my-scheduler {
  --scheduler-bg: #fff;
  --scheduler-border-color: #e0e4ea;
  --scheduler-header-bg: #f7f8fa;
  --scheduler-hour-line-color: #eef0f4;
  --scheduler-today-bg: #edfaf6;
  --scheduler-range-bg: #2cc5a0;
  --scheduler-range-border: #21a888;
  --scheduler-range-opacity: 0.85;
  --scheduler-range-selected-bg: #1a9e7e;
  --scheduler-radius: 8px;
  --scheduler-range-radius: 4px;
}
```

## Exports

```ts
import {
  Scheduler,
  type WorkingRange,
  type SchedulerLocale,
  type WeekInfo,
  hoursToTime, // 9 → "09:00", 9.5 → "09:30"
  timeToHours, // "09:00" → 9, "09:30" → 9.5
  minutesToTime, // 540 → "09:00"
  timeToMinutes, // "09:00" → 540
  snapToStep,
  getWeeksOfMonth,
  getCurrentWeekIndex,
  getWeekDates,
  formatDate, // Date → "2025-02-03"
  getDayName, // 0 → "Mon"
  en,
  ru,
  kk, // built-in locales
} from '@sakhnovkrg/vue-schedule'
```

## License

MIT
