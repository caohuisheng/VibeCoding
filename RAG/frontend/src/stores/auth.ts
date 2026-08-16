import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, type User } from '../api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))

  function setAuth(t: string, u: User) {
    token.value = t
    user.value = u
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function login(username: string, password: string) {
    const { data } = await api.login(username, password)
    setAuth(data.access_token, data.user)
  }

  async function register(username: string, password: string) {
    const { data } = await api.register(username, password)
    setAuth(data.access_token, data.user)
  }

  const isAdmin = () => user.value?.role === 'admin'

  return { token, user, login, register, logout, isAdmin }
})
