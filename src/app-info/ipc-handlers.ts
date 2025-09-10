import { ipcMain, app, shell } from 'electron';
import log from 'electron-log';
import path from 'path';

/**
 * 设置应用信息相关的 IPC 处理器
 */
export function setupAppInfoIpcHandlers(): void {
  // 获取应用版本
  ipcMain.handle('app-info:get-version', (): string => {
    return app.getVersion();
  });

  // 获取应用名称
  ipcMain.handle('app-info:get-name', (): string => {
    return app.getName();
  });

  // 获取应用路径
  ipcMain.handle('app-info:get-path', (): string => {
    return app.getAppPath();
  });

  // 获取应用是否打包
  ipcMain.handle('app-info:is-packaged', (): boolean => {
    return app.isPackaged;
  });

  // 获取日志目录路径
  ipcMain.handle('app-info:get-logs-path', (): string => {
    // electron-log 的默认日志路径
    // 在开发环境下通常是 ~/.electron/mcp-more/logs
    // 在生产环境下通常是 ~/AppData/Roaming/mcp-more/logs (Windows) 或 ~/Library/Logs/mcp-more (macOS) 或 ~/.config/mcp-more/logs (Linux)
    const logsPath = path.dirname(log.transports.file.getFile().path);
    return logsPath;
  });

  // 在文件管理器中显示日志目录
  ipcMain.handle('app-info:show-logs-directory', async (): Promise<void> => {
    try {
      const logsPath = path.dirname(log.transports.file.getFile().path);
      await shell.openPath(logsPath);
    } catch (error) {
      log.error('Failed to open logs directory:', error);
      throw error;
    }
  });

  // 获取平台信息
  ipcMain.handle('app-info:get-platform', (): string => {
    return process.platform;
  });

  // 在默认浏览器中打开外部链接
  ipcMain.handle('shell:open-external', async (_, url: string): Promise<void> => {
    try {
      await shell.openExternal(url);
    } catch (error) {
      log.error('Failed to open external URL:', url, error);
      throw error;
    }
  });

  log.info('App info IPC handlers set up');
}
