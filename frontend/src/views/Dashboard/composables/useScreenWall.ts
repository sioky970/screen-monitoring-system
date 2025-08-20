import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { message } from 'ant-design-vue'
import type { Client, ClientGroup, ClientStats, ClientFilter } from '@/types/client'
import { clientApi } from '@/api/client'
import { log } from '@/utils/logger'

export interface ScreenWallState {
  // 客户端数据
  clients: Ref<Client[]>
  clientGroups: Ref<ClientGroup[]>
  loading: Ref<boolean>

  // 筛选和分组
  selectedGroupId: Ref<number | null>
  searchQuery: Ref<string>
  statusFilter: Ref<string>

  // 选中状态
  selectedClient: Ref<Client | null>

  // 自动刷新
  autoRefresh: Ref<boolean>
  refreshInterval: Ref<number>
  lastRefreshTime: Ref<Date | null>

  // 计算属性
  onlineClients: ComputedRef<Client[]>
  offlineClients: ComputedRef<Client[]>
  filteredClients: ComputedRef<Client[]>

  // 操作方法
  refreshClients: () => Promise<void>
  loadClientGroups: () => Promise<void>
  showClientDetail: (client: Client) => void
  showScreenshotModal: (url: string, title: string) => void
  updateClient: (id: string, data: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>

  // 自动刷新控制
  startAutoRefresh: () => void
  stopAutoRefresh: () => void
  setRefreshInterval: (interval: number) => void
}

export const useScreenWall = (): ScreenWallState => {
  // 基础状态
  const clients = ref<Client[]>([])
  const clientGroups = ref<ClientGroup[]>([])
  const loading = ref(false)

  // 筛选状态
  const selectedGroupId = ref<number | null>(null)
  const searchQuery = ref('')
  const statusFilter = ref('all')

  // 选中状态
  const selectedClient = ref<Client | null>(null)

  // 自动刷新状态
  const autoRefresh = ref(true)
  const refreshInterval = ref(10000) // 10秒
  const lastRefreshTime = ref<Date | null>(null)
  let refreshTimer: NodeJS.Timeout | null = null

  // 智能更新客户端数据，避免不必要的重新渲染
  const updateClientsData = (newClients: Client[]) => {
    if (clients.value.length === 0) {
      // 首次加载，直接设置
      clients.value = [...newClients]
      return
    }

    // 创建新的客户端映射
    const newClientsMap = new Map(newClients.map(client => [client.id, client]))
    const currentClientsMap = new Map(clients.value.map(client => [client.id, client]))

    // 检查是否需要更新
    let needsUpdate = false

    // 检查数量变化
    if (newClients.length !== clients.value.length) {
      needsUpdate = true
    }

    // 检查客户端ID变化
    if (!needsUpdate) {
      const newIds = new Set(newClients.map(c => c.id))
      const currentIds = new Set(clients.value.map(c => c.id))

      if (newIds.size !== currentIds.size) {
        needsUpdate = true
      } else {
        for (const id of newIds) {
          if (!currentIds.has(id)) {
            needsUpdate = true
            break
          }
        }
      }
    }

    // 检查客户端数据变化
    if (!needsUpdate) {
      for (const newClient of newClients) {
        const currentClient = currentClientsMap.get(newClient.id)
        if (!currentClient || hasClientChanged(currentClient, newClient)) {
          needsUpdate = true
          break
        }
      }
    }

    if (needsUpdate) {
      // 保持稳定的排序：在线状态优先，然后按创建时间，最后按ID
      const sortedClients = [...newClients].sort((a, b) => {
        // 1. 在线状态优先
        if (a.status === 'online' && b.status !== 'online') return -1
        if (a.status !== 'online' && b.status === 'online') return 1

        // 2. 按创建时间排序
        const aTime = new Date(a.createdAt || 0).getTime()
        const bTime = new Date(b.createdAt || 0).getTime()
        if (aTime !== bTime) return aTime - bTime

        // 3. 按ID排序确保稳定性
        return a.id.localeCompare(b.id)
      })

      clients.value = sortedClients
    }
  }

  // 检查客户端数据是否发生变化
  const hasClientChanged = (oldClient: Client, newClient: Client): boolean => {
    const keys: (keyof Client)[] = [
      'computerName', 'status', 'lastHeartbeat', 'latestScreenshotUrl',
      'alertCount', 'groupId'
    ]

    return keys.some(key => {
      const oldValue = oldClient[key]
      const newValue = newClient[key]

      // 处理日期比较
      if (key === 'lastHeartbeat') {
        const oldTime = oldValue ? new Date(oldValue as string).getTime() : 0
        const newTime = newValue ? new Date(newValue as string).getTime() : 0
        return Math.abs(oldTime - newTime) > 1000 // 1秒的差异才算变化
      }

      return oldValue !== newValue
    })
  }
  
  // 计算属性
  const onlineClients = computed(() => 
    clients.value.filter((c: Client) => c.status === 'online')
  )
  
  const offlineClients = computed(() => 
    clients.value.filter((c: Client) => c.status === 'offline')
  )
  
  const filteredClients = computed(() => {
    let result = clients.value

    // 按组筛选
    if (selectedGroupId.value !== null) {
      result = result.filter((c: Client) => c.groupId === selectedGroupId.value)
    }

    // 按状态筛选
    if (statusFilter.value !== 'all') {
      result = result.filter((c: Client) => c.status === statusFilter.value)
    }

    // 按搜索关键词筛选
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter((c: Client) =>
        c.computerName?.toLowerCase().includes(query)
      )
    }

    // 确保稳定的排序（与后端保持一致）
    return [...result].sort((a, b) => {
      // 1. 在线状态优先
      if (a.status === 'online' && b.status !== 'online') return -1
      if (a.status !== 'online' && b.status === 'online') return 1

      // 2. 按创建时间排序
      const aTime = new Date(a.createdAt || 0).getTime()
      const bTime = new Date(b.createdAt || 0).getTime()
      if (aTime !== bTime) return aTime - bTime

      // 3. 按ID排序确保稳定性
      return a.id.localeCompare(b.id)
    })
  })
  
  // 数据加载
  const refreshClients = async (silent = false) => {
    if (!silent) {
      loading.value = true
    }

    try {
      const filter: ClientFilter = {}

      if (selectedGroupId.value !== null) {
        filter.groupId = selectedGroupId.value
      }

      if (statusFilter.value !== 'all') {
        filter.status = statusFilter.value
      }

      if (searchQuery.value.trim()) {
        filter.search = searchQuery.value.trim()
      }

      const response = await clientApi.getClients(filter)
      const newClients = response?.clients || []

      // 智能更新客户端数据，保持稳定的排序
      updateClientsData(newClients)
      lastRefreshTime.value = new Date()

      if (!silent) {
        log.info('ScreenWall', `Loaded ${clients.value.length} clients`)
      }
    } catch (error) {
      log.error('ScreenWall', 'Failed to load clients', error)
      if (!silent) {
        message.error('加载客户端列表失败')
      }
      clients.value = []
    } finally {
      if (!silent) {
        loading.value = false
      }
    }
  }
  
  const loadClientGroups = async () => {
    try {
      const response = await clientApi.getClientGroups()
      clientGroups.value = response || []
      
      log.info('ScreenWall', `Loaded ${clientGroups.value.length} client groups`)
    } catch (error) {
      log.error('ScreenWall', 'Failed to load client groups', error)
      message.error('加载客户端分组失败')
      clientGroups.value = []
    }
  }
  
  // 操作方法
  const showClientDetail = (client: Client) => {
    selectedClient.value = client
    log.info('ScreenWall', `Showing detail for client: ${client.id}`)
  }
  
  const showScreenshotModal = (url: string, title: string) => {
    log.info('ScreenWall', `Showing screenshot: ${title}`)
  }
  
  const updateClient = async (id: string, data: Partial<Client>) => {
    try {
      await clientApi.updateClient(id, data)
      await refreshClients(true) // 静默刷新
      log.info('ScreenWall', `Updated client: ${id}`)
    } catch (error) {
      log.error('ScreenWall', 'Failed to update client', error)
      throw error
    }
  }

  const deleteClient = async (id: string) => {
    try {
      await clientApi.deleteClient(id)
      await refreshClients(true) // 静默刷新
      log.info('ScreenWall', `Deleted client: ${id}`)
    } catch (error) {
      log.error('ScreenWall', 'Failed to delete client', error)
      throw error
    }
  }

  // 自动刷新控制
  const startAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }

    if (autoRefresh.value && refreshInterval.value > 0) {
      refreshTimer = setInterval(() => {
        refreshClients(true) // 静默刷新，不显示loading状态
      }, refreshInterval.value)

      log.info('ScreenWall', `Auto refresh started with interval: ${refreshInterval.value}ms`)
    }
  }

  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
      log.info('ScreenWall', 'Auto refresh stopped')
    }
  }

  const setRefreshInterval = (interval: number) => {
    refreshInterval.value = interval
    if (autoRefresh.value) {
      stopAutoRefresh()
      startAutoRefresh()
    }
  }

  // 生命周期管理
  onMounted(() => {
    startAutoRefresh()
  })

  onUnmounted(() => {
    stopAutoRefresh()
  })
  
  return {
    // 状态
    clients,
    clientGroups,
    loading,
    selectedGroupId,
    searchQuery,
    statusFilter,
    selectedClient,

    // 自动刷新
    autoRefresh,
    refreshInterval,
    lastRefreshTime,

    // 计算属性
    onlineClients,
    offlineClients,
    filteredClients,

    // 方法
    refreshClients,
    loadClientGroups,
    showClientDetail,
    showScreenshotModal,
    updateClient,
    deleteClient,

    // 自动刷新控制
    startAutoRefresh,
    stopAutoRefresh,
    setRefreshInterval
  }
}