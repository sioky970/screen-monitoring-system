<template>
  <a-modal
    :open="visible"
    :width="modalWidth"
    :footer="null"
    :destroy-on-close="true"
    :mask-closable="true"
    :keyboard="true"
    class="client-detail-modal"
    @cancel="handleClose"
    @update:open="$emit('update:visible', $event)"
  >
    <template #title>
      <div class="cdm-header" v-if="client">
        <div class="cdm-header-main">
          <span class="cdm-title">{{ client.computerName }}</span>
          <a-tag :color="statusBadge.color" class="cdm-status">{{ statusBadge.text }}</a-tag>
        </div>
        <div class="cdm-header-meta">
          <a-tag class="cdm-group" color="blue">{{ client.group?.name || '未分组' }}</a-tag>
          <span class="cdm-meta-item">编号：{{ client.clientNumber }}</span>
          <span class="cdm-dot" />
          <span class="cdm-meta-item">最后在线：{{ lastSeenText }}</span>
        </div>
      </div>
    </template>
    <div v-if="client" class="modal-content">
      <!-- 标签页 -->
      <a-tabs v-model:activeKey="activeTab" type="line" :tabBarGutter="16">
        <!-- 基本信息标签页 -->
        <a-tab-pane key="info" tab="基本信息">
          <ClientBasicInfo
            :client="client"
            :client-groups="clientGroups"
            :saving="isSaving"
            :deleting="isDeleting"
            :image-refresh-timestamp="imageRefreshTimestamp"
            @save="handleSaveClient"
            @delete="handleDeleteClient"
            @show-screenshot="handleShowScreenshot"
          />
        </a-tab-pane>

        <!-- 违规事件标签页 -->
        <a-tab-pane key="violations" :tab="`违规事件 (${violations.length})`">
          <div class="violations-content">
            <div class="violations-header">
              <h4>违规事件记录</h4>
              <div class="violations-actions">
                <a-button
                  type="primary"
                  danger
                  :disabled="violations.length === 0 || violationsLoading"
                  :loading="batchIgnoring"
                  @click="handleIgnoreAllViolations"
                >
                  一键忽略所有
                </a-button>
                <a-button
                  type="primary"
                  :icon="h(ReloadOutlined)"
                  :loading="violationsLoading"
                  @click="loadViolations"
                >
                  刷新
                </a-button>
              </div>
            </div>

            <a-table
              :columns="violationColumns"
              :data-source="violations"
              :loading="violationsLoading"
              :pagination="violationTablePagination"
              row-key="id"
              size="small"
              :bordered="false"
              class="cdm-table"
              :tableLayout="'fixed'"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'createdAt'">
                  {{ formatTime(record.createdAt) }}
                </template>
                <template v-else-if="column.key === 'detectedAddress'">
                  <span v-if="record.detectedAddress" class="address-text">
                    {{ record.detectedAddress }}
                  </span>
                  <span v-else class="no-address">-</span>
                </template>
                <template v-else-if="column.key === 'addressType'">
                  <a-tag color="blue">{{ record.addressType || '-' }}</a-tag>
                </template>

                <template v-else-if="column.key === 'status'">
                  <a-tag :color="getStatusColor(record.status)">
                    {{ getStatusText(record.status) }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <a-space>
                    <a-button
                      type="primary"
                      size="small"
                      :icon="h(PictureOutlined)"
                      @click="handleViewViolationScreenshot(record)"
                    >
                      查看截图
                    </a-button>
                    <a-button
                      v-if="record.status !== 'ignored'"
                      type="default"
                      size="small"
                      :loading="record.ignoring"
                      @click="handleIgnoreViolation(record)"
                    >
                      忽略
                    </a-button>
                    <a-tag v-else color="gray">已忽略</a-tag>
                  </a-space>
                </template>
              </template>

              <template #emptyText>
                <a-empty description="暂无违规记录" />
              </template>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- 违规截图查看模态框 -->
    <ViolationScreenshotModal
      v-model:visible="screenshotModalVisible"
      :violation="selectedViolation"
      @status-updated="loadViolations"
    />
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, h } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  PictureOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import type { Client } from '@/types/client'
import type { SecurityAlert, AlertStatus, RiskLevel } from '@/types/security'
import { clientsApi } from '@/api/clients'
import { securityApi } from '@/api/security'
import ViolationScreenshotModal from '@/components/ViolationScreenshotModal.vue'
import ClientBasicInfo from './ClientBasicInfo.vue'

interface Props {
  visible: boolean
  client: Client | null
}

interface Emits {
  'update:visible': [visible: boolean]
  'client-deleted': [clientId: string]
  'client-updated': [clientId: string]
  'show-screenshot': [url: string, title: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式状态
const isDeleting = ref(false)
const isSaving = ref(false)
const screenWidth = ref(window.innerWidth)
const clientGroups = ref([])
const activeTab = ref('info')
const violations = ref<SecurityAlert[]>([])
const violationsLoading = ref(false)
const batchIgnoring = ref(false)
const screenshotModalVisible = ref(false)
const selectedViolation = ref<SecurityAlert | null>(null)
const violationsPagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  onChange: (page: number, pageSize: number) => {
    violationsPagination.value.current = page
    violationsPagination.value.pageSize = pageSize
    loadViolations()
  }
})

// 图片刷新时间戳，用于强制刷新截图
const imageRefreshTimestamp = ref(Date.now())

// 表格列定义
const violationColumns = [
  {
    title: '违规时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    sorter: (a: SecurityAlert, b: SecurityAlert) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  },
  {
    title: '区块链地址',
    dataIndex: 'detectedAddress',
    key: 'detectedAddress',
    ellipsis: true
  },
  {
    title: '地址类型',
    dataIndex: 'addressType',
    key: 'addressType'
  },

  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 88,
    align: 'center'
  },
  {
    title: '操作',
    key: 'actions',
    width: 180
  }
]

// 表格分页配置
const violationTablePagination = computed(() => ({
  current: violationsPagination.value.current,
  pageSize: violationsPagination.value.pageSize,
  total: violationsPagination.value.total,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
  onChange: violationsPagination.value.onChange
}))

// 事件处理函数
const handleClose = () => {
  emit('update:visible', false)
}



const handleDeleteClient = async () => {
  if (!props.client) return

  isDeleting.value = true
  try {
    await clientsApi.deleteClient(props.client.id)
    message.success('客户端删除成功')
    emit('client-deleted', props.client.id)
    emit('update:visible', false)
  } catch (error) {
    console.error('删除客户端失败:', error)
    message.error('删除客户端失败，请重试')
  } finally {
    isDeleting.value = false
  }
}

// 保存客户端信息
const handleSaveClient = async (clientData: any) => {
  if (!props.client) return

  isSaving.value = true
  try {
    await clientsApi.updateClient(props.client.id, clientData)
    message.success('客户端信息更新成功')
    emit('client-updated', props.client.id)
  } catch (error) {
    console.error('更新客户端失败:', error)
    message.error('更新客户端失败，请重试')
  } finally {
    isSaving.value = false
  }
}

// 显示截图
const handleShowScreenshot = (url: string, title: string) => {
  emit('show-screenshot', url, title)
}

// 监听窗口大小变化
const handleResize = () => {
  screenWidth.value = window.innerWidth
}

// 加载客户端分组
const loadClientGroups = async () => {
  try {
    // 优先使用客户端详情API返回的分组数据
    if (props.client) {
      const response = await clientsApi.getClientDetail(props.client.id)
      // 后端API已修复，直接访问 response.data.availableGroups
      if (response?.data?.availableGroups) {
        clientGroups.value = response.data.availableGroups
        return
      }
    }

    // 如果没有客户端详情或分组数据，则单独获取分组列表
    const response = await clientsApi.getGroups()
    clientGroups.value = Array.isArray(response?.data) ? response.data : []
  } catch (error) {
    console.error('加载客户端分组失败:', error)
  }
}

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadClientGroups()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 计算属性
const modalWidth = computed(() => {
  if (screenWidth.value < 768) return '95%'
  if (screenWidth.value < 1200) return '840px'
  return '960px'
})

const statusBadge = computed(() => {
  const statusMap = {
    online: { status: 'success', text: '在线', color: '#52c41a' },
    offline: { status: 'error', text: '离线', color: '#ff4d4f' },
    error: { status: 'error', text: '错误', color: '#ff4d4f' },
    installing: { status: 'processing', text: '安装中', color: '#1890ff' }
  }
  
  return props.client ? statusMap[props.client.status] || { status: 'default', text: '未知', color: '#d9d9d9' } : { status: 'default', text: '未知', color: '#d9d9d9' }
})

const lastSeenText = computed(() => {
  // 优先使用 lastHeartbeat，如果没有则使用 lastSeen
  const lastTime = props.client?.lastHeartbeat || props.client?.lastSeen
  if (!lastTime) return '从未在线'
  return dayjs(lastTime).format('YYYY-MM-DD HH:mm:ss')
})



// 刷新截图
const refreshScreenshot = () => {
  imageRefreshTimestamp.value = Date.now()
}

// 违规事件相关方法
const loadViolations = async () => {
  if (!props.client) return

  violationsLoading.value = true
  try {
    const response = await securityApi.getClientAlerts({
        clientId: props.client.id,
        page: violationsPagination.value.current,
        pageSize: violationsPagination.value.pageSize
      })

      // 后端响应结构: { code: 200, data: { success: true, data: { alerts: [...], total: 8 } } }
      const alertsData = response.data?.data || response.data
      violations.value = alertsData?.alerts || []
      violationsPagination.value.total = alertsData?.total || 0
  } catch (error) {
    console.error('加载违规事件失败:', error)
    message.error('加载违规事件失败')
  } finally {
    violationsLoading.value = false
  }
}

const handleViewViolationScreenshot = (violation: SecurityAlert) => {
  selectedViolation.value = violation
  screenshotModalVisible.value = true
}

const handleUpdateViolationStatus = async (violation: SecurityAlert, status: AlertStatus) => {
  try {
    await securityApi.updateAlertStatus(violation.alertId, { status })
    message.success('状态更新成功')
    loadViolations() // 重新加载数据
  } catch (error) {
    message.error('状态更新失败')
  }
}

// 忽略单个违规事件
const handleIgnoreViolation = async (violation: SecurityAlert) => {
  try {
    // 设置单个违规事件的加载状态
    violation.ignoring = true
    await securityApi.updateAlertStatus(violation.alertId, { status: 'ignored' })
    message.success('违规事件已忽略')
    loadViolations() // 重新加载数据
  } catch (error) {
    console.error('忽略违规事件失败:', error)
    message.error('忽略失败')
  } finally {
    violation.ignoring = false
  }
}

// 一键忽略所有违规事件
const handleIgnoreAllViolations = async () => {
  if (!props.client) return

  try {
    batchIgnoring.value = true
    await securityApi.ignoreAllAlerts(props.client.id)
    message.success('所有违规事件已忽略')
    loadViolations() // 重新加载数据
  } catch (error) {
    console.error('批量忽略失败:', error)
    message.error('批量忽略失败')
  } finally {
    batchIgnoring.value = false
  }
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

// 统一的数据加载逻辑
const shouldLoadViolations = () => {
  return props.visible && props.client && activeTab.value === 'violations'
}

// 监听客户端变化
watch(() => props.client, (newClient, oldClient) => {
  if (newClient && newClient.id !== oldClient?.id) {
    // 如果弹窗可见，立即刷新新客户端的截图
    if (props.visible) {
      refreshScreenshot()
    }
    // 加载违规数据
    if (shouldLoadViolations()) {
      loadViolations()
    }
  }
})

// 监听标签页切换
watch(() => activeTab.value, (newTab) => {
  if (newTab === 'violations' && props.client) {
    loadViolations()
  }
})

// 监听弹窗可见性
watch(() => props.visible, (visible) => {
  if (visible && props.client) {
    loadClientGroups()
    refreshScreenshot() // 刷新截图显示最新内容
    // 只有在违规事件标签页时才加载违规数据
    if (activeTab.value === 'violations') {
      loadViolations()
    }
  }
})




</script>

<style scoped lang="scss">
.client-detail-modal {
  :global(.ant-modal-content){
    border-radius: 10px;
  }
  :global(.ant-modal-header){
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
  }
  :global(.ant-modal-body){
    padding-top: 12px;
  }

  .cdm-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cdm-header-main {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cdm-title { font-size: 16px; font-weight: 600; }
  .cdm-status { transform: translateY(-1px); }
  .cdm-header-meta {
    display: flex; align-items: center; gap: 8px;
    color: #8c8c8c; font-size: 12px;
  }
  .cdm-dot { width:4px; height:4px; border-radius:50%; background:#d9d9d9; display:inline-block; }

  .violations-content {
    padding: 16px 0;
  }
  .violations-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;

    h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }
  .violations-actions {
    display: flex;
    gap: 8px;
  }
  .cdm-table{ width: 100%; }
  .cdm-table :global(.ant-table){ font-size: 12px; table-layout: fixed; }
  .cdm-table :global(.ant-table-container){ overflow-x: visible; }

  .modal-content {
    .client-info {
      margin-bottom: 16px;

      .info-value {
        font-weight: 600;
        color: #262626;
      }
    }

    .stats-section {
      margin: 24px 0;
      padding: 16px;
      background: #f9f9f9;
      border-radius: 8px;
    }

    .actions-section {
      margin: 24px 0;
      text-align: center;
    }

    .screenshot-preview {
      margin-top: 24px;

      h4 {
        margin-bottom: 12px;
        font-size: 16px;
        font-weight: 600;
        color: #262626;
      }

      .screenshot-container {
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.3s ease;

        &:hover {
          transform: scale(1.02);
        }

        .screenshot-image {
          width: 100%;
          height: auto;
          display: block;
        }
      }
    }
  }

  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
  }
}



.address-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  word-break: break-all;
}

.no-address {
  color: #999;
  font-style: italic;
}

.violation-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.violation-description {
  margin-top: 8px;
}

.violation-description p {
  margin: 4px 0;
  font-size: 13px;
  color: #666;
}

.violation-description strong {
  color: #333;
}

.ant-list-item-action {
  margin-left: 16px;
}

.ant-list-item-action > li {
  padding: 0 4px;
}

@media (max-width: 768px) {
  .client-detail-modal {
    margin: 0;
    max-width: 100vw;
  }
  
  .modal-content {
    padding: 12px;
  }
  
  .client-info {
    font-size: 12px;
  }
  
  .actions-section {
    text-align: left;
  }
  
  .actions-section .ant-space {
    flex-direction: column;
    width: 100%;
  }
  
  .actions-section .ant-btn {
    width: 100%;
  }
  
  .screenshot-image {
    max-height: 200px;
  }
  
  .violation-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .violation-description {
    font-size: 12px;
  }
  
  .ant-list-item-action {
    margin-left: 0;
    margin-top: 8px;
  }
}
</style>