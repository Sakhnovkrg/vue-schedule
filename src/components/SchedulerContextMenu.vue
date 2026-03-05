<script setup lang="ts">
import { computed, inject, type ComputedRef } from 'vue'
import type { ContextMenuState, SchedulerLocale } from '../types'
import { en } from '../locales'

const props = defineProps<{
  state: ContextMenuState
  hasClipboard: boolean
}>()

const localeRef = inject<ComputedRef<SchedulerLocale>>(
  'schedulerLocale',
  computed(() => en)
)
const t = computed(() => localeRef.value)

const emit = defineEmits<{
  copy: []
  delete: []
  paste: []
  'copy-day': []
  'clear-day': []
}>()

const style = computed(() => ({
  left: `${props.state.x}px`,
  top: `${props.state.y}px`,
}))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.visible"
      class="scheduler-context-menu"
      :style="style"
      @click.stop
    >
      <template v-if="state.type === 'range'">
        <button class="menu-item" @click="emit('copy')">
          {{ t.copy }}
        </button>
        <button class="menu-item danger" @click="emit('delete')">
          {{ t.delete }}
        </button>
      </template>
      <template v-else-if="state.type === 'day'">
        <button
          class="menu-item"
          :disabled="!hasClipboard"
          @click="emit('paste')"
        >
          {{ t.paste }}
        </button>
        <button class="menu-item" @click="emit('copy-day')">
          {{ t.copyDay }}
        </button>
        <button class="menu-item danger" @click="emit('clear-day')">
          {{ t.clearDay }}
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.scheduler-context-menu {
  position: fixed;
  z-index: 1000;
  background: #fff;
  border: 1px solid var(--scheduler-border-color, #e0e4ea);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 160px;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  color: #1a1a2e;
  transition: background 0.1s;
}

.menu-item:hover:not(:disabled) {
  background: var(--scheduler-header-bg, #f7f8fa);
}

.menu-item:disabled {
  opacity: 0.4;
  cursor: default;
}

.menu-item.danger {
  color: #e53935;
}
</style>
