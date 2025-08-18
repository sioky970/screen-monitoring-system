<template>
  <div class="screen-wall" :style="screenWallStyle">
    <div
      v-for="client in clients"
      :key="client.id"
      class="screen-item"
      :class="{ 'offline-item': client.status === 'offline' }"
      @click="$emit('client-click', client)"
    >
      <div class="screen-content">
        <img
          v-if="client.latestScreenshotUrl"
          :src="client.latestScreenshotUrl"
          :alt="client.computerName"
          loading="lazy"
          decoding="async"
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

        <!-- 离线遮罩 -->
        <div v-if="client.status === 'offline'" class="offline-overlay">
          <div class="offline-info">
            <div class="offline-text">设备离线</div>
            <div class="offline-time">{{ getOfflineDuration(client.lastSeen) }}</div>
          </div>
        </div>
      </div>

      <div class="screen-item-info">
        <div class="client-name">{{ client.computerName }}</div>
        <div class="client-status">
          <div class="status-left">
            <a-tag :color="getStatusColor(client.status)" size="small">
              {{ getStatusText(client.status) }}
            </a-tag>
            <!-- 违规数量标识 -->
            <a-tooltip v-if="(client.alertCount || 0) > 0" :title="`违规次数：${client.alertCount}`">
              <a-badge
                :count="formatAlertCount(client.alertCount)"
                :overflow-count="9999"
                :number-style="{ backgroundColor: '#ff4d4f', fontSize: '10px' }"
                class="alert-badge"
              >
                <a-tag color="red" size="small">
                  <template #icon>
                    <ExclamationCircleOutlined />
                  </template>
                  违规
                </a-tag>
              </a-badge>
            </a-tooltip>
          </div>
          <span class="last-update">
            {{ client.status === 'offline' && client.lastSeen 
              ? `最后在线: ${dayjs(client.lastSeen).format('MM-DD HH:mm')}` 
              : (client.lastSeen ? dayjs(client.lastSeen).format('HH:mm:ss') : '--')
            }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { DesktopOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { generateClientPlaceholder } from '@/utils/imageUtils'
import { log } from '@/utils/logger'

interface Client {
  id: string
  clientNumber: string
  computerName: string
  status: 'online' | 'offline' | 'error' | 'installing'
  lastSeen?: string
  latestScreenshotUrl?: string
  alertCount?: number
  loading?: boolean
  [key: string]: any
}

interface Props {
  clients: Client[]
  gridColumns: number
  isFullscreen: boolean
}

interface Emits {
  'client-click': [client: Client]
}

const props = defineProps<Props>()
defineEmits<Emits>()

// 计算屏幕墙样式
const screenWallStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.gridColumns}, 1fr)`,
  gap: props.isFullscreen ? '8px' : '12px'
}))

// 获取离线时长
const getOfflineDuration = (lastSeen?: string) => {
  if (!lastSeen) return '未知'
  
  const now = dayjs()
  const lastSeenTime = dayjs(lastSeen)
  const diffMinutes = now.diff(lastSeenTime, 'minute')
  const diffHours = now.diff(lastSeenTime, 'hour')
  const diffDays = now.diff(lastSeenTime, 'day')
  
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟`
  } else if (diffHours < 24) {
    return `${diffHours}小时`
  } else {
    return `${diffDays}天`
  }
}

// 状态颜色映射
const getStatusColor = (status: string) => {
  const normalizedStatus = status?.toUpperCase()
  const colors = {
    'ONLINE': 'green',
    'OFFLINE': 'red',
    'ERROR': 'red',
    'INSTALLING': 'blue'
  }
  return colors[normalizedStatus as keyof typeof colors] || 'default'
}

// 状态文本映射
const getStatusText = (status: string) => {
  const normalizedStatus = status?.toUpperCase()
  const texts = {
    'ONLINE': '在线',
    'OFFLINE': '离线',
    'ERROR': '错误',
    'INSTALLING': '安装中'
  }
  return texts[normalizedStatus as keyof typeof texts] || status
}

// 违规数量格式化
const formatAlertCount = (count?: number) => {
  return Number(count || 0)
}

// 处理图片加载错误
const handleImageError = (client: Client) => {
  log.error('ClientGrid', `Screenshot load error for client: ${client.id}`, {
    clientId: client.id,
    computerName: client.computerName,
    screenshotUrl: client.latestScreenshotUrl
  })
  
  client.latestScreenshotUrl = generateClientPlaceholder(client)
  client.loading = false
}

// 处理图片加载成功
const handleImageLoad = (client: Client) => {
  client.loading = false
}
</script>

<style scoped>
.screen-wall {
  display: grid;
  padding: 16px;
  width: 100%;
}

.screen-item {
  border: 2px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
}

.screen-item:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
}

.offline-item {
  opacity: 0.8;
}

.screen-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen-content img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-screenshot {
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

.offline-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  z-index: 20;
}

.offline-info {
  text-align: center;
}

.offline-text {
  font-weight: bold;
  margin-bottom: 4px;
}

.offline-time {
  font-size: 12px;
  opacity: 0.9;
}

.screen-item-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 10;
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

.status-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alert-badge {
  display: inline-flex;
  align-items: center;
}

.alert-badge .ant-badge-count {
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
}

.last-update {
  color: rgba(255, 255, 255, 0.7);
}
</style>