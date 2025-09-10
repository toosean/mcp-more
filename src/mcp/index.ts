import log from 'electron-log';
import { mcpClientManager } from './services/mcpClientManager.js';
import { mcpServerManager } from './services/mcpServer.js';
import { configManager } from '../config/ConfigManager.js';

/**
 * 启动 MCP 服务器
 * 协调客户端管理器和服务器管理器
 */
export async function startMCPServer(): Promise<void> {
    try {
        // 先启动 MCP 客户端
        await mcpClientManager.initializeClients();
        
        // 从配置中获取端口号
        const portNumber = configManager.get('general', 'portNumber');
        
        // 然后启动 HTTP 服务器
        await mcpServerManager.start(portNumber);
        
        log.info('MCP system started successfully');
    } catch (error) {
        log.error('Failed to start MCP system:', error);
        throw error;
    }
}

/**
 * 停止 MCP 服务器
 */
export async function stopMCPServer(): Promise<void> {
    try {
        // 停止 HTTP 服务器
        await mcpServerManager.stop();
        
        // 断开所有客户端连接
        await mcpClientManager.disconnectAllClients();
        
        log.info('MCP system stopped successfully');
    } catch (error) {
        log.error('Failed to stop MCP system:', error);
        throw error;
    }
}