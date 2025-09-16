import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import log from 'electron-log';
import { McpToolRegister, McpToolInstance, ToolCallRecord } from '../interfaces/types.js';
import { convertJsonSchema7ToZodRawShape } from '../utils/schemaConverter.js';
import { mcpClientManager } from './mcpClientManager.js';
import { configManager } from '../../config/index.js';
import { broadcastStatisticsUpdate } from '../../config/ipc-handlers.js';
import { randomUUID } from "node:crypto";
import { mcpServerManager } from "./mcpServer.js";

/**
 * 工具注册管理器
 * 负责管理 MCP 工具的注册和调用
 */
export class ToolRegistry {
    private toolRegisters: McpToolRegister[] = [];

    /**
     * 刷新工具注册
     */
    async refreshToolRegisters(): Promise<void> {

        log.debug('Refreshing tool registers');

        const cachedToolInstances = await mcpClientManager.getCachedTools();

        const toolRegisterHolder = this.toolRegisters;

        // 检查已经注册的工具是否已经删除了，如果删除了，则需要删除注册
        for (const toolRegister of toolRegisterHolder) {
            if (!cachedToolInstances.some(toolInstance => toolRegister.wrapperName === toolInstance.wrapperName)) {
                toolRegister.toolRegister.remove();
                this.toolRegisters = this.toolRegisters.filter(tr => tr !== toolRegister);
            }
        }

        // 检查是否存在未注册的工具，如果存在，则需要注册
        for (const toolInstance of cachedToolInstances) {
            if (!toolRegisterHolder.some(toolRegister => toolRegister.wrapperName === toolInstance.wrapperName)) {
                for (const server of mcpServerManager.getAllMcpServers()) {
                    this.registerTool(server, toolInstance);
                }
            }
        }

    }
    
    /**
     * 为 MCP 服务器注册所有工具
     * @param server MCP 服务器实例
     */
    async registerAllTools(server: McpServer): Promise<void> {
        log.debug('Start to register tools');
        
        const toolInstances = await mcpClientManager.getCachedTools();
        this.toolRegisters = []; // 清空现有注册

        toolInstances.forEach(toolInstance => {
            this.registerTool(server, toolInstance);
        });

        log.info(`Registered ${this.toolRegisters.length} tools`);
    }

    /**
     * 注册单个工具
     * @param server MCP 服务器实例
     * @param toolInstance 工具实例
     */
    private registerTool(
        server: McpServer, 
        toolInstance: McpToolInstance
    ): void {
        log.debug(`Register tool: ${toolInstance.name} -> ${toolInstance.wrapperName}`);
        
        const wrapperName = toolInstance.wrapperName;
        const toolRegister = server.registerTool(
            wrapperName,
            {
                description: toolInstance.description,
                inputSchema: convertJsonSchema7ToZodRawShape(toolInstance.inputSchema),
                annotations: toolInstance.annotations
            },
            async (args: any) => {
                return this.handleToolCall(wrapperName, args);
            }
        );

        this.toolRegisters.push({
            wrapperName,
            server,
            toolRegister
        });
    }

    /**
     * 更新统计信息
     * @param toolName 工具名称
     */
    private async updateStatistics(toolName: string): Promise<void> {
        try {
            // 从工具名称中提取 MCP 包名称
            const clientInstance = await mcpClientManager.getToolInstanceByToolName(toolName);
            
            // 获取当前配置
            const mcpConfig = configManager.getSection('mcp');
            const statistics = { ...mcpConfig.statistics };
            
            // 更新总调用次数
            statistics.totalCalls = (statistics.totalCalls || 0) + 1;
            
            // 更新该 MCP 包的调用次数
            statistics.packageCalls = { ...statistics.packageCalls };
            statistics.packageCalls[clientInstance.clientInstance.mcp.name] = (statistics.packageCalls[clientInstance.clientInstance.mcp.name] || 0) + 1;
            
            // 保存更新后的统计信息
            await configManager.setSection('mcp', { statistics });
            
            // 广播统计信息更新到所有窗口
            broadcastStatisticsUpdate();
            
            log.debug(`Statistics updated: total=${statistics.totalCalls}, ${clientInstance.clientInstance.mcp.name}=${statistics.packageCalls[clientInstance.clientInstance.mcp.name]}`);
        } catch (error) {
            log.error('Failed to update statistics:', error);
        }
    }

    /**
     * 处理工具调用，记录参数和结果
     * @param toolName 工具名称
     * @param args 调用参数
     * @returns 工具执行结果
     */
    private async handleToolCall(toolName: string, args: any): Promise<any> {
        const callId = randomUUID();
        const startTime = Date.now();
        const timestamp = new Date();
        
        log.debug(`Call tool: ${toolName}`, { callId, args });
        
        const record: ToolCallRecord = {
            id: callId,
            toolName,
            timestamp,
            args,
            duration: 0,
            status: 'success'
        };

        try {
            // 调用实际的工具
            const result = await mcpClientManager.callTool(toolName, args);
            
            // 记录成功结果
            record.result = result;
            record.duration = Date.now() - startTime;
            record.status = 'success';
            
            // 更新统计信息（只在成功时更新）
            await this.updateStatistics(toolName);
            
            log.debug(`Tool call completed: ${toolName}`, record);
            
            return result;
            
        } catch (error) {
            // 记录错误
            record.error = error;
            record.duration = Date.now() - startTime;
            record.status = 'error';
            
            log.error(`Tool call failed: ${toolName}`, record);
            
            throw error;
        }
     
    }
}

// 导出单例实例
export const toolRegistry = new ToolRegistry();