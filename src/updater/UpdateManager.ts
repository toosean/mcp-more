import { BrowserWindow, dialog } from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { MockAutoUpdater } from './MockAutoUpdater';
import { updateEventSender } from './index';
import { CancellationToken } from "electron-updater"

type UpdaterInstance = typeof autoUpdater | MockAutoUpdater;

/**
 * 更新管理器类
 * 统一管理真实和模拟的更新逻辑
 */
export class UpdateManager {
  private updater: UpdaterInstance;
  private isDevelopment: boolean;
  private isSetup: boolean = false;
  private downloadcancellationToken: CancellationToken | null = null;
  private pendingUpdateInfo: any = null;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.updater = this.isDevelopment ? new MockAutoUpdater() : autoUpdater;
    
    log.info(`UpdateManager initialized in ${this.isDevelopment ? 'development' : 'production'} mode`);
  }

  /**
   * 设置更新管理器
   * @param mainWindow 主窗口实例
   */
  setup(mainWindow: BrowserWindow): void {
    if (this.isSetup) {
      log.warn('UpdateManager is already set up');
      return;
    }

    // 配置日志
    this.updater.logger = log;
    
    // 不要自动下载，先询问用户
    this.updater.autoDownload = false;

    // not supported, because electron-updater and electron-forge are not compatible
    this.updater.disableDifferentialDownload = true; 

    
    // 设置主窗口引用给事件发送器
    updateEventSender.setMainWindow(mainWindow);
    
    // 设置事件监听器
    this.setupEventHandlers(mainWindow);
    
    this.isSetup = true;
    log.info('UpdateManager setup completed');
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(mainWindow: BrowserWindow): void {
    // 检查更新可用时
    this.updater.on('update-available', (info) => {
      log.info('Update available:', info);
      
      if (!mainWindow) {
        log.warn('Main window not available for update notification');
        return;
      }
      
      // 存储更新信息供后续使用
      this.pendingUpdateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes as string
      };
      
      // 检查主窗口是否有焦点
      updateEventSender.updateAvailable({
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes as string
      });
      
    });
    
    // 更新下载完成时
    this.updater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      
      // 隐藏下载遮罩
      updateEventSender.hideUpdateOverlay();
      
      // 发送下载完成事件
      updateEventSender.downloadComplete();

      // 如果是开发模式，显示完成对话框而不是立即安装
      if (this.isDevelopment) {
        setTimeout(() => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '🔧 开发模式 - 更新模拟完成',
            message: '模拟更新已下载完成！\n\n在生产环境中，应用会自动重启完成更新。',
            buttons: ['确定']
          });
        }, 1000);
      } else {
        // 生产环境立即安装更新
        autoUpdater.quitAndInstall();
      }
    });
    
    // 检查更新时没有可用更新
    this.updater.on('update-not-available', (info) => {
      log.info('Update not available:', info);
    });
    
    // 更新出错时
    this.updater.on('error', (err) => {
      log.error('Auto updater error:', err);
      
      // 隐藏下载遮罩
      updateEventSender.hideUpdateOverlay();
      
      // 发送错误事件
      updateEventSender.updateError(err.message);
    });
    
    // 检查更新进度
    this.updater.on('download-progress', (progressObj) => {

      if(progressObj.percent % 10 === 0) {
        let logMessage = `Download Progress: ${progressObj.percent.toFixed(2)}%`;
        logMessage += ` (${progressObj.transferred}/${progressObj.total})`;
        log.info(logMessage);
      }
      
      // 发送进度更新到渲染进程
      updateEventSender.updateProgress({
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    });
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<any> {
    if (!this.isSetup) {
      throw new Error('UpdateManager not set up');
    }
    
    log.info('Manually checking for updates...');
    return this.updater.checkForUpdates();
  }

  /**
   * 取消下载
   */
  async cancelDownload(): Promise<void> {
    if (!this.isSetup) {
      throw new Error('UpdateManager not set up');
    }
    
    log.info('Cancelling update download...');
    
    if (this.isDevelopment) {
      (this.updater as MockAutoUpdater).cancelDownload();
    } else {
      this.downloadcancellationToken?.cancel();
    }
  }

  /**
   * 退出并安装更新
   */
  async quitAndInstall(): Promise<void> {
    if (!this.isSetup) {
      throw new Error('UpdateManager not set up');
    }
    
    log.info('Quitting and installing update...');
    this.updater.quitAndInstall();
  }

  /**
   * 触发模拟更新（仅开发模式）
   */
  async simulateUpdate(): Promise<void> {
    if (!this.isDevelopment) {
      throw new Error('Simulate update is only available in development mode');
    }
    
    if (!this.isSetup) {
      throw new Error('UpdateManager not set up');
    }
    
    log.info('[MOCK] Simulating update process...');
    return (this.updater as MockAutoUpdater).checkForUpdates();
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): object {
    return {
      isDevelopment: this.isDevelopment,
      isSetup: this.isSetup,
      updaterType: this.isDevelopment ? 'MockAutoUpdater' : 'electron-updater',
      ...(this.isDevelopment ? (this.updater as MockAutoUpdater).getDebugInfo() : {})
    };
  }

  /**
   * 获取updater实例（主要用于其他模块访问）
   */
  getUpdaterInstance(): UpdaterInstance {
    return this.updater;
  }

  /**
   * 用户确认下载更新（从渲染进程调用）
   */
  async confirmDownload(): Promise<void> {
    if (!this.isSetup) {
      throw new Error('UpdateManager not set up');
    }
    
    if (!this.pendingUpdateInfo) {
      throw new Error('No pending update available');
    }
    
    log.info('User confirmed download for version:', this.pendingUpdateInfo.version);
    
    // 显示下载遮罩
    updateEventSender.showUpdateOverlay(this.pendingUpdateInfo);
    
    // 开始下载
    if (this.isDevelopment) {
      (this.updater as MockAutoUpdater).downloadUpdate();
    } else {
      this.downloadcancellationToken = new CancellationToken();
      (this.updater as typeof autoUpdater).downloadUpdate(this.downloadcancellationToken);
    }
    
    // 清除待处理的更新信息
    this.pendingUpdateInfo = null;
  }

  /**
   * 检查是否为开发模式
   */
  isDevelopmentMode(): boolean {
    return this.isDevelopment;
  }
}