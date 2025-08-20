<template>
  <a-layout class="main-layout">
    <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible>
      <div class="logo">
        <span v-if="!collapsed">屏幕监控系统</span>
        <span v-else>监控</span>
      </div>
      
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
        @click="handleMenuClick"
      >
        <a-menu-item key="/dashboard">
          <template #icon>
            <DashboardOutlined />
          </template>
          仪表盘
        </a-menu-item>
        
        <a-menu-item key="/dashboard/screen-wall">
          <template #icon>
            <DesktopOutlined />
          </template>
          屏幕墙
        </a-menu-item>
        
        <a-menu-item key="/admin/whitelist">
          <template #icon>
            <SafetyOutlined />
          </template>
          白名单管理
        </a-menu-item>
        <a-menu-item key="/admin/groups">
          <template #icon>
            <SettingOutlined />
          </template>
          分组管理
        </a-menu-item>
        
        <!-- removed client-config menu item -->

      </a-menu>
    </a-layout-sider>
    
    <a-layout>
      <a-layout-header class="header">
        <div class="header-left">
          <MenuFoldOutlined
            v-if="collapsed"
            class="trigger"
            @click="() => (collapsed = !collapsed)"
          />
          <MenuUnfoldOutlined
            v-else
            class="trigger"
            @click="() => (collapsed = !collapsed)"
          />
        </div>
        
        <div class="header-right">
          <a-space>
            <a-badge :count="0">
              <BellOutlined style="font-size: 18px" />
            </a-badge>
            
            <a-dropdown>
              <a-avatar size="small" :style="{ backgroundColor: '#1890ff' }">
                {{ authStore.user?.username?.charAt(0).toUpperCase() }}
              </a-avatar>
              
              <template #overlay>
                <a-menu>
                  <a-menu-item @click="showChangePasswordModal">
                    <LockOutlined />
                    修改密码
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item @click="handleLogout">
                    <LogoutOutlined />
                    退出登录
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </div>
      </a-layout-header>
      
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
    
    <!-- 修改密码弹窗 -->
    <a-modal
      v-model:open="changePasswordVisible"
      title="修改密码"
      @ok="handleChangePassword"
      :confirm-loading="changePasswordLoading"
    >
      <a-form :model="changePasswordForm" :rules="changePasswordRules">
        <a-form-item label="当前密码" name="currentPassword">
          <a-input-password v-model:value="changePasswordForm.currentPassword" />
        </a-form-item>
        <a-form-item label="新密码" name="newPassword">
          <a-input-password v-model:value="changePasswordForm.newPassword" />
        </a-form-item>
        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password v-model:value="changePasswordForm.confirmPassword" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { message } from 'ant-design-vue'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  DesktopOutlined,
  SettingOutlined,
  ControlOutlined,
  SafetyOutlined,
  BellOutlined,
  LockOutlined,
  LogoutOutlined,
} from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const collapsed = ref(false)
const selectedKeys = ref<string[]>([route.path])

// 修改密码相关
const changePasswordVisible = ref(false)
const changePasswordLoading = ref(false)
const changePasswordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const changePasswordRules = {
  currentPassword: [{ required: true, message: '请输入当前密码' }],
  newPassword: [
    { required: true, message: '请输入新密码' },
    { min: 8, message: '密码至少8位' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码' },
    {
      validator: (rule: any, value: string) => {
        if (value !== changePasswordForm.newPassword) {
          return Promise.reject('两次密码输入不一致')
        }
        return Promise.resolve()
      }
    }
  ]
}

const handleMenuClick = ({ key }: { key: string }) => {
  router.push(key)
  selectedKeys.value = [key]
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const showChangePasswordModal = () => {
  changePasswordVisible.value = true
}

const handleChangePassword = async () => {
  changePasswordLoading.value = true
  try {
    await authApi.changePassword({
      currentPassword: changePasswordForm.currentPassword,
      newPassword: changePasswordForm.newPassword
    })
    message.success('密码修改成功')
    changePasswordVisible.value = false
    // 重置表单
    Object.assign(changePasswordForm, {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  } catch (error) {
    // 错误处理由拦截器处理
  } finally {
    changePasswordLoading.value = false
  }
}

onMounted(() => {
  // 只有在用户信息不存在且token存在时才获取用户信息
  const token = localStorage.getItem('token')
  console.log('MainLayout mounted - token存在:', !!token)
  console.log('MainLayout mounted - authStore.isAuthenticated:', authStore.isAuthenticated)
  console.log('MainLayout mounted - authStore.user:', authStore.user)
  
  if (token && !authStore.user) {
    console.log('Token存在但用户信息不存在，获取用户信息')
    authStore.fetchProfile().catch(() => {
      // 如果获取用户信息失败，token可能已过期，清除认证状态
      console.log('获取用户信息失败，可能token已过期')
    })
  } else if (token && authStore.user) {
    console.log('Token和用户信息都存在，跳过获取用户信息')
  } else {
    console.log('Token不存在，跳过获取用户信息')
  }
  
  selectedKeys.value = [route.path]
})

// 监听路由变化更新菜单选中状态
watch(() => route.path, (newPath) => {
  selectedKeys.value = [newPath]
})
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.logo {
  height: 32px;
  margin: 16px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.header {
  background: #fff;
  padding: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  padding-left: 16px;
}

.header-right {
  padding-right: 16px;
}

.trigger {
  font-size: 18px;
  line-height: 64px;
  padding: 0 24px;
  cursor: pointer;
  transition: color 0.3s;
}

.trigger:hover {
  color: #1890ff;
}

.content {
  margin: 24px;
  padding: 24px;
  background: #fff;
  min-height: calc(100vh - 112px);
  border-radius: 8px;
}
</style>