<script setup lang="ts">
import { computed } from 'vue'
import type { WorkingRange } from '../types'
import { minutesToTime } from '../utils/time'

const props = defineProps<{
  range: WorkingRange
  styleObj: { top: string; height: string }
  selected: boolean
  dragging: boolean
  readonly: boolean
}>()

const emit = defineEmits<{
  'mousedown-move': [e: MouseEvent]
  'mousedown-resize': [e: MouseEvent, edge: 'top' | 'bottom']
  dblclick: []
  contextmenu: [e: MouseEvent]
  click: [e: MouseEvent]
}>()

const timeLabel = computed(() => {
  return `${minutesToTime(props.range.start)} – ${minutesToTime(props.range.end)}`
})
</script>

<template>
  <div
    class="scheduler-range"
    :class="{ selected, dragging, pending: range.pending, readonly }"
    :style="styleObj"
    @mousedown.left.stop="!readonly && emit('mousedown-move', $event)"
    @dblclick.stop="!readonly && emit('dblclick')"
    @contextmenu.prevent.stop="!readonly && emit('contextmenu', $event)"
    @click.stop="emit('click', $event)"
  >
    <div
      v-if="!readonly"
      class="resize-handle top"
      @mousedown.left.stop="emit('mousedown-resize', $event, 'top')"
    />
    <div class="range-content">
      <slot :range="range" :time-label="timeLabel">
        <span class="range-time">{{ timeLabel }}</span>
      </slot>
    </div>
    <span v-if="range.pending" class="range-spinner-wrap"
      ><span class="range-spinner"
    /></span>
    <div
      v-if="!readonly"
      class="resize-handle bottom"
      @mousedown.left.stop="emit('mousedown-resize', $event, 'bottom')"
    />
  </div>
</template>

<style scoped>
.scheduler-range {
  position: absolute;
  left: 2px;
  right: 2px;
  background: var(--scheduler-range-bg, #4a90d9);
  opacity: var(--scheduler-range-opacity, 0.85);
  border: 1px solid var(--scheduler-range-border, #3572b0);
  border-radius: 4px;
  cursor: grab;
  user-select: none;
  z-index: 2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition:
    box-shadow 0.15s ease,
    opacity 0.15s ease;
  touch-action: none;
}

.scheduler-range.readonly {
  cursor: default;
}

.scheduler-range:hover {
  opacity: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.scheduler-range.selected {
  outline: 2px solid var(--scheduler-range-selected-bg, #1a5fb4);
  outline-offset: -2px;
  opacity: 1;
  z-index: 3;
}

.scheduler-range.dragging {
  cursor: grabbing;
  opacity: 0.7;
  z-index: 10;
}

.scheduler-range.pending {
  animation: scheduler-range-pulse 1.2s ease-in-out infinite;
  cursor: default;
}

@keyframes scheduler-range-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.85;
  }
}

.resize-handle {
  height: 6px;
  cursor: ns-resize;
  flex-shrink: 0;
}

.resize-handle.top {
  border-radius: 4px 4px 0 0;
}

.resize-handle.bottom {
  border-radius: 0 0 4px 4px;
}

.range-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  min-height: 0;
}

.range-time {
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

@media (max-width: 600px) {
  .range-time {
    font-size: 9px;
  }
}

.range-spinner-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  line-height: 0;
}

.range-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: scheduler-range-spin 0.6s linear infinite;
}

@keyframes scheduler-range-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
