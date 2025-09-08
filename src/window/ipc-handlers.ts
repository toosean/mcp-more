import { ipcMain } from 'electron';
import { windowManager } from './WindowManager';
import log from 'electron-log';

/**
 * 设置窗口控制相关的 IPC 处理器
 */
export function setupWindowControlIpcHandlers(): void {
  // 最小化窗口
  ipcMain.handle('window:minimize', async () => {
    try {
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.minimize();
      }
    } catch (error) {
      log.error('Error minimizing window:', error);
    }
  });

  // 最大化窗口
  ipcMain.handle('window:maximize', async () => {
    try {
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
      }
    } catch (error) {
      log.error('Error maximizing window:', error);
    }
  });

  // 还原窗口
  ipcMain.handle('window:unmaximize', async () => {
    try {
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.unmaximize();
      }
    } catch (error) {
      log.error('Error unmaximizing window:', error);
    }
  });

  // 关闭窗口
  ipcMain.handle('window:close', async () => {
    try {
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
    } catch (error) {
      log.error('Error closing window:', error);
    }
  });

  // 检查窗口是否最大化
  ipcMain.handle('window:is-maximized', async () => {
    try {
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        return mainWindow.isMaximized();
      }
      return false;
    } catch (error) {
      log.error('Error checking if window is maximized:', error);
      return false;
    }
  });

  log.info('Window control IPC handlers set up');
}