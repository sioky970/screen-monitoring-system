<template>
  <div class="client-alerts">
    <!-- 统计卡片 -->
    <div class="alerts-stats">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic
              title="总违规数"
              :value="alertsStats.total"
              :value-style="{ color: '#1890ff' }"
            />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic
              title="待处理"
              :value="alertsStats.pending"
              :value-style="{ color: '#faad14' }"
            />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic
              title="已处理"
              :value="alertsStats.resolved"
              :value-style="{ color: '#52c41a' }"
            />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic
              title="已忽略"
              :value="alertsStats.ignored"
              :value-style="{ color: '#8c8c8c' }"
            />
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 操作栏 -->
    <div class="alerts-toolbar">
      <div class="toolbar-left">
        <h4>违规事件列表</h4>
        <a-tag color="blue">{{ props.client?.computerName }}</a-tag>
      </div>
      <div class="toolbar-right">
        <a-space>
          <!-- 状态筛选 -->
          <a-select
            v-model:value="statusFilter"
            placeholder="筛选状态"
            style="width: 120px"
            allowClear
            @change="handleFilterChange"
          >
            <a-select-option value="pending">待处理</a-select-option>
            <a-select-option value="resolved">已处理</a-select-option>
            <a-select-option value="ignored">已忽略</a-select-option>
            <a-select-option value="confirmed">已确认</a-select-option>
          </a-select>
          
          <!-- 时间范围筛选 -->
          <a-range-picker
            v-model:value="dateRange"
            :placeholder="['开始时间', '结束时间']"
            format="YYYY-MM-DD"
            @change="handleFilterChange"
            style="width: 240px"
          />
          
          <!-- 刷新按钮 -->
          <a-button @click="refreshAlerts" :loading="alertsLoading">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
          
          <!-- 批量操作 -->
          <a-dropdown :disabled="selectedRowKeys.length === 0">
            <a-button>
              批量操作
              <DownOutlined />
            </a-button>
            <template #overlay>
              <a-menu @click="handleBatchAction">
                <a-menu-item key="ignore">
                  <ExclamationCircleOutlined />
                  批量忽略
                </a-menu-item>
                <a-menu-item key="resolve">
                  <CheckCircleOutlined />
                  批量处理
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          
          <!-- 一键忽略全部 -->
          <a-popconfirm
            title="确定要忽略该客户端的全部未处理违规吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="ignoreAllAlerts"
          >
            <a-button danger :loading="ignoringAll">
              <template #icon>
                <DeleteOutlined />
              </template>
              忽略全部
            </a-button>
          </a-popconfirm>
        </a-space>
      </div>
    </div>

    <!-- 违规事件表格 -->
    <a-table
      :dataSource="clientAlerts"
      :columns="alertColumns"
      :loading="alertsLoading"
      :pagination="alertsPagination"
      :row-selection="rowSelection"
      @change="handleTableChange"
      size="middle"
      row-key="alertId"
      class="alerts-table"
    >
      <template #bodyCell="{ column, record }">
        <!-- 违规详情 -->
        <template v-if="column.key === 'violation'">
          <div class="violation-info">
            <div class="violation-address">
              <a-typography-text copyable :ellipsis="{ tooltip: record.detectedAddress }">
                {{ record.detectedAddress }}
              </a-typography-text>
            </div>
            <div class="violation-meta">
              <a-tag size="small" :color="getAddressTypeColor(record.addressType)">
                {{ getAddressTypeText(record.addressType) }}
              </a-tag>
              <a-tag size="small" :color="getRiskLevelColor(record.riskLevel)">
                {{ getRiskLevelText(record.riskLevel) }}
              </a-tag>
            </div>
          </div>
        </template>
        
        <!-- 时间信息 -->
        <template v-if="column.key === 'time'">
          <div class="time-info">
            <div class="time-main">
              {{ dayjs(record.createdAt).format('MM-DD HH:mm') }}
            </div>
            <div class="time-sub">
              {{ dayjs(record.createdAt).fromNow() }}
            </div>
          </div>
        </template>
        
        <!-- 状态 -->
        <template v-if="column.key === 'status'">
          <a-tag :color="getAlertStatusColor(record.alertStatus)" class="status-tag">
            <template #icon>
              <component :is="getStatusIcon(record.alertStatus)" />
            </template>
            {{ getAlertStatusText(record.alertStatus) }}
          </a-tag>
        </template>
        
        <!-- 操作 -->
        <template v-if="column.key === 'action'">
          <a-space size="small">
            <a-tooltip title="查看截图">
              <a-button
                type="text"
                size="small"
                @click="showAlertScreenshot(record)"
                :disabled="!hasScreenshotUrl(record)"
              >
                <template #icon>
                  <EyeOutlined />
                </template>
              </a-button>
            </a-tooltip>
            
            <a-tooltip title="查看详情">
              <a-button
                type="text"
                size="small"
                @click="showAlertDetail(record)"
              >
                <template #icon>
                  <InfoCircleOutlined />
                </template>
              </a-button>
            </a-tooltip>
            
            <a-dropdown v-if="record.alertStatus !== 'ignored'">
              <a-button type="text" size="small">
                <template #icon>
                  <MoreOutlined />
                </template>
              </a-button>
              <template #overlay>
                <a-menu @click="({ key }) => handleQuickAction(record, key)">
                  <a-menu-item key="resolve">
                    <CheckCircleOutlined />
                    标记已处理
                  </a-menu-item>
                  <a-menu-item key="ignore">
                    <ExclamationCircleOutlined />
                    忽略此违规
                  </a-menu-item>
                  <a-menu-item key="confirm">
                    <WarningOutlined />
                    确认违规
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </template>
      </template>
    </a-table>
    
    <!-- 违规详情抽屉 -->
    <a-drawer
      v-model:open="detailDrawerVisible"
      title="违规事件详情"
      width="500"
      placement="right"
    >
      <AlertDetail
        v-if="selectedAlert"
        :alert="selectedAlert"
        @update-status="handleUpdateStatus"
        @show-screenshot="showAlertScreenshot"
      />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  ReloadOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  StopOutlined
} from '@ant-design/icons-vue'
import { securityApi } from '@/api/security'
import { securityBulkApi } from '@/api/security-bulk'
import { log } from '@/utils/logger'
import AlertDetail from './AlertDetail.vue'

// 启用dayjs相对时间插件
dayjs.extend(relativeTime)

interface Client {
  id: string
  computerName: string
  [key: string]: any
}

interface Props {
  client: Client
}

interface Emits {
  'show-screenshot': [url: string, title: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const clientAlerts = ref<any[]>([])
const alertsLoading = ref(false)
const ignoringAll = ref(false)
const statusFilter = ref<string | undefined>()
const dateRange = ref<[string, string] | undefined>()
const selectedRowKeys = ref<string[]>([])
const detailDrawerVisible = ref(false)
const selectedAlert = ref<any>(null)

// 分页配置
const alertsPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: [number, number]) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
})

// 表格列配置
const alertColumns = [
  {
    title: '违规信息',
    key: 'violation',
    width: 300
  },
  {
    title: '检测时间',
    key: 'time',
    width: 140
  },
  {
    title: '状态',
    key: 'status',
    width: 100
  },
  {
    title: '操作',
    key: 'action',
    width: 120,
    fixed: 'right'
  }
]

// 行选择配置
const rowSelection = {
  selectedRowKeys: selectedRowKeys,
  onChange: (keys: string[]) => {
    selectedRowKeys.value = keys
  },
  getCheckboxProps: (record: any) => ({
    disabled: record.alertStatus === 'ignored'
  })
}

// 统计数据
const alertsStats = computed(() => {
  const stats = {
    total: clientAlerts.value.length,
    pending: 0,
    resolved: 0,
    ignored: 0,
    confirmed: 0
  }
  
  clientAlerts.value.forEach(alert => {
    const status = alert.alertStatus
    if (status in stats) {
      stats[status as keyof typeof stats]++
    }
  })
  
  return stats
})

// 刷新违规事件
const refreshAlerts = async () => {
  if (!props.client) return
  
  alertsLoading.value = true
  try {
    const { current, pageSize } = alertsPagination
    const params: any = {
      clientId: props.client.id,
      page: current,
      pageSize
    }
    
    // 添加筛选条件
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    const res = await securityApi.getClientAlerts(params)
    clientAlerts.value = res.data.alerts || []
    alertsPagination.total = res.data.total || 0
  } catch (error) {
    message.error('刷新违规事件失败')
    log.error('ClientAlerts', 'Failed to refresh alerts', error)
  } finally {
    alertsLoading.value = false
  }
}

// 筛选条件变化处理
const handleFilterChange = () => {
  alertsPagination.current = 1
  refreshAlerts()
}

// 表格分页变化处理
const handleTableChange = (pagination: any) => {
  alertsPagination.current = pagination.current
  alertsPagination.pageSize = pagination.pageSize
  refreshAlerts()
}

// 批量操作处理
const handleBatchAction = async ({ key }: { key: string }) => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要操作的违规事件')
    return
  }
  
  const action = key === 'ignore' ? 'ignored' : 'resolved'
  const actionText = key === 'ignore' ? '忽略' : '处理'
  
  try {
    alertsLoading.value = true
    
    // 批量更新状态
    const promises = selectedRowKeys.value.map(alertId => 
      securityApi.updateAlertStatus(alertId, { status: action })
    )
    
    await Promise.all(promises)
    
    message.success(`批量${actionText}成功`)
    selectedRowKeys.value = []
    await refreshAlerts()
  } catch (error) {
    message.error(`批量${actionText}失败`)
    log.error('ClientAlerts', `Failed to batch ${action}`, error)
  } finally {
    alertsLoading.value = false
  }
}

// 快速操作处理
const handleQuickAction = async (record: any, action: string) => {
  const statusMap = {
    resolve: 'resolved',
    ignore: 'ignored',
    confirm: 'confirmed'
  }
  
  const status = statusMap[action as keyof typeof statusMap]
  if (!status) return
  
  try {
    await securityApi.updateAlertStatus(record.alertId, { status })
    message.success('操作成功')
    await refreshAlerts()
  } catch (error) {
    message.error('操作失败')
    log.error('ClientAlerts', 'Failed to update alert status', error)
  }
}

// 一键忽略全部未处理违规
const ignoreAllAlerts = async () => {
  if (!props.client) return
  
  try {
    ignoringAll.value = true
    const res = await securityBulkApi.ignoreAllByClient(props.client.id)
    
    const result = res?.data || res
    const affected = result?.affected ?? 0
    const success = result?.success ?? false
    const responseMessage = result?.message || `已忽略全部未处理违规（${affected} 条）`
    
    if (success) {
      message.success(responseMessage)
      await refreshAlerts()
    } else {
      message.warning(responseMessage || '操作未成功完成')
    }
  } catch (error: any) {
    const errorMsg = error?.response?.data?.message || error?.message || '忽略失败，请稍后重试'
    message.error(errorMsg)
    log.error('ClientAlerts', 'Failed to ignore all alerts', error)
  } finally {
    ignoringAll.value = false
  }
}

// 显示违规事件截图
const showAlertScreenshot = (alert: any) => {
  let url = alert.cdnUrl || alert.fileUrl || alert.screenshotUrl
  
  // 如果没有直接的URL，尝试从MinIO信息构建URL
  if (!url && alert.minioBucket && alert.minioObjectKey) {
    url = `/storage/${alert.minioBucket}/${alert.minioObjectKey}`
  }
  
  if (url) {
    const title = `违规截图 - ${dayjs(alert.createdAt || alert.screenshotTime || alert.created_at).format('YYYY-MM-DD HH:mm:ss')}`
    emit('show-screenshot', url, title)
  } else {
    message.error('没有可用的截图地址')
  }
}

// 显示违规详情
const showAlertDetail = (alert: any) => {
  selectedAlert.value = alert
  detailDrawerVisible.value = true
}

// 更新违规状态
const handleUpdateStatus = async (alertId: string, status: string) => {
  try {
    await securityApi.updateAlertStatus(alertId, { status })
    message.success('状态更新成功')
    detailDrawerVisible.value = false
    await refreshAlerts()
  } catch (error) {
    message.error('状态更新失败')
    log.error('ClientAlerts', 'Failed to update status', error)
  }
}

// 检查是否有截图URL
const hasScreenshotUrl = (record: any) => {
  return !!(record.fileUrl || record.cdnUrl || record.screenshotUrl || (record.minioBucket && record.minioObjectKey))
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
    'bitcoin': 'BTC',
    'ethereum': 'ETH',
    'other': '其他'
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

// 组件挂载时加载数据
onMounted(() => {
  refreshAlerts()
})
</script>

<style scoped>
.client-alerts {
  padding: 16px 0;
}

.alerts-stats {
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.alerts-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-left h4 {
  margin: 0;
  color: #262626;
}

.alerts-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.violation-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.violation-address {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.violation-meta {
  display: flex;
  gap: 4px;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-main {
  font-weight: 500;
  color: #262626;
}

.time-sub {
  font-size: 12px;
  color: #8c8c8c;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 12px 16px;
}

:deep(.ant-table-thead > tr > th) {
  background: #f5f5f5;
  font-weight: 600;
}

:deep(.ant-statistic-content) {
  font-size: 24px;
  font-weight: 600;
}

:deep(.ant-statistic-title) {
  color: #8c8c8c;
  font-size: 14px;
}
</style>