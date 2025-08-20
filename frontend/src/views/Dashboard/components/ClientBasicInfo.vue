<template>
  <div class="client-basic-info">
    <a-form :model="editForm" layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="客户端编号">
            <a-input v-model:value="editForm.clientNumber" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="计算机名">
            <a-input v-model:value="editForm.computerName" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="状态">
            <a-tag :color="getStatusColor(editForm.status)">
              {{ getStatusText(editForm.status) }}
            </a-tag>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="分组">
            <a-select v-model:value="editForm.groupId" placeholder="选择分组">
              <a-select-option v-for="group in clientGroups" :key="group.id" :value="group.id">
                {{ group.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="最后在线">
            <a-input
              :value="lastSeenDisplay"
              disabled
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item>
        <a-space>
          <a-button type="primary" @click="handleSave" :loading="saving">
            保存修改
          </a-button>
          <a-button @click="resetForm">
            重置
          </a-button>
          <a-popconfirm
            title="确定要删除该设备吗？删除后将无法恢复！"
            ok-text="确定删除"
            cancel-text="取消"
            @confirm="$emit('delete')"
          >
            <a-button danger :loading="deleting">
              删除设备
            </a-button>
          </a-popconfirm>
        </a-space>
      </a-form-item>
    </a-form>

    <!-- 最新截图 -->
    <div v-if="client.latestScreenshotUrl" class="detail-screenshot">
      <h4>最新截图</h4>
      <img
        :src="client.latestScreenshotUrl"
        :alt="client.computerName"
        loading="lazy"
        decoding="async"
        class="screenshot-image"
        @click="$emit('show-screenshot', client.latestScreenshotUrl, '客户端截图')"
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
  latestScreenshotUrl?: string
  [key: string]: any
}

interface Props {
  client: Client
  clientGroups: any[]
  saving: boolean
  deleting: boolean
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

// 重置表单
const resetForm = () => {
  if (props.client) {
    editForm.value = {
      clientNumber: props.client.clientNumber,
      computerName: props.client.computerName,
      status: props.client.status,
      groupId: props.client.group?.id,
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

<style scoped>
.client-basic-info {
  /* 基本样式 */
}

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
</style>