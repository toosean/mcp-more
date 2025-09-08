import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Mcp } from '../../config/types';

/**
 * MCP 客户端实例接口
 */
export interface McpClientInstance {
    client: Client;
    transport: Transport;
    mcp: Mcp;
}

/**
 * MCP 工具实例接口
 */
export interface McpToolInstance {
    clientInstance: McpClientInstance;
    wrapperName: string;
    name: string;
    title: string;
    description: string;
    inputSchema: any;
}

/**
 * MCP 工具注册信息接口
 */
export interface McpToolRegister {
    server: McpServer;
    wrapperName: string;
    toolRegister: RegisteredTool;
}

/**
 * 会话传输映射接口
 */
export interface SessionTransportMap {
    [sessionId: string]: StreamableHTTPServerTransport;
}

/**
 * 工具调用记录接口
 */
export interface ToolCallRecord {
    id: string;
    toolName: string;
    timestamp: Date;
    args: any;
    result?: any;
    error?: any;
    duration: number;
    status: 'success' | 'error';
}