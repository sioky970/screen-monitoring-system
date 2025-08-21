<template>
  <div class="client-basic-info flat">
    <a-form :model="editForm" layout="vertical" class="flat-form">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="客户端编号" class="fi">
            <a-input v-model:value="editForm.clientNumber" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="计算机名" class="fi">
            <a-input v-model:value="editForm.computerName" size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="状态" class="fi">
            <a-tag :color="getStatusColor(editForm.status)">
              {{ getStatusText(editForm.status) }}
            </a-tag>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="分组" class="fi">
            <div class="group-info">
              <div class="current-group">
                <span class="label">当前分组：</span>
                <a-tag color="blue">{{ currentGroupName }}</a-tag>
              </div>
              <a-select
                v-model:value="editForm.groupId"
                placeholder="选择新分组"
                class="flat-select"
                size="small"
                allow-clear
              >
                <a-select-option v-for="group in clientGroups" :key="group.id" :value="group.id">
                  {{ group.name }}
                </a-select-option>
              </a-select>
            </div>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="最后在线" class="fi">
            <a-input :value="lastSeenDisplay" disabled size="small" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="flat-actions">
        <a-space>
          <a-button type="primary" @click="handleSave" :loading="saving" size="small">
            保存修改
          </a-button>
          <a-button @click="resetForm" size="small">
            重置
          </a-button>
          <a-popconfirm
            title="确定要删除该设备吗？删除后将无法恢复！"
            ok-text="确定删除"
            cancel-text="取消"
            @confirm="$emit('delete')"
          >
            <a-button danger :loading="deleting" size="small">
              删除设备
            </a-button>
          </a-popconfirm>
        </a-space>
      </div>
    </a-form>

    <!-- 最新截图 -->
    <div v-if="client.latestScreenshotUrl" class="detail-screenshot flat-shot">
      <div class="shot-head">
        <span>最新截图</span>
        <a-button type="link" size="small" @click="$emit('show-screenshot', screenshotUrlWithTimestamp, '客户端截图')">放大查看</a-button>
      </div>
      <img
        :src="screenshotUrlWithTimestamp"
        :alt="client.computerName"
        loading="lazy"
        decoding="async"
        class="screenshot-image"
        @click="$emit('show-screenshot', screenshotUrlWithTimestamp, '客户端截图')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import dayjs from 'dayjs'

interface Client {
  id: string
  clientNumber: string
  computerName: string
  ip?: string
  status: string
  lastSeen?: string
  lastHeartbeat?: string
  group?: { id: number; name: string }
  groupId?: number
  latestScreenshotUrl?: string
  [key: string]: any
}

interface Props {
  client: Client
  clientGroups: any[]
  saving: boolean
  deleting: boolean
  imageRefreshTimestamp?: number
}

interface Emits {
  save: [clientData: any]
  delete: []
  'show-screenshot': [url: string, title: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const editForm = ref({
  clientNumber: '',
  computerName: '',
  status: '',
  groupId: undefined as number | undefined,
  lastSeen: ''
})

// 计算最后在线时间显示
const lastSeenDisplay = computed(() => {
  // 优先使用 lastHeartbeat，如果没有则使用 lastSeen
  const lastTime = props.client?.lastHeartbeat || props.client?.lastSeen
  if (!lastTime) return '--'
  return dayjs(lastTime).format('YYYY-MM-DD HH:mm:ss')
})

// 计算当前分组名称显示
const currentGroupName = computed(() => {
  if (props.client?.group?.name) {
    return props.client.group.name
  }
  if (props.client?.groupId && props.clientGroups) {
    const group = props.clientGroups.find(g => g.id === props.client.groupId)
    return group?.name || '未分组'
  }
  return '未分组'
})

// 计算带时间戳的截图URL，用于强制刷新
const screenshotUrlWithTimestamp = computed(() => {
  if (!props.client?.latestScreenshotUrl) return ''
  const timestamp = props.imageRefreshTimestamp || Date.now()
  const separator = props.client.latestScreenshotUrl.includes('?') ? '&' : '?'
  return `${props.client.latestScreenshotUrl}${separator}t=${timestamp}`
})

// 重置表单
const resetForm = () => {
  if (props.client) {
    editForm.value = {
      clientNumber: props.client.clientNumber,
      computerName: props.client.computerName,
      status: props.client.status,
      groupId: props.client.groupId,
      lastSeen: props.client.lastSeen || ''
    }
  }
}

// 监听客户端变化，重置表单
watch(() => props.client, (newClient) => {
  if (newClient) {
    resetForm()
  }
}, { immediate: true })

// 保存修改
const handleSave = () => {
  emit('save', {
    computerName: editForm.value.computerName,
    groupId: editForm.value.groupId
  })
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
</script>

<style scoped lang="scss">
.client-basic-info {
  &.flat{
    .flat-form{ --ant-form-item-margin-bottom:12px; }
    .fi :deep(.ant-form-item-label > label){ color:#8c8c8c; font-weight:500; }
    .flat-actions{ margin-top: 8px; }
    .flat-select{ width: 100%; }
    .detail-screenshot.flat-shot{
      margin-top: 12px;
      .shot-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; color:#595959; }
      .screenshot-image{ border-radius: 6px; }
    }
  }
}
  /* 基本样式 */

.detail-screenshot {
  margin-top: 16px;
}

.detail-screenshot h4 {
  margin-bottom: 12px;
}

.screenshot-image {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  border: 1px solid #d9d9d9;
  cursor: pointer;
  border-radius: 4px;
}

.screenshot-image:hover {
  border-color: #1890ff;
}

.group-info {
  width: 100%;
}

.current-group {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.current-group .label {
  margin-right: 8px;
  color: #666;
  font-size: 14px;
}
</style>