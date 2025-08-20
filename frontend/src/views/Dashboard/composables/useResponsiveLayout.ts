import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface ResponsiveLayoutOptions {
  minColumns?: number
  maxColumns?: number
  minWidth?: number
  maxWidth?: number
  gap?: number
}

export interface ResponsiveLayoutState {
  columns: Ref<number>
  gap: Ref<number>
  itemWidth: Ref<number>
  itemHeight: Ref<number>
  isMobile: ComputedRef<boolean>
  isTablet: ComputedRef<boolean>
  isDesktop: ComputedRef<boolean>
  updateLayout: () => void
}

export const useResponsiveLayout = (
  containerRef: Ref<HTMLElement | null>,
  options: ResponsiveLayoutOptions = {}
): ResponsiveLayoutState => {
  const {
    minColumns = 1,
    maxColumns = 8,
    minWidth = 280,
    maxWidth = 400,
    gap = 16
  } = options

  const columns = ref(4)
  const gapValue = ref(gap)
  const itemWidth = ref(0)
  const itemHeight = ref(0)

  // 响应式断点
  const screenWidth = ref(window.innerWidth)
  const screenHeight = ref(window.innerHeight)

  const isMobile = computed(() => screenWidth.value < 768)
  const isTablet = computed(() => screenWidth.value >= 768 && screenWidth.value < 1024)
  const isDesktop = computed(() => screenWidth.value >= 1024)

  // 计算最佳列数
  const calculateOptimalColumns = (): number => {
    if (!containerRef.value) return columns.value

    const containerWidth = containerRef.value.offsetWidth
    const availableWidth = containerWidth - gapValue.value

    // 根据屏幕尺寸调整列数
    let optimalColumns: number

    if (isMobile.value) {
      optimalColumns = Math.min(2, maxColumns)
    } else if (isTablet.value) {
      optimalColumns = Math.min(4, maxColumns)
    } else {
      optimalColumns = Math.max(
        minColumns,
        Math.min(maxColumns, Math.floor(availableWidth / minWidth))
      )
    }

    return Math.max(minColumns, Math.min(maxColumns, optimalColumns))
  }

  // 更新布局
  const updateLayout = () => {
    if (!containerRef.value) return

    const newColumns = calculateOptimalColumns()
    columns.value = newColumns

    const containerWidth = containerRef.value.offsetWidth
    const totalGap = gapValue.value * (newColumns - 1)
    itemWidth.value = Math.floor((containerWidth - totalGap) / newColumns)
    
    // 保持16:9的宽高比
    itemHeight.value = Math.floor(itemWidth.value * 9 / 16)
  }

  // 监听窗口变化
  const handleResize = () => {
    screenWidth.value = window.innerWidth
    screenHeight.value = window.innerHeight
    updateLayout()
  }

  // 初始化
  onMounted(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    columns,
    gap: gapValue,
    itemWidth,
    itemHeight,
    isMobile,
    isTablet,
    isDesktop,
    updateLayout
  }
}