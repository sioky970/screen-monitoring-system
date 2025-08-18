import { throttle } from 'lodash-es'
import { log } from '@/utils/logger'

export function useWebSocketEvents(socket: any, clientsComposable: any) {
  const { updateClientStatus, updateClientScreenshot, refreshClients } = clientsComposable
  
  // 节流处理客户端列表更新，避免频繁刷新
  const throttledRefreshClients = throttle(() => {
    log.info('useWebSocketEvents', 'Throttled refresh clients triggered')
    refreshClients().catch((error: any) => {
      log.error('useWebSocketEvents', 'Failed to refresh clients in throttled handler', error)
    })
  }, 2000, { leading: true, trailing: true })
  
  // 监听WebSocket事件
  const setupWebSocketListeners = () => {
    if (!socket) {
      log.warn('useWebSocketEvents', 'Socket not available for event listeners')
      return
    }
    
    // 监听客户端列表响应
    socket.on('clients_list_response', (data: any) => {
      log.info('useWebSocketEvents', 'Received clients_list_response', {
        hasData: !!data,
        clientsCount: data?.clients?.length || 0
      })
      
      if (data?.clients) {
        throttledRefreshClients()
      }
    })
    
    // 监听客户端状态更新
    socket.on('client_status_update', (data: any) => {
      log.info('useWebSocketEvents', 'Received client_status_update', {
        clientId: data?.clientId,
        status: data?.status,
        hasData: !!data
      })
      
      if (data?.clientId) {
        updateClientStatus(data.clientId, data)
      }
    })
    
    // 监听新截图
    socket.on('new_screenshot', (data: any) => {
      log.debug('useWebSocketEvents', 'Received new_screenshot', {
        clientId: data?.clientId,
        hasScreenshotUrl: !!data?.screenshotUrl,
        hasData: !!data
      })
      
      if (data?.clientId && data?.screenshotUrl) {
        updateClientScreenshot(data.clientId, data)
      }
    })
    
    // 监听客户端连接
    socket.on('client_connected', (data: any) => {
      log.info('useWebSocketEvents', 'Client connected', {
        clientId: data?.clientId
      })
      
      if (data?.clientId) {
        updateClientStatus(data.clientId, 'online')
      }
    })
    
    // 监听客户端断开连接
    socket.on('client_disconnected', (data: any) => {
      log.info('useWebSocketEvents', 'Client disconnected', {
        clientId: data?.clientId
      })
      
      if (data?.clientId) {
        updateClientStatus(data.clientId, 'offline')
      }
    })
    
    // 监听违规事件
    socket.on('new_alert', (data: any) => {
      log.info('useWebSocketEvents', 'Received new_alert', {
        clientId: data?.clientId,
        alertType: data?.type
      })
      
      // 触发客户端列表刷新以更新违规数量
      throttledRefreshClients()
    })
    
    log.info('useWebSocketEvents', 'WebSocket event listeners setup completed')
  }
  
  // 清理WebSocket事件监听器
  const cleanupWebSocketListeners = () => {
    if (!socket) {
      return
    }
    
    socket.off('clients_list_response')
    socket.off('client_status_update')
    socket.off('new_screenshot')
    socket.off('client_connected')
    socket.off('client_disconnected')
    socket.off('new_alert')
    
    log.info('useWebSocketEvents', 'WebSocket event listeners cleaned up')
  }
  
  return {
    setupWebSocketListeners,
    cleanupWebSocketListeners
  }
}