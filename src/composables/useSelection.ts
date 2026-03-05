import { ref, computed } from 'vue'
import type { WorkingRange } from '../types'

export function useSelection() {
  const selectedIds = ref<Set<string>>(new Set())

  const selectedArray = computed(() => Array.from(selectedIds.value))

  function select(id: string) {
    selectedIds.value = new Set([id])
  }

  function selectDay(day: number, ranges: WorkingRange[]) {
    const dayIds = ranges.filter(r => r.day === day).map(r => r.id)
    selectedIds.value = new Set(dayIds)
  }

  function clearSelection() {
    selectedIds.value = new Set()
  }

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
  }

  return {
    selectedIds,
    selectedArray,
    select,
    selectDay,
    clearSelection,
    isSelected,
  }
}
