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

  log.info('MCP IPC handlers set up');
}