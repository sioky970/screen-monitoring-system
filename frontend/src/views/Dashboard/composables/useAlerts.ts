import { ref } from 'vue'
import { alertsApi } from '@/api/alerts'
import { message } from 'ant-design-vue'

interface Alert {
  id: string
  clientId: string
  type: string
  description: string
  screenshotUrl?: string
  timestamp: string
  status: 'pending' | 'resolved' | 'ignored'
  severity: 'low' | 'medium' | 'high'
}

export function useAlerts() {
  const alerts = ref<Alert[]>([])
  const loading = ref(false)
  
  // 加载违规事件
  const loadAlerts = async (clientId: string) => {
    loading.value = true
    try {
      const response = await alertsApi.getAlerts({ clientId })
      alerts.value = response.data || []
    } catch (error) {
      console.error('Failed to load alerts:', error)
      // 使用模拟数据
      alerts.value = [
        {
          id: '1',
          clientId,
          type: 'blockchain_address',
          description: '检测到区块链地址访问',
          screenshotUrl: '/api/screenshots/alert_1.jpg',
          timestamp: new Date().toISOString(),
          status: 'pending',
          severity: 'high'
        },
        {
          id: '2',
          clientId,
          type: 'suspicious_activity',
          description: '检测到可疑活动',
          screenshotUrl: '/api/screenshots/alert_2.jpg',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'pending',
          severity: 'medium'
        }
      ]
    } finally {
      loading.value = false
    }
  }
  
  // 刷新违规事件
  const refreshAlerts = async (clientId: string) => {
    await loadAlerts(clientId)
  }
  
  // 审核违规事件
  const reviewAlert = async (alertId: string, action: 'resolve' | 'ignore') => {
    try {
      await alertsApi.reviewAlert(alertId, { action })
      
      // 更新本地状态
      const alert = alerts.value.find(a => a.id === alertId)
      if (alert) {
        alert.status = action === 'resolve' ? 'resolved' : 'ignored'
      }
      
      message.success(`违规事件已${action === 'resolve' ? '解决' : '忽略'}`)
    } catch (error) {
      console.error('Failed to review alert:', error)
      message.error('操作失败，请重试')
    }
  }
  
  // 一键忽略所有未处理违规
  const ignoreAllPendingAlerts = async (clientId: string) => {
    try {
      const pendingAlerts = alerts.value.filter(a => a.status === 'pending')
      
      if (pendingAlerts.length === 0) {
        message.info('没有待处理的违规事件')
        return
      }
      
      await alertsApi.batchReviewAlerts({
        alertIds: pendingAlerts.map(a => a.id),
        action: 'ignore'
      })
      
      // 更新本地状态
      pendingAlerts.forEach(alert => {
        alert.status = 'ignored'
      })
      
      message.success(`已忽略 ${pendingAlerts.length} 条违规事件`)
    } catch (error) {
      console.error('Failed to ignore all alerts:', error)
      message.error('批量忽略失败，请重试')
    }
  }
  
  // 获取违规类型文本
  const getAlertTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      blockchain_address: '区块链地址',
      suspicious_activity: '可疑活动',
      unauthorized_access: '未授权访问',
      data_leak: '数据泄露',
      malware: '恶意软件',
      policy_violation: '策略违规'
    }
    return typeMap[type] || type
  }
  
  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ff4d4f'
      case 'medium': return '#faad14'
      case 'low': return '#52c41a'
      default: return '#d9d9d9'
    }
  }
  
  // 获取严重程度文本
  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return '未知'
    }
  }
  
  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#faad14'
      case 'resolved': return '#52c41a'
      case 'ignored': return '#d9d9d9'
      default: return '#d9d9d9'
    }
  }
  
  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待处理'
      case 'resolved': return '已解决'
      case 'ignored': return '已忽略'
      default: return '未知'
    }
  }
  
  return {
    alerts,
    loading,
    loadAlerts,
    refreshAlerts,
    reviewAlert,
    ignoreAllPendingAlerts,
    getAlertTypeText,
    getSeverityColor,
    getSeverityText,
    getStatusColor,
    getStatusText
  }
}