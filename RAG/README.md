# 基于 LangChain 的企业级 RAG 电商知识库问答系统

> 毕业设计项目：基于 **LangChain** 框架，面向电商商品问答的企业级检索增强生成（RAG）知识库问答系统。用户通过浏览器完成知识库管理与知识库问答，回答时引用并高亮显示知识库来源片段。

## 功能特性

- ✅ **知识库管理**（仅管理员）：上传 PDF / Word / Markdown / TXT 文档，自动解析、智能切分、向量化入库；文档列表、删除、解析进度跟踪
- ✅ **知识库问答**：RAG 检索 + 生成，回答中标注引用来源 `[1]`、`[2]`，点击可查看对应知识库片段
- ✅ **多用户多会话**：每个用户拥有独立会话，支持新建 / 重命名 / 删除
- ✅ **会话持久化**：对话记录落库，任意时间登录可找回历史对话
- ✅ **注册 / 登录 / 修改密码**：JWT 认证 + bcrypt 密码哈希
- ✅ **权限控制**：管理员 `admin / 123456` 才能打开知识库管理页，普通用户仅可问答
- ✅ **性能优化**：混合检索、异步入库、流式输出、缓存、限流
- ✅ **附加功能**：问答反馈（👍/👎）、使用统计

## 技术栈

| 层 | 技术 |
|---|---|
| AI 框架 | LangChain 1.x（`langchain` + `langchain-openai` + `langchain-chroma` + `langchain-text-splitters`） |
| 后端 | FastAPI + SQLAlchemy 2.0 + Pydantic v2 |
| 前端 | Vue3 + TypeScript + Vite + Element Plus + Pinia |
| 大模型 | 阿里百炼通义千问 `qwen-plus`（OpenAI 兼容接口） |
| 向量模型 | `text-embedding-v3`（1024 维） |
| 向量库 | Chroma（本地持久化） |
| 关键词检索 | jieba 中文分词 + BM25 |
| 关系库 | SQLite（可一键切换 MySQL / PostgreSQL） |
| 认证 | PyJWT + bcrypt |

## 系统架构

```
前端 SPA（Vue3 + Element Plus）
   ├ 登录 / 注册 / 改密
   ├ 会话列表 + 聊天窗口（引用高亮 + 参考来源）
   └ 知识库管理页（仅 admin）
        │ REST + SSE（流式）
后端（FastAPI + LangChain + SQLAlchemy）
   ├ 认证（JWT + bcrypt）
   ├ 用户 / 会话 / 消息（多用户多会话，持久化）
   ├ 知识库管理（上传 → 解析 → 切分 → 向量化）
   └ RAG 问答（混合检索 → 生成 → 引用来源）
        │
   ┌────┴──────────────┐
   │ Chroma（向量）     │ SQLite（关系数据）
   └───────────────────┘
        │
   阿里百炼 DashScope（qwen-plus + text-embedding-v3）
```

## 目录结构

```
RAG/
├── backend/                 # 后端
│   ├── app/
│   │   ├── main.py          # FastAPI 入口 + 管理员种子
│   │   ├── config.py        # 配置（.env）
│   │   ├── database.py      # SQLAlchemy 引擎/会话
│   │   ├── models/          # ORM：user/conversation/message/document
│   │   ├── schemas/         # Pydantic 请求/响应模型
│   │   ├── api/             # auth/conversations/chat/documents/messages/stats
│   │   ├── core/            # security(JWT+bcrypt)/deps/rate_limit/cache/time
│   │   ├── rag/             # loader/splitter/embeddings/vector_store/retriever/chain/ingestion
│   │   └── services/        # chat_service
│   ├── tests/               # pytest 单元 + 集成测试
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # 前端
│   └── src/
│       ├── api/  stores/  router/  utils/
│       ├── views/           # Login/Register/Chat/KnowledgeBase/Profile
│       └── components/      # ChatMessage
├── .gitignore
└── README.md
```

## 快速开始

### 环境要求

- Python 3.11+（本项目在 3.13 下开发验证）
- Node.js 18+
- 阿里云百炼 API Key（[申请地址](https://bailian.console.aliyun.com/)）

### 1. 后端

```bash
cd backend

# 创建虚拟环境并安装依赖
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt

# 配置环境变量：复制 .env.example 为 .env，填入你的 API Key
cp .env.example .env    # 然后编辑 DASHSCOPE_API_KEY

# 启动服务（默认 http://127.0.0.1:8000）
uvicorn app.main:app --reload
```

首次启动会自动建表并创建管理员账号 `admin / 123456`。可访问 `http://127.0.0.1:8000/docs` 查看接口文档。

### 2. 前端

```bash
cd frontend
npm install
npm run dev    # 默认 http://localhost:5173，已配置 /api 代理到后端
```

浏览器打开 `http://localhost:5173` 即可使用。

## 使用说明

### 管理员（admin / 123456）

1. 登录后，侧边栏出现「知识库管理」入口
2. 进入知识库管理页，上传商品相关文档（PDF/Word/Markdown/TXT）
3. 等待解析入库（状态显示「已完成」）
4. 返回对话页，即可基于知识库进行问答

### 普通用户

1. 注册账号后登录
2. 只能进行知识库问答，无知识库管理权限

## 核心实现说明

### RAG 检索管线

```
用户问题
  ├─ 向量检索（Chroma，语义匹配）
  ├─ BM25 关键词检索（jieba 分词，精确匹配商品名/型号）
  └─ RRF 融合 → top-k 分块 → 拼接上下文 → LLM 流式生成（带引用标注）
```

### 性能优化点

- **混合检索**：语义（向量）+ 关键词（BM25）双路召回，RRF（Reciprocal Rank Fusion）融合，兼顾语义相近与商品名精确匹配
- **中文分词**：jieba 分词解决中文无空格导致 BM25 失效的问题
- **异步入库**：文档解析入库走后台线程，上传接口立即返回，前端轮询进度
- **流式输出**：SSE 打字机效果，降低体感延迟
- **相似问题缓存**：进程内 LRU 缓存相同问题的答案，减少重复 LLM 调用
- **限流**：按用户滑动窗口限流，防止滥用
- **智能切分**：递归切分 + 中文标点分隔符 + 重叠窗口，避免切断语义

### 引用来源展示

检索在生成前完成，故 SSE 首个事件即回传 `sources`（引用片段），前端渲染回答时将 `[1]`、`[2]` 标注替换为可点击徽标，点击定位到「参考来源」面板中的对应片段。

## API 概览

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/api/auth/register` | 注册 | 公开 |
| POST | `/api/auth/login` | 登录 | 公开 |
| GET | `/api/auth/me` | 当前用户 | 登录 |
| POST | `/api/auth/change-password` | 修改密码 | 登录 |
| GET/POST | `/api/conversations` | 会话列表/新建 | 登录 |
| PATCH/DELETE | `/api/conversations/{id}` | 重命名/删除会话 | 登录 |
| GET | `/api/conversations/{id}/messages` | 历史消息 | 登录 |
| POST | `/api/chat/stream` | 流式问答（SSE） | 登录 |
| GET/POST | `/api/documents` | 文档列表/上传 | 管理员 |
| DELETE | `/api/documents/{id}` | 删除文档 | 管理员 |
| POST | `/api/messages/{id}/feedback` | 问答反馈 | 登录 |
| GET | `/api/stats` | 使用统计 | 登录 |

## 测试

```bash
cd backend
.venv\Scripts\python -m pytest tests/ -v
```

覆盖：密码哈希/校验、JWT 签发/篡改检测、RRF 融合、文本切分，以及注册登录、权限守卫、会话 CRUD、统计、未授权访问等 API 集成测试。

## 配置项说明（.env）

| 配置 | 说明 |
|---|---|
| `DASHSCOPE_API_KEY` | 阿里百炼 API Key（必填） |
| `LLM_MODEL` | 对话模型，默认 `qwen-plus`，可选 `qwen-max`/`qwen-turbo` |
| `EMBEDDING_MODEL` | 向量模型，默认 `text-embedding-v3` |
| `DATABASE_URL` | 关系库连接串，默认 SQLite，可切 MySQL/PostgreSQL |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | 切分大小 / 重叠窗口 |
| `RETRIEVAL_K` | 检索返回分块数 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 管理员种子账号 |
