<template>
  <div
    class="client-card"
    :class="{
      'is-offline': isOffline,
      'is-error': isError,
      'is-loading': isLoading,
      'is-selected': isSelected
    }"
    :style="cardStyle"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 截图区域 -->
    <div class="client-screenshot">
      <img
        v-if="screenshotUrl && !imageError"
        :src="screenshotUrl"
        :alt="`${client.computerName} 截图`"
        class="screenshot-image"
        loading="lazy"
        @error="handleImageError"
        @load="handleImageLoad"
      />
      
      <!-- 占位符 -->
      <div v-else class="screenshot-placeholder">
        <div class="placeholder-content">
          <DesktopOutlined class="placeholder-icon" />
          <span class="placeholder-text">暂无截图</span>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-overlay">
        <a-spin size="large" />
      </div>

      <!-- 离线遮罩 -->
      <div v-if="isOffline" class="offline-overlay">
        <div class="offline-content">
          <WifiOutlined class="offline-icon" />
          <span class="offline-text">设备离线</span>
          <span class="offline-duration">{{ offlineDuration }}</span>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-if="isError" class="error-overlay">
        <ExclamationCircleOutlined class="error-icon" />
        <span class="error-text">连接错误</span>
      </div>
    </div>

    <!-- 客户端信息 -->
    <div class="client-info">
      <div class="client-header">
        <h3 class="client-name" :title="client.computerName">
          {{ client.computerName }}
        </h3>
        <div class="client-status">
          <a-badge
            :status="statusBadge.status"
            :text="statusBadge.text"
            :color="statusBadge.color"
          />
        </div>
      </div>

      <div class="client-details">
        <div class="client-id">
          <span class="label">编号:</span>
          <span class="value">{{ client.clientNumber }}</span>
        </div>
        
        <div class="client-last-seen">
          <span class="label">最后在线:</span>
          <span class="value">{{ lastSeenText }}</span>
        </div>

        <div v-if="client.alertCount > 0" class="client-alerts">
          <a-badge
            :count="client.alertCount"
            :overflow-count="99"
            :number-style="{ backgroundColor: '#ff4d4f' }"
          >
            <span class="alert-text">违规记录</span>
          </a-badge>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="client-actions">
        <a-button
          type="text"
          size="small"
          @click.stop="handleViewDetail"
        >
          <template #icon>
            <EyeOutlined />
          </template>
          详情
        </a-button>
        
        <a-button
          v-if="hasScreenshot"
          type="text"
          size="small"
          @click.stop="handleViewScreenshot"
        >
          <template #icon>
            <PictureOutlined />
          </template>
          截图
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import {
  DesktopOutlined,
  EyeOutlined,
  PictureOutlined,
  WifiOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons-vue'
import type { Client } from '@/types/client'

interface Props {
  client: Client
  isSelected?: boolean
  isLoading?: boolean
}

interface Emits {
  click: [client: Client]
  'view-detail': [client: Client]
  'view-screenshot': [client: Client]
  'mouse-enter': [client: Client]
  'mouse-leave': [client: Client]
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isLoading: false
})

const emit = defineEmits<Emits>()

// 状态
const imageError = ref(false)
const isHovered = ref(false)

// 计算属性
const isOffline = computed(() => props.client.status === 'offline')
const isError = computed(() => props.client.status === 'error')
const hasScreenshot = computed(() => !!props.client.latestScreenshotUrl)
const screenshotUrl = computed(() => {
  if (!props.client.latestScreenshotUrl) return ''

  // 添加时间戳参数避免缓存，确保图片能够实时更新
  const url = new URL(props.client.latestScreenshotUrl, window.location.origin)
  url.searchParams.set('t', Date.now().toString())
  return url.toString()
})

const statusBadge = computed(() => {
  const statusMap = {
    online: { status: 'success', text: '在线', color: '#52c41a' },
    offline: { status: 'error', text: '离线', color: '#ff4d4f' },
    error: { status: 'error', text: '错误', color: '#ff4d4f' },
    installing: { status: 'processing', text: '安装中', color: '#1890ff' }
  }
  
  return statusMap[props.client.status] || { status: 'default', text: '未知', color: '#d9d9d9' }
})

const offlineDuration = computed(() => {
  // 优先使用 lastHeartbeat，如果没有则使用 lastSeen
  const lastTime = props.client.lastHeartbeat || props.client.lastSeen
  if (!lastTime) return '未知'

  const now = dayjs()
  const lastSeen = dayjs(lastTime)
  const diffMinutes = now.diff(lastSeen, 'minute')
  const diffHours = now.diff(lastSeen, 'hour')
  const diffDays = now.diff(lastSeen, 'day')

  if (diffMinutes < 60) return `${diffMinutes}分钟`
  if (diffHours < 24) return `${diffHours}小时`
  return `${diffDays}天`
})

const lastSeenText = computed(() => {
  // 优先使用 lastHeartbeat，如果没有则使用 lastSeen
  const lastTime = props.client.lastHeartbeat || props.client.lastSeen
  if (!lastTime) return '从未在线'
  return dayjs(lastTime).format('MM-DD HH:mm')
})

const cardStyle = computed(() => ({
  transform: isHovered.value ? 'translateY(-2px)' : 'translateY(0)',
  boxShadow: isHovered.value ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
}))

// 事件处理
const handleClick = () => {
  emit('click', props.client)
}

const handleViewDetail = () => {
  emit('view-detail', props.client)
}

const handleViewScreenshot = () => {
  emit('view-screenshot', props.client)
}

const handleMouseEnter = () => {
  isHovered.value = true
  emit('mouse-enter', props.client)
}

const handleMouseLeave = () => {
  isHovered.value = false
  emit('mouse-leave', props.client)
}

const handleImageError = () => {
  imageError.value = true
}

const handleImageLoad = () => {
  imageError.value = false
}

// 清理
onUnmounted(() => {
  isHovered.value = false
})
</script>

<style scoped lang="scss">
.client-card {
  position: relative;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &.is-selected {
    border: 2px solid #1890ff;
  }

  &.is-offline {
    opacity: 0.7;
  }

  &.is-error {
    border-color: #ff4d4f;
  }
}

.client-screenshot {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #f5f5f5;
  overflow: hidden;

  .screenshot-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .screenshot-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);

    .placeholder-content {
      text-align: center;
      color: #8c8c8c;

      .placeholder-icon {
        font-size: 48px;
        margin-bottom: 8px;
        opacity: 0.5;
      }

      .placeholder-text {
        font-size: 14px;
      }
    }
  }

  .loading-overlay,
  .offline-overlay,
  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    flex-direction: column;
    gap: 8px;

    .offline-icon,
    .error-icon {
      font-size: 24px;
    }

    .offline-text,
    .error-text {
      font-size: 14px;
      font-weight: 500;
    }

    .offline-duration {
      font-size: 12px;
      opacity: 0.8;
    }
  }

  .error-overlay {
    background: rgba(255, 77, 79, 0.8);
  }
}

.client-info {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.client-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .client-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #262626;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 150px;
  }
}

.client-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #595959;

  .client-id,
  .client-last-seen {
    display: flex;
    justify-content: space-between;

    .label {
      color: #8c8c8c;
    }

    .value {
      color: #262626;
      font-weight: 500;
    }
  }

  .client-alerts {
    margin-top: 4px;

    .alert-text {
      font-size: 12px;
      color: #ff4d4f;
      font-weight: 500;
    }
  }
}

.client-actions {
  display: flex;
  gap: 4px;
  margin-top: auto;

  .ant-btn {
    flex: 1;
    padding: 0 8px;
    height: 24px;
    font-size: 12px;
  }
}
</style>