import { ref, onMounted, onUnmounted } from 'vue'

export function useFullscreen() {
  const isFullscreen = ref(false)

  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement
  }

  const toggleFullscreen = () => {
    if (isFullscreen.value) {
      document.exitFullscreen?.()
    } else {
      document.documentElement.requestFullscreen?.()
    }
  }

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.()
  }

  const exitFullscreen = () => {
    document.exitFullscreen?.()
  }

  const cleanup = () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    // 初始化全屏状态
    isFullscreen.value = !!document.fullscreenElement
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    cleanup
  }
}