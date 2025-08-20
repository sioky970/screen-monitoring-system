<template>
  <a-modal
    :visible="visible"
    :title="modalTitle"
    :width="modalWidth"
    :footer="null"
    :destroy-on-close="true"
    :mask-closable="true"
    :keyboard="true"
    class="screenshot-modal"
    :class="{ 'fullscreen': isFullscreen }"
    @cancel="handleClose"
    @update:visible="$emit('update:visible', $event)"
  >
    <div v-if="screenshotUrl" class="modal-content">
      <!-- 工具栏 -->
      <div class="toolbar">
        <a-space>
          <a-button
            type="text"
            size="small"
            @click="toggleFullscreen"
            :title="isFullscreen ? '退出全屏' : '全屏查看'"
          >
            <template #icon>
              <FullscreenOutlined v-if="!isFullscreen" />
              <FullscreenExitOutlined v-else />
            </template>
          </a-button>
          
          <a-button
            type="text"
            size="small"
            @click="handleDownload"
            :disabled="!canDownload"
          >
            <template #icon>
              <DownloadOutlined />
            </template>
            下载
          </a-button>
          
          <a-button
            type="text"
            size="small"
            @click="handleRefresh"
            :loading="isRefreshing"
          >
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
        </a-space>
      </div>

      <!-- 图片显示区域 -->
      <div class="image-container" :class="{ 'fullscreen': isFullscreen }">
        <img
          :src="screenshotUrl"
          :alt="imageAlt"
          class="screenshot-image"
          :class="{ 'loading': isLoading }"
          @load="handleImageLoad"
          @error="handleImageError"
        />
        
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-overlay">
          <a-spin size="large" />
        </div>
        
        <!-- 错误状态 -->
        <div v-if="hasError" class="error-overlay">
          <div class="error-content">
            <ExclamationCircleOutlined class="error-icon" />
            <p class="error-text">图片加载失败</p>
            <a-button type="primary" size="small" @click="handleRetry">
              重试
            </a-button>
          </div>
        </div>
      </div>

      <!-- 图片信息 -->
      <div class="image-info">
        <div class="info-item">
          <span class="label">文件名:</span>
          <span class="value">{{ fileName }}</span>
        </div>
        <div class="info-item">
          <span class="label">大小:</span>
          <span class="value">{{ fileSize }}</span>
        </div>
        <div class="info-item">
          <span class="label">时间:</span>
          <span class="value">{{ captureTime }}</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-container">
      <a-empty description="暂无截图数据" />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons-vue'

interface Props {
  visible: boolean
  screenshotUrl: string
  clientName: string
  captureDate?: string
}

interface Emits {
  'update:visible': [visible: boolean]
  download: [url: string]
  refresh: []
}

const props = withDefaults(defineProps<Props>(), {
  captureDate: undefined
})

const emit = defineEmits<Emits>()

// 响应式状态
const isFullscreen = ref(false)
const isLoading = ref(true)
const hasError = ref(false)
const isRefreshing = ref(false)
const screenWidth = ref(window.innerWidth)

// 计算属性
const modalTitle = computed(() => {
  return `${props.clientName} - 截图预览`
})

const modalWidth = computed(() => {
  if (isFullscreen.value) return '100%'
  return screenWidth.value < 768 ? '95%' : '800px'
})

const imageAlt = computed(() => {
  return `${props.clientName} 截图`
})

const fileName = computed(() => {
  const date = props.captureDate || new Date().toISOString()
  return `${props.clientName}_${dayjs(date).format('YYYYMMDD_HHmmss')}.png`
})

const fileSize = computed(() => {
  // 这里可以根据实际需要获取文件大小
  return '未知大小'
})

const captureTime = computed(() => {
  return props.captureDate 
    ? dayjs(props.captureDate).format('YYYY-MM-DD HH:mm:ss')
    : dayjs().format('YYYY-MM-DD HH:mm:ss')
})

const canDownload = computed(() => {
  return !!props.screenshotUrl && !hasError.value
})

// 事件处理
const handleClose = () => {
  emit('update:visible', false)
  if (isFullscreen.value) {
    isFullscreen.value = false
  }
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const handleDownload = () => {
  if (props.screenshotUrl) {
    emit('download', props.screenshotUrl)
  }
}

const handleRefresh = () => {
  isRefreshing.value = true
  isLoading.value = true
  hasError.value = false
  emit('refresh')
  
  setTimeout(() => {
    isRefreshing.value = false
  }, 1000)
}

const handleRetry = () => {
  hasError.value = false
  isLoading.value = true
}

const handleImageLoad = () => {
  isLoading.value = false
  hasError.value = false
}

const handleImageError = () => {
  isLoading.value = false
  hasError.value = true
}

// 监听窗口变化
const handleResize = () => {
  screenWidth.value = window.innerWidth
}

// 监听属性变化
watch(() => props.screenshotUrl, () => {
  isLoading.value = true
  hasError.value = false
})

watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    window.addEventListener('resize', handleResize)
  } else {
    window.removeEventListener('resize', handleResize)
    isFullscreen.value = false
  }
})

// 监听全屏状态
watch(isFullscreen, (newFullscreen) => {
  if (newFullscreen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped lang="scss">
.screenshot-modal {
  .modal-content {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
  }

  .toolbar {
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 16px;
  }

  .image-container {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    border-radius: 8px;
    overflow: hidden;
    min-height: 400px;

    &.fullscreen {
      min-height: calc(100vh - 120px);
    }

    .screenshot-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      transition: opacity 0.3s ease;

      &.loading {
        opacity: 0.3;
      }
    }

    .loading-overlay,
    .error-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.9);
    }

    .error-overlay {
      .error-content {
        text-align: center;

        .error-icon {
          font-size: 48px;
          color: #ff4d4f;
          margin-bottom: 16px;
        }

        .error-text {
          font-size: 16px;
          color: #666;
          margin-bottom: 16px;
        }
      }
    }
  }

  .image-info {
    margin-top: 16px;
    padding: 12px;
    background: #f9f9f9;
    border-radius: 8px;
    font-size: 14px;

    .info-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        color: #666;
        font-weight: 500;
      }

      .value {
        color: #333;
      }
    }
  }

  .empty-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
  }

  &.fullscreen {
    :deep(.ant-modal) {
      margin: 0;
      max-width: 100%;
      top: 0;
      padding-bottom: 0;
    }

    :deep(.ant-modal-content) {
      height: 100vh;
      border-radius: 0;
    }

    :deep(.ant-modal-body) {
      height: calc(100vh - 55px);
      display: flex;
      flex-direction: column;
    }
  }
}
</style>