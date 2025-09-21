import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
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
    private toolRegistersProfileMap: Map<string, McpToolRegister[]> = new Map();

    private async refreshToolRegistersWithHolder(toolRegisterHolder: McpToolRegister[], profileId?: string): Promise<McpToolRegister[]> {

        log.debug(`Refreshing tool registers for profile: ${profileId}`);
        log.debug(`Current toolRegisterHolder content:`, toolRegisterHolder.map(tr => tr.wrapperName));

        let cachedToolInstances = await mcpClientManager.getCachedTools();
        let holder = toolRegisterHolder;
        
        if(profileId) {
            const profile = configManager.getProfile(profileId);
            if (!profile) {
                log.warn(`Profile not found: ${profileId}`);
                return [];
            }

            cachedToolInstances = cachedToolInstances.filter(toolInstance => profile.mcpIdentifiers.includes(toolInstance.clientInstance.mcp.identifier));
            log.debug(`Filtered cached tool instances for profile: ${profileId}`, cachedToolInstances.map(toolInstance => toolInstance.wrapperName));
        } else{
            log.debug(`No profile id provided, using all cached tool instances`);
        }
        
        // 检查已经注册的工具是否已经删除了，如果删除了，则需要删除注册
        for (const toolRegister of holder) {
            if (!cachedToolInstances.some(toolInstance => toolRegister.wrapperName === toolInstance.wrapperName)) {
                toolRegister.toolRegister.remove();
                holder = holder.filter(tr => tr !== toolRegister);
                log.debug(`Removed tool register: ${toolRegister.wrapperName} for profile: ${profileId}`);
            }
        }

        // 检查是否存在未注册的工具，如果存在，则需要注册
        for (const toolInstance of cachedToolInstances) {
            if (!holder.some(toolRegister => toolRegister.wrapperName === toolInstance.wrapperName)) {
                for (const server of mcpServerManager.getAllMcpServers()) {
                    const toolRegister = this.registerTool(server, toolInstance);
                    holder.push({
                        server,
                        wrapperName: toolInstance.wrapperName,
                        toolRegister: toolRegister
                    });
                    log.debug(`Registered tool register: ${toolInstance.wrapperName} for profile: ${profileId}`);
                }
            }
        }

        log.debug(`Final toolRegisterHolder content:`, holder.map(tr => tr.wrapperName));

        return holder;

    }

    /**
     * 刷新工具注册
     */
    async refreshToolRegisters(): Promise<void> {
        this.toolRegisters = await this.refreshToolRegistersWithHolder(this.toolRegisters);
    }

    /**
     * 为指定 Profile 刷新工具注册
     * @param profileId Profile ID
     */
    async refreshToolRegistersForProfile(profileId: string): Promise<void> {
        const toolRegisters = await this.refreshToolRegistersWithHolder(this.toolRegistersProfileMap.get(profileId) || [], profileId);
        this.toolRegistersProfileMap.set(profileId, toolRegisters);
    }
    
    /**
     * 为 MCP 服务器注册所有工具
     * @param server MCP 服务器实例
     */
    async registerAllTools(server: McpServer): Promise<void> {
        log.debug('Start to register all tools');

        const toolInstances = await mcpClientManager.getCachedTools();

        toolInstances.forEach(toolInstance => {
            const toolRegister = this.registerTool(server, toolInstance);
            this.toolRegisters.push({
                server,
                wrapperName: toolInstance.wrapperName,
                toolRegister: toolRegister
            });

        });

        log.info(`Registered ${this.toolRegisters.length} tools for all profiles`);
    }

    /**
     * 为特定 Profile 的 MCP 服务器注册工具
     * @param server MCP 服务器实例
     * @param profileId Profile ID
     */
    async registerToolsForProfile(server: McpServer, profileId: string): Promise<void> {
        log.debug(`Start to register tools for profile: ${profileId}`);

        // 获取指定 Profile
        const profile = configManager.getProfile(profileId);
        if (!profile) {
            log.warn(`Profile not found: ${profileId}`);
            return;
        }

        // 获取所有工具实例
        const allToolInstances = await mcpClientManager.getCachedTools();

        // 过滤出属于该 Profile 的工具
        const profileToolInstances = allToolInstances.filter(toolInstance =>
            profile.mcpIdentifiers.includes(toolInstance.clientInstance.mcp.identifier)
        );

        profileToolInstances.forEach(toolInstance => {
            const toolRegister = this.registerTool(server, toolInstance);
            this.toolRegistersProfileMap.set(profileId, [...(this.toolRegistersProfileMap.get(profileId) || []), {
                server,
                wrapperName: toolInstance.wrapperName,
                toolRegister: toolRegister
            }]);
        });

        log.info(`Registered ${profileToolInstances.length} tools for profile: ${profileId} (${profile.name})`);
    }

    /**
     * 注册单个工具
     * @param server MCP 服务器实例
     * @param toolInstance 工具实例
     */
    private registerTool(
        server: McpServer, 
        toolInstance: McpToolInstance
    ): RegisteredTool {
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

        return toolRegister;
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