import { ipcMain } from 'electron';
import log from 'electron-log';
import { mcpAppManager } from './services/MCPAppManager';
import {
  MCPAppDetectionResult,
  MCPAppInfo,
  MCPAppSetupResult,
  MCPMoreSetupConfig,
  ConfiguredMCPServer
} from './interfaces/types';

/**
 * 设置 MCP 应用管理相关的 IPC 处理器
 */
export function setupMcpAppIpcHandlers(): void {
  // 获取所有支持的应用信息
  ipcMain.handle('mcp-app:get-supported-apps', (): MCPAppInfo[] => {
    try {
      return mcpAppManager.getSupportedApps();
    } catch (error) {
      log.error('Failed to get supported apps:', error);
      throw error;
    }
  });

  // 检测所有应用
  ipcMain.handle('mcp-app:detect-all-apps', async (): Promise<MCPAppDetectionResult[]> => {
    try {
      return await mcpAppManager.detectAllApps();
    } catch (error) {
      log.error('Failed to detect all apps:', error);
      throw error;
    }
  });

  // 检测特定应用
  ipcMain.handle('mcp-app:detect-app', async (_, appId: string): Promise<MCPAppDetectionResult> => {
    try {
      return await mcpAppManager.detectApp(appId);
    } catch (error) {
      log.error(`Failed to detect app ${appId}:`, error);
      throw error;
    }
  });

  // 获取已安装的应用
  ipcMain.handle('mcp-app:get-installed-apps', async (_, limit?: number): Promise<MCPAppDetectionResult[]> => {
    try {
      return await mcpAppManager.getInstalledApps(limit);
    } catch (error) {
      log.error('Failed to get installed apps:', error);
      throw error;
    }
  });

  // 配置特定应用
  ipcMain.handle('mcp-app:setup-app', async (_, appId: string, config: MCPMoreSetupConfig): Promise<MCPAppSetupResult> => {
    try {
      return await mcpAppManager.setupApp(appId, config);
    } catch (error) {
      log.error(`Failed to setup app ${appId}:`, error);
      throw error;
    }
  });

  // 打开应用配置目录
  ipcMain.handle('mcp-app:open-config-directory', async (_, appId: string): Promise<void> => {
    try {
      await mcpAppManager.openConfigDirectory(appId);
    } catch (error) {
      log.error(`Failed to open config directory for ${appId}:`, error);
      throw error;
    }
  });

  // 备份应用配置
  ipcMain.handle('mcp-app:backup-app-config', async (_, appId: string): Promise<string | null> => {
    try {
      return await mcpAppManager.backupAppConfig(appId);
    } catch (error) {
      log.error(`Failed to backup config for ${appId}:`, error);
      throw error;
    }
  });

  // 检查应用是否已配置指定的 alias
  ipcMain.handle('mcp-app:is-app-configured', async (_, appId: string, alias: string): Promise<boolean> => {
    try {
      return await mcpAppManager.isAppConfigured(appId, alias);
    } catch (error) {
      log.error(`Failed to check if ${appId} is configured with alias ${alias}:`, error);
      throw error;
    }
  });

  // 获取应用中所有已配置的 MCP More 服务器
  ipcMain.handle('mcp-app:get-app-configured-servers', async (_, appId: string): Promise<ConfiguredMCPServer[]> => {
    try {
      return await mcpAppManager.getAppConfiguredMCPMoreServers(appId);
    } catch (error) {
      log.error(`Failed to get configured MCP More servers for ${appId}:`, error);
      throw error;
    }
  });

  log.info('MCP App IPC handlers set up');
}
