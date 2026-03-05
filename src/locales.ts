import type { SchedulerLocale } from './types'

export const en: SchedulerLocale = {
  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  daysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  copy: 'Copy',
  delete: 'Delete',
  paste: 'Paste',
  copyDay: 'Copy day',
  clearDay: 'Clear day',
}

export const ru: SchedulerLocale = {
  months: [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ],
  daysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  copy: 'Копировать',
  delete: 'Удалить',
  paste: 'Вставить',
  copyDay: 'Копировать день',
  clearDay: 'Очистить день',
}

export const kk: SchedulerLocale = {
  months: [
    'Қаңтар',
    'Ақпан',
    'Наурыз',
    'Сәуір',
    'Мамыр',
    'Маусым',
    'Шілде',
    'Тамыз',
    'Қыркүйек',
    'Қазан',
    'Қараша',
    'Желтоқсан',
  ],
  daysShort: ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'],
  copy: 'Көшіру',
  delete: 'Жою',
  paste: 'Қою',
  copyDay: 'Күнді көшіру',
  clearDay: 'Күнді тазалау',
}

export const builtinLocales: Record<string, SchedulerLocale> = { en, ru, kk }
