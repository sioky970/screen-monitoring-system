<template>
  <a-modal
    :open="visible"
    :title="modalTitle"
    :width="modalWidth"
    :footer="null"
    :destroy-on-close="true"
    :mask-closable="true"
    :keyboard="true"
    class="violation-screenshot-modal"
    @cancel="handleClose"
    @update:open="$emit('update:visible', $event)"
  >
    <div v-if="violation" class="screenshot-content">
      <!-- 违规信息 -->
      <div class="violation-info">
        <a-descriptions :column="isMobile ? 1 : 2" size="small" bordered>
          <a-descriptions-item label="风险等级">
            <a-tag :color="getRiskLevelColor(violation.riskLevel)">
              {{ getRiskLevelText(violation.riskLevel) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(violation.alertStatus)">
              {{ getStatusText(violation.alertStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="检测时间">
            {{ formatTime(violation.screenshotTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="地址类型">
            {{ violation.addressType }}
          </a-descriptions-item>
          <a-descriptions-item label="检测到的地址" :span="isMobile ? 1 : 2">
            <a-typography-text copyable>{{ violation.detectedAddress }}</a-typography-text>
          </a-descriptions-item>
          <a-descriptions-item label="剪贴板内容" :span="isMobile ? 1 : 2">
            <a-typography-text copyable>{{ violation.clipboardContent }}</a-typography-text>
          </a-descriptions-item>
          <a-descriptions-item v-if="violation.reviewNote" label="处理备注" :span="isMobile ? 1 : 2">
            {{ violation.reviewNote }}
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <!-- 截图显示 -->
      <div class="screenshot-display">
        <h4>违规截图</h4>
        <div class="screenshot-container">
          <a-spin :spinning="imageLoading">
            <img
              v-if="getImageUrl(violation)"
              :src="getImageUrl(violation)"
              :alt="`违规截图 - ${violation.id}`"
              class="screenshot-image"
              @load="imageLoading = false"
              @error="handleImageError"
            />
            <div v-else class="no-screenshot">
              <a-empty description="暂无截图" />
            </div>
          </a-spin>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <a-space>
          <a-dropdown>
            <template #overlay>
              <a-menu @click="({ key }) => handleUpdateStatus(key)">
                <a-menu-item key="confirmed">确认违规</a-menu-item>
                <a-menu-item key="false_positive">误报</a-menu-item>
                <a-menu-item key="ignored">忽略</a-menu-item>
                <a-menu-item key="resolved">已解决</a-menu-item>
              </a-menu>
            </template>
            <a-button type="primary">
              更新状态
              <DownOutlined />
            </a-button>
          </a-dropdown>
          
          <a-button @click="handleDownload" :loading="downloadLoading">
            <template #icon>
              <DownloadOutlined />
            </template>
            下载截图
          </a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { DownOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import type { SecurityAlert, AlertStatus, RiskLevel } from '@/types/security'
import { securityApi } from '@/api/security'

interface Props {
  visible: boolean
  violation: SecurityAlert | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'statusUpdated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const imageLoading = ref(true)
const downloadLoading = ref(false)
const screenWidth = ref(window.innerWidth)

// 计算属性
const isMobile = computed(() => screenWidth.value < 768)
const modalWidth = computed(() => isMobile.value ? '95vw' : '800px')
const modalTitle = computed(() => {
  if (!props.violation) return '违规截图详情'
  return `违规截图详情 - ${props.violation.addressType} 地址检测`
})

// 事件处理
const handleClose = () => {
  emit('update:visible', false)
}

const handleImageError = () => {
  imageLoading.value = false
  message.error('截图加载失败')
}

const handleUpdateStatus = async (status: AlertStatus) => {
  if (!props.violation) return
  
  try {
    await securityApi.updateAlertStatus(props.violation.id, { status })
    message.success('状态更新成功')
    emit('statusUpdated')
  } catch (error) {
    message.error('状态更新失败')
  }
}

const handleDownload = async () => {
  const imageUrl = getImageUrl(props.violation)
  if (!imageUrl) {
    message.error('无可下载的截图')
    return
  }
  
  downloadLoading.value = true
  try {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `violation-screenshot-${props.violation.id}-${dayjs(props.violation.screenshotTime).format('YYYY-MM-DD-HH-mm-ss')}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    message.success('截图下载成功')
  } catch (error) {
    message.error('截图下载失败')
  } finally {
    downloadLoading.value = false
  }
}

// 工具函数
const getImageUrl = (violation: SecurityAlert): string => {
  // 优先使用screenshotUrl（新的字段）
  if (violation.screenshotUrl) {
    // 如果已经是完整URL，直接返回
    if (violation.screenshotUrl.startsWith('http://') || violation.screenshotUrl.startsWith('https://')) {
      return violation.screenshotUrl
    }
    // 如果已经是/storage/开头的路径，直接返回
    if (violation.screenshotUrl.startsWith('/storage/')) {
      return violation.screenshotUrl
    }
    // 否则添加/storage/前缀
    return `/storage/${violation.screenshotUrl}`
  }

  // 兼容旧的fileUrl字段
  if (violation.fileUrl) {
    if (violation.fileUrl.startsWith('http://') || violation.fileUrl.startsWith('https://')) {
      return violation.fileUrl
    }
    return violation.fileUrl.startsWith('/storage/') ? violation.fileUrl : `/storage/${violation.fileUrl}`
  }

  // 使用minioObjectKey构建URL
  if (violation.minioObjectKey) {
    return `/storage/${violation.minioObjectKey}`
  }

  return ''
}

const getRiskLevelColor = (level: RiskLevel): string => {
  const colorMap = {
    low: 'green',
    medium: 'orange',
    high: 'red',
    critical: 'red'
  }
  return colorMap[level] || 'default'
}

const getRiskLevelText = (level: RiskLevel): string => {
  const textMap = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '严重'
  }
  return textMap[level] || '未知'
}

const getStatusColor = (status: AlertStatus): string => {
  const colorMap = {
    pending: 'orange',
    confirmed: 'red',
    false_positive: 'green',
    ignored: 'gray',
    resolved: 'blue'
  }
  return colorMap[status] || 'default'
}

const getStatusText = (status: AlertStatus): string => {
  const textMap = {
    pending: '待处理',
    confirmed: '已确认',
    false_positive: '误报',
    ignored: '已忽略',
    resolved: '已解决'
  }
  return textMap[status] || '未知'
}

const formatTime = (time: string): string => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 监听违规数据变化，重置图片加载状态
watch(() => props.violation, () => {
  imageLoading.value = true
})

// 窗口大小监听
const handleResize = () => {
  screenWidth.value = window.innerWidth
}

// 生命周期
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.violation-screenshot-modal {
  top: 20px;
}

.screenshot-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.violation-info {
  margin-bottom: 16px;
}

.screenshot-display h4 {
  margin-bottom: 12px;
  color: #333;
  font-weight: 600;
}

.screenshot-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.screenshot-image {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: zoom-in;
  transition: transform 0.3s ease;
}

.screenshot-image:hover {
  transform: scale(1.02);
}

.no-screenshot {
  width: 100%;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-buttons {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .violation-screenshot-modal {
    margin: 0;
    max-width: 100vw;
  }
  
  .screenshot-content {
    padding: 12px;
  }
  
  .screenshot-container {
    min-height: 200px;
  }
  
  .screenshot-image {
    max-height: 300px;
  }
  
  .action-buttons .ant-space {
    flex-direction: column;
    width: 100%;
  }
  
  .action-buttons .ant-btn {
    width: 100%;
  }
}
</style>