<template>
  <div class="screen-wall-container">
    <div class="screen-wall-header">
      <div class="header-left">
        <h2>屏幕墙监控</h2>
        <a-tag :color="isConnected ? 'success' : 'error'">
          {{ isConnected ? '实时连接' : '连接断开' }}
        </a-tag>
      </div>

      <div class="header-right">
        <a-space>
          <span>每行设备数:</span>
          <a-select v-model:value="gridColumns" @change="handleGridLayoutChange" style="width: 120px">
            <a-select-option :value="4">4个/行</a-select-option>
            <a-select-option :value="6">6个/行</a-select-option>
            <a-select-option :value="8">8个/行</a-select-option>
            <a-select-option :value="10">10个/行</a-select-option>
            <a-select-option :value="12">12个/行</a-select-option>
          </a-select>

          <a-button @click="refreshClients" :loading="loading">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>

          <a-button @click="showLogViewer = true" type="dashed">
            <template #icon>
              <FileTextOutlined />
            </template>
            查看日志
          </a-button>

          <a-switch
            v-model:checked="isFullscreen"
            @change="toggleFullscreen"
            checked-children="全屏"
            un-checked-children="窗口"
          />

          <a-select v-model:value="selectedGroupId" allow-clear placeholder="按分组筛选" style="width: 160px" @change="refreshClients">
            <a-select-option v-for="g in clientGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
          </a-select>

        </a-space>
      </div>
    </div>

    <div class="screen-wall-content" :class="{ 'fullscreen': isFullscreen }">
      <!-- 标签页分组 -->
      <a-tabs v-model:activeKey="activeTab" type="card" class="client-tabs">
        <a-tab-pane key="all" :tab="`全部设备 (${clients.length})`">
          <div
            v-if="clients.length === 0 && !loading"
            class="empty-state"
          >
            <a-empty description="暂无客户端">
              <a-button type="primary" @click="refreshClients">刷新客户端列表</a-button>
            </a-empty>
          </div>
          <div
            v-else
            class="screen-wall"
            :style="screenWallStyle"
          >
            <div
              v-for="client in displayClients"
              :key="client.id"
              class="screen-item"
              @click="showClientDetail(client)"
            >
              <div class="screen-content">
                <img
                  v-if="client.latestScreenshotUrl"
                  :src="client.latestScreenshotUrl"
                  :alt="client.computerName"
                  loading="lazy"
                  decoding="async"
                  @error="handleImageError(client)"
                  @load="handleImageLoad(client)"
                />
                <div v-else class="no-screenshot">
                  <DesktopOutlined style="font-size: 48px; color: #d9d9d9;" />
                  <p>暂无截图</p>
                </div>

                <!-- 加载状态 -->
                <div v-if="client.loading" class="loading-overlay">
                  <a-spin size="large" />
                </div>
              </div>

              <div class="screen-item-info">
                <div class="client-name">{{ client.computerName }}</div>
                <div class="client-status">
                  <div class="status-left">
                    <a-tag
                      :color="getStatusColor(client.status)"
                      size="small"
                    >
                      {{ getStatusText(client.status) }}
                    </a-tag>
                    <!-- 违规数量标识（当 alertCount > 0 时显示） -->
                    <a-tooltip v-if="(client.alertCount || 0) > 0" :title="`违规次数：${client.alertCount}`">
                      <a-badge
                        :count="formatAlertCount(client.alertCount)"
                        :overflow-count="9999"
                        :number-style="{ backgroundColor: '#ff4d4f', fontSize: '10px' }"
                        class="alert-badge"
                      >
                        <a-tag color="red" size="small">
                          <template #icon>
                            <ExclamationCircleOutlined />
                          </template>
                          违规
                        </a-tag>
                      </a-badge>
                    </a-tooltip>
                  </div>
                  <span class="last-update">
                    {{ client.lastSeen ? dayjs(client.lastSeen).format('HH:mm:ss') : '--' }}
                  </span>
                  <!-- 离线时间显示 -->
                  <div v-if="client.status === 'offline' && client.lastSeen" class="offline-duration">
                    离线 {{ getOfflineDuration(client.lastSeen) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="online" :tab="`在线设备 (${onlineClients.length})`">
          <div
            v-if="onlineClients.length === 0 && !loading"
            class="empty-state"
          >
            <a-empty description="暂无在线客户端">
              <a-button type="primary" @click="refreshClients">刷新客户端列表</a-button>
            </a-empty>
          </div>
          <div
            v-else
            class="screen-wall"
            :style="screenWallStyle"
          >
            <div
              v-for="client in onlineClients"
              :key="client.id"
              class="screen-item"
              @click="showClientDetail(client)"
            >
              <div class="screen-content">
                <img
                  v-if="client.latestScreenshotUrl"
                  :src="client.latestScreenshotUrl"
                  :alt="client.computerName"
                  loading="lazy"
                  decoding="async"
                  @error="handleImageError(client)"
                  @load="handleImageLoad(client)"
                />
                <div v-else class="no-screenshot">
                  <DesktopOutlined style="font-size: 48px; color: #d9d9d9;" />
                  <p>暂无截图</p>
                </div>

                <!-- 加载状态 -->
                <div v-if="client.loading" class="loading-overlay">
                  <a-spin size="large" />
                </div>
              </div>

              <div class="screen-item-info">
                <div class="client-name">{{ client.computerName }}</div>
                <div class="client-status">
                  <div class="status-left">
                    <a-tag
                      :color="getStatusColor(client.status)"
                      size="small"
                    >
                      {{ getStatusText(client.status) }}
                    </a-tag>
                    <!-- 违规数量标识（当 alertCount > 0 时显示） -->
                    <a-tooltip v-if="(client.alertCount || 0) > 0" :title="`违规次数：${client.alertCount}`">
                      <a-badge
                        :count="formatAlertCount(client.alertCount)"
                        :overflow-count="9999"
                        :number-style="{ backgroundColor: '#ff4d4f', fontSize: '10px' }"
                        class="alert-badge"
                      >
                        <a-tag color="red" size="small">
                          <template #icon>
                            <ExclamationCircleOutlined />
                          </template>
                          违规
                        </a-tag>
                      </a-badge>
                    </a-tooltip>
                  </div>
                  <span class="last-update">
                    {{ client.lastSeen ? dayjs(client.lastSeen).format('HH:mm:ss') : '--' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="offline" :tab="`离线设备 (${offlineClients.length})`">
          <div
            v-if="offlineClients.length === 0 && !loading"
            class="empty-state"
          >
            <a-empty description="暂无离线客户端" />
          </div>
          <div
            v-else
            class="screen-wall"
            :style="screenWallStyle"
          >
            <div
              v-for="client in offlineClients"
              :key="client.id"
              class="screen-item offline-item"
              @click="showClientDetail(client)"
            >
              <div class="screen-content">
                <img
                  v-if="client.latestScreenshotUrl"
                  :src="client.latestScreenshotUrl"
                  :alt="client.computerName"
                  loading="lazy"
                  decoding="async"
                  @error="handleImageError(client)"
                  @load="handleImageLoad(client)"
                />
                <div v-else class="no-screenshot">
                  <DesktopOutlined style="font-size: 48px; color: #d9d9d9;" />
                  <p>暂无截图</p>
                </div>

                <!-- 离线遮罩 -->
                <div class="offline-overlay">
                  <div class="offline-info">
                    <div class="offline-text">设备离线</div>
                    <div class="offline-time">{{ getOfflineDuration(client.lastSeen) }}</div>
                  </div>
                </div>
              </div>

              <div class="screen-item-info">
                <div class="client-name">{{ client.computerName }}</div>
                <div class="client-status">
                  <div class="status-left">
                    <a-tag
                      :color="getStatusColor(client.status)"
                      size="small"
                    >
                      {{ getStatusText(client.status) }}
                    </a-tag>
                    <!-- 违规数量标识（当 alertCount > 0 时显示） -->
                    <a-tooltip v-if="(client.alertCount || 0) > 0" :title="`违规次数：${client.alertCount}`">
                      <a-badge
                        :count="formatAlertCount(client.alertCount)"
                        :overflow-count="9999"
                        :number-style="{ backgroundColor: '#ff4d4f', fontSize: '10px' }"
                        class="alert-badge"
                      >
                        <a-tag color="red" size="small">
                          <template #icon>
                            <ExclamationCircleOutlined />
                          </template>
                          违规
                        </a-tag>
                      </a-badge>
                    </a-tooltip>
                  </div>
                  <span class="last-update">
                    最后在线: {{ client.lastSeen ? dayjs(client.lastSeen).format('MM-DD HH:mm') : '--' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>


    <!-- 客户端详情弹窗 -->
    <a-modal
      v-model:open="clientDetailVisible"
      :title="`客户端详情 - ${selectedClient?.computerName}`"
      width="1000px"
      :footer="null"
    >
      <div v-if="selectedClient" class="client-detail">
        <a-tabs default-active-key="basic" type="card">
          <!-- 基本信息标签页 -->
          <a-tab-pane key="basic" tab="基本信息">
            <a-form :model="editForm" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="客户端编号">
                    <a-input v-model:value="editForm.clientNumber" disabled />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="计算机名">
                    <a-input v-model:value="editForm.computerName" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="IP地址">
                    <a-input v-model:value="editForm.ipAddress" disabled />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="状态">
                    <a-tag :color="getStatusColor(editForm.status)">
                      {{ getStatusText(editForm.status) }}
                    </a-tag>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="分组">
                    <a-select v-model:value="editForm.groupId" placeholder="选择分组">
                      <a-select-option v-for="group in clientGroups" :key="group.id" :value="group.id">
                        {{ group.name }}
                      </a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="最后在线">
                    <a-input :value="editForm.lastSeen ? dayjs(editForm.lastSeen).format('YYYY-MM-DD HH:mm:ss') : '--'" disabled />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item>
                <a-space>
                  <a-button type="primary" @click="saveClientInfo" :loading="saving">
                    保存修改
                  </a-button>
                  <a-button @click="resetEditForm">
                    重置
                  </a-button>
                  <a-popconfirm
                    title="确定要删除该设备吗？删除后将无法恢复！"
                    ok-text="确定删除"
                    cancel-text="取消"
                    @confirm="deleteClient"
                  >
                    <a-button danger :loading="deleting">
                      删除设备
                    </a-button>
                  </a-popconfirm>
                </a-space>
              </a-form-item>
            </a-form>

            <div class="detail-screenshot" v-if="selectedClient.latestScreenshotUrl">
              <h4>最新截图</h4>
              <img
                :src="selectedClient.latestScreenshotUrl"
                :alt="selectedClient.computerName"
                loading="lazy"
                decoding="async"
                style="width: 100%; max-height: 400px; object-fit: contain; border: 1px solid #d9d9d9; cursor: pointer;"
                @click="showScreenshotModal(selectedClient.latestScreenshotUrl)"
              />
            </div>
          </a-tab-pane>

          <!-- 违规事件标签页 -->
          <a-tab-pane key="alerts" tab="违规事件">
            <div class="alerts-section">
              <div class="alerts-header">
                <h4>区块链地址违规事件</h4>
                <a-space>
                  <a-button @click="refreshAlerts" :loading="alertsLoading" size="small">
                    <template #icon>
                      <ReloadOutlined />
                    </template>
                    刷新
                  </a-button>
                  <a-popconfirm
                    title="确定要忽略该客户端的全部未处理违规吗？"
                    ok-text="忽略全部"
                    cancel-text="取消"
                    @confirm="ignoreAllAlerts"
                  >
                    <a-button danger size="small" :loading="ignoringAll">一键忽略全部</a-button>
                  </a-popconfirm>
                </a-space>
              </div>

              <a-table
                :dataSource="clientAlerts"
                :columns="alertColumns"
                :loading="alertsLoading"
                :pagination="alertsPagination"
                @change="handleAlertsTableChange"
                size="small"
                row-key="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="record.alertStatus === 'resolved' ? 'green' : (record.alertStatus === 'ignored' ? 'default' : 'orange')">
                      {{ record.alertStatus === 'resolved' ? '已处理' : (record.alertStatus === 'ignored' ? '已忽略' : '待处理') }}
                    </a-tag>
                  </template>
                  <template v-if="column.key === 'action'">
                    <a-space size="small">
                      <a-button
                        type="link"
                        size="small"
                        @click="showAlertScreenshot(record)"
                        :disabled="!record.fileUrl && !record.cdnUrl && !record.screenshotUrl && !(record.minioBucket && record.minioObjectKey)"
                      >
                        查看截图
                      </a-button>
                      <a-button
                        v-if="record.alertStatus !== 'ignored'"
                        type="link"
                        danger
                        size="small"
                        @click="reviewAlert(record, 'ignored')"
                      >
                        忽略
                      </a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-modal>

    <!-- 日志查看器弹窗 -->
    <a-modal
      v-model:open="showLogViewer"
      title="前端日志查看器"
      width="80%"
      :footer="null"
      :bodyStyle="{ height: '70vh', padding: 0 }"
    >
      <LogViewer />
    </a-modal>

    <!-- 截图查看弹窗 -->
    <a-modal
      v-model:open="screenshotModalVisible"
      :title="screenshotModalTitle"
      width="90%"
      :footer="null"
      centered
    >
      <div class="screenshot-viewer">
        <img
          :src="currentScreenshotUrl"
          :alt="screenshotModalTitle"
          loading="lazy"
          decoding="async"
          style="width: 100%; max-height: 80vh; object-fit: contain;"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { clientsApi } from '@/api/clients'
import { securityApi } from '@/api/security'
import { securityBulkApi } from '@/api/security-bulk'
import { useSocket } from '@/composables/useSocket'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { log } from '@/utils/logger'
import { generateClientPlaceholder } from '@/utils/imageUtils'
import LogViewer from '@/components/LogViewer.vue'
import {
  DesktopOutlined,
  ReloadOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue'

interface Client {
  id: string
  clientNumber: string
  computerName: string
  ip?: string
  mac?: string
  os?: string
  version?: string
  status: 'online' | 'offline' | 'error' | 'installing'
  lastSeen?: string
  group?: {
    id: number
    name: string
  }
  latestScreenshotUrl?: string
  alertCount?: number
  loading?: boolean
}

const selectedGroupId = ref<number | null>(null)

const loading = ref(false)
const clients = ref<Client[]>([])
const gridColumns = ref<number>(8) // 默认每行8个设备
const isFullscreen = ref(false)
const clientDetailVisible = ref(false)
const selectedClient = ref<Client | null>(null)
const showLogViewer = ref(false)
const activeTab = ref('all') // 当前激活的标签页

// 离线判定阈值（毫秒），可通过 window.__OFFLINE_THRESHOLD_MS__ 覆盖
const OFFLINE_THRESHOLD_MS = Number((window as any).__OFFLINE_THRESHOLD_MS__ || 20000)
let staleTimer: number | undefined

// 周期性检查：长时间无心跳/无事件的客户端标记为离线
const markStaleOffline = () => {
  const now = Date.now()
  for (const c of clients.value) {
    const last = c.lastSeen ? new Date(c.lastSeen as any).getTime() : (c as any).lastStatusUpdate || 0
    if (last && (now - last > OFFLINE_THRESHOLD_MS) && c.status !== 'offline') {
      c.status = 'offline'
    }
  }
}



// 轮询控制：避免并发请求 + 定时器句柄
let isRefreshing = false
let refreshTimer: number | undefined

// 编辑表单相关
const editForm = ref<any>({})
const clientGroups = ref<any[]>([])
const saving = ref(false)
const deleting = ref(false)

// 违规事件相关
const clientAlerts = ref<any[]>([])
const alertsLoading = ref(false)
const alertsPagination = reactive({ current: 1, pageSize: 10, total: 0 })
const ignoringAll = ref(false)

// 截图查看相关
const screenshotModalVisible = ref(false)
const screenshotModalTitle = ref('')
const currentScreenshotUrl = ref('')

// 违规事件表格列定义（精简：时间/地址/状态/操作）
const alertColumns = [
  {
    title: '时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    customRender: ({ text }: any) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
  },
  {
    title: '检测到的地址',
    dataIndex: 'detectedAddress',
    key: 'detectedAddress',
    ellipsis: true
  },
  {
    title: '状态',
    dataIndex: 'alertStatus',
    key: 'status',
    width: 100
  },
  {
    title: '操作',
    key: 'action',
    width: 160
  }
]

// WebSocket连接
const { socket, isConnected } = useSocket('/monitor')

// 计算屏幕墙样式
const screenWallStyle = computed(() => {
  return {
    gridTemplateColumns: `repeat(${gridColumns.value}, 1fr)`,
    gap: '12px'
  }
})

// 显示的客户端（默认显示全部；如需仅显示在线，可改为筛选 online）
const displayClients = computed(() => {
  return clients.value
  // 若需要仅显示在线，请改为：return clients.value.filter(c => c.status === 'online')
})

// 在线客户端
const onlineClients = computed(() => {
  return clients.value.filter(c => c.status === 'online')
})

// 离线客户端
const offlineClients = computed(() => {
  return clients.value.filter(c => c.status === 'offline')
})

// 获取离线时长
const getOfflineDuration = (lastSeen?: string) => {
  if (!lastSeen) return '未知'
  
  const now = dayjs()
  const lastSeenTime = dayjs(lastSeen)
  const diffMinutes = now.diff(lastSeenTime, 'minute')
  const diffHours = now.diff(lastSeenTime, 'hour')
  const diffDays = now.diff(lastSeenTime, 'day')
  
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟`
  } else if (diffHours < 24) {
    return `${diffHours}小时`
  } else {
    return `${diffDays}天`
  }
}

// 状态颜色映射
const getStatusColor = (status: string) => {
  const normalizedStatus = status?.toUpperCase()
  const colors = {
    'ONLINE': 'green',     // 绿色表示在线
    'OFFLINE': 'red',      // 红色表示离线
    'ERROR': 'red',
    'INSTALLING': 'blue'
  }
  return colors[normalizedStatus as keyof typeof colors] || 'default'
}

// 状态文本映射
const getStatusText = (status: string) => {
  const normalizedStatus = status?.toUpperCase()
  const texts = {
    'ONLINE': '在线',
    'OFFLINE': '离线',
    'ERROR': '错误',
    'INSTALLING': '安装中'
  }
  return texts[normalizedStatus as keyof typeof texts] || status
}

// 违规数量格式化（防止Badge默认99+截断）
const formatAlertCount = (count?: number) => {
  const n = Number(count || 0)
  // 如果需要完全显示实际数量，返回 n（配合 overflow-count=9999）
  // 如果只想展示到4位数，可用 return n > 9999 ? 9999 : n
  return n
}

// 加载客户端列表（含并发保护）
const refreshClients = async () => {
  if (isRefreshing) {
    log.warn('ScreenWall', 'Skip refresh: previous refresh still running')
    return
  }
  isRefreshing = true
  log.info('ScreenWall', 'Starting to refresh clients list')
  loading.value = true

  try {
    log.debug('ScreenWall', 'Calling clientsApi.getClients', { params: { groupId: selectedGroupId?.value || undefined } })
    const response = await clientsApi.getClients({ groupId: selectedGroupId?.value || undefined })

    log.debug('ScreenWall', 'Received clients response', {
      responseType: typeof response,
      hasData: !!response?.data,
      hasClients: !!response?.data?.clients,
      clientsLength: response?.data?.clients?.length || 0,
      total: response?.data?.total,
      response: response
    })

    // 后端返回的数据结构是 { code, message, data: { clients: [], total, page, pageSize } }
    const clientsData = response?.data?.clients || []

    if (!Array.isArray(clientsData)) {
      log.error('ScreenWall', 'Clients data is not an array', {
        clientsData,
        type: typeof clientsData
      })
      throw new Error('Invalid clients data format: expected array')
    }

    const deriveAlertCount = (c: any) => Number(c?.pendingAlertCount ?? c?.unresolvedAlertCount ?? c?.alertCount ?? 0)

    // 增量合并而不是整体替换，避免覆盖 WS 最新状态，减少重渲染
    const byId = new Map(clients.value.map((c: any) => [c.id, c]))
    const now = Date.now()

    for (const incoming of clientsData) {
      const existing: any = byId.get(incoming.id)
      const inc = {
        ...incoming,
        alertCount: deriveAlertCount(incoming),
        // 不默认生成占位图，避免 100+ 客户端时的开销；在加载失败时再生成
        latestScreenshotUrl: incoming.latestScreenshotUrl || incoming.latestScreenshot || existing?.latestScreenshotUrl,
      } as any

      if (existing) {
        // 以 API 派生状态为准：如果 API 已判定离线，则直接覆盖，避免"离线->在线"抖动
        existing.status = inc.status
        existing.clientNumber = inc.clientNumber ?? existing.clientNumber
        existing.computerName = inc.computerName ?? existing.computerName
        existing.ip = inc.ip ?? existing.ip
        existing.os = inc.os ?? existing.os
        existing.version = inc.version ?? existing.version
        existing.lastSeen = inc.lastSeen ?? existing.lastSeen
        existing.alertCount = inc.alertCount
        existing.latestScreenshotUrl = inc.latestScreenshotUrl
        existing.loading = false
      } else {
        const obj: any = {
          ...inc,
          loading: false,
          lastStatusUpdate: now,
        }
        clients.value.push(obj)
        byId.set(inc.id, obj)
      }
    }

    log.info('ScreenWall', `Successfully loaded ${clients.value.length} clients`, {
      clientIds: clients.value.map(c => c.id),
      clientNames: clients.value.map(c => c.computerName)
    })

  } catch (error: any) {
    log.error('ScreenWall', 'Failed to refresh clients list', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    })
    message.error('加载客户端列表失败')
  } finally {
    loading.value = false
    isRefreshing = false
    log.debug('ScreenWall', 'Finished refreshing clients list')
  }
}

// 注意：实际使用中应该从后端API获取真实截图
// 现在使用本地生成的占位图片避免外部依赖

// 处理图片加载错误
const handleImageError = (client: Client) => {
  log.error('ScreenWall', `Screenshot load error for client: ${client.id}`, {
    clientId: client.id,
    computerName: client.computerName,
    screenshotUrl: client.latestScreenshotUrl
  })

  // 重新生成截图
  client.latestScreenshotUrl = generateClientPlaceholder(client)
  client.loading = false
}

// 处理图片加载成功
const handleImageLoad = (client: Client) => {
  client.loading = false
}

// 切换网格布局
const handleGridLayoutChange = () => {
  // 触发重新渲染
  nextTick()
}

// 切换全屏模式
const toggleFullscreen = (checked: boolean) => {
  if (checked) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

// 显示客户端详情
const showClientDetail = async (client: Client) => {
  selectedClient.value = client
  clientDetailVisible.value = true

  // 初始化编辑表单
  resetEditForm()

  // 使用真实分组API
  await loadClientGroups()

  // 使用真实分页API加载违规列表（首次打开重置到第1页）
  alertsPagination.current = 1
  await refreshAlerts()

  log.info('ScreenWall', `Opened client detail for ${client.id}`)
}

// 加载分组（真实API）
const loadClientGroups = async () => {
  try {
    const res = await clientsApi.getGroups()
    const list = Array.isArray(res) ? res : (res?.data || res)
    clientGroups.value = list || []
  } catch (error) {
    console.error('Failed to load client groups:', error)
    clientGroups.value = []
  }
}

const loadClientAlertsLegacy = async (clientId: string) => {
  alertsLoading.value = true
  try {
    // 模拟违规事件数据，实际应该调用安全API
    clientAlerts.value = [
      {
        id: 1,
        createdAt: new Date().toISOString(),
        alertType: 'blockchain_address',
        detectedAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        addressType: 'BTC',
        status: 'pending',
        screenshotUrl: 'http://localhost:9000/monitoring-screenshots/screenshots/' + clientId + '/alerts/sample.jpg'
      }
    ]
  } catch (error) {
    console.error('Failed to load client alerts:', error)
    clientAlerts.value = []
  } finally {
    alertsLoading.value = false
  }
}

// 重置编辑表单
const resetEditForm = () => {
  if (selectedClient.value) {
    editForm.value = {
      clientNumber: selectedClient.value.clientNumber,
      computerName: selectedClient.value.computerName,
      ipAddress: selectedClient.value.ipAddress,
      status: selectedClient.value.status,
      groupId: selectedClient.value.group?.id,
      lastSeen: selectedClient.value.lastSeen
    }
  }
}

// 保存客户端信息
const saveClientInfo = async () => {
  if (!selectedClient.value) return

  saving.value = true
  try {
    await clientsApi.updateClient(selectedClient.value.id, {
      computerName: editForm.value.computerName,
      groupId: editForm.value.groupId
    })

    // 更新本地数据
    const clientIndex = clients.value.findIndex(c => c.id === selectedClient.value!.id)
    if (clientIndex !== -1) {
      clients.value[clientIndex].computerName = editForm.value.computerName
      clients.value[clientIndex].group = clientGroups.value.find(g => g.id === editForm.value.groupId)
    }

    message.success('客户端信息更新成功')
  } catch (error: any) {
    message.error('更新失败: ' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

// 删除客户端
const deleteClient = async () => {
  if (!selectedClient.value) return

  deleting.value = true
  try {
    await clientsApi.deleteClient(selectedClient.value.id)

    // 从本地数据中移除
    const clientIndex = clients.value.findIndex(c => c.id === selectedClient.value!.id)
    if (clientIndex !== -1) {
      clients.value.splice(clientIndex, 1)
    }

    // 关闭详情弹窗
    clientDetailVisible.value = false
    selectedClient.value = null

    message.success('设备删除成功')
  } catch (error: any) {
    message.error('删除失败: ' + (error.message || '未知错误'))
  } finally {
    deleting.value = false
  }
}

// 刷新违规事件
const refreshAlerts = async () => {
  if (!selectedClient.value) return
  alertsLoading.value = true
  try {
    const { current, pageSize } = alertsPagination
    const res = await securityApi.getClientAlerts({
      clientId: selectedClient.value.id,
      page: current,
      pageSize,
    })
    clientAlerts.value = res.data.alerts || []
    alertsPagination.total = res.data.total || 0
  } catch (error) {
    message.error('刷新违规事件失败')
  } finally {
    alertsLoading.value = false
  }
}

const handleAlertsTableChange = (pagination: any) => {
  alertsPagination.current = pagination.current
  alertsPagination.pageSize = pagination.pageSize
  refreshAlerts()
}

// 审核违规事件
const reviewAlert = async (record: any, nextStatus: 'resolved' | 'ignored') => {
  try {
    await securityApi.updateAlertStatus(record.id, { status: nextStatus })
    message.success('操作成功')
    // 刷新列表
    await refreshAlerts()
    // 缩略卡片角标扣减：仅对pending/confirmed计数
    const client = clients.value.find(c => c.id === selectedClient.value?.id)
    if (client && client.alertCount && (record.alertStatus === 'pending' || record.alertStatus === 'confirmed')) {
      client.alertCount = Math.max(0, (client.alertCount || 0) - 1)
    }
  } catch (e) {
    message.error('操作失败')
  }
}

// 显示违规事件截图
const showAlertScreenshot = (alert: any) => {
  // 选择最佳可用URL顺序：cdnUrl > fileUrl > screenshotUrl
  const url = alert.cdnUrl || alert.fileUrl || alert.screenshotUrl
  if (url) {
    currentScreenshotUrl.value = url
    screenshotModalTitle.value = `违规截图 - ${dayjs(alert.createdAt || alert.screenshotTime || alert.created_at).format('YYYY-MM-DD HH:mm:ss')}`
    screenshotModalVisible.value = true
    return
  }
  // 如果没有可用的URL，显示错误信息
  // 注意：不再尝试直接拼接MinIO地址，因为前端在Docker容器中无法直接访问
  message.error('没有可用的截图地址')
}

// 显示普通截图
const showScreenshotModal = (screenshotUrl: string) => {
  currentScreenshotUrl.value = screenshotUrl
  screenshotModalTitle.value = '客户端截图'
  screenshotModalVisible.value = true
}

// 获取违规类型文本
const getAlertTypeText = (type: string) => {
  const types: Record<string, string> = {
    'blockchain_address': '区块链地址',
    'suspicious_activity': '可疑活动',
    'unauthorized_access': '未授权访问'
  }
  return types[type] || type
}

// WebSocket事件处理
// 一键忽略全部未处理违规
const ignoreAllAlerts = async () => {
  if (!selectedClient.value) return
  try {
    ignoringAll.value = true
    const res = await securityBulkApi.ignoreAllByClient(selectedClient.value.id)

    // 处理新的响应格式
    const result = res?.data || res
    const affected = result?.affected ?? 0
    const success = result?.success ?? false
    const responseMessage = result?.message || `已忽略全部未处理违规（${affected} 条）`

    if (success) {
      message.success(responseMessage)
      await refreshAlerts()
      const client = clients.value.find(c => c.id === selectedClient.value?.id)
      if (client) client.alertCount = 0
    } else {
      message.warning(responseMessage || '操作未成功完成')
    }
  } catch (e: any) {
    const errorMsg = e?.response?.data?.message || e?.message || '忽略失败，请稍后重试'
    message.error(errorMsg)
    log.error('ScreenWall', 'Failed to ignore all alerts', e)
  } finally {
    ignoringAll.value = false
  }
}

const setupWebSocket = () => {
  if (!socket.value) {
    log.warn('ScreenWall', 'Cannot setup WebSocket: socket is null')
    return
  }

  log.info('ScreenWall', 'Setting up WebSocket event listeners')

  // 监听客户端列表更新
  // 对 client-list-response 做 1s 节流，避免频繁触发全量刷新
  let lastListRefresh = 0
  socket.value.on('client-list-response', (data: any) => {
    const now = Date.now()
    if (now - lastListRefresh >= 1000) {
      log.debug('ScreenWall', 'Received client-list-response event (throttled)', data)
      lastListRefresh = now
      refreshClients()
    }
  })

  // 监听客户端状态变化
  socket.value.on('client-status-update', (data: any) => {
    log.debug('ScreenWall', 'Received client-status-update event', data)
    const client = clients.value.find(c => c.id === data.clientId)
    if (client) {
      // 处理状态对象，提取实际的状态字符串
      const newStatus = typeof data.status === 'object' ? data.status.status : data.status
      log.info('ScreenWall', `Updating client ${data.clientId} status to ${newStatus}`)
      client.status = newStatus
      client.lastSeen = data.timestamp
      ;(client as any).lastStatusUpdate = Date.now()

      // 如果状态对象包含其他信息，也更新它们
      if (typeof data.status === 'object') {
        if (data.status.lastHeartbeat) {
          client.lastSeen = data.status.lastHeartbeat
        }
        if (data.status.ipAddress) {
          client.ipAddress = data.status.ipAddress
        }
      }
    } else {
      log.warn('ScreenWall', `Client ${data.clientId} not found for status update`)
      // 若列表中不存在，增量插入占位对象，防止“已连接但未展示”的情况
      clients.value.push({
        id: data.clientId,
        clientNumber: data.clientId,
        computerName: data.clientId,
        status: (typeof data.status === 'object' ? data.status.status : data.status) || 'online',
        lastSeen: data.timestamp,
        latestScreenshot: '',
        alertCount: 0,
        loading: false,
        lastStatusUpdate: Date.now(),
      } as any)
    }
  })

  // 监听新的截图
  socket.value.on('screenshot-update', (data: any) => {
    log.debug('ScreenWall', 'Received screenshot-update event', data)
    const client = clients.value.find(c => c.id === data.clientId)
    if (client) {
      log.info('ScreenWall', `Updating screenshot for client ${data.clientId}`)
      // 如果 URL 未变化，避免触发重绘
      if (client.latestScreenshotUrl !== data.screenshotUrl) {
        client.latestScreenshotUrl = data.screenshotUrl
      }
      client.loading = false
    } else {
      log.warn('ScreenWall', `Client ${data.clientId} not found for screenshot update`)
      // 增量创建占位，便于快速展示
      clients.value.push({
        id: data.clientId,
        clientNumber: data.clientId,
        computerName: data.clientId,
        status: 'online',
        lastSeen: data.timestamp,
        latestScreenshotUrl: data.screenshotUrl,
        alertCount: 0,
        loading: false,
        lastStatusUpdate: Date.now(),
      } as any)
    }
  })

  log.info('ScreenWall', 'WebSocket event listeners setup completed')
}

// 注意：真实截图通过WebSocket实时推送，不需要定时刷新

onMounted(() => {
  refreshClients()
  // 每3秒刷新一次
  refreshTimer = window.setInterval(() => {
    refreshClients()
  }, 3000)
  // 每5秒做一次离线判定
  staleTimer = window.setInterval(() => markStaleOffline(), 5000)
  setupWebSocket()

  // 监听全屏状态变化
  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement
  }
  document.addEventListener('fullscreenchange', handleFullscreenChange)

  // 清理函数会在组件卸载时执行
  onUnmounted(() => {
    if (refreshTimer) window.clearInterval(refreshTimer)
    if (staleTimer) window.clearInterval(staleTimer)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  })
})
</script>

<style scoped>
.screen-wall-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-wall-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 16px;
}

.header-left h2 {
  margin: 0;
  margin-right: 12px;
  display: inline-block;
}

.screen-wall-content {
  flex: 1;
  overflow: auto;
}

.screen-wall-content.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #000;
  padding: 20px;
}

.screen-wall {
  display: grid;
  gap: 12px;
  padding: 16px;
  width: 100%;
}

.screen-item {
  border: 2px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  width: 100%;
  aspect-ratio: 16/9; /* 固定16:9比例 */
}

.screen-item:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
}



.screen-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen-content img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 拉伸填充，保持16:9比例 */
}

.no-screenshot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen-item-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 10;
}

.client-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.client-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alert-badge {
  display: inline-flex;
  align-items: center;
}

.alert-badge .ant-badge-count {
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
}

.last-update {
  color: rgba(255, 255, 255, 0.7);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.client-detail .detail-screenshot {
  margin-top: 16px;
}

.client-detail .detail-screenshot h4 {
  margin-bottom: 12px;
}

.alerts-section {
  margin-top: 16px;
}

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.alerts-header h4 {
  margin: 0;
}

.screenshot-viewer {
  text-align: center;
}

/* 全屏模式样式调整 */
.screen-wall-content.fullscreen .screen-wall {
  padding: 8px;
  gap: 8px;
}

.screen-wall-content.fullscreen .screen-item {
  border-width: 1px;
}

.screen-wall-content.fullscreen .screen-item-info {
  padding: 4px 8px;
  font-size: 12px;
}

/* 标签页样式 */
.client-tabs {
  margin-bottom: 16px;
}

.client-tabs :deep(.ant-tabs-content-holder) {
  padding: 0;
}

/* 离线设备特殊样式 */
.offline-item {
  opacity: 0.8;
}

.offline-item .screen-content {
  position: relative;
}

.offline-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  z-index: 20;
}

.offline-info {
  text-align: center;
}

.offline-text {
  font-weight: bold;
  margin-bottom: 4px;
}

.offline-time {
  font-size: 12px;
  opacity: 0.9;
}


</style>