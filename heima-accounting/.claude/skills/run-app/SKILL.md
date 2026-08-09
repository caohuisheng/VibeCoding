---
name: run
description: 启动并运行黑马记账桌面应用（Tauri + React + TypeScript）
---

# 运行黑马记账

此技能用于在本地开发环境启动黑马记账桌面应用。

## 前置条件检查

在运行之前，确保以下工具已安装：

1. **Node.js** — `node --version`
2. **Rust 工具链** — `rustc --version` 和 `cargo --version`

如果缺少任何一项，告知用户并停止。

## 检查依赖安装

运行前确保依赖已安装：

```
node_modules/ 存在 → 跳过
不存在 → npm install
```

如果 `src-tauri/target/` 不存在，首次编译 Rust 依赖需要 3-5 分钟，告知用户耐心等待。

## 启动命令

```bash
npm run tauri dev
```

此命令会：
1. 启动 Vite 前端开发服务器（默认 `http://localhost:5173`）
2. 编译 Rust 后端代码（首次较慢，后续增量编译秒级完成）
3. 自动打开黑马记账桌面窗口（420×780，居中显示）

## 启动后

- 确认 Vite 输出 `ready in xxx ms` 表示前端就绪
- 确认 Rust 输出 `Running target\debug\heima-accounting.exe` 表示桌面窗口已打开
- 如有编译警告（warning）通常不影响运行，告知用户即可
- 如有编译错误（error），完整读取错误信息告知用户

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `cargo: command not found` | 未安装 Rust | 访问 https://rustup.rs 安装 |
| Rust 编译失败 | 缺少 Windows 构建工具 | 安装 Visual Studio Build Tools 或 Windows SDK |
| 端口 5173 被占用 | 其他 Vite 实例在运行 | 关闭其他实例后重试 |
| Tauri 窗口白屏 | 前端未就绪 | 等待 Vite 完全启动后自动刷新 |
