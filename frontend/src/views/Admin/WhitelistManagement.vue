<template>
  <div class="whitelist-management">
    <div class="page-header">
      <h2>白名单管理</h2>
      <p>管理区块链地址白名单，减少误报提升监控效率</p>
    </div>
    
    <!-- 操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <a-space>
          <a-button type="primary" @click="showCreateModal">
            <template #icon>
              <PlusOutlined />
            </template>
            添加地址
          </a-button>
          
          <a-button @click="showBatchImportModal">
            <template #icon>
              <ImportOutlined />
            </template>
            批量导入
          </a-button>
          
          <a-button 
            danger
            :disabled="!hasSelection"
            @click="handleBatchDelete"
          >
            <template #icon>
              <DeleteOutlined />
            </template>
            批量删除
          </a-button>
        </a-space>
      </div>
      
      <div class="toolbar-right">
        <a-space>
          <a-select 
            v-model:value="queryParams.addressType" 
            placeholder="地址类型" 
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="BTC">BTC</a-select-option>
            <a-select-option value="ETH">ETH</a-select-option>
            <a-select-option value="TRC20">TRC20</a-select-option>
            <a-select-option value="ERC20">ERC20</a-select-option>
            <a-select-option value="USDT">USDT</a-select-option>
          </a-select>
          
          <a-select 
            v-model:value="queryParams.category" 
            placeholder="地址分类" 
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="公司钱包">公司钱包</a-select-option>
            <a-select-option value="交易所">交易所</a-select-option>
            <a-select-option value="合作伙伴">合作伙伴</a-select-option>
            <a-select-option value="测试地址">测试地址</a-select-option>
          </a-select>
          
          <a-input-search
            v-model:value="queryParams.search"
            placeholder="搜索地址或标签"
            style="width: 250px"
            @search="handleSearch"
            allow-clear
          />
          
          <a-button @click="loadWhitelist" :loading="loading">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
        </a-space>
      </div>
    </div>
    
    <!-- 统计卡片 -->
    <a-row :gutter="16" class="stats-row">
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="总地址数" :value="stats.total" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="活跃地址" :value="stats.active" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="BTC地址" :value="stats.btc" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="ETH地址" :value="stats.eth" />
        </a-card>
      </a-col>
    </a-row>
    
    <!-- 白名单表格 -->
    <a-table
      :columns="columns"
      :data-source="whitelist"
      :loading="loading"
      :pagination="pagination"
      :row-selection="rowSelection"
      @change="handleTableChange"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'address'">
          <div>
            <a-typography-text 
              :copyable="{ text: record.address }"
              class="address-text"
            >
              {{ formatAddress(record.address) }}
            </a-typography-text>
            <div v-if="record.label" class="address-label">{{ record.label }}</div>
          </div>
        </template>
        
        <template v-if="column.key === 'addressType'">
          <a-tag :color="getTypeColor(record.addressType)">
            {{ record.addressType }}
          </a-tag>
        </template>
        
        <template v-if="column.key === 'category'">
          <a-tag v-if="record.category" color="blue">{{ record.category }}</a-tag>
          <span v-else>-</span>
        </template>
        
        <template v-if="column.key === 'status'">
          <a-tag :color="record.isActive ? 'success' : 'default'">
            {{ record.isActive ? '激活' : '禁用' }}
          </a-tag>
        </template>
        
        <template v-if="column.key === 'expiresAt'">
          <span v-if="record.expiresAt">
            {{ dayjs(record.expiresAt).format('YYYY-MM-DD') }}
          </span>
          <span v-else>-</span>
        </template>
        
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="showEditModal(record)">
              编辑
            </a-button>
            
            <a-button 
              type="link" 
              size="small" 
              @click="toggleStatus(record)"
            >
              {{ record.isActive ? '禁用' : '启用' }}
            </a-button>
            
            <a-popconfirm
              title="确定要删除此地址吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="deleteItem(record)"
            >
              <a-button type="link" size="small" danger>
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
    
    <!-- 创建/编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      @ok="handleSubmit"
      :confirm-loading="submitLoading"
      width="600px"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <a-form-item label="区块链地址" name="address">
          <a-textarea 
            v-model:value="formData.address" 
            placeholder="请输入区块链地址"
            :rows="2"
          />
        </a-form-item>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="地址类型" name="addressType">
              <a-select v-model:value="formData.addressType" placeholder="请选择地址类型">
                <a-select-option value="BTC">BTC</a-select-option>
                <a-select-option value="ETH">ETH</a-select-option>
                <a-select-option value="TRC20">TRC20</a-select-option>
                <a-select-option value="ERC20">ERC20</a-select-option>
                <a-select-option value="BSC">BSC</a-select-option>
                <a-select-option value="MATIC">MATIC</a-select-option>
                <a-select-option value="USDT">USDT</a-select-option>
                <a-select-option value="USDC">USDC</a-select-option>
                <a-select-option value="OTHER">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          
          <a-col :span="12">
            <a-form-item label="地址分类" name="category">
              <a-select v-model:value="formData.category" placeholder="请选择分类">
                <a-select-option value="公司钱包">公司钱包</a-select-option>
                <a-select-option value="交易所">交易所</a-select-option>
                <a-select-option value="合作伙伴">合作伙伴</a-select-option>
                <a-select-option value="测试地址">测试地址</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-form-item label="地址标签" name="label">
          <a-input v-model:value="formData.label" placeholder="为地址添加标签说明" />
        </a-form-item>
        
        <a-form-item label="过期时间" name="expiresAt">
          <a-date-picker 
            v-model:value="formData.expiresAt" 
            placeholder="选择过期时间（可选）"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    
    <!-- 批量导入弹窗 -->
    <a-modal
      v-model:open="batchImportVisible"
      title="批量导入白名单"
      @ok="handleBatchImport"
      :confirm-loading="importLoading"
      width="800px"
    >
      <div class="import-help">
        <a-alert
          message="导入说明"
          description="每行一个地址，格式：地址,类型,分类,标签（后三项可选）。例如：1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa,BTC,公司钱包,测试地址"
          type="info"
          show-icon
          style="margin-bottom: 16px"
        />
      </div>
      
      <a-textarea
        v-model:value="importData"
        placeholder="请输入要导入的地址列表..."
        :rows="10"
        style="margin-bottom: 16px"
      />
      
      <div class="import-preview" v-if="previewData.length > 0">
        <h4>预览（前5条）：</h4>
        <a-table
          :columns="previewColumns"
          :data-source="previewData.slice(0, 5)"
          size="small"
          :pagination="false"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { whitelistApi, type WhitelistItem } from '@/api/whitelist'
import { message } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  PlusOutlined,
  ImportOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'

const loading = ref(false)
const submitLoading = ref(false)
const importLoading = ref(false)
const whitelist = ref<WhitelistItem[]>([])
const modalVisible = ref(false)
const batchImportVisible = ref(false)
const isEdit = ref(false)
const editingItem = ref<WhitelistItem | null>(null)
const formRef = ref()
const selectedRowKeys = ref<number[]>([])
const importData = ref('')

// 统计数据
const stats = reactive({
  total: 0,
  active: 0,
  btc: 0,
  eth: 0
})

// 查询参数
const queryParams = reactive({
  search: '',
  addressType: undefined as string | undefined,
  category: undefined as string | undefined,
  page: 1,
  pageSize: 10
})

// 分页信息
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`
})

// 表格列定义
const columns = [
  {
    title: '区块链地址',
    key: 'address',
    width: 300
  },
  {
    title: '类型',
    key: 'addressType',
    width: 80
  },
  {
    title: '分类',
    key: 'category',
    width: 100
  },
  {
    title: '状态',
    key: 'status',
    width: 80
  },
  {
    title: '过期时间',
    key: 'expiresAt',
    width: 120
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    width: 160,
    customRender: ({ text }: { text: string }) => dayjs(text).format('YYYY-MM-DD HH:mm')
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    fixed: 'right' as const
  }
]

// 预览表格列
const previewColumns = [
  { title: '地址', dataIndex: 'address' },
  { title: '类型', dataIndex: 'addressType' },
  { title: '分类', dataIndex: 'category' },
  { title: '标签', dataIndex: 'label' }
]

// 行选择配置
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: number[]) => {
    selectedRowKeys.value = keys
  }
}))

const hasSelection = computed(() => selectedRowKeys.value.length > 0)

// 表单数据
const formData = reactive({
  address: '',
  addressType: 'BTC',
  category: '',
  label: '',
  expiresAt: undefined as Dayjs | undefined
})

// 表单验证规则
const formRules = {
  address: [
    { required: true, message: '请输入区块链地址' },
    { min: 10, message: '地址长度至少10位' }
  ],
  addressType: [
    { required: true, message: '请选择地址类型' }
  ]
}

const modalTitle = computed(() => isEdit.value ? '编辑白名单地址' : '添加白名单地址')

// 预览数据
const previewData = computed(() => {
  if (!importData.value.trim()) return []
  
  return importData.value.trim().split('\n').map((line, index) => {
    const parts = line.split(',').map(p => p.trim())
    return {
      key: index,
      address: parts[0] || '',
      addressType: parts[1] || 'OTHER',
      category: parts[2] || '',
      label: parts[3] || ''
    }
  }).filter(item => item.address)
})

// 地址类型颜色映射
const getTypeColor = (type: string) => {
  const colors = {
    'BTC': 'orange',
    'ETH': 'blue',
    'TRC20': 'green',
    'ERC20': 'purple',
    'USDT': 'cyan',
    'USDC': 'geekblue'
  }
  return colors[type as keyof typeof colors] || 'default'
}

// 格式化地址显示
const formatAddress = (address: string) => {
  if (address.length <= 20) return address
  return `${address.slice(0, 10)}...${address.slice(-10)}`
}

// 加载白名单列表
const loadWhitelist = async () => {
  loading.value = true
  try {
    const response = await whitelistApi.getWhitelist({
      ...queryParams,
      page: pagination.current,
      pageSize: pagination.pageSize
    })
    
    whitelist.value = response.data
    pagination.total = response.total
    
    // 更新统计数据
    updateStats(response.data)
  } catch (error) {
    message.error('加载白名单失败')
  } finally {
    loading.value = false
  }
}

// 更新统计数据
const updateStats = (data: WhitelistItem[]) => {
  stats.total = data.length
  stats.active = data.filter(item => item.isActive).length
  stats.btc = data.filter(item => item.addressType === 'BTC').length
  stats.eth = data.filter(item => item.addressType === 'ETH').length
}

// 搜索处理
const handleSearch = () => {
  pagination.current = 1
  loadWhitelist()
}

// 表格变化处理
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadWhitelist()
}

// 显示创建弹窗
const showCreateModal = () => {
  isEdit.value = false
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

// 显示编辑弹窗
const showEditModal = (item: WhitelistItem) => {
  isEdit.value = true
  editingItem.value = item
  
  Object.assign(formData, {
    address: item.address,
    addressType: item.addressType,
    category: item.category || '',
    label: item.label || '',
    expiresAt: item.expiresAt ? dayjs(item.expiresAt) : undefined
  })
  
  modalVisible.value = true
}

// 显示批量导入弹窗
const showBatchImportModal = () => {
  importData.value = ''
  batchImportVisible.value = true
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    address: '',
    addressType: 'BTC',
    category: '',
    label: '',
    expiresAt: undefined
  })
  formRef.value?.resetFields()
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  
  submitLoading.value = true
  
  try {
    const submitData = {
      address: formData.address,
      addressType: formData.addressType,
      category: formData.category || undefined,
      label: formData.label || undefined,
      expiresAt: formData.expiresAt?.toISOString()
    }
    
    if (isEdit.value && editingItem.value) {
      await whitelistApi.updateWhitelist(editingItem.value.id, submitData)
      message.success('白名单地址更新成功')
    } else {
      await whitelistApi.createWhitelist(submitData)
      message.success('白名单地址添加成功')
    }
    
    modalVisible.value = false
    loadWhitelist()
  } catch (error) {
    // 错误由拦截器处理
  } finally {
    submitLoading.value = false
  }
}

// 批量导入
const handleBatchImport = async () => {
  if (!previewData.value.length) {
    message.warning('请输入要导入的地址')
    return
  }
  
  importLoading.value = true
  
  try {
    const addresses = previewData.value.map(item => ({
      address: item.address,
      addressType: item.addressType,
      category: item.category || undefined,
      label: item.label || undefined
    }))
    
    await whitelistApi.importWhitelist(addresses)
    message.success(`成功导入 ${addresses.length} 个地址`)
    
    batchImportVisible.value = false
    loadWhitelist()
  } catch (error) {
    // 错误由拦截器处理
  } finally {
    importLoading.value = false
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (!selectedRowKeys.value.length) return
  
  try {
    await whitelistApi.batchDeleteWhitelist(selectedRowKeys.value)
    message.success('批量删除成功')
    selectedRowKeys.value = []
    loadWhitelist()
  } catch (error) {
    // 错误由拦截器处理
  }
}

// 切换状态
const toggleStatus = async (item: WhitelistItem) => {
  try {
    await whitelistApi.updateWhitelistStatus(item.id, !item.isActive)
    message.success(`地址${item.isActive ? '禁用' : '启用'}成功`)
    loadWhitelist()
  } catch (error) {
    // 错误由拦截器处理
  }
}

// 删除单个项目
const deleteItem = async (item: WhitelistItem) => {
  try {
    await whitelistApi.deleteWhitelist(item.id)
    message.success('白名单地址删除成功')
    loadWhitelist()
  } catch (error) {
    // 错误由拦截器处理
  }
}

onMounted(() => {
  loadWhitelist()
})
</script>

<style scoped>
.whitelist-management {
  height: 100%;
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

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.stats-row {
  margin-bottom: 16px;
}

.address-text {
  font-family: monospace;
  font-size: 13px;
}

.address-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.import-help {
  margin-bottom: 16px;
}

.import-preview {
  margin-top: 16px;
}

.import-preview h4 {
  margin-bottom: 12px;
}
</style>