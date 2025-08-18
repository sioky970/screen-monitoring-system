<template>
  <div class="screen-wall-header">
    <div class="header-left">
      <h2>屏幕墙监控</h2>
      <a-tag :color="isConnected ? 'success' : 'error'">
        {{ isConnected ? '实时连接' : '连接断开' }}
      </a-tag>
    </div>

    <div class="header-right">
      <a-space>
        <span>每行设备数:</span>
        <a-select 
          :value="gridColumns" 
          @change="$emit('grid-change', $event)" 
          style="width: 120px"
        >
          <a-select-option :value="4">4个/行</a-select-option>
          <a-select-option :value="6">6个/行</a-select-option>
          <a-select-option :value="8">8个/行</a-select-option>
          <a-select-option :value="10">10个/行</a-select-option>
          <a-select-option :value="12">12个/行</a-select-option>
        </a-select>

        <a-button @click="$emit('refresh')" :loading="loading">
          <template #icon>
            <ReloadOutlined />
          </template>
          刷新
        </a-button>

        <a-button @click="$emit('show-logs')" type="dashed">
          <template #icon>
            <FileTextOutlined />
          </template>
          查看日志
        </a-button>

        <a-switch
          :checked="isFullscreen"
          @change="$emit('fullscreen-toggle', $event)"
          checked-children="全屏"
          un-checked-children="窗口"
        />

        <a-select 
          :value="selectedGroupId" 
          allow-clear 
          placeholder="按分组筛选" 
          style="width: 160px" 
          @change="$emit('group-change', $event)"
        >
          <a-select-option v-for="group in clientGroups" :key="group.id" :value="group.id">
            {{ group.name }}
          </a-select-option>
        </a-select>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ReloadOutlined, FileTextOutlined } from '@ant-design/icons-vue'

interface Props {
  isConnected: boolean
  loading: boolean
  gridColumns: number
  isFullscreen: boolean
  clientGroups: any[]
  selectedGroupId: number | null
}

interface Emits {
  refresh: []
  'grid-change': [columns: number]
  'fullscreen-toggle': [checked: boolean]
  'group-change': [groupId: number | null]
  'show-logs': []
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.screen-wall-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}
</style>