<template>
  <div class="client-alerts">
    <div class="alerts-header">
      <h4>区块链地址违规事件</h4>
      <a-space>
        <a-button @click="refreshAlerts" :loading="alertsLoading" size="small">
          <template #icon>
            <ReloadOutlined />
          </template>
          刷新
        </a-button>
        <a-popconfirm
          title="确定要忽略该客户端的全部未处理违规吗？"
          ok-text="忽略全部"
          cancel-text="取消"
          @confirm="ignoreAllAlerts"
        >
          <a-button danger size="small" :loading="ignoringAll">
            一键忽略全部
          </a-button>
        </a-popconfirm>
      </a-space>
    </div>

    <a-table
      :dataSource="clientAlerts"
      :columns="alertColumns"
      :loading="alertsLoading"
      :pagination="alertsPagination"
      @change="handleTableChange"
      size="small"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="getAlertStatusColor(record.alertStatus)">
            {{ getAlertStatusText(record.alertStatus) }}
          </a-tag>
        </template>
        <template v-if="column.key === 'action'">
          <a-space size="small">
            <a-button
              type="link"
              size="small"
              @click="showAlertScreenshot(record)"
              :disabled="!hasScreenshotUrl(record)"
            >
              查看截图
            </a-button>
            <a-button
              v-if="record.alertStatus !== 'ignored'"
              type="link"
              danger
              size="small"
              @click="reviewAlert(record, 'ignored')"
            >
              忽略
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { securityApi } from '@/api/security'
import { securityBulkApi } from '@/api/security-bulk'
import { log } from '@/utils/logger'

interface Client {
  id: string
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

const clientAlerts = ref<any[]>([])
const alertsLoading = ref(false)
const ignoringAll = ref(false)

const alertsPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 违规事件表格列定义
const alertColumns = [
  {
    title: '时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    customRender: ({ text }: any) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
  },
  {
    title: '检测到的地址',
    dataIndex: 'detectedAddress',
    key: 'detectedAddress',
    ellipsis: true
  },
  {
    title: '状态',
    dataIndex: 'alertStatus',
    key: 'status',
    width: 100
  },
  {
    title: '操作',
    key: 'action',
    width: 160
  }
]

// 刷新违规事件
const refreshAlerts = async () => {
  if (!props.client) return
  
  alertsLoading.value = true
  try {
    const { current, pageSize } = alertsPagination
    const res = await securityApi.getClientAlerts({
      clientId: props.client.id,
      page: current,
      pageSize
    })
    clientAlerts.value = res.data.alerts || []
    alertsPagination.total = res.data.total || 0
  } catch (error) {
    message.error('刷新违规事件失败')
    log.error('ClientAlerts', 'Failed to refresh alerts', error)
  } finally {
    alertsLoading.value = false
  }
}

// 表格分页变化处理
const handleTableChange = (pagination: any) => {
  alertsPagination.current = pagination.current
  alertsPagination.pageSize = pagination.pageSize
  refreshAlerts()
}

// 审核违规事件
const reviewAlert = async (record: any, nextStatus: 'resolved' | 'ignored') => {
  try {
    await securityApi.updateAlertStatus(record.id, { status: nextStatus })
    message.success('操作成功')
    await refreshAlerts()
  } catch (error) {
    message.error('操作失败')
    log.error('ClientAlerts', 'Failed to review alert', error)
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
  const url = alert.cdnUrl || alert.fileUrl || alert.screenshotUrl
  if (url) {
    const title = `违规截图 - ${dayjs(alert.createdAt || alert.screenshotTime || alert.created_at).format('YYYY-MM-DD HH:mm:ss')}`
    emit('show-screenshot', url, title)
  } else {
    message.error('没有可用的截图地址')
  }
}

// 检查是否有截图URL
const hasScreenshotUrl = (record: any) => {
  return !!(record.fileUrl || record.cdnUrl || record.screenshotUrl || (record.minioBucket && record.minioObjectKey))
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

// 组件挂载时加载数据
onMounted(() => {
  refreshAlerts()
})
</script>

<style scoped>
.client-alerts {
  margin-top: 16px;
}

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.alerts-header h4 {
  margin: 0;
}
</style>