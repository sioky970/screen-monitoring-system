<template>
  <a-modal
    :open="visible"
    :title="modalTitle"
    :width="modalWidth"
    :footer="null"
    :destroy-on-close="true"
    :mask-closable="true"
    :keyboard="true"
    class="client-detail-modal"
    @cancel="handleClose"
    @update:open="$emit('update:visible', $event)"
  >
    <div v-if="client" class="modal-content">
      <!-- 标签页 -->
      <a-tabs v-model:activeKey="activeTab" type="card">
        <!-- 基本信息标签页 -->
        <a-tab-pane key="info" tab="基本信息">
          <!-- 客户端基本信息 -->
          <a-descriptions
            :column="isMobile ? 1 : 2"
            size="small"
            bordered
            class="client-info"
          >
        <a-descriptions-item label="计算机名称">
          <span class="info-value">{{ client.computerName }}</span>
        </a-descriptions-item>

        <a-descriptions-item label="客户端编号">
          <span class="info-value">{{ client.clientNumber }}</span>
        </a-descriptions-item>

        <a-descriptions-item label="状态">
          <a-badge
            :status="statusBadge.status"
            :text="statusBadge.text"
            :color="statusBadge.color"
          />
        </a-descriptions-item>

        <a-descriptions-item label="最后在线时间">
          <span class="info-value">{{ lastSeenText }}</span>
        </a-descriptions-item>
      </a-descriptions>

      <!-- 统计信息 -->
      <div class="stats-section">
        <a-row :gutter="16">
          <a-col :span="24">
            <a-statistic
              title="总违规次数"
              :value="client.alertCount || 0"
              :value-style="{ color: client.alertCount > 0 ? '#ff4d4f' : '#3f8600' }"
            />
          </a-col>
        </a-row>
      </div>

      <!-- 操作按钮 -->
      <div class="actions-section">
        <a-space>
          <a-button
            type="primary"
            @click="handleViewScreenshot"
            :disabled="!hasScreenshot"
          >
            <template #icon>
              <PictureOutlined />
            </template>
            查看截图
          </a-button>
          
          <a-button
            type="default"
            @click="handleRefreshData"
            :loading="isRefreshing"
          >
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新数据
          </a-button>
          
          <a-popconfirm
            title="确定要强制下线该客户端吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleForceOffline"
          >
            <a-button type="dashed" danger>
              <template #icon>
                <PoweroffOutlined />
              </template>
              强制下线
            </a-button>
          </a-popconfirm>
          
          <a-popconfirm
            title="确定要删除该客户端吗？删除后将无法恢复！"
            ok-text="确定删除"
            cancel-text="取消"
            @confirm="handleDeleteClient"
          >
            <a-button type="primary" danger :loading="isDeleting">
              <template #icon>
                <DeleteOutlined />
              </template>
              删除客户端
            </a-button>
          </a-popconfirm>
        </a-space>
      </div>

          <!-- 最近截图预览 -->
          <div v-if="hasScreenshot" class="screenshot-preview">
            <h4>最新截图</h4>
            <div class="screenshot-container">
              <img
                :src="client.latestScreenshotUrl"
                :alt="`${client.computerName} 最新截图`"
                class="screenshot-image"
                @click="handleViewScreenshot"
              />
            </div>
          </div>
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
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'screenshotTime'">
                  {{ formatTime(record.screenshotTime) }}
                </template>
                <template v-else-if="column.key === 'detectedAddress'">
                  <span v-if="record.detectedAddress" class="address-text">
                    {{ record.detectedAddress }}
                  </span>
                  <span v-else class="no-address">-</span>
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
                      v-if="record.alertStatus !== 'ignored'"
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
  ReloadOutlined,
  PoweroffOutlined,
  DownOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import type { Client } from '@/types/client'
import type { SecurityAlert, AlertStatus, RiskLevel } from '@/types/security'
import { clientsApi } from '@/api/clients'
import { securityApi } from '@/api/security'
import ViolationScreenshotModal from '@/components/ViolationScreenshotModal.vue'

interface Props {
  visible: boolean
  client: Client | null
}

interface Emits {
  'update:visible': [visible: boolean]
  'view-screenshot': [client: Client]
  'refresh-data': [clientId: string]
  'force-offline': [clientId: string]
  'client-deleted': [clientId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式状态
const isRefreshing = ref(false)
const isDeleting = ref(false)
const screenWidth = ref(window.innerWidth)
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

// 表格列定义
const violationColumns = [
  {
    title: '违规时间',
    dataIndex: 'screenshotTime',
    key: 'screenshotTime',
    width: 180,
    sorter: (a: SecurityAlert, b: SecurityAlert) =>
      new Date(a.screenshotTime).getTime() - new Date(b.screenshotTime).getTime()
  },
  {
    title: '区块链地址',
    dataIndex: 'detectedAddress',
    key: 'detectedAddress',
    ellipsis: true
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right'
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

const handleViewScreenshot = () => {
  if (props.client) {
    emit('view-screenshot', props.client)
  }
}

const handleRefreshData = async () => {
  if (props.client) {
    isRefreshing.value = true
    try {
      emit('refresh-data', props.client.id)
    } finally {
      setTimeout(() => {
        isRefreshing.value = false
      }, 1000)
    }
  }
}

const handleForceOffline = () => {
  if (props.client) {
    emit('force-offline', props.client.id)
  }
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

// 监听窗口大小变化
const handleResize = () => {
  screenWidth.value = window.innerWidth
}

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 计算属性
const modalTitle = computed(() => {
  return props.client ? `${props.client.computerName} - 详细信息` : '客户端详情'
})

const modalWidth = computed(() => {
  return screenWidth.value < 768 ? '90%' : '600px'
})

const isMobile = computed(() => screenWidth.value < 768)

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

const hasScreenshot = computed(() => {
  return !!props.client?.latestScreenshotUrl
})

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

      // 响应拦截器返回了完整的后端响应，需要访问data字段
      violations.value = response.data?.alerts || []
      violationsPagination.value.total = response.data?.total || 0
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

// 监听客户端变化，加载违规事件
watch(() => props.client, (newClient) => {
  if (newClient && activeTab.value === 'violations') {
    loadViolations()
  }
})

// 监听标签页切换，当切换到违规事件标签时加载数据
watch(() => activeTab.value, (newTab) => {
  if (newTab === 'violations' && props.client) {
    loadViolations()
  }
})

// 监听弹窗可见性，当弹窗打开时预加载违规事件数据
watch(() => props.visible, (visible) => {
  if (visible && props.client) {
    // 预加载违规事件数据，这样用户切换到违规事件标签时就能立即看到数据
    loadViolations()
  }
})




</script>

<style scoped lang="scss">
.client-detail-modal {
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

/* 违规事件样式 */
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
}

.violations-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.violations-actions {
  display: flex;
  gap: 8px;
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