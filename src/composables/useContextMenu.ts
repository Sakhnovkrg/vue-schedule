import { reactive, onMounted, onUnmounted } from 'vue'
import type { ContextMenuState } from '../types'

export function useContextMenu() {
  const state = reactive<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    type: null,
    rangeId: null,
    day: null,
  })

  function showForRange(e: MouseEvent, rangeId: string, day: number) {
    e.preventDefault()
    state.visible = true
    state.x = e.clientX
    state.y = e.clientY
    state.type = 'range'
    state.rangeId = rangeId
    state.day = day
  }

  function showForDay(e: MouseEvent, day: number) {
    e.preventDefault()
    state.visible = true
    state.x = e.clientX
    state.y = e.clientY
    state.type = 'day'
    state.rangeId = null
    state.day = day
  }

  function hide() {
    state.visible = false
    state.type = null
    state.rangeId = null
    state.day = null
  }

  function onClickOutside(e: Event) {
    if (!state.visible) return
    const target = e.target as HTMLElement
    if (target.closest('.scheduler-context-menu')) return
    hide()
  }

  onMounted(() => {
    document.addEventListener('mousedown', onClickOutside, true)
  })

  onUnmounted(() => {
    document.removeEventListener('mousedown', onClickOutside, true)
  })

  return { state, showForRange, showForDay, hide }
}
