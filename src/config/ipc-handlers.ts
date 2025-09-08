import { ipcMain, BrowserWindow } from 'electron';
import { configManager } from './ConfigManager';
import { AppConfig, PartialAppConfig } from './types';

/**
 * 设置配置相关的 IPC 处理器
 */
export function setupConfigIpcHandlers(): void {
  // 获取完整配置
  ipcMain.handle('config:get', (): AppConfig => {
    return configManager.getConfig();
  });

  // 获取配置的特定部分
  ipcMain.handle('config:get-section', (_, section: keyof AppConfig) => {
    return configManager.getSection(section);
  });

  // 获取特定配置项
  ipcMain.handle('config:get-item', (_, section: keyof AppConfig, key: string) => {
    return configManager.get(section as any, key as any);
  });

  // 设置完整配置
  ipcMain.handle('config:set', (_, config: PartialAppConfig): void => {
    configManager.setConfig(config);
  });

  // 设置配置的特定部分
  ipcMain.handle('config:set-section', (_, section: keyof AppConfig, value: any): void => {
    configManager.setSection(section as any, value);
  });

  // 设置特定配置项
  ipcMain.handle('config:set-item', (_, section: keyof AppConfig, key: string, value: any): void => {
    configManager.set(section as any, key as any, value);
  });

  // 重置配置到默认值
  ipcMain.handle('config:reset', (): void => {
    configManager.resetToDefaults();
  });

  // 重置特定部分到默认值
  ipcMain.handle('config:reset-section', (_, section: keyof AppConfig): void => {
    configManager.resetSection(section as any);
  });

  // 导出配置
  ipcMain.handle('config:export', (): AppConfig => {
    return configManager.exportConfig();
  });

  // 导入配置
  ipcMain.handle('config:import', (_, config: Partial<AppConfig>): void => {
    configManager.importConfig(config);
  });

  // 获取配置文件路径
  ipcMain.handle('config:get-path', (): string => {
    return configManager.getConfigPath();
  });

  // 检查配置是否存在
  ipcMain.handle('config:has-config', (): boolean => {
    return configManager.hasConfig();
  });
}

/**
 * 广播统计信息更新到所有窗口
 */
export function broadcastStatisticsUpdate(): void {
  const config = configManager.getConfig();
  const statistics = config.mcp?.statistics;
  
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('statistics:updated', statistics);
  });
}
