# MCP More

<img src="./assets/icon.png" alt="MCP More 图标" width="128" height="128" />

一个用于管理模型上下文协议（MCP）服务器的现代化桌面应用程序。

[English](./README.md) | [简体中文 (Chinese)](./README.zh-CN.md)

![License](https://img.shields.io/badge/license-AGPLv3-blue.svg)
![Electron](https://img.shields.io/badge/Electron-38.0.0-green.svg)
![React](https://img.shields.io/badge/React-18.3.1-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-4.8.4-red.svg)

## 📸 截图

<img src="./screenshots/homepage.png" alt="MCP More 图标" width="768" />

## ✨ 特性

- 🔍 **MCP 市场浏览**: 从内置市场发现和安装 MCP 包
- 📦 **包管理**: 轻松安装、启用/禁用和配置 MCP 包
- 🔧 **多种连接方式**: 支持 WebSocket、HTTP/SSE 和本地进程连接
- 🌗 **主题支持**: 深色/浅色/系统主题自动切换
- 🌍 **国际化**: 支持多语言界面

## 📋 系统要求

- **操作系统**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Node.js**: 16.x 或更高版本
- **NPM**: 7.x 或更高版本

## 🚀 快速开始

### 开发环境设置

1. **克隆项目**
   ```bash
   git clone https://github.com/toosean/mcp-more.git
   cd mcp-more
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run start
   ```

### 构建和打包

```bash
# 代码检查
npm run lint

# 打包应用程序
npm run package

# 创建安装包
npm run make

# 发布到 GitHub
npm run publish
```

## 🏗️ 项目架构

### 核心组件

- **主进程 (`src/main.ts`)**: Electron 应用生命周期管理
- **渲染进程 (`src/renderer/`)**: React 用户界面
- **预加载脚本 (`src/preload.ts`)**: 安全的 IPC 通信桥梁

### MCP 管理系统

```
src/mcp/
├── services/
│   ├── mcpClientManager.ts    # MCP 客户端管理
│   ├── toolRegistry.ts        # 工具注册表
│   └── sessionManager.ts      # 会话管理
├── interfaces/                # 类型定义
└── utils/                     # 工具函数
```

### UI 组件结构

```
src/renderer/
├── components/
│   ├── layout/                # 布局组件
│   ├── mcp/                   # MCP 相关组件
│   └── ui/                    # 基础 UI 组件
├── pages/                     # 页面组件
├── hooks/                     # 自定义 Hooks
└── services/                  # 前端服务
```

## 🔧 配置

### MCP 包配置

MCP 包支持三种连接方式：

#### 1. WebSocket 连接
```json
{
  "identifier": "my-websocket-mcp",
  "name": "My WebSocket MCP",
  "enabled": true,
  "config": {
    "url": "ws://localhost:8080"
  }
}
```

#### 2. HTTP/SSE 连接
```json
{
  "identifier": "my-http-mcp",
  "name": "My HTTP MCP",
  "enabled": true,
  "config": {
    "url": "https://api.example.com/mcp"
  }
}
```

#### 3. 本地进程
```json
{
  "identifier": "my-local-mcp",
  "name": "My Local MCP",
  "enabled": true,
  "config": {
    "command": "python /path/to/mcp-server.py",
    "environment": {
      "API_KEY": "your-api-key"
    }
  }
}
```

### 应用设置

应用配置存储在平台特定位置：
- **Windows**: `%APPDATA%/mcp-more/config.json`
- **macOS**: `~/Library/Preferences/mcp-more/config.json`
- **Linux**: `~/.config/mcp-more/config.json`

## 📚 使用指南

### 1. 浏览 MCP 市场
- 启动应用后默认进入市场页面
- 浏览可用的 MCP 包
- 查看包的详细信息、描述和工具

### 2. 安装 MCP 包
- 在市场中点击"安装"按钮
- 或在"浏览"页面手动添加 MCP 包
- 配置连接参数（URL 或命令）

### 3. 管理已安装的包
- 在"已安装"页面查看所有包
- 启用/禁用包
- 查看工具调用统计

### 4. 配置应用设置
- 在"设置"页面调整主题、语言等选项
- 配置自启动和系统托盘选项
- 管理遥测和统计设置

## 🛠️ 开发指南

### 技术栈

- **框架**: Electron + React
- **语言**: TypeScript
- **构建工具**: Vite + Electron Forge
- **UI 库**: Radix UI + Tailwind CSS
- **国际化**: i18next
- **日志**: electron-log

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 TypeScript 严格模式
- 组件使用函数式编程风格
- IPC 通信采用 invoke/handle 模式

### 调试

- 主进程日志：`electron-log` 输出到控制台和文件
- 渲染进程：使用 Chrome DevTools
- 配置文件位置可通过应用内"设置"页面查看

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 AGPLv3 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Model Context Protocol](https://modelcontextprotocol.io/) - 核心协议支持
- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Radix UI](https://radix-ui.com/) - 无障碍 UI 组件

## 📞 支持

- 🐛 [报告问题](https://github.com/toosean/mcp-more/issues)
- 💬 [讨论和建议](https://github.com/toosean/mcp-more/discussions)
- 📧 联系作者: toosean@gmail.com

---

<div align="center">
Made with ❤️ by <a href="https://github.com/toosean">toosean</a>
</div>