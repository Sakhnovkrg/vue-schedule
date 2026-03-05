export { default as Scheduler } from './components/Scheduler.vue'
export { default } from './components/Scheduler.vue'

export type {
  WorkingRange,
  SchedulerProps,
  SchedulerLocale,
  WeekInfo,
  ClipboardData,
  ContextMenuState,
} from './types'

export { en, ru, kk } from './locales'

export {
  minutesToTime,
  timeToMinutes,
  hoursToTime,
  timeToHours,
  snapToStep,
} from './utils/time'

export {
  getWeeksOfMonth,
  getCurrentWeekIndex,
  getWeekDates,
  formatDate,
  getDayName,
} from './utils/weeks'
