import request from './request'
import type { Client, ClientGroup, ClientStats, ClientFilter, ClientUpdateData, ClientListResponse } from '@/types/client'

export const clientApi = {
  // 获取客户端列表
  getClients: async (filter?: ClientFilter): Promise<ClientListResponse> => {
    const params = new URLSearchParams()
    if (filter?.status) params.append('status', filter.status)
    if (filter?.groupId) params.append('groupId', filter.groupId.toString())
    if (filter?.search) params.append('search', filter.search)
    
    const response = await request.get(`/clients?${params.toString()}`)
    return response.data
  },

  // 获取客户端详情
  getClient: async (id: string): Promise<Client> => {
    const response = await request.get(`/clients/${id}`)
    return response.data
  },

  // 更新客户端
  updateClient: async (id: string, data: ClientUpdateData): Promise<Client> => {
    const response = await request.put(`/clients/${id}`, data)
    return response.data
  },

  // 删除客户端
  deleteClient: async (id: string): Promise<void> => {
    await request.delete(`/clients/${id}`)
  },

  // 获取客户端分组
  getClientGroups: async (): Promise<ClientGroup[]> => {
    const response = await request.get('/clients/groups/list')
    return response.data
  },

  // 获取客户端统计
  getClientStats: async (): Promise<ClientStats> => {
    const response = await request.get('/clients/stats')
    return response.data
  },

  // 强制客户端下线
  forceOffline: async (id: string): Promise<void> => {
    await request.post(`/clients/${id}/force-offline`)
  },

  // 刷新客户端数据
  refreshClient: async (id: string): Promise<Client> => {
    const response = await request.post(`/clients/${id}/refresh`)
    return response.data
  }
}
