import client from './client'

export interface User {
  id: number
  username: string
  role: string
  created_at: string
}

export interface Conversation {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export interface Citation {
  document_id?: number
  filename: string
  chunk_index: number
  content: string
  score?: number
}

export interface Message {
  id: number
  role: string
  content: string
  citations: Citation[] | null
  feedback: string | null
  created_at: string
}

export interface Document {
  id: number
  filename: string
  file_type: string
  size: number
  status: string
  chunk_count: number
  error: string | null
  created_at: string
}

export const api = {
  // 认证
  login: (username: string, password: string) =>
    client.post('/auth/login', { username, password }),
  register: (username: string, password: string) =>
    client.post('/auth/register', { username, password }),
  me: () => client.get('/auth/me'),
  changePassword: (old_password: string, new_password: string) =>
    client.post('/auth/change-password', { old_password, new_password }),

  // 会话
  listConversations: () => client.get('/conversations'),
  createConversation: (title: string) => client.post('/conversations', { title }),
  renameConversation: (id: number, title: string) =>
    client.patch(`/conversations/${id}`, { title }),
  deleteConversation: (id: number) => client.delete(`/conversations/${id}`),
  listMessages: (id: number) => client.get(`/conversations/${id}/messages`),
  setFeedback: (messageId: number, feedback: string) =>
    client.post(`/messages/${messageId}/feedback`, { feedback }),

  // 知识库文档
  listDocuments: () => client.get('/documents'),
  uploadDocument: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client.post('/documents/upload', form)
  },
  deleteDocument: (id: number) => client.delete(`/documents/${id}`),
}
