<template>
  <div class="log-viewer">
    <div class="log-header">
      <a-space>
        <a-button @click="refreshLogs" size="small">
          <template #icon>
            <ReloadOutlined />
          </template>
          刷新
        </a-button>
        
        <a-button @click="clearLogs" size="small" danger>
          <template #icon>
            <DeleteOutlined />
          </template>
          清空
        </a-button>
        
        <a-button @click="exportLogs" size="small">
          <template #icon>
            <DownloadOutlined />
          </template>
          导出
        </a-button>
        
        <a-select v-model:value="selectedLevel" @change="refreshLogs" size="small" style="width: 100px">
          <a-select-option value="all">全部</a-select-option>
          <a-select-option value="DEBUG">调试</a-select-option>
          <a-select-option value="INFO">信息</a-select-option>
          <a-select-option value="WARN">警告</a-select-option>
          <a-select-option value="ERROR">错误</a-select-option>
        </a-select>
        
        <a-input 
          v-model:value="searchText" 
          placeholder="搜索日志..." 
          @input="refreshLogs"
          size="small"
          style="width: 200px"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>
        
        <a-switch 
          v-model:checked="autoScroll" 
          checked-children="自动滚动" 
          un-checked-children="手动滚动"
          size="small"
        />
      </a-space>
    </div>
    
    <div class="log-content" ref="logContainer">
      <div 
        v-for="(log, index) in filteredLogs" 
        :key="index"
        :class="['log-entry', `log-${log.level.toLowerCase()}`]"
      >
        <span class="log-timestamp">{{ formatTime(log.timestamp) }}</span>
        <span class="log-level">{{ log.level }}</span>
        <span class="log-module">{{ log.module }}</span>
        <span class="log-message">{{ log.message }}</span>
        <span v-if="log.data" class="log-data">{{ formatData(log.data) }}</span>
      </div>
      
      <div v-if="filteredLogs.length === 0" class="log-empty">
        暂无日志
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { logger } from '@/utils/logger'
import { 
  ReloadOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  SearchOutlined 
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const logs = ref<any[]>([])
const selectedLevel = ref('all')
const searchText = ref('')
const autoScroll = ref(true)
const logContainer = ref<HTMLElement>()

// 获取日志
const refreshLogs = () => {
  logs.value = logger.getLogs()
}

// 清空日志
const clearLogs = () => {
  logger.clear()
  refreshLogs()
  message.success('日志已清空')
}

// 导出日志
const exportLogs = () => {
  const logText = logger.exportLogs()
  const blob = new Blob([logText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  message.success('日志已导出')
}

// 过滤日志
const filteredLogs = computed(() => {
  let result = logs.value

  // 按级别过滤
  if (selectedLevel.value !== 'all') {
    result = result.filter(log => log.level === selectedLevel.value)
  }

  // 按搜索文本过滤
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(log => 
      log.message.toLowerCase().includes(search) ||
      log.module.toLowerCase().includes(search) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(search))
    )
  }

  return result
})

// 格式化时间
const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString()
}

// 格式化数据
const formatData = (data: any) => {
  if (typeof data === 'string') return data
  return JSON.stringify(data, null, 2)
}

// 自动滚动到底部
const scrollToBottom = () => {
  if (autoScroll.value && logContainer.value) {
    nextTick(() => {
      logContainer.value!.scrollTop = logContainer.value!.scrollHeight
    })
  }
}

// 监听日志变化
watch(filteredLogs, scrollToBottom)

// 初始化
refreshLogs()

// 定时刷新日志
setInterval(refreshLogs, 1000)
</script>

<style scoped>
.log-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.log-header {
  padding: 8px 12px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  flex-shrink: 0;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.log-entry {
  display: flex;
  margin-bottom: 2px;
  padding: 2px 4px;
  border-radius: 2px;
}

.log-entry:hover {
  background: #2a2d2e;
}

.log-timestamp {
  color: #808080;
  margin-right: 8px;
  min-width: 80px;
}

.log-level {
  margin-right: 8px;
  min-width: 50px;
  font-weight: bold;
}

.log-debug .log-level { color: #808080; }
.log-info .log-level { color: #4fc3f7; }
.log-warn .log-level { color: #ffb74d; }
.log-error .log-level { color: #f44336; }

.log-module {
  color: #ce9178;
  margin-right: 8px;
  min-width: 80px;
}

.log-message {
  color: #d4d4d4;
  margin-right: 8px;
  flex: 1;
}

.log-data {
  color: #9cdcfe;
  font-style: italic;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-empty {
  text-align: center;
  color: #808080;
  padding: 20px;
}
</style>
