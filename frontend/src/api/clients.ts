import request from './request'

export interface Client {
  id: string
  clientNumber: string
  computerName: string
  ip?: string
  mac?: string
  os?: string
  version?: string
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'INSTALLING'
  lastSeen?: string
  group?: {
    id: number
    name: string
  }
}

export const clientsApi = {
  getClients: (params: any): Promise<any> =>
    request.get('/clients', { params }),
    
  getClientStats: (): Promise<any> =>
    request.get('/clients/stats'),
}