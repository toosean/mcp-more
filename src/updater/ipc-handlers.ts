import { ipcMain } from 'electron';
import log from 'electron-log';
import { updateManager } from './index';

/**
 * 设置更新相关的 IPC 处理器
 */
export function setupUpdaterIpcHandlers() {
  log.info('Setting up updater IPC handlers...');

  // 取消下载
  ipcMain.handle('updater:cancel-download', async () => {
    try {
      log.info('Cancelling update download...');
      await updateManager.cancelDownload();
      return { success: true, message: 'Download cancelled' };
    } catch (error) {
      log.error('Error cancelling download:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 用户确认下载更新
  ipcMain.handle('updater:confirm-download', async () => {
    try {
      log.info('User confirmed update download...');
      await updateManager.confirmDownload();
      return { success: true, message: 'Download started' };
    } catch (error) {
      log.error('Error starting download:', error);
      return { success: false, error: (error as Error).message };
    }
  });


  // 开发模式专用：触发模拟更新
  ipcMain.handle('updater:simulate-update', async () => {
    try {
      log.info('[MOCK] Simulating update process...');
      
      if (!updateManager.isDevelopmentMode()) {
        return { success: false, error: 'Simulate update is only available in development mode' };
      }
      
      await updateManager.simulateUpdate();
      return { success: true, message: 'Mock update simulation started' };
    } catch (error) {
      log.error('Error simulating update:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 获取更新管理器调试信息
  ipcMain.handle('updater:get-debug-info', async () => {
    try {
      const debugInfo = updateManager.getDebugInfo();
      return { success: true, debugInfo };
    } catch (error) {
      log.error('Error getting debug info:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  log.info('Updater IPC handlers setup complete');
}