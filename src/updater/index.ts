import { BrowserWindow } from 'electron';
import log from 'electron-log';
import { UpdateManager } from './UpdateManager';

export interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond?: number;
}

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

/**
 * 发送更新事件到渲染进程
 */
export class UpdateEventSender {
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * 发送更新可用事件
   */
  updateAvailable(updateInfo: UpdateInfo) {
    if (!this.mainWindow) {
      log.warn('Main window not available for update available event');
      return;
    }

    log.info('Sending update available event for version:', updateInfo.version);
    this.mainWindow.webContents.send('updater:update-available', updateInfo);
  }

  /**
   * 显示更新下载遮罩
   */
  showUpdateOverlay(updateInfo: UpdateInfo) {
    if (!this.mainWindow) {
      log.warn('Main window not available for update overlay');
      return;
    }

    log.info('Showing update overlay for version:', updateInfo.version);
    this.mainWindow.webContents.send('updater:show-overlay', updateInfo);
  }

  /**
   * 隐藏更新下载遮罩
   */
  hideUpdateOverlay() {
    if (!this.mainWindow) {
      log.warn('Main window not available for update overlay');
      return;
    }

    log.info('Hiding update overlay');
    this.mainWindow.webContents.send('updater:hide-overlay');
  }

  /**
   * 更新下载进度
   */
  updateProgress(progress: UpdateProgress) {
    if (!this.mainWindow) {
      log.warn('Main window not available for progress update');
      return;
    }

    this.mainWindow.webContents.send('updater:progress', progress);
  }

  /**
   * 更新下载完成
   */
  downloadComplete() {
    if (!this.mainWindow) {
      log.warn('Main window not available for download complete');
      return;
    }

    log.info('Update download complete');
    this.mainWindow.webContents.send('updater:download-complete');
  }

  /**
   * 更新出错
   */
  updateError(error: string) {
    if (!this.mainWindow) {
      log.warn('Main window not available for update error');
      return;
    }

    log.error('Update error:', error);
    this.mainWindow.webContents.send('updater:error', error);
  }
}

// 导出单例实例
export const updateEventSender = new UpdateEventSender();
export const updateManager = new UpdateManager();

// 导出类型和类（用于类型检查和扩展）
export { UpdateManager } from './UpdateManager';
export { MockAutoUpdater } from './MockAutoUpdater';