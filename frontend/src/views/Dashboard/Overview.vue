<template>
  <div class="dashboard-overview">
    <div class="page-header">
      <h2>系统概览</h2>
      <p>屏幕监控系统运行状态总览</p>
    </div>
    
    <!-- 统计卡片 -->
    <a-row :gutter="16" class="stats-cards">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="在线客户端"
            :value="stats.onlineClients"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix>
              <DesktopOutlined />
            </template>
            <template #suffix>
              / {{ stats.totalClients }}
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="安全告警"
            :value="stats.todayAlerts"
            :value-style="{ color: '#faad14' }"
          >
            <template #prefix>
              <AlertOutlined />
            </template>
            <template #suffix>
              今日
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="系统用户"
            :value="stats.totalUsers"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="白名单地址"
            :value="stats.whitelistCount"
            :value-style="{ color: '#722ed1' }"
          >
            <template #prefix>
              <SafetyOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>
    
    <!-- 快速操作 -->
    <a-row :gutter="16" class="quick-actions">
      <a-col :span="12">
        <a-card title="快速操作">
          <div class="action-buttons">
            <a-button type="primary" size="large" @click="$router.push('/dashboard/screen-wall')">
              <DesktopOutlined />
              查看屏幕墙
            </a-button>
            
            <a-button size="large" @click="$router.push('/admin/users')" v-if="authStore.isAdmin">
              <UserAddOutlined />
              添加用户
            </a-button>
            
            <a-button size="large" @click="$router.push('/admin/whitelist')" v-if="authStore.isOperator">
              <PlusOutlined />
              添加白名单
            </a-button>
          </div>
        </a-card>
      </a-col>
      
      <a-col :span="12">
        <a-card title="系统状态">
          <div class="system-status">
            <div class="status-item">
              <span class="status-label">系统运行时间:</span>
              <span class="status-value">{{ systemUptime }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">最后更新:</span>
              <span class="status-value">{{ lastUpdate }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">服务状态:</span>
              <a-tag color="success">正常运行</a-tag>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { clientsApi } from '@/api/clients'
import { usersApi } from '@/api/users'
import { whitelistApi } from '@/api/whitelist'
import dayjs from 'dayjs'
import {
  DesktopOutlined,
  AlertOutlined,
  UserOutlined,
  SafetyOutlined,
  UserAddOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue'

const authStore = useAuthStore()

const stats = reactive({
  totalClients: 0,
  onlineClients: 0,
  todayAlerts: 0,
  totalUsers: 0,
  whitelistCount: 0
})

const systemUptime = ref('--')
const lastUpdate = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))

let updateTimer: NodeJS.Timeout | null = null

const loadStats = async () => {
  try {
    // 并行加载统计数据
    const [clientStats, userStats, whitelistStats] = await Promise.all([
      clientsApi.getClientStats().catch(() => ({ totalClients: 0, onlineClients: 0 })),
      usersApi.getStats().catch(() => ({ totalUsers: 0 })),
      whitelistApi.getStats().catch(() => ({ whitelistCount: 0 }))
    ])
    
    Object.assign(stats, {
      ...clientStats,
      ...userStats,
      ...whitelistStats,
      todayAlerts: 8 // 模拟数据
    })
    
    lastUpdate.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

onMounted(() => {
  loadStats()
  
  // 设置定时更新
  updateTimer = setInterval(() => {
    loadStats()
  }, 30000) // 30秒更新一次
  
  // 模拟系统运行时间
  const startTime = dayjs().subtract(2, 'day').subtract(3, 'hour').subtract(25, 'minute')
  const updateUptime = () => {
    const duration = dayjs().diff(startTime)
    const days = Math.floor(duration / (1000 * 60 * 60 * 24))
    const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    systemUptime.value = `${days}天 ${hours}小时 ${minutes}分钟`
  }
  
  updateUptime()
  setInterval(updateUptime, 60000) // 每分钟更新一次
})

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
})
</script>

<style scoped>
.dashboard-overview {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1f2937;
}

.page-header p {
  color: #6b7280;
  font-size: 16px;
}

.stats-cards {
  margin-bottom: 24px;
}

.quick-actions {
  margin-bottom: 24px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.system-status .status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.system-status .status-item:last-child {
  border-bottom: none;
}

.status-label {
  color: #6b7280;
}

.status-value {
  font-weight: 500;
  color: #1f2937;
}
</style>