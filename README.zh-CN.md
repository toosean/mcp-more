# MCP More

<img src="./assets/icon.png" alt="MCP More 图标" width="256" height="256" />

一个用于管理模型上下文协议（MCP）服务器的现代化桌面应用程序。

也许您平时在用 Claude Desktop、Codex、Gemini 这些 MCP 客户端的时候，每次发现个很棒的 MCP，都要在各个客户端里重复配置一遍，改 .json 文件、管理 Token、登录状态，真是又麻烦又浪费时间。有了 MCP More，只需要配置一次，所有客户端都能直接用，简单高效。

> 🚧 项目目前处于预览阶段，可能还会遇到一些小 BUG 和不完善的地方，欢迎大家积极提 issue 和 PR，一起让它变得更好！🎉

[English](./README.md) | [简体中文 (Chinese)](./README.zh-CN.md)

![License](https://img.shields.io/badge/license-AGPLv3-blue.svg)
![Electron](https://img.shields.io/badge/Electron-38.0.0-green.svg)
![React](https://img.shields.io/badge/React-18.3.1-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-4.8.4-red.svg)

## 📸 截图

<img src="./screenshots/homepage.png" alt="MCP More 图标" width="768" />

## ✨ 特性

- 🔍 **MCP 市场浏览**: 我们精选了很多优秀的 MCP，点一下就能直接用。
- 📦 **MCP 管理**: 如果你和我们一样经常使用各种 MCP 来提升工作效率，那你一定需要个地方来统一管理它们。
- 👤 **Profile 管理**: 支持多 Profile 切换，为不同场景配置不同的 MCP，避免太多 MCP 把你的上下文挤爆。
- 🌗 **主题支持**: 深色/浅色/系统主题自动切换
- 🌍 **国际化**: 支持多语言界面


## 📚 使用指南

使用 MCP More 安装 MCP 有两种方式：

### 1. 浏览 MCP 市场

我们收集了市面上很多热门的 MCP，并把安装方式都内置到应用里了。看到喜欢的 MCP，点个"安装"就能直接用。

### 2. 手动 MCP 包

如果你想要的 MCP 还没收录在我们市场里，也可以手动添加。在"已安装"标签页点击"手动添加 MCP"，按照对话框提示就能搞定。

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
- 📧 联系作者: toosean@gmail.com

---

<div align="center">
Made with ❤️ by <a href="https://github.com/toosean">toosean</a>
</div>