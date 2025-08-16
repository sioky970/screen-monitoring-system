import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import { log } from '@/utils/logger'

export const useSocket = (namespace: string = '') => {
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)

  const connect = () => {
    const token = localStorage.getItem('token')
    // 使用同源，并兼容子路径部署（BASE_URL）。在反向代理下推荐将 /socket.io 与 /api 一起转发到后端
    const base = (import.meta.env.BASE_URL || '/') as string
    const origin = location.origin.replace(/^http/, 'ws')
    const url = `${origin}${base.replace(/\/$/, '')}${namespace}`

    log.info('WebSocket', `Attempting to connect to: ${url}`, { namespace, hasToken: !!token })

    socket.value = io(url, {
      auth: {
        token
      },
      transports: ['websocket']
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      log.info('WebSocket', `Connected successfully to: ${namespace}`, {
        id: socket.value?.id,
        transport: socket.value?.io.engine.transport.name
      })
    })

    socket.value.on('disconnect', (reason) => {
      isConnected.value = false
      log.warn('WebSocket', `Disconnected from: ${namespace}`, { reason })
    })

    socket.value.on('connect_error', (error) => {
      isConnected.value = false
      log.error('WebSocket', `Connection error for: ${namespace}`, {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      })
    })

    // 添加重连事件监听
    socket.value.on('reconnect', (attemptNumber) => {
      log.info('WebSocket', `Reconnected to: ${namespace}`, { attemptNumber })
    })

    socket.value.on('reconnect_attempt', (attemptNumber) => {
      log.debug('WebSocket', `Reconnection attempt ${attemptNumber} for: ${namespace}`)
    })

    socket.value.on('reconnect_error', (error) => {
      log.error('WebSocket', `Reconnection error for: ${namespace}`, error)
    })

    socket.value.on('reconnect_failed', () => {
      log.error('WebSocket', `Reconnection failed for: ${namespace}`)
    })
  }

  const disconnect = () => {
    if (socket.value) {
      log.info('WebSocket', `Disconnecting from: ${namespace}`)
      socket.value.disconnect()
      socket.value = null
    }
    isConnected.value = false
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    socket,
    isConnected: readonly(isConnected),
    connect,
    disconnect
  }
}