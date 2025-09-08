import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import log from 'electron-log';
import { configManager } from '../../config';
import { Mcp } from '../../config/types';
import { McpClientInstance, McpToolInstance } from '../interfaces/types.js';
import { toolRegistry } from "./toolRegistry";

/**
 * MCP 客户端管理器
 */
export class McpClientManager {
  private clients: McpClientInstance[] = [];
  private cachedTools: McpToolInstance[] = [];

  private getMcpByIdentifier(mcpIdentifier: string): Mcp | undefined {
    const mcpConfig = configManager.getSection('mcp');
    const installedMcps = mcpConfig.installedMcps;
    return installedMcps.find(mcp => mcp.identifier === mcpIdentifier);
  }

  /**
   * 获取配置中所有已启用的 MCP 包
   * @returns 已启用的 MCP 包数组
   */
  private getEnabledMcps(): Mcp[] {
    const mcpConfig = configManager.getSection('mcp');
    const installedMcps = mcpConfig.installedMcps;

    // 数组结构，只返回已启用的包
    return installedMcps.filter(mcp => mcp.enabled && mcp.installed !== null);
  }

  /**
   * 为单个 MCP 包创建客户端实例
   * @param mcp MCP 配置
   * @returns MCP 客户端实例
   */
  private async createClientInstance(mcp: Mcp): Promise<McpClientInstance> {
    let transport: Transport;

    if (mcp.config.url) {
      // 远程 MCP - 使用 URL 连接
      const url = new URL(mcp.config.url);

      if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        // WebSocket 连接
        transport = new WebSocketClientTransport(url);
      } else if (url.protocol === 'http:' || url.protocol === 'https:') {
        // HTTP 连接 - 根据路径判断使用 SSE 还是 StreamableHTTP
        if (url.pathname.endsWith('/sse')) {
          // 如果路径以 /sse 结尾，使用 SSE 传输
          transport = new SSEClientTransport(url);
        } else {
          // 否则使用 StreamableHTTP 传输
          transport = new StreamableHTTPClientTransport(url);
        }
      } else {
        //throw new Error(`不支持的协议: ${url.protocol}`);
        log.error(`Unsupported protocol: ${url}`);
      }
    } else if (mcp.config.command) {
      // 本地 MCP - 使用命令行启动
      const commandParts = mcp.config.command.split(' ');
      const command = commandParts[0];
      const args = commandParts.slice(1);

      transport = new StdioClientTransport({
        command,
        args,
        env: mcp.config.environment || undefined
      });
    } else {
      throw new Error(`Invalid MCP package config: must provide url or command`);
    }

    // 创建 Client
    const client = new Client({
      name: `mcp-more-client-${mcp.identifier}`,
      version: "1.0.0"
    });

    const clientInstance: McpClientInstance = {
      client,
      transport,
      mcp
    };

    return clientInstance;
  }

  /**
   * 连接到 MCP 客户端
   * @param clientInstance 客户端实例
   */
  private async connectClient(clientInstance: McpClientInstance): Promise<void> {
    try {
      await clientInstance.client.connect(clientInstance.transport);
      log.info(`MCP client connected: ${clientInstance.mcp.identifier}`);
    } catch (error) {
      log.error(`Failed to connect MCP client: ${clientInstance.mcp.identifier}`, error);
      throw error;
    }
  }

  /**
   * 初始化所有已启用的 MCP 客户端
   */
  async initializeClients(): Promise<void> {
    const enabledMCPs = this.getEnabledMcps();

    log.info(`Initializing ${enabledMCPs.length} MCP clients...`);
    let initializedCount = 0;
    let closedCount = 0;

    for (const mcp of enabledMCPs) {

      if (this.clients.some(client => client.mcp.identifier === mcp.identifier)) {
        log.debug(`MCP client already initialized: ${mcp.identifier}`);
        continue;
      }

      try {
        const clientInstance = await this.createClientInstance(mcp);
        await this.connectClient(clientInstance);
        this.clients.push(clientInstance);
        initializedCount++;
      } catch (error) {
        log.error(`Failed to initialize MCP client: ${mcp.identifier}`, error);
      }
    }

    for (const client of this.clients.values()) {
      if (!enabledMCPs.some(mcp => mcp.identifier === client.mcp.identifier)) {
        await this.stopMcp(client.mcp.identifier);
        closedCount++;
      }
    }

    log.info(`Successfully initialized ${initializedCount} MCP clients, closed ${closedCount} MCP clients`);
  }

  /**
   * 获取指定 MCP 的客户端实例
   * @param mcp MCP
   * @returns 客户端实例或 undefined
   */
  private getClientInstance(mcp: Mcp): McpClientInstance | undefined {
    return this.clients.find(client => client.mcp.identifier === mcp.identifier);
  }

  /**
   * 获取所有客户端实例
   * @returns 所有客户端实例数组
   */
  private getAllClientInstances(): McpClientInstance[] {
    return Array.from(this.clients.values());
  }

  /**
   * 列出指定 MCP 的所有工具
   * @param mcp MCP 标识
   * @returns 工具列表
   */
  private async listTools(mcp: Mcp) {
    const client = this.getClientInstance(mcp);
    if (!client) {
      throw new Error(`MCP client not connected: ${mcp.identifier}`);
    }

    try {
      return await client.client.listTools();
    } catch (error) {
      log.error(`Failed to list tools: ${mcp.identifier}`, error);
      throw error;
    }
  }

  /**
   * 列出所有 MCP 的工具
   * @returns 工具列表
   */
  async listAllTools(): Promise<McpToolInstance[]> {
    const clientInstances = this.getAllClientInstances();

    const tools: McpToolInstance[] = [];
    const scopedTools: {
      clientInstance: McpClientInstance;
      name: string;
      title: string;
      description: string;
      inputSchema: any;
    }[] = [];

    for (const clientInstance of clientInstances) {
      const clientTools = await this.listTools(clientInstance.mcp);
      clientTools.tools.forEach((tool: any) => {
        scopedTools.push({
          clientInstance,
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema
        });
      });
    }

    // 按照 scopedTools.name 来统计工具出现的次数
    // 统计每个工具名称出现的次数，并存储到一个 Map 中
    const toolNameCount: Map<string, number> = new Map();
    scopedTools.forEach(tool => {
      const toolName = `${tool.clientInstance.mcp.name}__${tool.name}`;
      const count = toolNameCount.get(toolName) || 0;
      toolNameCount.set(toolName, count + 1);
    });

    for (const tool of scopedTools) {

      const toolName = `${tool.clientInstance.mcp.name}__${tool.name}`;

      const uniqueName = toolNameCount.get(toolName) === 1
        ? toolName
        : `${tool.clientInstance.mcp.identifier.replace('/', '__')}__${toolName}`;

      tools.push({
        clientInstance: tool.clientInstance,
        wrapperName: uniqueName,
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema
      });

    }

    return tools;
  }

  /**
   * 缓存所有工具
   */
  async cacheAllTools(): Promise<void> {
    log.debug('Caching all tools');
    const tools = await this.listAllTools();
    this.cachedTools = tools;
    log.info(`Cached ${tools.length} tools`);
  }

  /**
   * 获取缓存的工具列表
   * @returns 缓存的工具列表
   */
  async getCachedTools(): Promise<McpToolInstance[]> {
    return this.cachedTools;
  }

  /**
   * 根据外部工具名获得 ToolInstance
   * @param toolName 工具名称
   * @returns ToolInstance
   */
  async getToolInstanceByToolName(toolName: string): Promise<McpToolInstance | undefined> {
    return this.cachedTools.find(tool => tool.wrapperName === toolName);
  }

  /**
   * 调用指定工具
   * @param toolName 工具名称
   * @param args 工具参数
   * @returns 工具执行结果
   */
  async callTool(toolName: string, args: any = {}) {

    const cachedTool = this.cachedTools.find(tool => tool.wrapperName === toolName);
    if (!cachedTool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const client = this.getClientInstance(cachedTool.clientInstance.mcp);
    if (!client) {
      throw new Error(`MCP client not connected: ${cachedTool.clientInstance.mcp.identifier}`);
    }

    try {
      return await client.client.callTool({
        name: cachedTool.name,
        arguments: args
      });
    } catch (error) {
      log.error(`Failed to call tool: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * 启动指定 MCP 客户端
   * @param mcpIdentifier MCP 标识符
   */
  async startMcp(mcpIdentifier: string): Promise<void> {
    try {
      const mcp = this.getMcpByIdentifier(mcpIdentifier);
      if (!mcp) {
        throw new Error(`MCP not found: ${mcpIdentifier}`);
      }

      // 先检查客户端是否已存在且已连接
      let client = this.getClientInstance(mcp);

      if (client) {
        log.debug(`MCP client already connected: ${mcp.identifier}`);
        return;
      }

      // 如果客户端不存在，需要先创建
      if (!client) {
        // 创建新的客户端实例
        log.debug(`Creating new MCP client: ${mcp.identifier}`);
        client = await this.createClientInstance(mcp);
        this.clients.push(client);

        await this.connectClient(client);
        log.info(`MCP client started: ${mcp.identifier}`);
      }

      await this.cacheAllTools();
      await toolRegistry.refreshToolRegisters();


    } catch (error) {
      log.error(`Failed to start MCP client: ${mcpIdentifier}`, error);
      throw error;
    }
  }

  /**
   * 停止指定 MCP 客户端
   * @param mcpIdentifier MCP 标识符
   */
  async stopMcp(mcpIdentifier: string): Promise<void> {

    const mcp = this.getEnabledMcps().find(mcp => mcp.identifier === mcpIdentifier);
    if (!mcp) {
      throw new Error(`MCP not found: ${mcpIdentifier}`);
    }

    try {
      const client = this.getClientInstance(mcp);

      if (!client) {
        log.debug(`MCP client not found: ${mcp.identifier}`);
        return;
      }

      if (!client) {
        log.debug(`MCP client already disconnected: ${mcp.identifier}`);
        return;
      }

      // 断开连接
      await client.client.close();

      this.clients = this.clients.filter(client => client.mcp.identifier !== mcp.identifier);

      await this.cacheAllTools();
      await toolRegistry.refreshToolRegisters();

      log.info(`MCP client stopped: ${mcp.identifier}`);

    } catch (error) {
      log.error(`Failed to stop MCP client: ${mcp.identifier}`, error);
      throw error;
    }
  }

  /**
   * 获取指定 MCP 客户端状态
   * @param mcpIdentifier MCP 标识符
   */
  async getMcpStatus(mcpIdentifier: string): Promise<string> {
    const mcp = this.getEnabledMcps().find(mcp => mcp.identifier === mcpIdentifier);
    if (!mcp) {
      throw new Error(`MCP not found: ${mcpIdentifier}`);
    }

    const client = this.getClientInstance(mcp);
    if (!client) {
      log.debug(`MCP client not connected: ${mcp.identifier}`);
      return 'stopped';
    }
    return 'running';
  }

  // 暂时不支持 resource,prompt
  //   /**
  //    * 列出指定 MCP 的所有资源
  //    * @param mcpId MCP 标识符
  //    * @returns 资源列表
  //    */
  //   async listResources(mcpId: string) {
  //     const client = this.getClient(mcpId);
  //     if (!client || !client.connected) {
  //       throw new Error(`MCP client not connected: ${mcpId}`);
  //     }

  //     try {
  //       return await client.client.listResources();
  //     } catch (error) {
  //       log.error(`Failed to list resources: ${mcpId}`, error);
  //       throw error;
  //     }
  //   }

  //   /**
  //    * 读取指定 MCP 的资源
  //    * @param mcpId MCP 标识符
  //    * @param uri 资源 URI
  //    * @returns 资源内容
  //    */
  //   async readResource(mcpId: string, uri: string) {
  //     const client = this.getClient(mcpId);
  //     if (!client || !client.connected) {
  //       throw new Error(`MCP client not connected: ${mcpId}`);
  //     }

  //     try {
  //       return await client.client.readResource({ uri });
  //     } catch (error) {
  //       log.error(`Failed to read resource: ${mcpId}.${uri}`, error);
  //       throw error;
  //     }
  //   }

  //   /**
  //    * 列出指定 MCP 的所有提示
  //    * @param mcpId MCP 标识符
  //    * @returns 提示列表
  //    */
  //   async listPrompts(mcpId: string) {
  //     const client = this.getClient(mcpId);
  //     if (!client || !client.connected) {
  //       throw new Error(`MCP client not connected: ${mcpId}`);
  //     }

  //     try {
  //       return await client.client.listPrompts();
  //     } catch (error) {
  //       log.error(`Failed to list prompts: ${mcpId}`, error);
  //       throw error;
  //     }
  //   }

  //   /**
  //    * 获取指定 MCP 的提示
  //    * @param mcpId MCP 标识符
  //    * @param promptName 提示名称
  //    * @param args 提示参数
  //    * @returns 提示内容
  //    */
  //   async getPrompt(mcpId: string, promptName: string, args: any = {}) {
  //     const client = this.getClient(mcpId);
  //     if (!client || !client.connected) {
  //       throw new Error(`MCP client not connected: ${mcpId}`);
  //     }

  //     try {
  //       return await client.client.getPrompt({
  //         name: promptName,
  //         arguments: args
  //       });
  //     } catch (error) {
  //       log.error(`Failed to get prompt: ${mcpId}.${promptName}`, error);
  //       throw error;
  //     }
  //   }

  /**
   * 断开指定客户端连接
   * @param mcp MCP
   */
  private async disconnectClient(mcp: Mcp): Promise<void> {
    const client = this.getClientInstance(mcp);
    if (!client) {
      return;
    }

    try {
      await client.client.close();
      log.info(`MCP client disconnected: ${client.mcp.identifier}`);
    } catch (error) {
      log.error(`Failed to disconnect MCP client: ${client.mcp.identifier}`, error);
    }
  }

  /**
   * 断开所有客户端连接
   */
  async disconnectAllClients(): Promise<void> {
    const disconnectPromises = this.getAllClientInstances().map(client =>
      this.disconnectClient(client.mcp)
    );

    await Promise.allSettled(disconnectPromises);
    this.clients = [];
    log.info('All MCP clients disconnected');
  }

  /**
   * 重新加载客户端配置
   */
  async reloadClients(): Promise<void> {
    await this.disconnectAllClients();
    await this.initializeClients();
  }
}

// 导出单例实例
export const mcpClientManager = new McpClientManager();
