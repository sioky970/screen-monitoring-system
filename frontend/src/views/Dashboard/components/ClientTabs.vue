<template>
  <a-tabs 
    :active-key="activeKey" 
    @update:active-key="$emit('update:active-key', $event)"
    type="card" 
    class="client-tabs"
  >
    <a-tab-pane key="all" :tab="`全部设备 (${clients.length})`">
      <div v-if="clients.length === 0 && !loading" class="empty-state">
        <a-empty description="暂无客户端">
          <a-button type="primary" @click="$emit('refresh')">
            刷新客户端列表
          </a-button>
        </a-empty>
      </div>
      <slot v-else name="content" :display-clients="clients" />
    </a-tab-pane>

    <a-tab-pane key="online" :tab="`在线设备 (${onlineClients.length})`">
      <div v-if="onlineClients.length === 0 && !loading" class="empty-state">
        <a-empty description="暂无在线客户端">
          <a-button type="primary" @click="$emit('refresh')">
            刷新客户端列表
          </a-button>
        </a-empty>
      </div>
      <slot v-else name="content" :display-clients="onlineClients" />
    </a-tab-pane>

    <a-tab-pane key="offline" :tab="`离线设备 (${offlineClients.length})`">
      <div v-if="offlineClients.length === 0 && !loading" class="empty-state">
        <a-empty description="暂无离线客户端" />
      </div>
      <slot v-else name="content" :display-clients="offlineClients" />
    </a-tab-pane>
  </a-tabs>
</template>

<script setup lang="ts">
interface Client {
  id: string
  clientNumber: string
  computerName: string
  status: 'online' | 'offline' | 'error' | 'installing'
  [key: string]: any
}

interface Props {
  activeKey: string
  clients: Client[]
  onlineClients: Client[]
  offlineClients: Client[]
  loading: boolean
}

interface Emits {
  'update:active-key': [key: string]
  refresh: []
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.client-tabs {
  margin-bottom: 16px;
}

.client-tabs :deep(.ant-tabs-content-holder) {
  padding: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}
</style>