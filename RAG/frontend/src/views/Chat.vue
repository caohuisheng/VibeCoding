<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Setting, DataAnalysis, SwitchButton } from '@element-plus/icons-vue'
import { api, type Conversation, type Message } from '../api'
import { useAuthStore } from '../stores/auth'
import ChatMessage from '../components/ChatMessage.vue'

const auth = useAuthStore()
const router = useRouter()

const conversations = ref<Conversation[]>([])
const currentId = ref<number | null>(null)
const messages = ref<Message[]>([])
const input = ref('')
const streaming = ref(false)
const scrollBox = ref<HTMLElement>()

onMounted(loadConversations)

async function loadConversations() {
  const { data } = await api.listConversations()
  conversations.value = data
}

function newChat() {
  currentId.value = null
  messages.value = []
}

async function selectConversation(c: Conversation) {
  currentId.value = c.id
  const { data } = await api.listMessages(c.id)
  messages.value = data
  scrollToBottom()
}

async function removeConversation(c: Conversation) {
  try {
    await ElMessageBox.confirm('确定删除该会话及其历史记录？', '提示', { type: 'warning' })
  } catch {
    return
  }
  await api.deleteConversation(c.id)
  if (currentId.value === c.id) newChat()
  loadConversations()
}

async function send() {
  const q = input.value.trim()
  if (!q || streaming.value) return
  input.value = ''
  messages.value.push({ id: 0, role: 'user', content: q, citations: null, feedback: null, created_at: '' })
  const aiMsg = reactive<Message>({ id: 0, role: 'assistant', content: '', citations: [], feedback: null, created_at: '' })
  messages.value.push(aiMsg)
  streaming.value = true
  scrollToBottom()

  try {
    const resp = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ conversation_id: currentId.value, message: q }),
    })
    if (!resp.ok || !resp.body) throw new Error('请求失败 ' + resp.status)

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data: ')) continue
        const payload = t.slice(6)
        if (payload === '[DONE]') continue
        let ev: any
        try {
          ev = JSON.parse(payload)
        } catch {
          continue
        }
        if (ev.type === 'sources') {
          aiMsg.citations = ev.data
        } else if (ev.type === 'token') {
          aiMsg.content += ev.data
          scrollToBottom()
        } else if (ev.type === 'done') {
          currentId.value = ev.data.conversation_id
          aiMsg.id = ev.data.message_id
          loadConversations()
        } else if (ev.type === 'error') {
          aiMsg.content = '出错了：' + ev.data
        }
      }
    }
  } catch (e: any) {
    aiMsg.content = '请求出错：' + (e.message || e)
    ElMessage.error(aiMsg.content)
  } finally {
    streaming.value = false
    scrollToBottom()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollBox.value) scrollBox.value.scrollTop = scrollBox.value.scrollHeight
  })
}

async function onFeedback(m: Message, val: string) {
  if (!m.id) return
  try {
    await api.setFeedback(m.id, val)
    m.feedback = val
  } catch (e: any) {
    ElMessage.error(e.response?.data?.detail || '操作失败')
  }
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="brand">电商知识库问答</div>
      <el-button class="new-btn" type="primary" :icon="Plus" @click="newChat">新建会话</el-button>

      <div class="conv-list">
        <div
          v-for="c in conversations"
          :key="c.id"
          class="conv-item"
          :class="{ active: c.id === currentId }"
          @click="selectConversation(c)"
        >
          <span class="conv-title">{{ c.title }}</span>
          <el-icon class="conv-del" @click.stop="removeConversation(c)"><Delete /></el-icon>
        </div>
        <div v-if="!conversations.length" class="empty">暂无会话，点击「新建会话」开始</div>
      </div>

      <div class="sidebar-footer">
        <div class="user-info">
          <span>{{ auth.user?.username }}</span>
          <el-tag v-if="auth.isAdmin()" size="small" type="warning">管理员</el-tag>
        </div>
        <div class="actions">
          <el-button v-if="auth.isAdmin()" text size="small" :icon="DataAnalysis" @click="router.push('/knowledge')">
            知识库管理
          </el-button>
          <el-button text size="small" :icon="Setting" @click="router.push('/profile')">修改密码</el-button>
          <el-button text size="small" :icon="SwitchButton" @click="logout">退出</el-button>
        </div>
      </div>
    </aside>

    <!-- 主区域 -->
    <main class="main">
      <header class="main-header">
        <span class="title">
          {{ currentId ? conversations.find((c) => c.id === currentId)?.title || '对话' : '新对话' }}
        </span>
      </header>

      <div ref="scrollBox" class="messages">
        <div v-if="!messages.length" class="welcome">
          <h2>你好，我是电商知识库智能客服 👋</h2>
          <p>可以问我关于商品参数、价格、功能等方面的问题</p>
        </div>
        <ChatMessage v-for="(m, i) in messages" :key="i" :message="m" @feedback="(v) => onFeedback(m, v)" />
      </div>

      <footer class="input-bar">
        <el-input
          v-model="input"
          type="textarea"
          :rows="3"
          resize="none"
          placeholder="输入问题，回车发送，Shift+Enter 换行"
          @keydown.enter.exact.prevent="send"
        />
        <el-button type="primary" :loading="streaming" @click="send">发送</el-button>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  padding: 14px;
  box-sizing: border-box;
}
.brand {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 12px;
  text-align: center;
}
.new-btn {
  width: 100%;
  margin-bottom: 12px;
}
.conv-list {
  flex: 1;
  overflow-y: auto;
}
.conv-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: #303133;
  font-size: 13px;
  margin-bottom: 4px;
}
.conv-item:hover {
  background: #f5f7fa;
}
.conv-item.active {
  background: #ecf5ff;
  color: #409eff;
}
.conv-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-del {
  display: none;
  color: #909399;
}
.conv-item:hover .conv-del {
  display: inline-block;
}
.conv-del:hover {
  color: #f56c6c;
}
.empty {
  color: #c0c4cc;
  font-size: 12px;
  text-align: center;
  margin-top: 20px;
}
.sidebar-footer {
  border-top: 1px solid #e4e7ed;
  padding-top: 10px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
}
.actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.main-header {
  height: 52px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: #fff;
}
.title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
.welcome {
  text-align: center;
  color: #909399;
  margin-top: 15%;
}
.welcome h2 {
  color: #303133;
}
.input-bar {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
  align-items: flex-end;
}
.input-bar .el-button {
  height: 76px;
}
</style>
