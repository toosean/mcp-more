import log from 'electron-log';

export interface MockUpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface MockProgressInfo {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond?: number;
}

/**
 * 模拟的 autoUpdater 类，用于开发模式
 */
export class MockAutoUpdater {
  public logger: any = null;
  public autoDownload: boolean = false;
  public disableDifferentialDownload: boolean = true;
  private downloadIntervalId: NodeJS.Timeout | null = null;
  private listeners: Record<string, Function[]> = {};

  /**
   * 添加事件监听器
   */
  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * 发送事件到所有监听器
   */
  private emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(...args);
        } catch (err) {
          log.error('Error in mock autoUpdater event handler:', err);
        }
      });
    }
  }

  /**
   * 取消当前下载
   */
  cancelDownload(): void {
    if (this.downloadIntervalId) {
      clearInterval(this.downloadIntervalId);
      this.downloadIntervalId = null;
      log.info('[MOCK] Download cancelled');
    }
  }

  /**
   * 模拟检查更新
   */
  async checkForUpdates(): Promise<void> {
    log.info('[MOCK] Checking for updates...');
    
    // 模拟检查延迟
    setTimeout(() => {
      // 模拟有更新可用
      const mockUpdateInfo: MockUpdateInfo = {
        version: '1.0.1-dev',
        releaseDate: new Date().toISOString(),
        releaseNotes: `这是一个开发模式下的模拟更新

新功能:
- ✨ 更新下载遮罩界面
- 🎨 改进的进度显示
- 🚀 更好的用户体验
- 🛡️ 增强的错误处理

修复:
- 🐛 修复了一些已知问题
- 🔧 优化了性能表现
- 📱 改进了响应式设计

技术改进:
- 🏗️ 重构了更新管理架构
- 📝 添加了详细的日志记录
- 🎯 改进了开发者体验`
      };
      
      this.emit('update-available', mockUpdateInfo);
    }, 1000);
  }

  /**
   * 模拟下载更新
   */
  async downloadUpdate(): Promise<void> {
    log.info('[MOCK] Starting update download...');
    
    // 清理之前的下载（如果有）
    if (this.downloadIntervalId) {
      clearInterval(this.downloadIntervalId);
    }
    
    // 模拟下载进度
    const totalSize = 8388608; // 8MB
    let transferred = 0;
    const chunkSize = 163840; // 160KB per chunk
    const interval = 100; // 100ms per chunk
    
    this.downloadIntervalId = setInterval(() => {
      transferred += chunkSize;
      const percent = Math.min((transferred / totalSize) * 100, 100);
      
      const progressInfo: MockProgressInfo = {
        percent,
        transferred: Math.min(transferred, totalSize),
        total: totalSize,
        bytesPerSecond: chunkSize * (1000 / interval)
      };
      
      this.emit('download-progress', progressInfo);
      
      if (percent >= 100) {
        if (this.downloadIntervalId) {
          clearInterval(this.downloadIntervalId);
          this.downloadIntervalId = null;
        }
        // 下载完成
        setTimeout(() => {
          this.emit('update-downloaded', {
            version: '1.0.1-dev',
            downloadedFile: 'mock-update.exe'
          });
        }, 500);
      }
    }, interval);
  }

  /**
   * 模拟退出并安装
   */
  quitAndInstall(): void {
    log.info('[MOCK] Quit and install called - in real app this would restart');
    // 在开发模式下，我们不真的退出应用
    setTimeout(() => {
      log.info('[MOCK] Update installation completed (simulated)');
    }, 1000);
  }

  /**
   * 获取当前状态信息（调试用）
   */
  getDebugInfo(): object {
    return {
      autoDownload: this.autoDownload,
      hasActiveDownload: this.downloadIntervalId !== null,
      listenerCounts: Object.fromEntries(
        Object.entries(this.listeners).map(([event, listeners]) => [event, listeners.length])
      )
    };
  }
}