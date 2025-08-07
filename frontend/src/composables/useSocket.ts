import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'

export const useSocket = (namespace: string = '') => {
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)

  const connect = () => {
    const token = localStorage.getItem('token')
    
    socket.value = io(`http://localhost:3002${namespace}`, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      console.log('WebSocket connected:', namespace)
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
      console.log('WebSocket disconnected:', namespace)
    })

    socket.value.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      isConnected.value = false
    })
  }

  const disconnect = () => {
    if (socket.value) {
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
    socket: readonly(socket),
    isConnected: readonly(isConnected),
    connect,
    disconnect
  }
}