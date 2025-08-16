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
  updateAlertStatus: (id: number, data: { status: string; remark?: string }): Promise<any> =>
    request.put(`/security/alerts/${id}/status`, data),
}

