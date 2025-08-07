import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { authApi } from '@/api/auth'

interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'operator' | 'viewer'
  realName?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isOperator = computed(() => user.value?.role === 'operator' || user.value?.role === 'admin')
  
  const setAuth = (userData: User, tokenValue: string) => {
    user.value = userData
    token.value = tokenValue
    localStorage.setItem('token', tokenValue)
  }
  
  const clearAuth = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }
  
  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })
      setAuth(response.user, response.access_token)
      message.success('登录成功')
      return true
    } catch (error: any) {
      message.error(error.message || '登录失败')
      return false
    }
  }
  
  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuth()
      message.success('已退出登录')
    }
  }
  
  const fetchProfile = async () => {
    if (!token.value) return
    
    try {
      const userData = await authApi.getProfile()
      user.value = userData
    } catch (error) {
      clearAuth()
    }
  }
  
  return {
    user: readonly(user),
    token: readonly(token),
    isAuthenticated,
    isAdmin,
    isOperator,
    login,
    logout,
    fetchProfile,
    setAuth,
    clearAuth
  }
})