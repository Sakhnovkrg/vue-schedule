import { ref, onUnmounted } from 'vue'

export interface DragCallbacks {
  onStart?: (_e: MouseEvent) => void
  onMove?: (_e: MouseEvent) => void
  onEnd?: (_e: MouseEvent) => void
}

function touchToMouse(e: TouchEvent): MouseEvent {
  const touch = e.touches[0] || e.changedTouches[0]
  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
    pageX: touch.pageX,
    pageY: touch.pageY,
    button: 0,
    buttons: 1,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: () => e.preventDefault(),
    stopPropagation: () => e.stopPropagation(),
  } as unknown as MouseEvent
}

export function useDrag(callbacks: DragCallbacks) {
  const isDragging = ref(false)

  function onMouseMove(e: MouseEvent) {
    if (!isDragging.value) return
    e.preventDefault()
    callbacks.onMove?.(e)
  }

  function onMouseUp(e: MouseEvent) {
    if (!isDragging.value) return
    isDragging.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    callbacks.onEnd?.(e)
  }

  function onTouchMove(e: TouchEvent) {
    if (!isDragging.value) return
    e.preventDefault()
    callbacks.onMove?.(touchToMouse(e))
  }

  function onTouchEnd(e: TouchEvent) {
    if (!isDragging.value) return
    isDragging.value = false
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
    document.removeEventListener('touchcancel', onTouchEnd)
    callbacks.onEnd?.(touchToMouse(e))
  }

  function startDrag(e: MouseEvent | TouchEvent) {
    isDragging.value = true

    if ('touches' in e) {
      document.addEventListener('touchmove', onTouchMove, { passive: false })
      document.addEventListener('touchend', onTouchEnd)
      document.addEventListener('touchcancel', onTouchEnd)
      callbacks.onStart?.(touchToMouse(e))
    } else {
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      callbacks.onStart?.(e)
    }
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
    document.removeEventListener('touchcancel', onTouchEnd)
  })

  return {
    isDragging,
    startDrag,
  }
}
