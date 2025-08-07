import request from './request'

export interface WhitelistItem {
  id: number
  address: string
  addressType: string
  label?: string
  category?: string
  isActive: boolean
  createdAt: string
  expiresAt?: string
  createdBy: number
  approvedBy?: number
  approvedAt?: string
}

export interface CreateWhitelistRequest {
  address: string
  addressType: string
  label?: string
  category?: string
  expiresAt?: string
}

export interface UpdateWhitelistRequest {
  address?: string
  addressType?: string
  label?: string
  category?: string
  expiresAt?: string
}

export interface QueryWhitelistRequest {
  page?: number
  pageSize?: number
  search?: string
  addressType?: string
  category?: string
}

export interface WhitelistResponse {
  data: WhitelistItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const whitelistApi = {
  getWhitelist: (params: QueryWhitelistRequest): Promise<WhitelistResponse> =>
    request.get('/whitelist', { params }),
    
  getWhitelistById: (id: number): Promise<WhitelistItem> =>
    request.get(`/whitelist/${id}`),
    
  createWhitelist: (data: CreateWhitelistRequest): Promise<WhitelistItem> =>
    request.post('/whitelist', data),
    
  updateWhitelist: (id: number, data: UpdateWhitelistRequest): Promise<WhitelistItem> =>
    request.put(`/whitelist/${id}`, data),
    
  updateWhitelistStatus: (id: number, isActive: boolean): Promise<void> =>
    request.put(`/whitelist/${id}/status`, { isActive }),
    
  deleteWhitelist: (id: number): Promise<void> =>
    request.delete(`/whitelist/${id}`),
    
  batchDeleteWhitelist: (ids: number[]): Promise<void> =>
    request.post('/whitelist/batch-delete', { ids }),
    
  importWhitelist: (addresses: CreateWhitelistRequest[]): Promise<void> =>
    request.post('/whitelist/import', { addresses }),
    
  getStats: (): Promise<any> =>
    request.get('/whitelist/stats'),
}