import { reactive, computed, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { clientApi } from '@/api/client'
import type { Client, ClientGroup, ClientFilter } from '@/types/client'

interface ScreenWallState {
  clients: Client[]
  clientGroups: ClientGroup[]
  loading: boolean
  selectedGroupId: number | null
  selectedStatus: string
  searchKeyword: string
  selectedClient: Client | null
}

export function useScreenWall() {
  const state = reactive<ScreenWallState>({
    clients: [],
    clientGroups: [],
    loading: false,
    selectedGroupId: null,
    selectedStatus: '',
    searchKeyword: '',
    selectedClient: null
  })

  // 计算属性
  const filteredClients = computed(() => {
    let result = state.clients

    // 按分组筛选
    if (state.selectedGroupId !== null) {
      result = result.filter(client => client.groupId === state.selectedGroupId!.toString())
    }

    // 按状态筛选
    if (state.selectedStatus) {
      result = result.filter(client => client.status === state.selectedStatus)
    }

    // 按搜索关键词筛选
    if (state.searchKeyword) {
      const keyword = state.searchKeyword.toLowerCase()
      result = result.filter(client =>
        client.computerName.toLowerCase().includes(keyword) ||
        (client.clientNumber && client.clientNumber.toLowerCase().includes(keyword))
      )
    }

    return result
  })

  // 刷新客户端数据
  const refreshClients = async () => {
    try {
      state.loading = true
      const response = await clientApi.getClients()
      // 后端返回的是 {clients: [...], total: ..., page: ..., pageSize: ...} 格式
      state.clients = response?.clients || []
    } catch (error) {
      console.error('获取客户端列表失败:', error)
      message.error('获取客户端列表失败')
    } finally {
      state.loading = false
    }
  }

  // 加载客户端分组
  const loadClientGroups = async () => {
    try {
      const response = await clientApi.getClientGroups()
      state.clientGroups = response || []
    } catch (error) {
      console.error('获取客户端分组失败:', error)
      message.error('获取客户端分组失败')
    }
  }

  // 更新客户端
  const updateClient = async (clientId: string, data: any) => {
    try {
      await clientApi.updateClient(clientId, data)
      message.success('客户端更新成功')
      await refreshClients()
    } catch (error) {
      console.error('更新客户端失败:', error)
      message.error('更新客户端失败')
    }
  }

  // 删除客户端
  const deleteClient = async (clientId: string) => {
    try {
      await clientApi.deleteClient(clientId)
      message.success('客户端删除成功')
      await refreshClients()
    } catch (error) {
      console.error('删除客户端失败:', error)
      message.error('删除客户端失败')
    }
  }

  // 设置筛选条件
  const setFilter = (filter: Partial<ClientFilter>) => {
    if (filter.groupId !== undefined) {
      state.selectedGroupId = filter.groupId
    }
    if (filter.status !== undefined) {
      state.selectedStatus = filter.status
    }
    if (filter.search !== undefined) {
      state.searchKeyword = filter.search
    }
  }

  // 清除筛选
  const clearFilter = () => {
    state.selectedGroupId = null
    state.selectedStatus = ''
    state.searchKeyword = ''
  }

  // 组件挂载时初始化数据
  onMounted(async () => {
    await Promise.all([
      refreshClients(),
      loadClientGroups()
    ])
  })

  return {
    // 状态属性
    clients: computed(() => state.clients),
    clientGroups: computed(() => state.clientGroups),
    loading: computed(() => state.loading),
    selectedGroupId: computed({
      get: () => state.selectedGroupId,
      set: (value) => state.selectedGroupId = value
    }),
    selectedStatus: computed({
      get: () => state.selectedStatus,
      set: (value) => state.selectedStatus = value
    }),
    searchKeyword: computed({
      get: () => state.searchKeyword,
      set: (value) => state.searchKeyword = value
    }),
    selectedClient: computed(() => state.selectedClient),
    
    // 计算属性
    filteredClients,
    
    // 方法
    refreshClients,
    loadClientGroups,
    updateClient,
    deleteClient,
    setFilter,
    clearFilter
  }
}