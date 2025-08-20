<template>
  <div class="alert-detail">
    <!-- 基本信息 -->
    <div class="detail-section">
      <h4 class="section-title">
        <InfoCircleOutlined />
        基本信息
      </h4>
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="违规ID">
          <a-typography-text copyable>{{ alert.alertId }}</a-typography-text>
        </a-descriptions-item>
        <a-descriptions-item label="检测时间">
          {{ dayjs(alert.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="getAlertStatusColor(alert.alertStatus)">
            <template #icon>
              <component :is="getStatusIcon(alert.alertStatus)" />
            </template>
            {{ getAlertStatusText(alert.alertStatus) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="风险等级">
          <a-tag :color="getRiskLevelColor(alert.riskLevel)">
            {{ getRiskLevelText(alert.riskLevel) }}
          </a-tag>
        </a-descriptions-item>
      </a-descriptions>
    </div>

    <!-- 违规详情 -->
    <div class="detail-section">
      <h4 class="section-title">
        <WarningOutlined />
        违规详情
      </h4>
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="检测到的地址">
          <div class="address-info">
            <a-typography-text copyable code class="address-text">
              {{ alert.detectedAddress }}
            </a-typography-text>
            <a-tag size="small" :color="getAddressTypeColor(alert.addressType)">
              {{ getAddressTypeText(alert.addressType) }}
            </a-tag>
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="地址类型">
          {{ getAddressTypeText(alert.addressType) }}
        </a-descriptions-item>
        <a-descriptions-item label="剪贴板内容" v-if="alert.clipboardContent">
          <a-typography-paragraph
            :copyable="{ text: alert.clipboardContent }"
            :ellipsis="{ rows: 3, expandable: true }"
            class="clipboard-content"
          >
            {{ alert.clipboardContent }}
          </a-typography-paragraph>
        </a-descriptions-item>
      </a-descriptions>
    </div>

    <!-- 截图信息 -->
    <div class="detail-section" v-if="hasScreenshot">
      <h4 class="section-title">
        <CameraOutlined />
        截图信息
      </h4>
      <div class="screenshot-section">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="截图时间" v-if="alert.screenshotTime">
            {{ dayjs(alert.screenshotTime).format('YYYY-MM-DD HH:mm:ss') }}
          </a-descriptions-item>
          <a-descriptions-item label="存储位置" v-if="alert.minioBucket">
            <a-typography-text code>
              {{ alert.minioBucket }}/{{ alert.minioObjectKey }}
            </a-typography-text>
          </a-descriptions-item>
        </a-descriptions>
        
        <div class="screenshot-actions">
          <a-button type="primary" @click="viewScreenshot" :disabled="!hasScreenshot">
            <template #icon>
              <EyeOutlined />
            </template>
            查看截图
          </a-button>
          <a-button @click="downloadScreenshot" :disabled="!hasScreenshot">
            <template #icon>
              <DownloadOutlined />
            </template>
            下载截图
          </a-button>
        </div>
      </div>
    </div>

    <!-- 操作历史 -->
    <div class="detail-section">
      <h4 class="section-title">
        <HistoryOutlined />
        操作历史
      </h4>
      <a-timeline size="small">
        <a-timeline-item color="blue">
          <template #dot>
            <PlusCircleOutlined />
          </template>
          <div class="timeline-content">
            <div class="timeline-title">违规事件创建</div>
            <div class="timeline-time">{{ dayjs(alert.createdAt).format('YYYY-MM-DD HH:mm:ss') }}</div>
          </div>
        </a-timeline-item>
        
        <a-timeline-item 
          v-if="alert.alertStatus !== 'pending'"
          :color="getTimelineColor(alert.alertStatus)"
        >
          <template #dot>
            <component :is="getStatusIcon(alert.alertStatus)" />
          </template>
          <div class="timeline-content">
            <div class="timeline-title">状态更新为：{{ getAlertStatusText(alert.alertStatus) }}</div>
            <div class="timeline-time">{{ dayjs(alert.updatedAt || alert.createdAt).format('YYYY-MM-DD HH:mm:ss') }}</div>
          </div>
        </a-timeline-item>
      </a-timeline>
    </div>

    <!-- 操作按钮 -->
    <div class="detail-actions">
      <a-space direction="vertical" style="width: 100%">
        <a-button-group style="width: 100%">
          <a-button 
            type="primary" 
            @click="updateStatus('resolved')"
            :disabled="alert.alertStatus === 'resolved'"
            style="flex: 1"
          >
            <template #icon>
              <CheckCircleOutlined />
            </template>
            标记已处理
          </a-button>
          <a-button 
            @click="updateStatus('ignored')"
            :disabled="alert.alertStatus === 'ignored'"
            style="flex: 1"
          >
            <template #icon>
              <ExclamationCircleOutlined />
            </template>
            忽略违规
          </a-button>
        </a-button-group>
        
        <a-button 
          danger
          @click="updateStatus('confirmed')"
          :disabled="alert.alertStatus === 'confirmed'"
          style="width: 100%"
        >
          <template #icon>
            <WarningOutlined />
          </template>
          确认违规
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  InfoCircleOutlined,
  WarningOutlined,
  CameraOutlined,
  EyeOutlined,
  DownloadOutlined,
  HistoryOutlined,
  PlusCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  StopOutlined
} from '@ant-design/icons-vue'

interface Alert {
  alertId: string
  detectedAddress: string
  addressType: string
  riskLevel: string
  alertStatus: string
  createdAt: string
  updatedAt?: string
  screenshotTime?: string
  clipboardContent?: string
  fileUrl?: string
  cdnUrl?: string
  minioBucket?: string
  minioObjectKey?: string
  [key: string]: any
}

interface Props {
  alert: Alert
}

interface Emits {
  'update-status': [alertId: string, status: string]
  'show-screenshot': [alert: Alert]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 检查是否有截图
const hasScreenshot = computed(() => {
  return !!(props.alert.fileUrl || props.alert.cdnUrl || (props.alert.minioBucket && props.alert.minioObjectKey))
})

// 查看截图
const viewScreenshot = () => {
  emit('show-screenshot', props.alert)
}

// 下载截图
const downloadScreenshot = () => {
  let url = props.alert.cdnUrl || props.alert.fileUrl
  
  if (!url && props.alert.minioBucket && props.alert.minioObjectKey) {
    url = `/storage/${props.alert.minioBucket}/${props.alert.minioObjectKey}`
  }
  
  if (url) {
    const link = document.createElement('a')
    link.href = url
    link.download = `violation-screenshot-${props.alert.alertId}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } else {
    message.error('没有可用的截图地址')
  }
}

// 更新状态
const updateStatus = (status: string) => {
  emit('update-status', props.alert.alertId, status)
}

// 获取地址类型颜色
const getAddressTypeColor = (type: string) => {
  const colors = {
    'bitcoin': 'orange',
    'ethereum': 'blue',
    'other': 'default'
  }
  return colors[type as keyof typeof colors] || 'default'
}

// 获取地址类型文本
const getAddressTypeText = (type: string) => {
  const texts = {
    'bitcoin': 'Bitcoin (BTC)',
    'ethereum': 'Ethereum (ETH)',
    'other': '其他类型'
  }
  return texts[type as keyof typeof texts] || type
}

// 获取风险等级颜色
const getRiskLevelColor = (level: string) => {
  const colors = {
    'high': 'red',
    'medium': 'orange',
    'low': 'green'
  }
  return colors[level as keyof typeof colors] || 'default'
}

// 获取风险等级文本
const getRiskLevelText = (level: string) => {
  const texts = {
    'high': '高风险',
    'medium': '中风险',
    'low': '低风险'
  }
  return texts[level as keyof typeof texts] || level
}

// 获取违规状态颜色
const getAlertStatusColor = (status: string) => {
  const colors = {
    'resolved': 'green',
    'ignored': 'default',
    'pending': 'orange',
    'confirmed': 'red'
  }
  return colors[status as keyof typeof colors] || 'default'
}

// 获取违规状态文本
const getAlertStatusText = (status: string) => {
  const texts = {
    'resolved': '已处理',
    'ignored': '已忽略',
    'pending': '待处理',
    'confirmed': '已确认'
  }
  return texts[status as keyof typeof texts] || status
}

// 获取状态图标
const getStatusIcon = (status: string) => {
  const icons = {
    'resolved': CheckOutlined,
    'ignored': StopOutlined,
    'pending': ClockCircleOutlined,
    'confirmed': WarningOutlined
  }
  return icons[status as keyof typeof icons] || ClockCircleOutlined
}

// 获取时间线颜色
const getTimelineColor = (status: string) => {
  const colors = {
    'resolved': 'green',
    'ignored': 'gray',
    'confirmed': 'red'
  }
  return colors[status as keyof typeof colors] || 'blue'
}
</script>

<style scoped>
.alert-detail {
  padding: 0;
}

.detail-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #262626;
  font-size: 16px;
  font-weight: 600;
}

.address-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.address-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  word-break: break-all;
}

.clipboard-content {
  margin: 0;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.screenshot-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.screenshot-actions {
  display: flex;
  gap: 8px;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-title {
  font-weight: 500;
  color: #262626;
}

.timeline-time {
  font-size: 12px;
  color: #8c8c8c;
}

.detail-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

:deep(.ant-descriptions-item-label) {
  font-weight: 500;
  color: #595959;
  width: 100px;
}

:deep(.ant-descriptions-item-content) {
  color: #262626;
}

:deep(.ant-timeline-item-content) {
  margin-left: 8px;
}
</style>