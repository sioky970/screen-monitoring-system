import request from './request'

export const securityApi = {
  // 分页获取客户端违规事件
  getClientAlerts: (params: {
    clientId: string
    page?: number
    pageSize?: number
    status?: string
    alertType?: string
    startDate?: string
    endDate?: string
  }): Promise<any> => request.get('/security/alerts', { params }),

  // 更新违规事件状态（审核）
  updateAlertStatus: (alertId: string, data: { status: string; remark?: string }): Promise<any> =>
    request.put(`/security/alerts/${alertId}/status`, data),

  // 忽略指定客户端的所有违规事件
  ignoreAllAlerts: (clientId: string): Promise<any> =>
    request.post('/security/alerts/ignore-all', { clientId }),
}

