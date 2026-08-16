<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = ref({ old_password: '', new_password: '', confirm: '' })
const loading = ref(false)

async function submit() {
  if (!form.value.old_password || !form.value.new_password) {
    ElMessage.warning('请填写完整')
    return
  }
  if (form.value.new_password.length < 6) {
    ElMessage.warning('新密码至少 6 位')
    return
  }
  if (form.value.new_password !== form.value.confirm) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  loading.value = true
  try {
    await api.changePassword(form.value.old_password, form.value.new_password)
    ElMessage.success('密码修改成功，请重新登录')
    auth.logout()
    router.push('/login')
  } catch (e: any) {
    ElMessage.error(e.response?.data?.detail || '修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="profile-wrap">
    <el-card class="profile-card">
      <div class="head">
        <el-button text @click="router.push('/')">← 返回</el-button>
        <h2>修改密码</h2>
      </div>
      <el-form label-width="80px">
        <el-form-item label="旧密码">
          <el-input v-model="form.old_password" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="form.new_password" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="form.confirm" type="password" show-password @keyup.enter="submit" />
        </el-form-item>
        <el-button type="primary" :loading="loading" @click="submit">确认修改</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.profile-wrap {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}
.profile-card {
  width: 460px;
  padding: 8px 20px 16px;
}
.head {
  text-align: center;
  position: relative;
  margin-bottom: 16px;
}
.head .el-button {
  position: absolute;
  left: 0;
  top: 8px;
}
.head h2 {
  margin: 0;
  color: #303133;
}
</style>
