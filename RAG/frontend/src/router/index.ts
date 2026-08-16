import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
    { path: '/', name: 'chat', component: () => import('../views/Chat.vue'), meta: { requiresAuth: true } },
    {
      path: '/knowledge',
      name: 'knowledge',
      component: () => import('../views/KnowledgeBase.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    { path: '/profile', name: 'profile', component: () => import('../views/Profile.vue'), meta: { requiresAuth: true } },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) return { path: '/login' }
  if (to.meta.requiresAdmin) {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user?.role !== 'admin') return { path: '/' }
  }
  return true
})

export default router
