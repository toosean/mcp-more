// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import log from 'electron-log/renderer';
import { AppConfig, PartialAppConfig } from './config/types';
import { RuntimeInfo } from './runtime/RuntimeManager';

// 配置渲染进程的 electron-log
log.transports.console.level = 'debug';
log.transports.ipc.level = 'silly';

// 定义应用信息 API 接口
interface AppInfoAPI {
  getVersion(): Promise<string>;
  getName(): Promise<string>;
  getPath(): Promise<string>;
  isPackaged(): Promise<boolean>;
  getLogsPath(): Promise<string>;
  showLogsDirectory(): Promise<void>;
  getPlatform(): Promise<string>;
}

// 定义配置 API 接口
interface ConfigAPI {
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
}

// 配置 API 实现
const configAPI: ConfigAPI = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  getSection: (section) => ipcRenderer.invoke('config:get-section', section),
  getItem: (section, key) => ipcRenderer.invoke('config:get-item', section, key),
  
  setConfig: (config) => ipcRenderer.invoke('config:set', config),
  setSection: (section, value) => ipcRenderer.invoke('config:set-section', section, value),
  setItem: (section, key, value) => ipcRenderer.invoke('config:set-item', section, key, value),
  
  reset: () => ipcRenderer.invoke('config:reset'),
  resetSection: (section) => ipcRenderer.invoke('config:reset-section', section),
  
  exportConfig: () => ipcRenderer.invoke('config:export'),
  importConfig: (config) => ipcRenderer.invoke('config:import', config),
  
  getConfigPath: () => ipcRenderer.invoke('config:get-path'),
  hasConfig: () => ipcRenderer.invoke('config:has-config'),
  
  onConfigChange: (section, callback) => {
    const channel = `config:change:${section}`;
    ipcRenderer.on(channel, (_, newValue, oldValue) => {
      callback(newValue, oldValue);
    });
    
    return () => {
      ipcRenderer.removeAllListeners(channel);
    };
  },
  
  onStatisticsUpdate: (callback) => {
    ipcRenderer.on('statistics:updated', (_, statistics) => {
      callback(statistics);
    });
    
    return () => {
      ipcRenderer.removeAllListeners('statistics:updated');
    };
  },
};

// 应用信息 API 实现
const appInfoAPI: AppInfoAPI = {
  getVersion: () => ipcRenderer.invoke('app-info:get-version'),
  getName: () => ipcRenderer.invoke('app-info:get-name'),
  getPath: () => ipcRenderer.invoke('app-info:get-path'),
  isPackaged: () => ipcRenderer.invoke('app-info:is-packaged'),
  getLogsPath: () => ipcRenderer.invoke('app-info:get-logs-path'),
  showLogsDirectory: () => ipcRenderer.invoke('app-info:show-logs-directory'),
  getPlatform: () => ipcRenderer.invoke('app-info:get-platform'),
};

// 定义日志 API 接口
interface LogAPI {
  info(message: any, ...params: any[]): void;
  warn(message: any, ...params: any[]): void;
  error(message: any, ...params: any[]): void;
  debug(message: any, ...params: any[]): void;
  verbose(message: any, ...params: any[]): void;
  silly(message: any, ...params: any[]): void;
}

// 定义窗口控制 API 接口
interface WindowControlAPI {
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  unmaximize(): Promise<void>;
}

// 日志 API 实现
const logAPI: LogAPI = {
  info: (message, ...params) => log.info(message, ...params),
  warn: (message, ...params) => log.warn(message, ...params),
  error: (message, ...params) => log.error(message, ...params),
  debug: (message, ...params) => log.debug(message, ...params),
  verbose: (message, ...params) => log.verbose(message, ...params),
  silly: (message, ...params) => log.silly(message, ...params),
};

// 定义事件监听 API 接口
interface EventAPI {
  on(channel: string, callback: (...args: any[]) => void): () => void;
  removeAllListeners(channel: string): void;
}

// 定义MCP服务器状态接口
interface McpServerStatus {
  status: 'healthy' | 'stopped' | 'error';
  isListening: boolean;
  serverCount: number;
  uptime: number;
  error?: string;
}


// 定义运行时 API 接口
interface RuntimeAPI {
  checkRuntimesAsync(): Promise<RuntimeInfo[]>;
  refreshRuntimesAsync(): Promise<void>;
  isRuntimeInstalledAsync(runtimeName: string): Promise<boolean>;
  getRuntimeInfoAsync(runtimeName: string): Promise<RuntimeInfo>;
}

// 定义MCP API 接口
interface McpAPI {
  startMcp(mcpId: string): Promise<void>;
  stopMcp(mcpId: string): Promise<void>;
  getMcpStatus(mcpId: string): Promise<'running' | 'stopped' | 'error'>;
  getServerStatus(): Promise<McpServerStatus>;
}

// 窗口控制 API 实现
const windowControlAPI: WindowControlAPI = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  unmaximize: () => ipcRenderer.invoke('window:unmaximize'),
};

// 事件监听 API 实现
const eventAPI: EventAPI = {
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
    return () => {
      ipcRenderer.removeAllListeners(channel);
    };
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// 运行时 API 实现
const runtimeAPI: RuntimeAPI = {
  checkRuntimesAsync: () => ipcRenderer.invoke('runtime:check-runtimes'),
  refreshRuntimesAsync: () => ipcRenderer.invoke('runtime:refresh-runtimes'),
  isRuntimeInstalledAsync: (runtimeName: string) => ipcRenderer.invoke('runtime:is-runtime-installed', runtimeName),
  getRuntimeInfoAsync: (runtimeName: string) => ipcRenderer.invoke('runtime:get-runtime-info', runtimeName),
};

// MCP API 实现
const mcpAPI: McpAPI = {
  startMcp: (mcpId: string) => ipcRenderer.invoke('mcp:start-mcp', mcpId),
  stopMcp: (mcpId: string) => ipcRenderer.invoke('mcp:stop-mcp', mcpId),
  getMcpStatus: (mcpId: string) => ipcRenderer.invoke('mcp:get-mcp-status', mcpId),
  getServerStatus: () => ipcRenderer.invoke('mcp:get-server-status')
};

// Shell API 实现
const shellAPI: ShellAPI = {
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url)
};

// 定义 Shell API 接口
interface ShellAPI {
  openExternal(url: string): Promise<void>;
}

// 定义更新 API 接口
interface UpdaterAPI {
  // 开发模式专用：模拟更新
  simulateUpdate(): Promise<{ success: boolean; message?: string; error?: string }>;

  // 取消下载
  cancelDownload(): Promise<{ success: boolean; error?: string }>;

  // 用户确认下载
  confirmDownload(): Promise<{ success: boolean; error?: string }>;

  // 获取调试信息
  getDebugInfo(): Promise<{ success: boolean; debugInfo?: any; error?: string }>;
  
  // 监听更新事件
  onUpdateAvailable(callback: (updateInfo: any) => void): () => void;
  onShowOverlay(callback: (updateInfo: any) => void): () => void;
  onHideOverlay(callback: () => void): () => void;
  onProgress(callback: (progress: any) => void): () => void;
  onDownloadComplete(callback: () => void): () => void;
  onError(callback: (error: string) => void): () => void;
}

// 更新 API 实现
const updaterAPI: UpdaterAPI = {
  simulateUpdate: () => ipcRenderer.invoke('updater:simulate-update'),
  cancelDownload: () => ipcRenderer.invoke('updater:cancel-download'),
  confirmDownload: () => ipcRenderer.invoke('updater:confirm-download'),
  getDebugInfo: () => ipcRenderer.invoke('updater:get-debug-info'),
  
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('updater:update-available', (_, updateInfo) => callback(updateInfo));
    return () => ipcRenderer.removeAllListeners('updater:update-available');
  },
  
  onShowOverlay: (callback) => {
    ipcRenderer.on('updater:show-overlay', (_, updateInfo) => callback(updateInfo));
    return () => ipcRenderer.removeAllListeners('updater:show-overlay');
  },
  
  onHideOverlay: (callback) => {
    ipcRenderer.on('updater:hide-overlay', callback);
    return () => ipcRenderer.removeAllListeners('updater:hide-overlay');
  },
  
  onProgress: (callback) => {
    ipcRenderer.on('updater:progress', (_, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('updater:progress');
  },
  
  onDownloadComplete: (callback) => {
    ipcRenderer.on('updater:download-complete', callback);
    return () => ipcRenderer.removeAllListeners('updater:download-complete');
  },
  
  onError: (callback) => {
    ipcRenderer.on('updater:error', (_, error) => callback(error));
    return () => ipcRenderer.removeAllListeners('updater:error');
  }
};

// 暴露 Env 给渲染进程
contextBridge.exposeInMainWorld('env', import.meta.env);

// 暴露 API 给渲染进程
contextBridge.exposeInMainWorld('configAPI', configAPI);
contextBridge.exposeInMainWorld('appInfoAPI', appInfoAPI);
contextBridge.exposeInMainWorld('logAPI', logAPI);
contextBridge.exposeInMainWorld('windowControlAPI', windowControlAPI);
contextBridge.exposeInMainWorld('eventAPI', eventAPI);
contextBridge.exposeInMainWorld('mcpAPI', mcpAPI);
contextBridge.exposeInMainWorld('runtimeAPI', runtimeAPI);
contextBridge.exposeInMainWorld('shellAPI', shellAPI);
contextBridge.exposeInMainWorld('updaterAPI', updaterAPI);