import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useScreenWallState() {
  // 页面状态
  const gridColumns = ref(4)
  const isFullscreen = ref(false)
  const activeTab = ref('all')
  const showLogViewer = ref(false)
  
  // 弹窗状态
  const clientDetailVisible = ref(false)
  const selectedClient = ref<any>(null)
  const screenshotModalVisible = ref(false)
  const screenshotModalData = ref({
    title: '',
    url: ''
  })
  
  // 计算属性
  const screenWallStyle = computed(() => ({
    gridTemplateColumns: `repeat(${gridColumns.value}, 1fr)`
  }))
  
  // 辅助函数
  const getOfflineDuration = (lastSeen?: string) => {
    if (!lastSeen) return '未知'
    
    const now = Date.now()
    const lastSeenTime = new Date(lastSeen).getTime()
    const diffMs = now - lastSeenTime
    
    if (diffMs < 60000) return '刚刚'
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}小时前`
    return `${Math.floor(diffMs / 86400000)}天前`
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#52c41a'
      case 'offline': return '#ff4d4f'
      case 'error': return '#faad14'
      case 'installing': return '#1890ff'
      default: return '#d9d9d9'
    }
  }
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return '在线'
      case 'offline': return '离线'
      case 'error': return '错误'
      case 'installing': return '安装中'
      default: return '未知'
    }
  }
  
  const formatAlertCount = (count?: number) => {
    if (!count || count === 0) return ''
    return count > 99 ? '99+' : count.toString()
  }
  
  // 事件处理
  const handleImageError = (client: any) => {
    client.loading = false
  }
  
  const handleImageLoad = (client: any) => {
    client.loading = false
  }
  
  const handleGridLayoutChange = (columns: number) => {
    gridColumns.value = columns
  }
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      isFullscreen.value = true
    } else {
      document.exitFullscreen()
      isFullscreen.value = false
    }
  }
  
  const showClientDetail = (client: any) => {
    selectedClient.value = client
    clientDetailVisible.value = true
  }
  
  const showScreenshot = (title: string, url: string) => {
    screenshotModalData.value = { title, url }
    screenshotModalVisible.value = true
  }
  
  // 全屏状态监听
  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement
  }
  
  onMounted(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  })
  
  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  })
  
  return {
    // 状态
    gridColumns,
    isFullscreen,
    activeTab,
    showLogViewer,
    clientDetailVisible,
    selectedClient,
    screenshotModalVisible,
    screenshotModalTitle: computed(() => screenshotModalData.value.title),
    currentScreenshotUrl: computed(() => screenshotModalData.value.url),
    
    // 计算属性
    screenWallStyle,
    
    // 辅助函数
    getOfflineDuration,
    getStatusColor,
    getStatusText,
    formatAlertCount,
    
    // 事件处理
    handleImageError,
    handleImageLoad,
    handleGridLayoutChange,
    toggleFullscreen,
    showClientDetail,
    showScreenshotModal: showScreenshot
  }
}