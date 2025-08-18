<template>
  <a-modal
    :open="visible"
    @update:open="$emit('update:visible', $event)"
    title="系统日志"
    width="80%"
    :footer="null"
    class="log-viewer-modal"
  >
    <div class="log-viewer">
      <div class="log-controls">
        <a-space>
          <a-select v-model:value="logLevel" style="width: 120px">
            <a-select-option value="all">全部</a-select-option>
            <a-select-option value="error">错误</a-select-option>
            <a-select-option value="warn">警告</a-select-option>
            <a-select-option value="info">信息</a-select-option>
            <a-select-option value="debug">调试</a-select-option>
          </a-select>
          <a-button @click="refreshLogs" :loading="loading">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
          <a-button @click="clearLogs">
            <template #icon><DeleteOutlined /></template>
            清空
          </a-button>
          <a-switch v-model:checked="autoScroll" checked-children="自动滚动" un-checked-children="手动滚动" />
        </a-space>
      </div>
      
      <div ref="logContainer" class="log-content">
        <div v-if="filteredLogs.length === 0" class="no-logs">
          <a-empty description="暂无日志" />
        </div>
        <div v-else>
          <div
            v-for="(log, index) in filteredLogs"
            :key="index"
            :class="['log-entry', `log-${log.level}`]"
          >
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="log-level">{{ log.level.toUpperCase() }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons-vue'

interface LogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
}

interface Props {
  visible: boolean
}

interface Emits {
  'update:visible': [visible: boolean]
}

defineProps<Props>()
defineEmits<Emits>()

const logs = ref<LogEntry[]>([])
const logLevel = ref('all')
const loading = ref(false)
const autoScroll = ref(true)
const logContainer = ref<HTMLElement>()

// 过滤日志
const filteredLogs = computed(() => {
  if (logLevel.value === 'all') {
    return logs.value
  }
  return logs.value.filter(log => log.level === logLevel.value)
})

// 格式化时间
const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}

// 刷新日志
const refreshLogs = async () => {
  loading.value = true
  try {
    // 这里应该调用实际的日志API
    // const response = await logsApi.getLogs()
    // logs.value = response.data
    
    // 模拟数据
    logs.value = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '系统启动完成'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'warn',
        message: '客户端连接超时'
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'error',
        message: '数据库连接失败'
      }
    ]
  } catch (error) {
    console.error('Failed to refresh logs:', error)
  } finally {
    loading.value = false
  }
}

// 清空日志
const clearLogs = () => {
  logs.value = []
}

// 自动滚动到底部
const scrollToBottom = () => {
  if (autoScroll.value && logContainer.value) {
    nextTick(() => {
      logContainer.value!.scrollTop = logContainer.value!.scrollHeight
    })
  }
}

// 监听日志变化，自动滚动
watch(filteredLogs, scrollToBottom, { deep: true })
</script>

<style scoped>
.log-viewer {
  height: 60vh;
  display: flex;
  flex-direction: column;
}

.log-controls {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.no-logs {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.log-entry {
  display: flex;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid #f0f0f0;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: #666;
  margin-right: 8px;
  min-width: 140px;
}

.log-level {
  margin-right: 8px;
  min-width: 60px;
  font-weight: bold;
}

.log-message {
  flex: 1;
  word-break: break-all;
}

.log-error .log-level {
  color: #ff4d4f;
}

.log-warn .log-level {
  color: #faad14;
}

.log-info .log-level {
  color: #1890ff;
}

.log-debug .log-level {
  color: #52c41a;
}

.log-viewer-modal :deep(.ant-modal-body) {
  padding: 16px;
}
</style>