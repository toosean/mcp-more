# MCP More

<img src="./assets/icon.png" alt="MCP More Icon" width="256" height="256" />

A modern desktop application for managing **Model Context Protocol (MCP)** servers.

Tired of configuring the same MCP over and over again across different clients like Claude Desktop, Codex, and Gemini? Editing .json files, managing tokens, handling login states - it's such a hassle. With MCP More, configure once and use everywhere. Simple and efficient.

> 🚧 The project is currently in preview stage. You may encounter some minor bugs or incomplete features. We welcome everyone to submit issues and PRs to help make it better together! 🎉

[English](./README.md) | [简体中文 (Chinese)](./README.zh-CN.md)

![License](https://img.shields.io/badge/license-AGPLv3-blue.svg)
![Electron](https://img.shields.io/badge/Electron-38.0.0-green.svg)
![React](https://img.shields.io/badge/React-18.3.1-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-4.8.4-red.svg)

## 📸 Screenshots

<img src="./screenshots/homepage.png" alt="MCP More Screenshot" width="768" />

## ✨ Features

- 🔍 **MCP Market Browsing**: We've curated many excellent MCPs - just one click to start using them.
- 📦 **MCP Management**: If you're like us and frequently use various MCPs to boost productivity, you definitely need a place to manage them all.
- 👤 **Profile Management**: Support multiple profile switching for different scenarios with different MCPs, preventing too many MCPs from overwhelming your context.
- 🌗 **Theme Support**: Light/Dark/System theme auto-switching
- 🌍 **Internationalization**: Multi-language interface support

## 📚 User Guide

There are two ways to install MCPs with MCP More:

### 1. Browse MCP Market

We've collected many popular MCPs and built their installation methods right into the app. Just see an MCP you like and click "Install" to start using it.

### 2. Manual MCP Package

If your desired MCP isn't in our marketplace yet, you can also add it manually. Click "Add MCP Manually" in the "Installed" tab and follow the dialog prompts to get it done.

## 🛠️ Developer Guide

### Tech Stack

* **Framework**: Electron + React
* **Language**: TypeScript
* **Build Tool**: Vite + Electron Forge
* **UI Library**: Radix UI + Tailwind CSS
* **Internationalization**: i18next
* **Logging**: electron-log

### Coding Standards

* Use ESLint for code checks
* Follow TypeScript strict mode
* Functional programming style for components
* IPC communication uses `invoke/handle` pattern

### Debugging

* Main process logs: output via `electron-log` to console and file
* Renderer process: use Chrome DevTools
* Configuration file location can be checked in the app's "Settings"

## 🚀 Getting Started

### Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/toosean/mcp-more.git
   cd mcp-more
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run start
   ```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under AGPLv3 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

* [Model Context Protocol](https://modelcontextprotocol.io/) - Core protocol support
* [Electron](https://electronjs.org/) - Cross-platform desktop framework
* [React](https://reactjs.org/) - UI library
* [Radix UI](https://radix-ui.com/) - Accessible UI components

## 📞 Support

- 🐛 [Report Issues](https://github.com/toosean/mcp-more/issues)
- 📧 Contact author: toosean@gmail.com

---

<div align="center">
Made with ❤️ by <a href="https://github.com/toosean">toosean</a>
</div>  