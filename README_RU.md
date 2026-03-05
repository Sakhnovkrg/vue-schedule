# @sakhnovkrg/vue-schedule

Недельный шедулер для Vue 3. Компонент для формирования расписания — сетка дни x часы с drag-взаимодействием.

## Установка

```bash
npm install @sakhnovkrg/vue-schedule
```

## Использование

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Scheduler } from '@sakhnovkrg/vue-schedule'
import '@sakhnovkrg/vue-schedule/style'
import type { WorkingRange } from '@sakhnovkrg/vue-schedule'

const ranges = ref<WorkingRange[]>([])

function onRangeCreate(range: Omit<WorkingRange, 'id'>) {
  // POST на сервер, добавить в ranges
}

function onRangeUpdate(range: WorkingRange, previous: WorkingRange) {
  // PUT на сервер, обновить в ranges
}

function onRangeDelete(id: string) {
  // DELETE на сервер, убрать из ranges
}

function onRangesDelete(ids: string[]) {
  // Несколько DELETE запросов, убрать из ranges
}

function onClipboardPaste(newRanges: WorkingRange[]) {
  // POST массив на сервер, добавить в ranges
}

function onWeekChange(start: Date, end: Date) {
  // Загрузить ranges для новой недели
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

## Тип WorkingRange

```ts
interface WorkingRange {
  id: string
  day: number // 0=Пн .. 6=Вс
  date: string // "2025-02-03"
  start: number // час начала (9 = 9:00, 9.5 = 9:30)
  end: number // час окончания (18 = 18:00, 17.5 = 17:30)
  pending?: boolean // оптимистичный UI: диапазон сохраняется
}
```

`pending: true` — диапазон отображается с пульсацией и спиннером. Полезно для оптимистичных обновлений: добавляете диапазон в `ranges` сразу с `pending: true`, после ответа API убираете флаг.

## Props

| Prop             | Тип                         | По умолчанию | Описание                                                                                                         |
| ---------------- | --------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| `ranges`         | `WorkingRange[]`            | —            | Массив диапазонов (обязательный)                                                                                 |
| `month`          | `Date`                      | `new Date()` | Начальный месяц. Навигация по месяцам встроена в компонент                                                       |
| `loading`        | `boolean`                   | `false`      | Оверлей загрузки поверх сетки                                                                                    |
| `readonly`       | `boolean`                   | `false`      | Режим просмотра: создание, перемещение, ресайз, удаление и буфер обмена отключены. Слоты остаются интерактивными |
| `locale`         | `string \| SchedulerLocale` | `'en'`       | Локаль: `'en'`, `'ru'`, `'kk'` или кастомный объект `SchedulerLocale`                                            |
| `dayStartHour`   | `number`                    | `0`          | С какого часа начинается ось Y (например `8` — сетка начнётся с 8:00, после 23:00 пойдёт 0:00, 1:00...)          |
| `startHour`      | `number`                    | `0`          | Смещение от `dayStartHour` в часах. Например `dayStartHour=8, startHour=2` → сетка начнётся с 10:00              |
| `endHour`        | `number`                    | `24`         | Сколько часов показывать всего. Например `dayStartHour=8, endHour=12` → сетка с 8:00 до 20:00                    |
| `stepMinutes`    | `number`                    | `30`         | Шаг сетки в минутах (5, 10, 15, 30, 60)                                                                          |
| `maxHeight`      | `number`                    | —            | Максимальная высота в px, при превышении — вертикальный скролл с sticky-заголовком                               |
| `minColumnWidth` | `number`                    | `0`          | Минимальная ширина колонки дня в px. Если не помещается — горизонтальный скролл                                  |

## Events

| Event              | Payload                                       | Описание                                                                             |
| ------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `range-create`     | `Omit<WorkingRange, 'id'>`                    | Создание диапазона (drag на пустом месте или клик)                                   |
| `range-update`     | `range: WorkingRange, previous: WorkingRange` | Изменение (перемещение или ресайз)                                                   |
| `range-delete`     | `id: string`                                  | Удаление одного (двойной клик)                                                       |
| `ranges-delete`    | `ids: string[]`                               | Удаление нескольких (Delete, очистка дня)                                            |
| `clipboard-paste`  | `WorkingRange[]`                              | Вставка из буфера (Ctrl+V, контекстное меню). `id` временные — замените на серверные |
| `clipboard-copy`   | `WorkingRange[]`                              | Копирование в буфер (информационное)                                                 |
| `selection-change` | `string[]`                                    | Изменение выделения                                                                  |
| `month-change`     | `month: Date`                                 | Переключение месяца (кнопки ← →)                                                     |
| `week-change`      | `start: Date, end: Date`                      | Переключение недели (включая первую загрузку)                                        |

## Взаимодействие

- **Drag на пустом месте** — создать диапазон
- **Клик на пустом месте** — создать диапазон размером в один шаг
- **Drag за диапазон** — переместить (включая на другой день)
- **Ctrl+Drag за диапазон** — копировать (создать дубликат)
- **Drag за верхний/нижний край** — ресайз
- **Двойной клик по диапазону** — удалить
- **Двойной клик по заголовку дня** — выделить все диапазоны дня
- **Ctrl+C** — копировать выделенные
- **Ctrl+V** — вставить (в день под курсором)
- **Delete / Backspace** — удалить выделенные
- **Правый клик** — контекстное меню (копировать, удалить, вставить, копировать день, очистить день)
- **Escape** — снять выделение

### Мобильные устройства

- **Тап на пустом месте** — создать диапазон (один шаг)
- **Перетаскивание диапазона** — переместить
- **Перетаскивание за верхний/нижний край** — ресайз
- **Двойной тап по диапазону** — удалить

## Слот `#range`

Позволяет подменить содержимое диапазона. Слот-пропсы:

- `range` — объект `WorkingRange` (start/end в часах)
- `timeLabel` — строка `"09:00 – 18:00"`

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

Без слота отображается стандартная плашка с временем.

## Локализация

Встроенные локали: `en` (по умолчанию), `ru`, `kk`.

```vue
<!-- Встроенная локаль -->
<Scheduler :ranges="ranges" locale="ru" />

<!-- Кастомная локаль -->
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

Проп `locale` реактивный — при смене значения UI перерисуется мгновенно.

## CSS-переменные

Настраиваются через CSS custom properties на родительском элементе:

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

## Экспорты

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
  kk, // встроенные локали
} from '@sakhnovkrg/vue-schedule'
```

## Лицензия

MIT
