import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useResponsiveLayout() {
  const windowWidth = ref(window.innerWidth)
  const windowHeight = ref(window.innerHeight)

  // 响应式断点
  const breakpoints = {
    xs: 480,
    sm: 768,
    md: 992,
    lg: 1200,
    xl: 1600
  }

  // 计算当前屏幕尺寸
  const screenSize = computed(() => {
    const width = windowWidth.value
    if (width < breakpoints.xs) return 'xs'
    if (width < breakpoints.sm) return 'sm'
    if (width < breakpoints.md) return 'md'
    if (width < breakpoints.lg) return 'lg'
    if (width < breakpoints.xl) return 'xl'
    return 'xxl'
  })

  // 计算网格列数
  const columns = computed(() => {
    const size = screenSize.value
    switch (size) {
      case 'xs': return 1
      case 'sm': return 2
      case 'md': return 3
      case 'lg': return 4
      case 'xl': return 5
      case 'xxl': return 6
      default: return 4
    }
  })

  // 计算网格间距
  const gap = computed(() => {
    const size = screenSize.value
    switch (size) {
      case 'xs': return 8
      case 'sm': return 12
      case 'md': return 16
      case 'lg': return 20
      case 'xl': return 24
      case 'xxl': return 24
      default: return 16
    }
  })

  // 计算卡片最小宽度
  const minCardWidth = computed(() => {
    const size = screenSize.value
    switch (size) {
      case 'xs': return 280
      case 'sm': return 300
      case 'md': return 320
      case 'lg': return 340
      case 'xl': return 360
      case 'xxl': return 380
      default: return 320
    }
  })

  // 是否为移动设备
  const isMobile = computed(() => screenSize.value === 'xs' || screenSize.value === 'sm')

  // 是否为平板设备
  const isTablet = computed(() => screenSize.value === 'md')

  // 是否为桌面设备
  const isDesktop = computed(() => ['lg', 'xl', 'xxl'].includes(screenSize.value))

  // 监听窗口大小变化
  const handleResize = () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }

  // 防抖处理
  let resizeTimer: number | null = null
  const debouncedResize = () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }
    resizeTimer = window.setTimeout(handleResize, 100)
  }

  onMounted(() => {
    window.addEventListener('resize', debouncedResize)
    handleResize() // 初始化
  })

  onUnmounted(() => {
    window.removeEventListener('resize', debouncedResize)
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }
  })

  return {
    windowWidth,
    windowHeight,
    screenSize,
    columns,
    gap,
    minCardWidth,
    isMobile,
    isTablet,
    isDesktop,
    breakpoints
  }
}