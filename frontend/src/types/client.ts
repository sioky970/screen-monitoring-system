export interface Client {
  id: string
  clientNumber: string
  computerName: string
  status: 'online' | 'offline' | 'error' | 'installing'
  lastSeen?: string
  lastHeartbeat?: string
  group?: ClientGroup
  groupId?: number
  alertCount?: number
  latestScreenshotUrl?: string
  isActive?: boolean
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface ClientGroup {
  id: number
  name: string
  description?: string
  color?: string
  clientCount?: number
  createdAt: string
  updatedAt: string
}

export interface ClientStats {
  total: number
  online: number
  offline: number
  error: number
  installing: number
}

export interface ClientListResponse {
  clients: Client[]
  total: number
  page: number
  pageSize: number
}

export interface ClientFilter {
  groupId?: number
  status?: string
  search?: string
}

export interface ClientUpdateData {
  computerName?: string
  groupId?: number
  tags?: string[]
}
