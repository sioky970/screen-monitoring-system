<template>
  <a-modal
    :open="visible"
    @update:open="$emit('update:visible', $event)"
    :title="`客户端详情 - ${client?.computerName}`"
    width="1000px"
    :footer="null"
  >
    <div v-if="client" class="client-detail">
      <a-tabs default-active-key="basic" type="card">
        <!-- 基本信息标签页 -->
        <a-tab-pane key="basic" tab="基本信息">
          <ClientBasicInfo
            :client="client"
            :client-groups="clientGroups"
            :saving="saving"
            :deleting="deleting"
            @save="handleSave"
            @delete="handleDelete"
            @show-screenshot="handleShowScreenshot"
          />
        </a-tab-pane>

        <!-- 违规事件标签页 -->
        <a-tab-pane key="alerts" tab="违规事件">
          <ClientAlerts
            :client="client"
            @show-screenshot="handleShowScreenshot"
          />
        </a-tab-pane>
      </a-tabs>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ClientBasicInfo from './ClientBasicInfo.vue'
import ClientAlerts from './ClientAlerts.vue'

interface Client {
  id: string
  clientNumber: string
  computerName: string
  ip?: string
  status: string
  lastSeen?: string
  group?: { id: number; name: string }
  latestScreenshotUrl?: string
  [key: string]: any
}

interface Props {
  visible: boolean
  client: Client | null
  clientGroups: any[]
}

interface Emits {
  'update:visible': [visible: boolean]
  save: [clientData: any]
  delete: []
  'show-screenshot': [url: string, title: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const saving = ref(false)
const deleting = ref(false)

const handleSave = async (clientData: any) => {
  saving.value = true
  try {
    await emit('save', clientData)
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  deleting.value = true
  try {
    await emit('delete')
  } finally {
    deleting.value = false
  }
}

const handleShowScreenshot = (url: string, title: string = '客户端截图') => {
  emit('show-screenshot', url, title)
}
</script>

<style scoped>
.client-detail {
  /* 样式可以根据需要添加 */
}
</style>