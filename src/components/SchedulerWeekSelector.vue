<script setup lang="ts">
import { computed } from 'vue'
import type { WeekInfo } from '../types'

const props = defineProps<{
  weeks: WeekInfo[]
  activeIndex: number
  month: Date
}>()

const emit = defineEmits<{
  select: [index: number]
}>()

const currentMonth = computed(() => props.month.getMonth())

function isOutOfMonth(date: Date): boolean {
  return date.getMonth() !== currentMonth.value
}
</script>

<template>
  <div class="scheduler-week-selector">
    <button
      v-for="week in weeks"
      :key="week.index"
      class="scheduler-week-btn"
      :class="{ active: week.index === activeIndex }"
      @click="emit('select', week.index)"
    >
      <span class="week-label-inline">
        <span :class="{ 'out-of-month': isOutOfMonth(week.start) }">{{
          week.start.getDate()
        }}</span>
        <span>–</span>
        <span :class="{ 'out-of-month': isOutOfMonth(week.end) }">{{
          week.end.getDate()
        }}</span>
      </span>
      <span class="week-label-stacked">
        <span :class="{ 'out-of-month': isOutOfMonth(week.start) }">{{
          week.start.getDate()
        }}</span>
        <span class="week-dash">–</span>
        <span :class="{ 'out-of-month': isOutOfMonth(week.end) }">{{
          week.end.getDate()
        }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.scheduler-week-selector {
  display: flex;
  gap: 4px;
}

.week-label-stacked {
  display: none;
}

@media (max-width: 600px) {
  .scheduler-week-selector {
    width: 100%;
  }

  .scheduler-week-btn {
    flex: 1;
    text-align: center;
    padding: 6px 4px;
  }

  .week-label-inline {
    display: none;
  }

  .week-label-stacked {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.2;
  }

  .week-dash {
    font-size: 10px;
    opacity: 0.5;
  }
}

.scheduler-week-btn {
  padding: 6px 14px;
  border: 1px solid var(--scheduler-border-color, #d0d5dd);
  background: var(--scheduler-bg, #fff);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  color: #344054;
  transition: all 0.15s ease;
}

.scheduler-week-btn:hover {
  background: var(--scheduler-header-bg, #f7f8fa);
}

.scheduler-week-btn.active {
  background: var(--scheduler-range-bg, #4a90d9);
  color: #fff;
  border-color: var(--scheduler-range-bg, #4a90d9);
}

.out-of-month {
  opacity: 0.6;
}
</style>
