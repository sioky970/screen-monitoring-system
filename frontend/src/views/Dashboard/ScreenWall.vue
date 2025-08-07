<template>
  <div class="screen-wall-container">
    <div class="screen-wall-header">
      <div class="header-left">
        <h2>屏幕墙监控</h2>
        <a-tag :color="isConnected ? 'success' : 'error'">
          {{ isConnected ? '实时连接' : '连接断开' }}
        </a-tag>
      </div>
      
      <div class="header-right">
        <a-space>
          <span>网格布局:</span>
          <a-select v-model:value="gridLayout" @change="handleGridLayoutChange" style="width: 120px">
            <a-select-option value="2x2">2x2</a-select-option>
            <a-select-option value="3x3">3x3</a-select-option>
            <a-select-option value="4x4">4x4</a-select-option>
            <a-select-option value="auto">自适应</a-select-option>
          </a-select>
          
          <a-button @click="refreshClients" :loading="loading">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
          
          <a-switch 
            v-model:checked="isFullscreen" 
            @change="toggleFullscreen"
            checked-children="全屏"
            un-checked-children="窗口"
          />
        </a-space>
      </div>
    </div>
    
    <div class="screen-wall-content" :class="{ 'fullscreen': isFullscreen }">
      <div 
        v-if="clients.length === 0 && !loading"
        class="empty-state"
      >
        <a-empty description="暂无在线客户端">
          <a-button type="primary" @click="refreshClients">刷新客户端列表</a-button>
        </a-empty>
      </div>
      
      <div 
        v-else
        class="screen-wall"
        :style="screenWallStyle"
      >
        <div 
          v-for="client in displayClients" 
          :key="client.id"
          class="screen-item"
          @click="showClientDetail(client)"
        >
          <div class="screen-content">
            <img 
              v-if="client.latestScreenshot"
              :src="client.latestScreenshot"
              :alt="client.computerName"
              @error="handleImageError(client)"
              @load="handleImageLoad(client)"
            />
            <div v-else class="no-screenshot">
              <DesktopOutlined style="font-size: 48px; color: #d9d9d9;" />
              <p>暂无截图</p>
            </div>
            
            <!-- 加载状态 -->
            <div v-if="client.loading" class="loading-overlay">
              <a-spin size="large" />
            </div>
          </div>
          
          <div class="screen-item-info">
            <div class="client-name">{{ client.computerName }}</div>
            <div class="client-status">
              <a-tag 
                :color="getStatusColor(client.status)"
                size="small"
              >
                {{ getStatusText(client.status) }}
              </a-tag>
              <span class="last-update">
                {{ client.lastSeen ? dayjs(client.lastSeen).format('HH:mm:ss') : '--' }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- 填充空白项 -->
        <div 
          v-for="i in emptySlots" 
          :key="`empty-${i}`"
          class="screen-item empty"
        >
          <div class="empty-content">
            <PlusOutlined style="font-size: 24px; color: #d9d9d9;" />
            <p>等待连接</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 客户端详情弹窗 -->
    <a-modal
      v-model:open="clientDetailVisible"
      :title="`客户端详情 - ${selectedClient?.computerName}`"
      width="800px"
      :footer="null"
    >
      <div v-if="selectedClient" class="client-detail">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="客户端编号">
            {{ selectedClient.clientNumber }}
          </a-descriptions-item>
          <a-descriptions-item label="计算机名">
            {{ selectedClient.computerName }}
          </a-descriptions-item>
          <a-descriptions-item label="IP地址">
            {{ selectedClient.ip || '--' }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(selectedClient.status)">
              {{ getStatusText(selectedClient.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="操作系统">
            {{ selectedClient.os || '--' }}
          </a-descriptions-item>
          <a-descriptions-item label="版本">
            {{ selectedClient.version || '--' }}
          </a-descriptions-item>
          <a-descriptions-item label="最后在线">
            {{ selectedClient.lastSeen ? dayjs(selectedClient.lastSeen).format('YYYY-MM-DD HH:mm:ss') : '--' }}
          </a-descriptions-item>
          <a-descriptions-item label="分组">
            {{ selectedClient.group?.name || '未分组' }}
          </a-descriptions-item>
        </a-descriptions>
        
        <div class="detail-screenshot" v-if="selectedClient.latestScreenshot">
          <h4>最新截图</h4>
          <img 
            :src="selectedClient.latestScreenshot" 
            :alt="selectedClient.computerName"
            style="width: 100%; max-height: 400px; object-fit: contain; border: 1px solid #d9d9d9;"
          />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { clientsApi } from '@/api/clients'
import { useSocket } from '@/composables/useSocket'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  DesktopOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue'

interface Client {
  id: string
  clientNumber: string
  computerName: string
  ip?: string
  mac?: string
  os?: string
  version?: string
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'INSTALLING'
  lastSeen?: string
  group?: {
    id: number
    name: string
  }
  latestScreenshot?: string
  loading?: boolean
}

const loading = ref(false)
const clients = ref<Client[]>([])
const gridLayout = ref<string>('auto')
const isFullscreen = ref(false)
const clientDetailVisible = ref(false)
const selectedClient = ref<Client | null>(null)

// WebSocket连接
const { socket, isConnected } = useSocket('/monitor')

// 计算屏幕墙样式
const screenWallStyle = computed(() => {
  const clientCount = clients.value.length
  let columns = 3
  
  if (gridLayout.value === '2x2') {
    columns = 2
  } else if (gridLayout.value === '3x3') {
    columns = 3
  } else if (gridLayout.value === '4x4') {
    columns = 4
  } else {
    // 自适应
    if (clientCount <= 4) columns = 2
    else if (clientCount <= 9) columns = 3
    else if (clientCount <= 16) columns = 4
    else columns = Math.ceil(Math.sqrt(clientCount))
  }
  
  return {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    aspectRatio: '16/9'
  }
})

// 显示的客户端（只显示在线的）
const displayClients = computed(() => {
  return clients.value.filter(client => client.status === 'ONLINE')
})

// 空白位置数量
const emptySlots = computed(() => {
  const columns = parseInt(screenWallStyle.value.gridTemplateColumns.match(/\d+/)?.[0] || '3')
  const totalSlots = columns * Math.ceil(displayClients.value.length / columns)
  return Math.max(0, totalSlots - displayClients.value.length)
})

// 状态颜色映射
const getStatusColor = (status: string) => {
  const colors = {
    'ONLINE': 'success',
    'OFFLINE': 'default',
    'ERROR': 'error',
    'INSTALLING': 'processing'
  }
  return colors[status as keyof typeof colors] || 'default'
}

// 状态文本映射
const getStatusText = (status: string) => {
  const texts = {
    'ONLINE': '在线',
    'OFFLINE': '离线',
    'ERROR': '错误',
    'INSTALLING': '安装中'
  }
  return texts[status as keyof typeof texts] || status
}

// 加载客户端列表
const refreshClients = async () => {
  loading.value = true
  try {
    const response = await clientsApi.getClients({ status: 'ONLINE' })
    clients.value = (response.data || []).map((client: any) => ({
      ...client,
      latestScreenshot: generateMockScreenshot(client),
      loading: false
    }))
  } catch (error) {
    message.error('加载客户端列表失败')
  } finally {
    loading.value = false
  }
}

// 生成模拟截图URL (实际使用中应该从API获取)
const generateMockScreenshot = (client: Client) => {
  // 这里使用占位图片，实际应该从后端API获取真实截图
  const width = 800
  const height = 600
  const text = client.computerName
  return `https://via.placeholder.com/${width}x${height}/f0f2f5/666?text=${encodeURIComponent(text)}`
}

// 处理图片加载错误
const handleImageError = (client: Client) => {
  console.error(`Screenshot load error for client: ${client.id}`)
  client.loading = false
}

// 处理图片加载成功
const handleImageLoad = (client: Client) => {
  client.loading = false
}

// 切换网格布局
const handleGridLayoutChange = () => {
  // 触发重新渲染
  nextTick()
}

// 切换全屏模式
const toggleFullscreen = (checked: boolean) => {
  if (checked) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

// 显示客户端详情
const showClientDetail = (client: Client) => {
  selectedClient.value = client
  clientDetailVisible.value = true
}

// WebSocket事件处理
const setupWebSocket = () => {
  if (!socket.value) return
  
  // 监听客户端列表更新
  socket.value.on('client-list-response', () => {
    refreshClients()
  })
  
  // 监听客户端状态变化
  socket.value.on('client-status-update', (data: any) => {
    const client = clients.value.find(c => c.id === data.clientId)
    if (client) {
      client.status = data.status
      client.lastSeen = data.timestamp
    }
  })
  
  // 监听新的截图
  socket.value.on('screenshot-update', (data: any) => {
    const client = clients.value.find(c => c.id === data.clientId)
    if (client) {
      client.latestScreenshot = data.screenshotUrl
      client.loading = false
    }
  })
}

// 定期刷新截图 (模拟FPS=1)
const startScreenshotRefresh = () => {
  setInterval(() => {
    if (isConnected.value && clients.value.length > 0) {
      // 为每个在线客户端更新截图时间戳以模拟刷新
      clients.value.forEach(client => {
        if (client.status === 'ONLINE') {
          const url = generateMockScreenshot(client)
          const timestamp = Date.now()
          client.latestScreenshot = `${url}&t=${timestamp}`
        }
      })
    }
  }, 1000) // 1秒刷新一次 (FPS=1)
}

onMounted(() => {
  refreshClients()
  setupWebSocket()
  startScreenshotRefresh()
  
  // 监听全屏状态变化
  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement
  }
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  
  // 清理函数会在组件卸载时执行
  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  })
})
</script>

<style scoped>
.screen-wall-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-wall-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 16px;
}

.header-left h2 {
  margin: 0;
  margin-right: 12px;
  display: inline-block;
}

.screen-wall-content {
  flex: 1;
  overflow: auto;
}

.screen-wall-content.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #000;
  padding: 20px;
}

.screen-wall {
  display: grid;
  gap: 12px;
  height: 100%;
  padding: 16px;
}

.screen-item {
  border: 2px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.screen-item:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
}

.screen-item.empty {
  border-style: dashed;
  cursor: default;
}

.screen-item.empty:hover {
  border-color: #d9d9d9;
  box-shadow: none;
}

.screen-content {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.screen-content img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-screenshot,
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen-item-info {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
}

.client-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.client-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.last-update {
  color: rgba(255, 255, 255, 0.7);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.client-detail .detail-screenshot {
  margin-top: 16px;
}

.client-detail .detail-screenshot h4 {
  margin-bottom: 12px;
}

/* 全屏模式样式调整 */
.screen-wall-content.fullscreen .screen-wall {
  padding: 8px;
  gap: 8px;
}

.screen-wall-content.fullscreen .screen-item {
  border-width: 1px;
}

.screen-wall-content.fullscreen .screen-item-info {
  padding: 4px 8px;
  font-size: 12px;
}
</style>