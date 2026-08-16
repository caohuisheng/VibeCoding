<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = ref({ username: '', password: '', confirm: '' })
const loading = ref(false)

async function submit() {
  if (form.value.username.length < 3) {
    ElMessage.warning('用户名至少 3 个字符')
    return
  }
  if (form.value.password.length < 6) {
    ElMessage.warning('密码至少 6 个字符')
    return
  }
  if (form.value.password !== form.value.confirm) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    await auth.register(form.value.username, form.value.password)
    ElMessage.success('注册成功')
    router.push('/')
  } catch (e: any) {
    ElMessage.error(e.response?.data?.detail || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-wrap">
    <el-card class="auth-card">
      <h2 class="title">注册新账号</h2>
      <el-form @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名（3-32 字符）" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码（至少 6 位）" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.confirm" type="password" placeholder="确认密码" size="large" show-password @keyup.enter="submit" />
        </el-form-item>
        <el-button type="primary" size="large" class="submit" :loading="loading" @click="submit">
          注册
        </el-button>
      </el-form>
      <div class="link">
        已有账号？
        <el-link type="primary" @click="router.push('/login')">返回登录</el-link>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.auth-wrap {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #409eff 0%, #2b6cb0 100%);
}
.auth-card {
  width: 400px;
  padding: 10px 20px 20px;
}
.title {
  text-align: center;
  font-size: 18px;
  color: #303133;
  margin-bottom: 20px;
}
.submit {
  width: 100%;
}
.link {
  text-align: center;
  margin-top: 14px;
  font-size: 13px;
  color: #909399;
}
</style>
