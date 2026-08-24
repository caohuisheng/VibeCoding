# AI 健康报告服务

公司健康管理小程序在用户完成图像采集后，需要调用外部 AI 模型生成健康分析报告。本服务是一个**最小可运行的后端**，负责接收分析请求、记录任务状态，并供调用方查询处理进度与结果。

模型本身用**模拟 AI** 实现（无需接入真实模型）：延迟若干秒返回报告文本，并支持演示一次处理失败。

## 技术栈

- Java 17 + Spring Boot 3.1.x（Spring Web）
- 内存字典存储（`ConcurrentHashMap`，无数据库、无外部中间件）
- Spring `@Async` 异步处理

## 设计说明

- **异步处理**：外部 AI "通常数秒返回、也可能超时/失败"，若同步则 HTTP 请求会长时间阻塞。因此创建接口受理后立即返回任务信息（状态为「等待处理」），由后台线程异步调用模拟 AI，调用方通过查询接口轮询进度与结果。
- **任务状态机**：`PENDING`（等待处理）→ `PROCESSING`（处理中）→ `SUCCESS`（成功）/ `FAILED`（失败）。
- **幂等去重**：以 `userId + ":" + fileKey` 作为业务请求唯一键，同一用户重复提交同一文件不会重复创建任务或重复调用 AI。
- **模拟失败**：文件标识 `fileKey` 包含关键字 `fail`（忽略大小写）时，模拟 AI 处理失败，任务进入「失败」。

## 运行

前置：JDK 17、Maven 3.5+。

```bash
# 构建与测试
mvn test

# 启动（默认端口 8080）
mvn spring-boot:run
```

> 若本机 `JAVA_HOME` 指向 JDK 8/11，可临时指定 JDK 17，例如：
> `JAVA_HOME=/path/to/jdk17 mvn test`

## 接口

### 创建分析任务

`POST /api/tasks`

请求体：

```json
{
  "userId": "u1",
  "fileKey": "img-001.jpg",
  "fileName": "正面照"
}
```

- `userId`（必填）：用户标识
- `fileKey`（必填）：待分析文件唯一标识（用于幂等去重）
- `fileName`（选填）：文件名

返回 `202`：

```json
{
  "id": "3f2c...",
  "userId": "u1",
  "fileKey": "img-001.jpg",
  "fileName": "正面照",
  "status": "PENDING",
  "statusLabel": "等待处理",
  "report": null,
  "error": null,
  "createdAt": "2026-08-24T03:00:00Z",
  "updatedAt": "2026-08-24T03:00:00Z"
}
```

### 查询任务

`GET /api/tasks/{id}`

- 成功：`status` 为 `SUCCESS`，`report` 为报告文本。
- 失败：`status` 为 `FAILED`，`error` 为失败原因。
- 不存在：返回 `404`。

### 错误格式

统一错误响应体：`{ "code": 400, "message": "...", "path": "/api/tasks", "timestamp": "..." }`

## 演示步骤

```bash
# 1. 创建任务（正常成功）
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","fileKey":"img-001.jpg"}'
# → 返回 202 与 taskId（status=PENDING）

# 2. 轮询结果（约 3 秒后为 SUCCESS，含 report）
curl http://localhost:8080/api/tasks/{taskId}

# 3. 重复提交：再次 POST 相同 userId+fileKey → 返回同一 taskId，不重复调用 AI

# 4. 演示失败：fileKey 含 "fail"
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","fileKey":"fail-case.jpg"}'
# → 轮询后 status=FAILED，含 error

# 5. 异常：缺 userId / fileKey → 400；查询不存在 id → 404
```

## 目录结构

```
HeathManage/
├── pom.xml
└── src/
    ├── main/java/com/healthmanage/report/
    │   ├── HealthReportApplication.java   # 入口（@EnableAsync）
    │   ├── config/AsyncConfig.java        # 异步线程池
    │   ├── controller/TaskController.java # 创建/查询接口
    │   ├── dto/                           # 请求/响应 DTO
    │   ├── model/                         # TaskStatus 枚举、AnalysisTask 实体
    │   ├── store/TaskStore.java           # 内存存储 + 幂等索引
    │   ├── service/                       # TaskService / ReportProcessor / MockAiService
    │   └── exception/                     # 全局异常处理
    ├── main/resources/application.yml     # 端口、模拟 AI 配置
    └── test/                              # 单元测试 + 集成测试
```
