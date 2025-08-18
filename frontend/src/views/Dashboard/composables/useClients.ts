import { ref, computed } from 'vue'
import { clientsApi } from '@/api/clients'
import { log } from '@/utils/logger'

interface Client {
  id: string
  clientNumber: string
  computerName: string
  ip?: string
  mac?: string
  os?: string
  version?: string
  status: 'online' | 'offline' | 'error' | 'installing'
  lastSeen?: string
  group?: {
    id: number
    name: string
  }
  latestScreenshotUrl?: string
  alertCount?: number
  loading?: boolean
}

export function useClients() {
  const clients = ref<Client[]>([])
  const clientGroups = ref<any[]>([])
  const loading = ref(false)
  const selectedGroupId = ref<number | null>(null)
  
  // 离线判定阈值（毫秒）
  const OFFLINE_THRESHOLD_MS = Number((window as any).__OFFLINE_THRESHOLD_MS__ || 20000)
  
  // 轮询控制：避免并发请求
  let isRefreshing = false
  
  // 计算属性
  const onlineClients = computed(() => {
    return clients.value.filter(c => c.status === 'online')
  })
  
  const offlineClients = computed(() => {
    return clients.value.filter(c => c.status === 'offline')
  })
  
  // 周期性检查：长时间无心跳/无事件的客户端标记为离线
  const markStaleOffline = () => {
    const now = Date.now()
    for (const c of clients.value) {
      const last = c.lastSeen ? new Date(c.lastSeen as any).getTime() : (c as any).lastStatusUpdate || 0
      if (last && (now - last > OFFLINE_THRESHOLD_MS) && c.status !== 'offline') {
        c.status = 'offline'
      }
    }
  }
  
  // 加载客户端列表
  const refreshClients = async () => {
    if (isRefreshing) {
      log.warn('useClients', 'Skip refresh: previous refresh still running')
      return
    }
    
    isRefreshing = true
    log.info('useClients', 'Starting to refresh clients list')
    loading.value = true
    
    try {
      log.debug('useClients', 'Calling clientsApi.getClients', { 
        params: { groupId: selectedGroupId?.value || undefined } 
      })
      
      const response = await clientsApi.getClients({ 
        groupId: selectedGroupId?.value || undefined 
      })
      
      log.debug('useClients', 'Received clients response', {
        responseType: typeof response,
        hasData: !!response?.data,
        hasClients: !!response?.data?.clients,
        clientsLength: response?.data?.clients?.length || 0,
        total: response?.data?.total,
        response: response
      })
      
      // 后端返回的数据结构是 { code, message, data: { clients: [], total, page, pageSize } }
      const clientsData = response?.data?.clients || []
      
      if (!Array.isArray(clientsData)) {
        log.error('useClients', 'Clients data is not an array', {
          clientsData,
          type: typeof clientsData
        })
        throw new Error('Invalid clients data format: expected array')
      }
      
      const deriveAlertCount = (c: any) => Number(c?.pendingAlertCount ?? c?.unresolvedAlertCount ?? c?.alertCount ?? 0)
      
      // 增量合并而不是整体替换，避免覆盖 WS 最新状态，减少重渲染
      const byId = new Map(clients.value.map((c: any) => [c.id, c]))
      const now = Date.now()
      
      for (const incoming of clientsData) {
        const existing: any = byId.get(incoming.id)
        const inc = {
          ...incoming,
          alertCount: deriveAlertCount(incoming),
          latestScreenshotUrl: incoming.latestScreenshotUrl || incoming.latestScreenshot || existing?.latestScreenshotUrl,
        } as any
        
        if (existing) {
          // 以 API 派生状态为准：如果 API 已判定离线，则直接覆盖，避免"离线->在线"抖动
          existing.status = inc.status
          existing.clientNumber = inc.clientNumber ?? existing.clientNumber
          existing.computerName = inc.computerName ?? existing.computerName
          existing.ip = inc.ip ?? existing.ip
          existing.os = inc.os ?? existing.os
          existing.version = inc.version ?? existing.version
          existing.lastSeen = inc.lastSeen ?? existing.lastSeen
          existing.alertCount = inc.alertCount
          existing.latestScreenshotUrl = inc.latestScreenshotUrl
          existing.loading = false
        } else {
          const obj: any = {
            ...inc,
            loading: false,
            lastStatusUpdate: now,
          }
          clients.value.push(obj)
          byId.set(inc.id, obj)
        }
      }
      
      log.info('useClients', `Successfully loaded ${clients.value.length} clients`, {
        clientIds: clients.value.map(c => c.id),
        clientNames: clients.value.map(c => c.computerName)
      })
      
    } catch (error: any) {
      log.error('useClients', 'Failed to refresh clients list', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      })
      throw error
    } finally {
      loading.value = false
      isRefreshing = false
      log.debug('useClients', 'Finished refreshing clients list')
    }
  }
  
  // 加载客户端分组
  const loadClientGroups = async () => {
    try {
      const res = await clientsApi.getGroups()
      const list = Array.isArray(res) ? res : (res?.data || res)
      clientGroups.value = list || []
    } catch (error) {
      console.error('Failed to load client groups:', error)
      clientGroups.value = []
    }
  }
  
  // 更新客户端信息
  const updateClient = async (clientId: string, clientData: any) => {
    await clientsApi.updateClient(clientId, clientData)
    
    // 更新本地数据
    const clientIndex = clients.value.findIndex(c => c.id === clientId)
    if (clientIndex !== -1) {
      clients.value[clientIndex].computerName = clientData.computerName
      if (clientData.groupId) {
        clients.value[clientIndex].group = clientGroups.value.find(g => g.id === clientData.groupId)
      }
    }
  }
  
  // 删除客户端
  const deleteClient = async (clientId: string) => {
    await clientsApi.deleteClient(clientId)
    
    // 从本地数据中移除
    const clientIndex = clients.value.findIndex(c => c.id === clientId)
    if (clientIndex !== -1) {
      clients.value.splice(clientIndex, 1)
    }
  }
  
  // 更新客户端状态（用于WebSocket事件）
  const updateClientStatus = (clientId: string, statusData: any) => {
    const client = clients.value.find(c => c.id === clientId)
    if (client) {
      const newStatus = typeof statusData === 'object' ? statusData.status : statusData
      client.status = newStatus
      client.lastSeen = statusData.timestamp || statusData.lastHeartbeat
      ;(client as any).lastStatusUpdate = Date.now()
      
      // 如果状态对象包含其他信息，也更新它们
      if (typeof statusData === 'object') {
        if (statusData.ipAddress) {
          client.ip = statusData.ipAddress
        }
      }
    } else {
      // 若列表中不存在，增量插入占位对象
      clients.value.push({
        id: clientId,
        clientNumber: clientId,
        computerName: clientId,
        status: (typeof statusData === 'object' ? statusData.status : statusData) || 'online',
        lastSeen: statusData.timestamp,
        alertCount: 0,
        loading: false,
        lastStatusUpdate: Date.now(),
      } as any)
    }
  }
  
  // 更新客户端截图（用于WebSocket事件）
  const updateClientScreenshot = (clientId: string, screenshotData: any) => {
    const client = clients.value.find(c => c.id === clientId)
    if (client) {
      // 如果 URL 未变化，避免触发重绘
      if (client.latestScreenshotUrl !== screenshotData.screenshotUrl) {
        client.latestScreenshotUrl = screenshotData.screenshotUrl
      }
      client.loading = false
    } else {
      // 增量创建占位，便于快速展示
      clients.value.push({
        id: clientId,
        clientNumber: clientId,
        computerName: clientId,
        status: 'online',
        lastSeen: screenshotData.timestamp,
        latestScreenshotUrl: screenshotData.screenshotUrl,
        alertCount: 0,
        loading: false,
        lastStatusUpdate: Date.now(),
      } as any)
    }
  }
  
  return {
    clients,
    clientGroups,
    loading,
    selectedGroupId,
    onlineClients,
    offlineClients,
    refreshClients,
    loadClientGroups,
    updateClient,
    deleteClient,
    updateClientStatus,
    updateClientScreenshot,
    markStaleOffline
  }
}