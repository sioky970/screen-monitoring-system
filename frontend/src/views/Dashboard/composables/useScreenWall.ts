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
    
    return result
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
      clients.value = response?.clients || []
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