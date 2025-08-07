import axios from 'axios'
import { message } from 'ant-design-vue'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const { response } = error
    
    if (response?.status === 401) {
      localStorage.removeItem('token')
      message.error('登录已过期，请重新登录')
      router.push('/login')
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