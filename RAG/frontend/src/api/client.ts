import axios from 'axios'
import router from '../router'

const client = axios.create({ baseURL: '/api', timeout: 120000 })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && router.currentRoute.value.path !== '/login') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
    return Promise.reject(err)
  }
)

export default client
