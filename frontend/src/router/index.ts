import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Overview',
          component: () => import('@/views/Dashboard/Overview.vue')
        },
        {
          path: 'screen-wall',
          name: 'ScreenWall',
          component: () => import('@/views/Dashboard/ScreenWall.vue')
        }
      ]
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [

        {
          path: 'whitelist',
          name: 'WhitelistManagement',
          component: () => import('@/views/Admin/WhitelistManagement.vue')
        },
        {
          path: 'groups',
          name: 'GroupManagement',
          component: () => import('@/views/Admin/GroupManagement.vue')
        }
        // removed client-config route
      ]
    }
  ]
})

// 路由守卫（以本地 token 为准，避免 Ref 判定失真与首次加载状态不同步）
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const hasToken = !!localStorage.getItem('token')

  console.log('路由守卫检查:')
  console.log('- 目标路由:', to.path, to.name)
  console.log('- 来源路由:', from.path, from.name)
  console.log('- 认证状态(store .value):', (authStore as any).isAuthenticated?.value)
  console.log('- 认证状态(token):', hasToken)
  console.log('- 需要认证:', to.meta.requiresAuth)
  console.log('- 需要管理员:', to.meta.requiresAdmin)

  if (to.meta.requiresAuth && !hasToken) {
    console.log('需要认证但未登录，跳转到登录页')
    next('/login')
  } else if (to.meta.requiresAdmin && !hasToken) {
    console.log('需要管理员权限但未登录，跳转到登录页')
    next('/login')
  } else if (to.name === 'Login' && hasToken) {
    console.log('已登录用户访问登录页，跳转到仪表板')
    next('/dashboard')
  } else {
    console.log('路由检查通过，允许访问')
    next()
  }
})

export default router