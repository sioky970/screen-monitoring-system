import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { message } from 'ant-design-vue'
import { authApi } from '@/api/auth'

interface User {
  id: number
  username: string
  email: string
  role: 'admin'
  realName?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  
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
      console.log('调用登录API...', { email })
      const response = await authApi.login({ email, password })
      console.log('API响应:', response)
      
      const userData = {
        ...response.user,
        role: 'admin' as const
      }
      console.log('设置用户数据:', userData)
      console.log('设置token:', response.access_token)
      
      setAuth(userData, response.access_token)
      
      console.log('登录后状态检查:')
      console.log('- user:', user.value)
      console.log('- token:', token.value)
      console.log('- isAuthenticated:', isAuthenticated.value)
      
      message.success('登录成功')
      return true
    } catch (error: any) {
      console.error('登录API错误:', error)
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
    console.log('fetchProfile - 开始获取用户信息')
    console.log('fetchProfile - token存在:', !!token.value)
    console.log('fetchProfile - token值:', token.value ? token.value.substring(0, 20) + '...' : 'null')
    
    if (!token.value) {
      console.log('fetchProfile - 没有token，跳过获取用户信息')
      return
    }
    
    try {
      const userData = await authApi.getProfile()
      console.log('fetchProfile - 获取用户信息成功:', userData)
      user.value = {
        ...userData,
        role: 'admin' as const
      }
      console.log('fetchProfile - 设置用户数据完成:', user.value)
    } catch (error: any) {
      console.log('fetchProfile - 获取用户信息失败:', error)
      console.log('fetchProfile - 错误状态码:', error?.response?.status)
      console.log('fetchProfile - 错误信息:', error.message)
      
      // 只在特定错误情况下清除认证状态
      // 401错误已由响应拦截器处理，避免重复清除
      if (error?.response?.status !== 401) {
        console.warn('非401错误，需要处理:', error)
      }
    }
  }
  
  return {
    user: readonly(user),
    token: readonly(token),
    isAuthenticated,
    isAdmin,
    login,
    logout,
    fetchProfile,
    setAuth,
    clearAuth
  }
})