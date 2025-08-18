<template>
  <div class="screen-wall-container">
    <!-- 页面头部 -->
    <ScreenWallHeader
      :is-connected="isConnected"
      :loading="loading"
      :grid-columns="gridColumns"
      :is-fullscreen="isFullscreen"
      :client-groups="clientGroups"
      :selected-group-id="selectedGroupId"
      @refresh="refreshClients"
      @grid-change="handleGridChange"
      @fullscreen-toggle="toggleFullscreen"
      @group-change="handleGroupChange"
      @show-logs="showLogViewer = true"
    />

    <!-- 主要内容区域 -->
    <div class="screen-wall-content" :class="{ 'fullscreen': isFullscreen }">
      <!-- 客户端标签页 -->
      <ClientTabs
        v-model:active-key="activeTab"
        :clients="clients"
        :online-clients="onlineClients"
        :offline-clients="offlineClients"
        :loading="loading"
        @refresh="refreshClients"
      >
        <!-- 客户端网格 -->
        <template #content="{ displayClients }">
          <ClientGrid
            :clients="displayClients"
            :grid-columns="gridColumns"
            :is-fullscreen="isFullscreen"
            @client-click="showClientDetail"
          />
        </template>
      </ClientTabs>
    </div>

    <!-- 客户端详情弹窗 -->
    <ClientDetailModal
      v-model:visible="clientDetailVisible"
      :client="selectedClient"
      :client-groups="clientGroups"
      @save="handleClientSave"
      @delete="handleClientDelete"
    />

    <!-- 日志查看器弹窗 -->
    <a-modal
      v-model:open="showLogViewer"
      title="前端日志查看器"
      width="80%"
      :footer="null"
      :bodyStyle="{ height: '70vh', padding: 0 }"
    >
      <LogViewer />
    </a-modal>

    <!-- 截图查看弹窗 -->
    <ScreenshotModal
      v-model:visible="screenshotModalVisible"
      :title="screenshotModalTitle"
      :url="currentScreenshotUrl"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { useSocket } from '@/composables/useSocket'
import { log } from '@/utils/logger'

// 组件导入
import ScreenWallHeader from './components/ScreenWallHeader.vue'
import ClientTabs from './components/ClientTabs.vue'
import ClientGrid from './components/ClientGrid.vue'
import ClientDetailModal from './components/ClientDetailModal.vue'
import ScreenshotModal from './components/ScreenshotModal.vue'
import LogViewer from '@/components/LogViewer.vue'

// Composables
import { useClients } from './composables/useClients'
import { useWebSocketEvents } from './composables/useWebSocketEvents'
import { useScreenWallState } from './composables/useScreenWallState'

// 使用组合式函数管理状态
const {
  clients,
  clientGroups,
  loading,
  onlineClients,
  offlineClients,
  selectedGroupId,
  refreshClients,
  loadClientGroups,
  updateClient,
  deleteClient
} = useClients()

const {
  gridColumns,
  isFullscreen,
  activeTab,
  clientDetailVisible,
  selectedClient,
  showLogViewer,
  screenshotModalVisible,
  screenshotModalTitle,
  currentScreenshotUrl,
  showClientDetail,
  showScreenshotModal
} = useScreenWallState()

// WebSocket连接
const { socket, isConnected } = useSocket('/monitor')

// 设置WebSocket事件监听
useWebSocketEvents(socket, {
  onClientStatusUpdate: (data) => {
    const client = clients.value.find(c => c.id === data.clientId)
    if (client) {
      const newStatus = typeof data.status === 'object' ? data.status.status : data.status
      client.status = newStatus
      client.lastSeen = data.timestamp
    }
  },
  onScreenshotUpdate: (data) => {
    const client = clients.value.find(c => c.id === data.clientId)
    if (client && client.latestScreenshotUrl !== data.screenshotUrl) {
      client.latestScreenshotUrl = data.screenshotUrl
      client.loading = false
    }
  },
  onClientListResponse: () => {
    refreshClients()
  }
})

// 事件处理函数
const handleGridChange = (columns: number) => {
  gridColumns.value = columns
}

const handleGroupChange = (groupId: number | null) => {
  selectedGroupId.value = groupId
  refreshClients()
}

const toggleFullscreen = (checked: boolean) => {
  if (checked) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

const handleClientSave = async (clientData: any) => {
  try {
    await updateClient(selectedClient.value!.id, clientData)
    message.success('客户端信息更新成功')
  } catch (error: any) {
    message.error('更新失败: ' + (error.message || '未知错误'))
  }
}

const handleClientDelete = async () => {
  try {
    await deleteClient(selectedClient.value!.id)
    clientDetailVisible.value = false
    selectedClient.value = null
    message.success('设备删除成功')
  } catch (error: any) {
    message.error('删除失败: ' + (error.message || '未知错误'))
  }
}

// 生命周期
onMounted(async () => {
  await Promise.all([
    refreshClients(),
    loadClientGroups()
  ])

  // 监听全屏状态变化
  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement
  }
  document.addEventListener('fullscreenchange', handleFullscreenChange)

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
</style>