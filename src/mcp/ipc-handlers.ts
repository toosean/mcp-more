import { ipcMain } from 'electron';
import log from 'electron-log';
import { mcpClientManager } from './services/mcpClientManager';
import { mcpServerManager } from './services/mcpServer';
import { toolRegistry } from './services/toolRegistry';

/**
 * 设置MCP相关的IPC处理器
 */
export function setupMCPIpcHandlers(): void {
  // 启动特定客户端
  ipcMain.handle('mcp:start-mcp', async (event, mcpIdentifier: string) => {
    try {
      log.info(`Starting MCP client: ${mcpIdentifier}`);
      await mcpClientManager.startMcp(mcpIdentifier);
      log.info(`MCP client started successfully: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to start MCP client ${mcpIdentifier}:`, error);
      throw error;
    }
  });

  // 停止特定客户端
  ipcMain.handle('mcp:stop-mcp', async (event, mcpIdentifier: string) => {
    try {
      log.info(`Stopping MCP client: ${mcpIdentifier}`);
      await mcpClientManager.stopMcp(mcpIdentifier);
      log.info(`MCP client stopped successfully: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to stop MCP client ${mcpIdentifier}:`, error);
      throw error;
    }
  });

  // 获取特定客户端状态
  ipcMain.handle('mcp:get-mcp-status', async (event, mcpIdentifier: string) => {
    try {
      log.debug(`Getting MCP client status: ${mcpIdentifier}`);
      const status = await mcpClientManager.getMcpStatus(mcpIdentifier);
      return status;
    } catch (error) {
      log.error(`Failed to get MCP client status ${mcpIdentifier}:`, error);
      throw error;
    }
  });

  // 获取MCP服务器状态
  ipcMain.handle('mcp:get-server-status', async () => {

    const isListening = mcpServerManager.isListening();
    const serverCount = mcpServerManager.getAllMcpServers().length;
    
    return {
      status: isListening ? 'healthy' : 'stopped',
      isListening,
      serverCount,
      uptime: isListening ? process.uptime() : 0
    };

  });

  // OAuth 相关处理器
  ipcMain.handle('mcp:trigger-oauth-flow', async (event, mcpIdentifier: string) => {
    try {
      log.info(`Triggering OAuth flow for MCP: ${mcpIdentifier}`);
      const result = await mcpClientManager.triggerOAuthFlow(mcpIdentifier);
      log.info(`OAuth flow result for ${mcpIdentifier}:`, result);
      return result;
    } catch (error) {
      log.error(`Failed to trigger OAuth flow for ${mcpIdentifier}:`, error);
      throw error;
    }
  });

  // 完成OAuth授权流程
  ipcMain.handle('mcp:complete-oauth-flow', async (event, mcpIdentifier: string, authorizationCode: string) => {
    try {
      log.info(`Completing OAuth flow for MCP: ${mcpIdentifier}`);
      const result = await mcpClientManager.completeOAuthFlow(mcpIdentifier, authorizationCode);
      log.info(`OAuth completion result for ${mcpIdentifier}:`, result);
      return result;
    } catch (error) {
      log.error(`Failed to complete OAuth flow for ${mcpIdentifier}:`, error);
      throw error;
    }
  });

  // 获取OAuth状态
  ipcMain.handle('mcp:get-oauth-state', async (event, mcpIdentifier: string) => {
    try {
      log.debug(`Getting OAuth state for MCP: ${mcpIdentifier}`);
      const state = await mcpClientManager.getOAuthState(mcpIdentifier);
      return state;
    } catch (error) {
      log.error(`Failed to get OAuth state for ${mcpIdentifier}:`, error);
      throw error;
    }
  });

  ipcMain.handle('mcp:clear-oauth-data', async (event, mcpIdentifier: string) => {
    try {
      log.info(`Clearing OAuth data for MCP: ${mcpIdentifier}`);
      await mcpClientManager.clearOAuthData(mcpIdentifier);
      log.info(`OAuth data cleared for ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to clear OAuth data for ${mcpIdentifier}:`, error);
      throw error;
    }
  });

  log.info('MCP IPC handlers set up');
}