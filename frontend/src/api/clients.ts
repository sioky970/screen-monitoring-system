import request from './request'

export interface ClientGroup {
  id: number
  name: string
  description?: string
  color?: string
  sortOrder?: number
  isActive?: boolean
}

export interface Client {
  id: string
  clientNumber: string
  computerName: string
  ip?: string
  mac?: string
  os?: string
  version?: string
  status: 'online' | 'offline' | 'error' | 'installing'
  lastSeen?: string
  group?: ClientGroup
}

export const clientsApi = {
  getClients: (params: any): Promise<any> =>
    request.get('/clients', { params }),

  getClientStats: (): Promise<any> =>
    request.get('/clients/stats'),

  updateClient: (id: string, data: any): Promise<any> =>
    request.put(`/clients/${id}`, data),

  // 获取客户端完整详情信息（包含基本信息、分组、违规事件等）
  getClientDetail: (id: string): Promise<any> =>
    request.get(`/clients/${id}/detail`),

  // 客户端删除
  deleteClient: (id: string): Promise<any> => request.delete(`/clients/${id}`),
  bulkDeleteClients: (ids: string[]): Promise<any> => request.post('/clients/bulk-delete', { ids }),

  // 分组管理
  getGroups: (): Promise<any> => request.get('/clients/groups/list'),
  createGroup: (data: Partial<ClientGroup>): Promise<any> => request.post('/clients/groups', data),
  updateGroup: (id: number, data: Partial<ClientGroup>): Promise<any> => request.put(`/clients/groups/${id}`, data),
  deleteGroup: (id: number): Promise<any> => request.delete(`/clients/groups/${id}`),
}