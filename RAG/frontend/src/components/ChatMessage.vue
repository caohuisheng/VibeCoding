<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { renderMarkdown } from '../utils/markdown'
import type { Message } from '../api'

const props = defineProps<{ message: Message }>()
const emit = defineEmits<{ feedback: [val: 'up' | 'down'] }>()

const showSources = ref(false)
const activeSource = ref(-1)
const sourceList = ref<HTMLElement>()

const html = computed(() =>
  renderMarkdown(props.message.content, props.message.citations?.length ?? 0)
)

function onContentClick(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest('.cite-badge') as HTMLElement | null
  if (!el) return
  const idx = Number(el.dataset.cite) - 1
  activeSource.value = idx
  showSources.value = true
  nextTick(() => {
    sourceList.value
      ?.querySelector(`[data-idx="${idx}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function setFeedback(val: 'up' | 'down') {
  emit('feedback', val)
}
</script>

<template>
  <div class="msg" :class="message.role">
    <div class="avatar">{{ message.role === 'user' ? '我' : 'AI' }}</div>
    <div class="bubble">
      <div v-if="message.role === 'user'" class="content">{{ message.content }}</div>
      <div v-else class="content markdown" v-html="html" @click="onContentClick"></div>

      <div
        v-if="message.role === 'assistant' && message.citations?.length"
        class="sources"
      >
        <el-button text size="small" type="primary" @click="showSources = !showSources">
          参考来源（{{ message.citations.length }}）
        </el-button>
        <div v-if="showSources" ref="sourceList" class="source-list">
          <div
            v-for="(c, i) in message.citations"
            :key="i"
            :data-idx="i"
            class="source-item"
            :class="{ active: i === activeSource }"
          >
            <div class="source-head">
              <span class="source-idx">{{ i + 1 }}.</span>
              <span class="source-file">{{ c.filename }}</span>
              <span v-if="c.score != null" class="source-score">相关度 {{ c.score.toFixed(4) }}</span>
            </div>
            <div class="source-content">{{ c.content }}</div>
          </div>
        </div>
      </div>

      <div v-if="message.role === 'assistant' && message.id" class="feedback">
        <el-button text size="small" :type="message.feedback === 'up' ? 'primary' : ''" @click="setFeedback('up')">👍 有用</el-button>
        <el-button text size="small" :type="message.feedback === 'down' ? 'danger' : ''" @click="setFeedback('down')">👎 无用</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}
.msg.user {
  flex-direction: row-reverse;
}
.avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.msg.user .avatar {
  background: #67c23a;
}
.bubble {
  max-width: 76%;
}
.msg.user .bubble {
  display: flex;
  justify-content: flex-end;
}
.content {
  padding: 10px 14px;
  border-radius: 10px;
  background: #fff;
  line-height: 1.7;
  font-size: 14px;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.msg.user .content {
  background: #409eff;
  color: #fff;
}
.markdown :deep(p) {
  margin: 0 0 8px;
}
.markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.markdown :deep(pre) {
  background: #f6f8fa;
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
}
.markdown :deep(code) {
  background: #f0f2f5;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
}
.markdown :deep(.cite-badge) {
  color: #409eff;
  cursor: pointer;
  font-weight: 600;
  margin: 0 1px;
}
.markdown :deep(.cite-badge:hover) {
  text-decoration: underline;
}
.sources {
  margin-top: 8px;
}
.source-list {
  margin-top: 8px;
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.source-item {
  border: 1px solid #e4e7ed;
  border-left: 3px solid #409eff;
  border-radius: 6px;
  padding: 8px 10px;
  background: #fff;
  transition: background 0.2s;
}
.source-item.active {
  background: #ecf5ff;
  border-color: #409eff;
}
.source-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}
.source-idx {
  color: #409eff;
  font-weight: 600;
}
.source-file {
  font-weight: 600;
  color: #303133;
}
.source-score {
  margin-left: auto;
  color: #909399;
  font-size: 11px;
}
.source-content {
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
  max-height: 90px;
  overflow-y: auto;
  white-space: pre-wrap;
}
.feedback {
  margin-top: 6px;
  display: flex;
  gap: 4px;
}
</style>
