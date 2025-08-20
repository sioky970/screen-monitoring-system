<template>
  <div 
    ref="containerRef"
    class="client-grid"
    :style="gridStyle"
  >
    <!-- 加载状态 -->
    <div v-if="isLoading && clients.length === 0" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="clients.length === 0" class="empty-container">
      <a-empty description="暂无客户端数据">
        <template #image>
          <DesktopOutlined class="empty-icon" />
        </template>
      </a-empty>
    </div>

    <!-- 客户端网格 -->
    <div v-else class="grid-container">
      <TransitionGroup
        name="client-card"
        tag="div"
        class="client-cards"
        :style="cardsStyle"
      >
        <ClientCard
          v-for="client in clients"
          :key="client.id"
          :client="client"
          :is-selected="selectedClient?.id === client.id"
          :is-loading="loadingClients.has(client.id)"
          @click="handleClientClick"
          @view-detail="handleViewDetail"
          @view-screenshot="handleViewScreenshot"
          @mouse-enter="handleMouseEnter"
          @mouse-leave="handleMouseLeave"
        />
      </TransitionGroup>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore && !isLoading" class="load-more">
      <a-button type="dashed" @click="handleLoadMore" :loading="isLoadingMore">
        加载更多
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import dayjs from 'dayjs'
import ClientCard from './ClientCard.vue'
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
import type { Client } from '@/types/client'

interface Props {
  clients: Client[]
  selectedClient?: Client | null
  isLoading?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  loadingClients?: Set<string>
}

interface Emits {
  'client-click': [client: Client]
  'view-detail': [client: Client]
  'view-screenshot': [client: Client]
  'load-more': []
  'mouse-enter': [client: Client]
  'mouse-leave': [client: Client]
}

const props = withDefaults(defineProps<Props>(), {
  selectedClient: null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  loadingClients: () => new Set()
})

const emit = defineEmits<Emits>()

// 响应式布局
const containerRef = ref<HTMLElement>()
const layout = useResponsiveLayout(containerRef, {
  minColumns: 1,
  maxColumns: 8,
  minWidth: 280,
  maxWidth: 400,
  gap: 16
})

// 计算属性
const gridStyle = computed(() => ({
  padding: '16px',
  minHeight: '100%'
}))

const cardsStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${layout.columns.value}, 1fr)`,
  gap: `${layout.gap.value}px`,
  gridAutoRows: 'min-content'
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

// 事件处理函数
const handleClientClick = (client: Client) => {
  emit('client-click', client)
}

const handleViewDetail = (client: Client) => {
  emit('view-detail', client)
}

const handleViewScreenshot = (client: Client) => {
  emit('view-screenshot', client)
}

const handleMouseEnter = (client: Client) => {
  emit('mouse-enter', client)
}

const handleMouseLeave = (client: Client) => {
  emit('mouse-leave', client)
}

const handleLoadMore = () => {
  emit('load-more')
}
</script>

<style scoped>
.client-grid {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.empty-icon {
  font-size: 64px;
  color: #d9d9d9;
}

.grid-container {
  width: 100%;
}

.client-cards {
  width: 100%;
  padding: 0 16px 16px;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

/* 动画 */
.client-card-enter-active,
.client-card-leave-active {
  transition: all 0.3s ease;
}

.client-card-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.client-card-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.client-card-move {
  transition: transform 0.3s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .client-cards {
    padding: 0 12px 12px;
  }
}

@media (max-width: 480px) {
  .client-cards {
    padding: 0 8px 8px;
  }
}
</style>