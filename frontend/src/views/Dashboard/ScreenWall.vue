<template>
  <div 
    class="screen-wall-container"
    :class="{ fullscreen: isFullscreen }"
  >
    <!-- 控制栏 -->
    <div 
      class="control-bar"
      :class="{ compact: isFullscreen }"
    >
      <div class="control-left">
        <h1 
          class="page-title"
          :class="{ hidden: isFullscreen }"
        >
          客户端监控墙
        </h1>
        
        <!-- 刷新按钮 -->
        <a-button
          type="primary"
          :icon="h(ReloadOutlined)"
          :loading="loading"
          @click="handleRefresh"
        >
          刷新
        </a-button>

        <!-- 自动刷新控制 -->
        <a-button-group>
          <a-button
            :type="autoRefresh ? 'primary' : 'default'"
            :icon="h(autoRefresh ? PauseOutlined : PlayCircleOutlined)"
            @click="toggleAutoRefresh"
          >
            {{ autoRefresh ? '暂停' : '开始' }}
          </a-button>
          <a-dropdown>
            <a-button :icon="h(SettingOutlined)">
              {{ refreshInterval / 1000 }}s
            </a-button>
            <template #overlay>
              <a-menu @click="handleIntervalChange">
                <a-menu-item key="5000">5秒</a-menu-item>
                <a-menu-item key="10000">10秒</a-menu-item>
                <a-menu-item key="30000">30秒</a-menu-item>
                <a-menu-item key="60000">1分钟</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-button-group>

        <!-- 最后刷新时间 -->
        <span v-if="lastRefreshTime" class="refresh-time">
          最后更新: {{ formatRefreshTime(lastRefreshTime) }}
        </span>

        <!-- 全屏切换 -->
        <a-button
          :icon="h(isFullscreen ? FullscreenExitOutlined : FullscreenOutlined)"
          @click="toggleFullscreen"
        >
          {{ isFullscreen ? '退出全屏' : '全屏显示' }}
        </a-button>
      </div>
      
      <div 
        class="control-right"
        :class="{ hidden: isFullscreen }"
      >
        <!-- 分组筛选 -->
        <a-select
          v-model:value="selectedGroupId"
          placeholder="选择分组"
          style="width: 150px"
          allow-clear
          @change="handleGroupChange"
        >
          <a-select-option 
            v-for="group in clientGroups" 
            :key="group.id" 
            :value="group.id"
          >
            {{ group.name }}
          </a-select-option>
        </a-select>
        
        <!-- 状态筛选 -->
        <a-select
          v-model:value="statusFilter"
          placeholder="状态筛选"
          style="width: 120px"
          @change="handleStatusChange"
        >
          <a-select-option value="all">全部</a-select-option>
          <a-select-option value="online">在线</a-select-option>
          <a-select-option value="offline">离线</a-select-option>
          <a-select-option value="error">异常</a-select-option>
        </a-select>
        
        <!-- 搜索框 -->
        <a-input-search
          v-model:value="searchQuery"
          placeholder="搜索客户端..."
          style="width: 200px"
          @search="handleSearch"
          @change="handleSearchChange"
        />
        
        <!-- 清除筛选 -->
        <a-button 
          v-if="hasActiveFilters"
          @click="clearFilters"
        >
          清除筛选
        </a-button>
      </div>
    </div>

    <!-- 客户端网格 -->
    <div class="clients-grid">
      <ClientGrid
        :clients="filteredClients"
        :selected-client="selectedClient"
        :loading="loading"
        @client-click="handleClientClick"
        @view-detail="handleViewDetail"
        @view-screenshot="handleViewScreenshot"
      />
      
      <!-- 空状态 -->
      <div v-if="!loading && filteredClients.length === 0" class="empty-state">
        <a-empty description="暂无客户端数据">
          <template #image>
            <DesktopOutlined style="font-size: 64px; color: #d9d9d9;" />
          </template>
        </a-empty>
      </div>
    </div>

    <!-- 客户端详情弹窗 -->
    <ClientDetailModal
      v-model:visible="clientDetailVisible"
      :client="selectedClient"
      @client-updated="handleClientUpdated"
      @client-deleted="handleClientDelete"
      @show-screenshot="handleShowScreenshot"
    />

    <!-- 截图查看弹窗 -->
    <ScreenshotModal
      v-model:visible="screenshotModalVisible"
      :client-name="selectedClient?.computerName || '客户端'"
      :screenshot-url="screenshotUrl"
    />

    <!-- 日志查看器弹窗 -->
    <a-modal
      v-model:visible="showLogViewer"
      title="前端日志查看器"
      width="80%"
      :footer="null"
      :body-style="{ height: '70vh', padding: 0 }"
    >
      <LogViewer />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, h } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  DesktopOutlined,
  PlayCircleOutlined,
  PauseOutlined,
  SettingOutlined
} from '@ant-design/icons-vue'
import ClientGrid from './components/ClientGrid.vue'
import ClientDetailModal from './components/ClientDetailModal.vue'
import ScreenshotModal from './components/ScreenshotModal.vue'
import LogViewer from './components/LogViewer.vue'
import { useScreenWall } from './composables/useScreenWall'
import { useFullscreen } from '@/composables/useFullscreen'
import { log } from '@/utils/logger'
import type { Client } from '@/types/client'

// 使用组合式API
const {
  clients,
  clientGroups,
  loading,
  selectedGroupId,
  searchQuery,
  statusFilter,
  selectedClient,
  autoRefresh,
  refreshInterval,
  lastRefreshTime,
  filteredClients,
  refreshClients,
  loadClientGroups,
  showClientDetail,
  showScreenshotModal,
  startAutoRefresh,
  stopAutoRefresh,
  setRefreshInterval,
  updateClient,
  deleteClient
} = useScreenWall()

// 全屏状态管理
const { isFullscreen, toggleFullscreen, cleanup: cleanupFullscreen } = useFullscreen()

// 弹窗状态
const clientDetailVisible = ref(false)
const screenshotModalVisible = ref(false)
const screenshotUrl = ref('')
const showLogViewer = ref(false)

// 计算属性
const hasActiveFilters = computed(() => {
  return selectedGroupId.value !== null || 
         statusFilter.value !== 'all' || 
         searchQuery.value.trim() !== ''
})

// 事件处理函数
const handleRefresh = async () => {
  try {
    await refreshClients()
    message.success('刷新成功')
  } catch (error) {
    message.error('刷新失败')
  }
}

const handleGroupChange = (groupId: number | null) => {
  selectedGroupId.value = groupId
}

const handleStatusChange = (status: string) => {
  statusFilter.value = status
}

const handleSearch = () => {
  // 搜索逻辑已在 computed 中处理
}

const handleSearchChange = () => {
  // 实时搜索
}

const clearFilters = () => {
  selectedGroupId.value = null
  statusFilter.value = 'all'
  searchQuery.value = ''
}

const handleClientClick = (client: Client) => {
  selectedClient.value = client
  clientDetailVisible.value = true
}

const handleViewDetail = (client: Client) => {
  selectedClient.value = client
  clientDetailVisible.value = true
}

const handleViewScreenshot = (client: Client) => {
  selectedClient.value = client
  screenshotUrl.value = client.latestScreenshotUrl || ''
  screenshotModalVisible.value = true
}

// 自动刷新控制
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    startAutoRefresh()
    message.success('自动刷新已开启')
  } else {
    stopAutoRefresh()
    message.success('自动刷新已暂停')
  }
}

const handleIntervalChange = ({ key }: { key: string }) => {
  const interval = parseInt(key)
  setRefreshInterval(interval)
  message.success(`刷新间隔已设置为 ${interval / 1000} 秒`)
}

const formatRefreshTime = (time: Date) => {
  return time.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const handleClientSave = async (client: Client) => {
  try {
    await updateClient(client.id, client)
    message.success('客户端信息更新成功')
    clientDetailVisible.value = false
    await refreshClients()
  } catch (error) {
    message.error('更新失败')
  }
}

const handleClientDelete = async (clientId: string) => {
  try {
    await deleteClient(clientId)
    message.success('客户端删除成功')
    clientDetailVisible.value = false
    await refreshClients()
  } catch (error) {
    message.error('删除失败')
  }
}

const handleClientUpdated = async (clientId: string) => {
  try {
    await refreshClients()
    message.success('客户端信息更新成功')
  } catch (error) {
    message.error('刷新客户端列表失败')
  }
}

const handleShowScreenshot = (url: string, title: string) => {
  screenshotUrl.value = url
  screenshotModalVisible.value = true
}

// 生命周期
onMounted(async () => {
  try {
    await Promise.all([
      refreshClients(),
      loadClientGroups()
    ])
    log.info('ScreenWall', 'Screen wall initialized successfully')
  } catch (error) {
    log.error('ScreenWall', 'Failed to initialize screen wall', error)
    message.error('初始化失败')
  }
})

onUnmounted(() => {
  cleanupFullscreen()
})

// 监听筛选条件变化
watch([selectedGroupId, statusFilter, searchQuery], () => {
  // 筛选逻辑已在 computed 中处理
}, { immediate: false })
</script>

<style scoped>
.screen-wall-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: hidden;
}

.screen-wall-container.fullscreen {
  background: #000;
}

.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.control-bar.compact {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.control-bar.compact .page-title,
.control-bar.compact .control-right {
  display: none;
}

.control-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.refresh-time {
  font-size: 12px;
  color: #8c8c8c;
  margin-left: 8px;
  white-space: nowrap;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.page-title.hidden {
  display: none;
}

.control-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-right.hidden {
  display: none;
}

.clients-grid {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-bar {
    padding: 12px 16px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .control-left,
  .control-right {
    justify-content: center;
  }

  .control-right {
    margin-top: 8px;
  }
}

@media (max-width: 480px) {
  .control-bar {
    padding: 8px 12px;
  }

  .control-left {
    flex-direction: column;
    gap: 8px;
  }
}

/* 全屏模式样式 */
.screen-wall-container.fullscreen .control-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
}

.screen-wall-container.fullscreen .clients-grid {
  padding-top: 60px;
}
</style>