import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import log from 'electron-log';
import { startMCPServer } from './mcp';
import { setupConfigIpcHandlers } from './config/ipc-handlers';
import { setupAppInfoIpcHandlers } from './app-info/ipc-handlers';
import { setupWindowControlIpcHandlers } from './window/ipc-handlers';
import { setupMCPIpcHandlers } from './mcp/ipc-handlers';
import { setupUpdaterIpcHandlers } from './updater/ipc-handlers';
import { setupRuntimeIpcHandlers } from './runtime/ipc-handlers';
import { updateManager } from './updater';
import { windowManager } from './window';
import { menuManager } from './menu';
import { configManager } from './config/ConfigManager';

// 配置 electron-log
log.transports.console.level = 'debug';
log.transports.file.level = 'silly';
log.transports.file.maxSize = 1002430; // 10M

log.initialize({ preload: true });

// 在开发模式下，确保日志也输出到控制台
if (process.env.NODE_ENV === 'development') {
  log.transports.console.level = 'debug';
}

log.info('Electron is starting...');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  log.info(`Electron is starting...${app.getVersion()}`);
  app.quit();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  log.debug('Electron is ready...');

  // 创建主窗口和系统托盘
  windowManager.createMainWindow();
  windowManager.createSystemTray();
  
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // 如果正在退出或者不是 macOS，则退出应用
  if (windowManager.getIsQuitting() || process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.showMainWindow();
  }
});

// 在应用退出前清理资源
app.on('before-quit', () => {
  windowManager.destroyTray();
});


/**
 * 管理系统自启动设置
 */
function manageAutoStart() {
  const autoStart = configManager.get('general', 'autoStart');
  
  if (process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux') {
    const currentAutoStart = app.getLoginItemSettings().openAtLogin;
    
    if (autoStart !== currentAutoStart) {
      app.setLoginItemSettings({
        openAtLogin: autoStart,
        openAsHidden: autoStart // 自启动时隐藏窗口
      });
      log.info(`Auto start ${autoStart ? 'enabled' : 'disabled'}`);
    }
  }
}

app.whenReady().then(async () => {
  log.info('Electron is ready, setting up configuration...');
  
  // 管理自启动设置
  manageAutoStart();
  
  // 设置应用菜单
  menuManager.setupApplicationMenu();
  
  // 设置配置 IPC 处理器
  setupConfigIpcHandlers();
  
  // 设置应用信息 IPC 处理器
  setupAppInfoIpcHandlers();
  
  // 设置窗口控制 IPC 处理器
  setupWindowControlIpcHandlers();
  
  // 设置MCP IPC 处理器
  setupMCPIpcHandlers();
  
  // 设置运行时 IPC 处理器
  setupRuntimeIpcHandlers();
  
  // 设置更新 IPC 处理器
  setupUpdaterIpcHandlers();
  
  log.info('Starting MCP Server...');
  startMCPServer();
  
  // 设置自动更新管理器
  log.info('Setting up update manager...');
  const mainWindow = windowManager.getMainWindow();
  if (mainWindow) {
    updateManager.setup(mainWindow);
    
    // 只在生产环境中自动检查更新
    if (!updateManager.isDevelopmentMode()) {
      // 应用启动后延迟检查更新（避免阻塞启动）
      setTimeout(() => {
        log.info('Checking for updates...');
        updateManager.checkForUpdates().catch(err => {
          log.error('Error checking for updates on startup:', err);
        });
      }, 5000); // 5秒后检查更新
    } else {
      log.debug('Update manager setup complete for development mode (mock mode)');
    }
  } else {
    log.error('Main window not available for update manager setup');
  }
});