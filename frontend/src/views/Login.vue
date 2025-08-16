<template>
  <div class="login-container full-height flex-center">
    <div class="login-card">
      <div class="login-header">
        <h2>屏幕监控系统</h2>
        <p>管理员登录</p>
      </div>
      
      <a-form
        :model="loginForm"
        :rules="loginRules"
        @finish="handleLogin"
        class="login-form"
      >
        <a-form-item name="email">
          <a-input
            v-model:value="loginForm.email"
            placeholder="邮箱地址"
            size="large"
            autocomplete="username"
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
        </a-form-item>
        
        <a-form-item name="password">
          <a-input-password
            v-model:value="loginForm.password"
            placeholder="密码"
            size="large"
            autocomplete="current-password"
          >
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>
        
        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
          >
            登录
          </a-button>
        </a-form-item>
      </a-form>
      
      <div class="login-footer">
        <p>管理员账号：admin@example.com / admin123</p>
        <p class="note">仅限管理员访问</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, nextTick } from 'vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(false)

const loginForm = reactive({
  email: 'admin@example.com',
  password: 'admin123'
})

const loginRules = {
  email: [
    { required: true, message: '请输入邮箱地址' },
    { type: 'email', message: '邮箱格式不正确' }
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码至少6位' }
  ]
}

const handleLogin = async () => {
  loading.value = true
  try {
    console.log('开始登录...', loginForm.email)
    const success = await authStore.login(loginForm.email, loginForm.password)
    console.log('登录结果:', success)
    console.log('认证状态:', authStore.isAuthenticated)
    
    if (success) {
      console.log('登录成功，准备跳转到 /dashboard')
      // 使用 nextTick 确保状态更新完成后再跳转
      await nextTick()
      console.log('跳转前的认证状态:', authStore.isAuthenticated)
      await router.push('/dashboard')
      console.log('跳转完成')
    } else {
      console.log('登录失败')
    }
  } catch (error) {
    console.error('登录过程中出错:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed;
}

.login-card {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h2 {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.login-header p {
  color: #6b7280;
  font-size: 16px;
}

.login-form {
  margin-top: 24px;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.login-footer p {
  color: #8b9197;
  font-size: 14px;
}

.login-footer .note {
  color: #f56565;
  font-size: 12px;
  margin-top: 8px;
}
</style>