import axios from 'axios'
import { message } from 'ant-design-vue'
import router from '@/router'
import { log } from '@/utils/logger'

// 在Docker容器环境中，使用相对路径让Vite proxy处理API请求
// 只有在明确设置了VITE_API_BASE_URL且不是容器间通信地址时才使用绝对路径
const apiBaseURL = (() => {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL
  // 如果环境变量包含backend-dev（容器间通信），则使用相对路径让proxy处理
  if (envApiUrl && !envApiUrl.includes('backend-dev')) {
    return envApiUrl
  }
  // 默认使用相对路径，由Vite proxy转发
  const base = (import.meta.env.BASE_URL || '/') as string
  return `${base.replace(/\/$/, '/')}api`
})()

const request = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    console.log(`[API] 请求拦截器 - ${config.method?.toUpperCase()} ${config.url}`)
    console.log(`[API] Token存在:`, !!token)
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log(`[API] Authorization头已设置:`, `Bearer ${token.substring(0, 20)}...`)
    } else {
      console.log(`[API] 没有token，未设置Authorization头`)
    }

    // 统一规范 URL：去掉开头的斜杠，让 baseURL 正确生效（/api + auth/login => /api/auth/login）
    if (typeof config.url === 'string' && config.url.startsWith('/')) {
      config.url = config.url.replace(/^\//, '')
    }

    // 记录请求日志
    log.debug('API', `Request: ${config.method?.toUpperCase()} ${config.baseURL || ''}/${config.url}`, {
      params: config.params,
      data: config.data,
      headers: {
        ...config.headers,
        Authorization: token ? 'Bearer ***' : undefined // 隐藏token详情
      }
    })

    return config
  },
  (error) => {
    console.log(`[API] 请求拦截器错误:`, error)
    log.error('API', 'Request interceptor error', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 记录成功响应日志
    log.debug('API', `Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data,
      headers: response.headers
    })

    return response.data
  },
  (error) => {
    const { response, config } = error

    // 记录错误响应日志
    log.error('API', `Response Error: ${config?.method?.toUpperCase()} ${config?.url}`, {
      status: response?.status,
      statusText: response?.statusText,
      data: response?.data,
      message: error.message,
      code: error.code
    })

    if (response?.status === 401) {
      console.log(`[API] 收到401错误，开始处理token过期`)
      console.log(`[API] 当前路由:`, router.currentRoute.value.path)
      console.log(`[API] 当前localStorage中的token:`, localStorage.getItem('token') ? 'exists' : 'null')
      
      // 清除本地token
      localStorage.removeItem('token')
      console.log(`[API] 已清除localStorage中的token`)
      
      // 避免在登录页重复显示错误信息
      if (router.currentRoute.value.path !== '/login') {
        console.log(`[API] 不在登录页，显示错误信息并跳转`)
        message.error('登录已过期，请重新登录')
        router.push('/login')
      } else {
        console.log(`[API] 已在登录页，跳过错误提示`)
      }
    } else if (response?.status === 403) {
      message.error('权限不足')
    } else if (response?.status >= 500) {
      message.error('服务器错误，请稍后重试')
    } else {
      message.error(response?.data?.message || '请求失败')
    }

    return Promise.reject(error)
  }
)

export default request