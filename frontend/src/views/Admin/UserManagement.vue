<template>
  <div class="user-management">
    <div class="page-header">
      <h2>用户管理</h2>
      <p>管理系统用户账号和权限</p>
    </div>
    
    <!-- 操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <a-button type="primary" @click="showCreateModal">
          <template #icon>
            <UserAddOutlined />
          </template>
          添加用户
        </a-button>
      </div>
      
      <div class="toolbar-right">
        <a-space>
          <a-select 
            v-model:value="queryParams.role" 
            placeholder="角色筛选" 
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="admin">管理员</a-select-option>
            <a-select-option value="operator">操作员</a-select-option>
            <a-select-option value="viewer">查看者</a-select-option>
          </a-select>
          
          <a-input-search
            v-model:value="queryParams.search"
            placeholder="搜索用户名或邮箱"
            style="width: 250px"
            @search="handleSearch"
            allow-clear
          />
          
          <a-button @click="loadUsers" :loading="loading">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
        </a-space>
      </div>
    </div>
    
    <!-- 用户表格 -->
    <a-table
      :columns="columns"
      :data-source="users"
      :loading="loading"
      :pagination="pagination"
      @change="handleTableChange"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'username'">
          <div>
            <strong>{{ record.username }}</strong>
            <div class="user-email">{{ record.email }}</div>
          </div>
        </template>
        
        <template v-if="column.key === 'role'">
          <a-tag :color="getRoleColor(record.role)">
            {{ getRoleText(record.role) }}
          </a-tag>
        </template>
        
        <template v-if="column.key === 'status'">
          <a-tag :color="record.isActive ? 'success' : 'default'">
            {{ record.isActive ? '激活' : '禁用' }}
          </a-tag>
        </template>
        
        <template v-if="column.key === 'lastLogin'">
          {{ record.lastLogin ? dayjs(record.lastLogin).format('YYYY-MM-DD HH:mm') : '从未登录' }}
        </template>
        
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="showEditModal(record)">
              编辑
            </a-button>
            
            <a-button 
              type="link" 
              size="small" 
              :disabled="record.id === currentUserId"
              @click="toggleUserStatus(record)"
            >
              {{ record.isActive ? '禁用' : '启用' }}
            </a-button>
            
            <a-popconfirm
              title="确定要删除此用户吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="deleteUser(record)"
            >
              <a-button 
                type="link" 
                size="small" 
                danger
                :disabled="record.id === currentUserId"
              >
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
    
    <!-- 创建/编辑用户弹窗 -->
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
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="用户名" name="username">
              <a-input v-model:value="formData.username" placeholder="请输入用户名" />
            </a-form-item>
          </a-col>
          
          <a-col :span="12">
            <a-form-item label="邮箱" name="email">
              <a-input v-model:value="formData.email" placeholder="请输入邮箱" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="真实姓名" name="realName">
              <a-input v-model:value="formData.realName" placeholder="请输入真实姓名" />
            </a-form-item>
          </a-col>
          
          <a-col :span="12">
            <a-form-item label="手机号" name="phone">
              <a-input v-model:value="formData.phone" placeholder="请输入手机号" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="角色" name="role">
              <a-select v-model:value="formData.role" placeholder="请选择角色">
                <a-select-option value="admin">管理员</a-select-option>
                <a-select-option value="operator">操作员</a-select-option>
                <a-select-option value="viewer">查看者</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          
          <a-col :span="12" v-if="!isEdit">
            <a-form-item label="密码" name="password">
              <a-input-password v-model:value="formData.password" placeholder="请输入密码" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-form-item v-if="isEdit" label="新密码" name="newPassword">
          <a-input-password 
            v-model:value="formData.newPassword" 
            placeholder="留空则不修改密码" 
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { usersApi, type User, type CreateUserRequest, type UpdateUserRequest } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  UserAddOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'

const authStore = useAuthStore()

const loading = ref(false)
const submitLoading = ref(false)
const users = ref<User[]>([])
const modalVisible = ref(false)
const isEdit = ref(false)
const editingUser = ref<User | null>(null)
const formRef = ref()

const currentUserId = computed(() => authStore.user?.id)

// 查询参数
const queryParams = reactive({
  search: '',
  role: undefined as string | undefined,
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
    title: '用户信息',
    key: 'username',
    width: 200
  },
  {
    title: '真实姓名',
    dataIndex: 'realName',
    width: 120
  },
  {
    title: '手机号',
    dataIndex: 'phone',
    width: 120
  },
  {
    title: '角色',
    key: 'role',
    width: 100
  },
  {
    title: '状态',
    key: 'status',
    width: 80
  },
  {
    title: '最后登录',
    key: 'lastLogin',
    width: 160
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
    width: 200,
    fixed: 'right' as const
  }
]

// 表单数据
const formData = reactive({
  username: '',
  email: '',
  realName: '',
  phone: '',
  role: 'viewer' as 'admin' | 'operator' | 'viewer',
  password: '',
  newPassword: ''
})

// 表单验证规则
const formRules = computed(() => ({
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, max: 50, message: '用户名长度应为3-50个字符' }
  ],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email' as const, message: '请输入有效的邮箱地址' }
  ],
  role: [
    { required: true, message: '请选择角色' }
  ],
  password: isEdit.value ? [] : [
    { required: true, message: '请输入密码' },
    { min: 8, message: '密码至少8位' }
  ],
  newPassword: [
    { min: 8, message: '密码至少8位' }
  ]
}))

const modalTitle = computed(() => isEdit.value ? '编辑用户' : '添加用户')

// 角色颜色映射
const getRoleColor = (role: string) => {
  const colors = {
    'admin': 'red',
    'operator': 'orange',
    'viewer': 'blue'
  }
  return colors[role as keyof typeof colors] || 'default'
}

// 角色文本映射
const getRoleText = (role: string) => {
  const texts = {
    'admin': '管理员',
    'operator': '操作员',
    'viewer': '查看者'
  }
  return texts[role as keyof typeof texts] || role
}

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    const response = await usersApi.getUsers({
      ...queryParams,
      page: pagination.current,
      pageSize: pagination.pageSize
    })
    
    users.value = response.data
    pagination.total = response.total
  } catch (error) {
    message.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.current = 1
  loadUsers()
}

// 表格变化处理
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadUsers()
}

// 显示创建用户弹窗
const showCreateModal = () => {
  isEdit.value = false
  editingUser.value = null
  resetForm()
  modalVisible.value = true
}

// 显示编辑用户弹窗
const showEditModal = (user: User) => {
  isEdit.value = true
  editingUser.value = user
  
  Object.assign(formData, {
    username: user.username,
    email: user.email,
    realName: user.realName || '',
    phone: user.phone || '',
    role: user.role,
    password: '',
    newPassword: ''
  })
  
  modalVisible.value = true
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    username: '',
    email: '',
    realName: '',
    phone: '',
    role: 'viewer',
    password: '',
    newPassword: ''
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
    if (isEdit.value && editingUser.value) {
      // 编辑用户
      const updateData: UpdateUserRequest = {
        username: formData.username,
        email: formData.email,
        realName: formData.realName || undefined,
        phone: formData.phone || undefined,
        role: formData.role
      }
      
      if (formData.newPassword) {
        updateData.newPassword = formData.newPassword
      }
      
      await usersApi.updateUser(editingUser.value.id, updateData)
      message.success('用户更新成功')
    } else {
      // 创建用户
      const createData: CreateUserRequest = {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        realName: formData.realName || undefined,
        phone: formData.phone || undefined,
        role: formData.role
      }
      
      await usersApi.createUser(createData)
      message.success('用户创建成功')
    }
    
    modalVisible.value = false
    loadUsers()
  } catch (error) {
    // 错误由拦截器处理
  } finally {
    submitLoading.value = false
  }
}

// 切换用户状态
const toggleUserStatus = async (user: User) => {
  try {
    await usersApi.updateUserStatus(user.id, !user.isActive)
    message.success(`用户${user.isActive ? '禁用' : '启用'}成功`)
    loadUsers()
  } catch (error) {
    // 错误由拦截器处理
  }
}

// 删除用户
const deleteUser = async (user: User) => {
  try {
    await usersApi.deleteUser(user.id)
    message.success('用户删除成功')
    loadUsers()
  } catch (error) {
    // 错误由拦截器处理
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.user-management {
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

.user-email {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}
</style>