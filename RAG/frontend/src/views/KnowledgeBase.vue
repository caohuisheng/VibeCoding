<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { api, type Document } from '../api'

const router = useRouter()
const documents = ref<Document[]>([])
const uploading = ref(false)
const uploadRef = ref<any>()
let timer: number | undefined

onMounted(() => {
  loadDocuments()
  timer = window.setInterval(loadDocuments, 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function loadDocuments() {
  const { data } = await api.listDocuments()
  documents.value = data
}

async function beforeUpload(file: File) {
  uploading.value = true
  try {
    await api.uploadDocument(file)
    ElMessage.success('上传成功，正在解析入库')
    loadDocuments()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.detail || '上传失败')
  } finally {
    uploading.value = false
  }
  return false // 阻止 el-upload 默认上传行为
}

async function removeDocument(doc: Document) {
  try {
    await ElMessageBox.confirm(`确定删除文档「${doc.filename}」及其向量数据？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  await api.deleteDocument(doc.id)
  ElMessage.success('已删除')
  loadDocuments()
}

function statusType(s: string) {
  if (s === 'done') return 'success'
  if (s === 'failed') return 'danger'
  if (s === 'processing') return 'warning'
  return 'info'
}
function statusText(s: string) {
  return { pending: '排队中', processing: '解析中', done: '已完成', failed: '失败' }[s] || s
}
function formatSize(n: number) {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="kb-wrap">
    <header class="kb-header">
      <el-button text @click="router.push('/')">← 返回对话</el-button>
      <h2>知识库管理</h2>
      <el-upload
        ref="uploadRef"
        :show-file-list="false"
        :before-upload="beforeUpload"
        accept=".pdf,.docx,.md,.markdown,.txt"
      >
        <el-button type="primary" :icon="UploadFilled" :loading="uploading">上传文档</el-button>
      </el-upload>
    </header>

    <el-card class="kb-card">
      <el-table :data="documents" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="filename" label="文件名" min-width="220" />
        <el-table-column prop="file_type" label="类型" width="80" />
        <el-table-column label="大小" width="100">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="chunk_count" label="分块数" width="90" />
        <el-table-column prop="error" label="错误信息" min-width="160">
          <template #default="{ row }">{{ row.error || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button text type="danger" size="small" @click="removeDocument(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!documents.length" class="empty">暂无文档，点击右上角「上传文档」添加知识库内容</div>
    </el-card>
  </div>
</template>

<style scoped>
.kb-wrap {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}
.kb-header {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
}
.kb-header h2 {
  flex: 1;
  margin: 0;
  font-size: 16px;
  color: #303133;
}
.kb-card {
  margin: 16px;
  flex: 1;
  overflow: auto;
}
.empty {
  text-align: center;
  color: #c0c4cc;
  padding: 40px 0;
}
</style>
