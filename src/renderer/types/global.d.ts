import { AppConfig, PartialAppConfig } from '../../config/types';

declare global {
  interface Window {
    appInfoAPI: {
      getVersion(): Promise<string>;
      getName(): Promise<string>;
      getPath(): Promise<string>;
      isPackaged(): Promise<boolean>;
      getLogsPath(): Promise<string>;
      showLogsDirectory(): Promise<void>;
      getPlatform(): Promise<string>;
    };
    configAPI: {
      // 获取配置
      getConfig(): Promise<AppConfig>;
      getSection<K extends keyof AppConfig>(section: K): Promise<AppConfig[K]>;
      getItem<K extends keyof AppConfig>(section: K, key: string): Promise<any>;
      
      // 设置配置
      setConfig(config: PartialAppConfig): Promise<void>;
      setSection<K extends keyof AppConfig>(section: K, value: Partial<AppConfig[K]>): Promise<void>;
      setItem<K extends keyof AppConfig>(section: K, key: string, value: any): Promise<void>;
      
      // 重置配置
      reset(): Promise<void>;
      resetSection<K extends keyof AppConfig>(section: K): Promise<void>;
      
      // 导入导出
      exportConfig(): Promise<AppConfig>;
      importConfig(config: Partial<AppConfig>): Promise<void>;
      
      // 工具方法
      getConfigPath(): Promise<string>;
      hasConfig(): Promise<boolean>;
      
      // 监听配置变化
      onConfigChange<K extends keyof AppConfig>(
        section: K,
        callback: (newValue: AppConfig[K], oldValue: AppConfig[K]) => void
      ): () => void;
      
      // 监听统计信息更新
      onStatisticsUpdate(callback: (statistics: any) => void): () => void;
    };
    logAPI: {
      info(message: any, ...params: any[]): void;
      warn(message: any, ...params: any[]): void;
      error(message: any, ...params: any[]): void;
      debug(message: any, ...params: any[]): void;
      verbose(message: any, ...params: any[]): void;
      silly(message: any, ...params: any[]): void;
    };
    windowControlAPI: {
      minimize(): Promise<void>;
      maximize(): Promise<void>;
      close(): Promise<void>;
      isMaximized(): Promise<boolean>;
      unmaximize(): Promise<void>;
    };
    eventAPI: {
      on(channel: string, callback: (...args: any[]) => void): () => void;
      removeAllListeners(channel: string): void;
    };
    mcpAPI: {
      startMcp(mcpId: string): Promise<void>;
      stopMcp(mcpId: string): Promise<void>;
      getMcpStatus(mcpId: string): Promise<'running' | 'stopped' | 'error'>;
    };
    updaterAPI: {
      // 取消下载
      cancelDownload(): Promise<{ success: boolean; error?: string }>;

      // 用户确认下载
      confirmDownload(): Promise<{ success: boolean; error?: string }>;
      
      // 开发模式专用：模拟更新
      simulateUpdate(): Promise<{ success: boolean; message?: string; error?: string }>;
      
      // 获取调试信息
      getDebugInfo(): Promise<{ success: boolean; debugInfo?: any; error?: string }>;
      
      // 监听更新事件
      onUpdateAvailable(callback: (updateInfo: any) => void): () => void;
      onShowOverlay(callback: (updateInfo: any) => void): () => void;
      onHideOverlay(callback: () => void): () => void;
      onProgress(callback: (progress: any) => void): () => void;
      onDownloadComplete(callback: () => void): () => void;
      onError(callback: (error: string) => void): () => void;
    };
  }
}

export {};
