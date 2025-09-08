import { BrowserWindow, Menu, Tray, nativeImage, app, shell, NativeImage } from 'electron';
import path from 'node:path';
import log from 'electron-log';
import { configManager } from '../config';

import iconPng from '/assets/icon.png';

/**
 * 窗口管理器类
 * 负责管理主窗口、系统托盘和相关的交互逻辑
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private isQuitting = false;

  /**
   * 创建主窗口
   */
  createMainWindow(): BrowserWindow {
    log.debug('Creating main window...');
    // 创建浏览器窗口选项
    const windowOptions: any = {
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false, // 初始不显示，等待启动配置
      // 开发模式下显示原生标题栏，生产模式下使用自定义标题栏
      frame: process.env.NODE_ENV === 'development', 
      fullscreenable: false, // 禁用全屏模式
      icon: iconPng,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    };

    // 添加图标（如果存在）
    const appIcon = this.getAppIcon();
    if (appIcon) {
      windowOptions.icon = appIcon;
    }

    // 创建浏览器窗口
    this.mainWindow = new BrowserWindow(windowOptions);

    // 开发模式下打开开发者工具
    // if (process.env.NODE_ENV === 'development') {
    //   this.mainWindow.webContents.openDevTools();
    // }

    // 加载应用内容
    
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      log.debug('MAIN_WINDOW_VITE_DEV_SERVER_URL', MAIN_WINDOW_VITE_DEV_SERVER_URL);
      this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      // 在生产环境中，渲染器文件位于 .vite/renderer 目录
      const rendererPath = path.join(__dirname, '../renderer', MAIN_WINDOW_VITE_NAME, 'index.html');
      log.debug('rendererPath', rendererPath);
      this.mainWindow.loadFile(rendererPath);
    }

    // 设置窗口事件监听
    this.setupWindowEvents();

    return this.mainWindow;
  }

  /**
   * 创建系统托盘
   */
  createSystemTray(): void {
    log.debug('Creating system tray...');
    if (this.tray) return; // 避免重复创建

    const trayIcon = this.getTrayIcon();
    this.tray = new Tray(trayIcon);

    // 设置托盘提示文本
    this.tray.setToolTip('MCP More - MCP 包管理器');

    // 设置托盘菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => this.showMainWindow(),
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => this.quitApplication(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);

    // 双击托盘图标显示/隐藏窗口
    this.tray.on('double-click', () => {
      this.toggleMainWindow();
    });

    // 右键显示菜单
    this.tray.on('right-click', () => {
      this.tray?.popUpContextMenu();
    });
  }

  /**
   * 显示主窗口
   */
  showMainWindow(): void {
    if (!this.mainWindow) {
      this.createMainWindow();
    }

    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      
      this.mainWindow.show();
      this.mainWindow.focus();
      
      // macOS 特殊处理
      if (process.platform === 'darwin') {
        app.dock?.show();
      }
    }
  }

  /**
   * 隐藏到托盘
   */
  hideToTray(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide();
      
      // macOS 特殊处理
      if (process.platform === 'darwin') {
        app.dock?.hide();
      }
    }
  }

  /**
   * 切换主窗口显示状态
   */
  toggleMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.showMainWindow();
      return;
    }

    if (this.mainWindow.isVisible()) {
      this.hideToTray();
    } else {
      this.showMainWindow();
    }
  }

  /**
   * 处理启动时的窗口状态
   */
  handleStartupState(): void {
    const shouldMinimizeOnStartup = configManager.get('general', 'minimizeOnStartup');
    
    if (shouldMinimizeOnStartup) {
      // 创建托盘（如果还没有创建）
      this.createSystemTray();
      
      // 启动时隐藏到托盘
      this.hideToTray();
    } else {
      // 正常显示窗口
      this.showMainWindow();
    }
  }

  /**
   * 退出应用程序
   */
  quitApplication(): void {
    this.isQuitting = true;
    
    // 清理托盘
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    
    // 关闭所有窗口
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    
    app.quit();
  }

  /**
   * 获取主窗口实例
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * 检查是否正在退出
   */
  getIsQuitting(): boolean {
    return this.isQuitting;
  }

  /**
   * 销毁托盘
   */
  destroyTray(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  /**
   * 设置窗口事件监听
   */
  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    // 窗口准备显示时
    this.mainWindow.once('ready-to-show', () => {
      // 根据配置决定是否显示窗口
      this.handleStartupState();
    });

    // 窗口关闭事件
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting && this.tray) {
        // 如果有托盘且不是退出应用，则隐藏到托盘
        event.preventDefault();
        this.hideToTray();
      }
    });

    // 窗口关闭后清理引用
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 窗口最小化事件（可选：也可以隐藏到托盘）
    this.mainWindow.on('minimize', () => {
      // 根据用户偏好，可以选择最小化到托盘
      const hideOnMinimize = true; // 可以做成配置项
      if (hideOnMinimize && this.tray) {
        this.mainWindow?.hide();
      }
    });

    // 监听窗口最大化状态变化
    this.mainWindow.on('maximize', () => {
      this.mainWindow?.webContents.send('window:maximized', true);
    });

    this.mainWindow.on('unmaximize', () => {
      this.mainWindow?.webContents.send('window:maximized', false);
    });

    // 阻止进入全屏模式
    this.mainWindow.on('enter-full-screen', () => {
      log.warn('Attempted to enter fullscreen mode - preventing');
      // 立即退出全屏
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setFullScreen(false);
      }
    });

    // 监听全屏按键尝试
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      // 阻止 F11 键进入全屏
      if (input.key === 'F11' && input.type === 'keyDown') {
        log.warn('F11 fullscreen key blocked');
        event.preventDefault();
      }
    });
  }

  /**
   * 获取应用图标
   */
  private getAppIcon(): NativeImage | undefined {
    // 在开发环境下，使用源码中的图标
    const isDev = process.env.NODE_ENV === 'development';
    let iconPath: string;
    
    if (isDev) {
      iconPath = path.join(__dirname, '../../src/assets/icon.png');
    } else {
      iconPath = process.platform === 'win32' 
        ? path.join(__dirname, '../assets/icon.ico')
        : path.join(__dirname, '../assets/icon.png');
    }
    
    try {
      const fs = require('fs');
      if (fs.existsSync(iconPath)) {
        return nativeImage.createFromPath(iconPath);
      }
    } catch (error) {
      log.warn('App icon file not found, using default icon');
    }
    
    // 如果图标文件不存在，返回 undefined，让 Electron 使用默认图标
    return undefined;
  }

  /**
   * 获取托盘图标
   */
  private getTrayIcon(): NativeImage {
    // 在开发环境下，使用源码中的图标
    const isDev = process.env.NODE_ENV === 'development';
    let iconPath: string;
    
    if (isDev) {
      // 开发环境使用同一个图标
      iconPath = path.join(__dirname, '/assets/icon.png');
    } else {
      const assetsPath = path.join(__dirname, '../../../assets/');
      log.debug('assetsPath', path.join(__dirname, '../../../assets/'));
      // 生产环境根据平台选择图标
      if (process.platform === 'darwin') {
        iconPath = path.join(assetsPath, 'icon.png');;
      } else if (process.platform === 'win32') {
        iconPath = path.join(assetsPath, 'icon.ico');;
      } else {
        iconPath = path.join(assetsPath, 'icon.png');;
      }
    }
    
    try {
      const fs = require('fs');
      if (fs.existsSync(iconPath)) {
        const icon = nativeImage.createFromPath(iconPath);
        
        // macOS 设置为模板图标（仅在生产环境）
        if (process.platform === 'darwin' && !isDev) {
          icon.setTemplateImage(true);
        }
        
        return icon;
      }
    } catch (error) {
      log.warn('Tray icon file not found, using default icon');
    }
    
    // 如果托盘图标不存在，使用现有的图标或创建默认图标
    const appIcon = this.getAppIcon();
    return appIcon || this.createDefaultTrayIcon();
  }

  /**
   * 创建默认的托盘图标
   */
  private createDefaultTrayIcon(): NativeImage {
    // 创建一个 16x16 的简单图标
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4); // RGBA
    
    // 创建一个简单的圆形图标
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        const dx = x - size / 2;
        const dy = y - size / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= size / 2 - 1) {
          buffer[index] = 100;     // R
          buffer[index + 1] = 150; // G
          buffer[index + 2] = 200; // B
          buffer[index + 3] = 255; // A
        } else {
          buffer[index] = 0;       // R
          buffer[index + 1] = 0;   // G
          buffer[index + 2] = 0;   // B
          buffer[index + 3] = 0;   // A (透明)
        }
      }
    }
    
    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

}

// 导出单例实例
export const windowManager = new WindowManager();