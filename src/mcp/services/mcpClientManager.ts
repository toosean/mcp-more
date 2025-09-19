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
import { ElectronOAuthClientProvider } from './oauth/ElectronOAuthClientProvider';
import { MetadataDiscoveryService } from './oauth/metadataDiscovery';
import { OAuthStateMachine } from './oauth/oauth-state-machine';
import { is401Error } from './oauth/oauthUtils';
import { JSONSchema7 } from "json-schema";
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types";

export class McpStartNeedsAuthError extends Error{
  constructor(message: string) {
    super(message);
    this.name = 'McpStartNeedsAuthError';
  }
}

/**
 * MCP 客户端管理器
 */
export class McpClientManager {
  private clients: McpClientInstance[] = [];
  private cachedTools: McpToolInstance[] = [];
  private metadataService = new MetadataDiscoveryService();
  private tokenRefreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly REFRESH_BUFFER_SECONDS = 5 * 60; // 提前 5 分钟刷新

  private getMcpByIdentifier(mcpIdentifier: string): Mcp | undefined {
    const mcpConfig = configManager.getSection('mcp');
    const installedMcps = mcpConfig.installedMcps;
    return installedMcps.find(mcp => mcp.identifier === mcpIdentifier);
  }

  private getAllMcps(): Mcp[] {
    const mcpConfig = configManager.getSection('mcp');
    const installedMcps = mcpConfig.installedMcps;
    return installedMcps;
  }

  /**
   * 获取配置中所有已启用的 MCP 包
   * @returns 已启用的 MCP 包数组
   */
  private getEnabledMcps(): Mcp[] {
    const installedMcps = this.getAllMcps();

    // 数组结构，只返回已启用的包
    return installedMcps.filter(mcp => mcp.enabled && mcp.installed !== null);
  }

  /**
   * 替换字符串中的占位符
   * @param template 包含占位符的模板字符串
   * @param values 替换值的映射
   * @returns 替换后的字符串
   */
  private replacePlaceholders(template: string, values: Record<string, string>): string {
    return template.replace(/\$\{\{(\w+)\}\}/g, (match, key) => {
      const value = values[key];
      if (value !== undefined) {
        return value;
      }
      // 如果找不到对应的值，保留原始占位符并记录警告
      log.warn(`Placeholder ${match} not found in input values, keeping original placeholder`);
      return match;
    });
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
      // 替换URL中的占位符
      const resolvedUrl = this.replacePlaceholders(mcp.config.url, mcp.inputValues || {});
      log.debug(`MCP ${mcp.identifier}: Original URL: ${mcp.config.url}`);
      log.debug(`MCP ${mcp.identifier}: Resolved URL: ${resolvedUrl}`);
      if (mcp.inputValues && Object.keys(mcp.inputValues).length > 0) {
        log.debug(`MCP ${mcp.identifier}: Input values: ${JSON.stringify(mcp.inputValues)}`);
      }
      const url = new URL(resolvedUrl);

      // 获取最新的 MCP 配置（确保包含最新的 OAuth tokens）
      const latestMcp = this.getMcpByIdentifier(mcp.identifier) || mcp;

      // 准备 OAuth 头部（如果需要）
      const headers: Record<string, string> = {};

      // 检查 token 是否过期，如果过期则尝试刷新
      let oauthTokens = await configManager.getOAuthTokens(latestMcp.identifier);
      if (oauthTokens && this.isTokenExpired(oauthTokens)) {
        log.info(`Token expired for MCP: ${latestMcp.identifier}, attempting to refresh`);
        const refreshSuccess = await this.refreshOAuthToken(latestMcp.identifier);
        if (refreshSuccess) {
          oauthTokens = await configManager.getOAuthTokens(latestMcp.identifier);
        } else {
          log.warn(`Failed to refresh expired token for MCP: ${latestMcp.identifier}`);
        }
      }

      if (oauthTokens?.access_token) {
        headers['Authorization'] = `Bearer ${oauthTokens.access_token}`;
        log.debug(`Adding OAuth authorization header for MCP: ${latestMcp.identifier}`);
        log.debug(`Token: ${oauthTokens.access_token.substring(0, 20)}...`);
      } else {
        log.debug(`No OAuth tokens found for MCP: ${mcp.identifier}`);
      }

      if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        // WebSocket 连接 - 注意：WebSocket 传输不支持自定义头部
        // 如果需要 OAuth，建议使用 HTTP/SSE 传输
        if (Object.keys(headers).length > 0) {
          log.warn(`MCP ${mcp.identifier}: WebSocket transport does not support OAuth headers. Consider using HTTP/SSE transport for OAuth support.`);
        }
        transport = new WebSocketClientTransport(url);
      } else if (url.protocol === 'http:' || url.protocol === 'https:') {
        // HTTP 连接 - 根据路径判断使用 SSE 还是 StreamableHTTP
        if (url.pathname.endsWith('/sse')) {
          // 如果路径以 /sse 结尾，使用 SSE 传输
          transport = new SSEClientTransport(url, {
            requestInit: Object.keys(headers).length > 0 ? { headers } : undefined
          });
        } else {
          // 否则使用 StreamableHTTP 传输
          transport = new StreamableHTTPClientTransport(url, {
            requestInit: Object.keys(headers).length > 0 ? { headers } : undefined
          });
        }
      } else {
        //throw new Error(`不支持的协议: ${url.protocol}`);
        log.error(`Unsupported protocol: ${url}`);
      }
    } else if (mcp.config.command) {
      // 本地 MCP - 使用命令行启动
      // 替换命令中的占位符
      const resolvedCommand = this.replacePlaceholders(mcp.config.command, mcp.inputValues || {});
      log.debug(`MCP ${mcp.identifier}: Original command: ${mcp.config.command}`);
      log.debug(`MCP ${mcp.identifier}: Resolved command: ${resolvedCommand}`);
      if (mcp.inputValues && Object.keys(mcp.inputValues).length > 0) {
        log.debug(`MCP ${mcp.identifier}: Input values: ${JSON.stringify(mcp.inputValues)}`);
      }

      const commandParts = resolvedCommand.split(' ');
      const command = commandParts[0];
      const args = commandParts.slice(1);

      // 替换环境变量中的占位符
      let resolvedEnvironment: Record<string, string> = {};
      if (mcp.config.env) {
        log.debug(`MCP ${mcp.identifier}: Original environment variables: ${JSON.stringify(mcp.config.env)}`);
        for (const [key, value] of Object.entries(mcp.config.env)) {
          resolvedEnvironment[key] = this.replacePlaceholders(value, mcp.inputValues || {});
        }
        log.debug(`MCP ${mcp.identifier}: Resolved environment variables: ${JSON.stringify(resolvedEnvironment)}`);
      }

      transport = new StdioClientTransport({
        command,
        args,
        env: resolvedEnvironment
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
   * @param retryCount 重试计数
   */
  private async connectClient(
    clientInstance: McpClientInstance, 
    autoOAuth: boolean = false
  ): Promise<void> {

    log.error(`Connecting MCP client: ${clientInstance.mcp.identifier}`);
    
    try {
      await clientInstance.client.connect(clientInstance.transport);
      log.info(`MCP client connected: ${clientInstance.mcp.identifier}`);
    } catch (error) {
      log.error(`Failed to connect MCP client: ${clientInstance.mcp.identifier}`, error);

      // OAuth 重试逻辑
      if (is401Error(error) && 
          autoOAuth !== false) {

        log.info(`Attempting OAuth flow for 401 error: ${clientInstance.mcp.identifier}`);
        const shouldRetry = await this.handleOAuthError(clientInstance.mcp, error, autoOAuth);

        if (shouldRetry) {
          // 使用新令牌重新创建客户端实例
          const updatedMcp = this.getMcpByIdentifier(clientInstance.mcp.identifier);
          if (updatedMcp) {
            
            const newClientInstance = await this.createClientInstance(updatedMcp);

            // 更新客户端实例
            this.clients = [
              ...this.clients.filter(client => client.mcp.identifier !== clientInstance.mcp.identifier),
              newClientInstance
            ]
            
            // 递归调用，使用新的客户端实例重试连接
            return this.connectClient(newClientInstance, autoOAuth);
          }
        }
      }

      if(is401Error(error) && autoOAuth === false) {
        throw new McpStartNeedsAuthError(`[401] MCP ${clientInstance.mcp.name} needs Authorization.`);
      }

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

    for (const client of this.clients) {
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
      inputSchema: JSONSchema7;
      annotations: ToolAnnotations;
    }[] = [];

    for (const clientInstance of clientInstances) {
      const clientTools = await this.listTools(clientInstance.mcp);
      clientTools.tools.forEach((tool) => {
        scopedTools.push({
          clientInstance,
          name: `${clientInstance.mcp.code}__${tool.name}`,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema as JSONSchema7,
          annotations: tool.annotations
        });
      });
    }

    // 按照 scopedTools.name 来统计工具出现的次数
    // 统计每个工具名称出现的次数，并存储到一个 Map 中
    const toolNameCount: Map<string, number> = new Map();
    scopedTools.forEach(tool => {
      const count = toolNameCount.get(tool.name) || 0;
      toolNameCount.set(tool.name, count + 1);
    });

    for (const tool of scopedTools) {


      const uniqueName = toolNameCount.get(tool.name) === 1
        ? tool.name
        : `${tool.clientInstance.mcp.identifier.replace('/', '_')}__${tool.name}`;

      tools.push({
        clientInstance: tool.clientInstance,
        wrapperName: uniqueName,
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations
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
  async startMcp(mcpIdentifier: string, autoOAuth: boolean = false): Promise<void> {
    try {
      const mcp = this.getMcpByIdentifier(mcpIdentifier);
      if (!mcp) {
        throw new Error(`MCP not found: ${mcpIdentifier}`);
      }

      // 设置状态为 starting
      mcp.status = 'starting';
      this.updateMcpConfig(mcpIdentifier, mcp);

      // 先检查客户端是否已存在且已连接
      let client = this.getClientInstance(mcp);

      if (client) {
        this.clients = this.clients.filter(client => client.mcp.identifier !== mcpIdentifier);
      }

      // 如果客户端不存在，需要先创建
      if (!client) {
        // 创建新的客户端实例
        log.debug(`Creating new MCP client: ${mcp.identifier}`);
        client = await this.createClientInstance(mcp);
        this.clients.push(client);

        await this.connectClient(client, autoOAuth);
        log.info(`MCP client started: ${mcp.identifier}`);
      }

      await this.cacheAllTools();
      await toolRegistry.refreshToolRegisters();

      if (mcp) {
        mcp.latestError = null;
        mcp.latestErrorDetail = null;
        mcp.enabled = true;
        mcp.status = 'running';
        this.updateMcpConfig(mcpIdentifier, mcp);
        this.scheduleTokenRefresh(mcpIdentifier);
      }

    } catch (error) {

      this.clients = this.clients.filter(client => client.mcp.identifier !== mcpIdentifier);

      const mcp = this.getMcpByIdentifier(mcpIdentifier);
      if (mcp) {
        mcp.status = 'stopped';
        if (error instanceof McpStartNeedsAuthError) {
          mcp.latestError = 'auth';
          mcp.latestErrorDetail = error.message;
        } else {
          mcp.latestError = 'unknown';
          mcp.latestErrorDetail = error instanceof Error ? error.message : 'Unknown error';
        }
        this.updateMcpConfig(mcpIdentifier, mcp);
      }

      log.error(`McpClientManager.startMcp Failed to start MCP client: ${mcpIdentifier}`, error);
      throw error;
    }
  }

  /**
   * 停止指定 MCP 客户端
   * @param mcpIdentifier MCP 标识符
   */
  async stopMcp(mcpIdentifier: string): Promise<void> {

    const mcp = this.getMcpByIdentifier(mcpIdentifier);
    if (!mcp) {
      throw new Error(`MCP not found: ${mcpIdentifier}`);
    }

    // 设置状态为 stopping
    mcp.status = 'stopping';
    mcp.enabled = false;
    this.updateMcpConfig(mcpIdentifier, mcp);

    try {
      const client = this.getClientInstance(mcp);

      if (!client) {
        log.debug(`MCP client not found: ${mcp.identifier}`);
        // 即使客户端不存在，也要更新状态为 stopped
        mcp.status = 'stopped';
        this.updateMcpConfig(mcpIdentifier, mcp);
        return;
      }

      // 断开连接
      await client.client.close();

      this.clients = this.clients.filter(client => client.mcp.identifier !== mcp.identifier);

      await this.cacheAllTools();
      await toolRegistry.refreshToolRegisters();

      // 停止 token 自动刷新
      this.clearTokenRefreshTimer(mcpIdentifier);

      log.info(`MCP client stopped: ${mcp.identifier}`);

      if (mcp) {
        mcp.latestError = null;
        mcp.latestErrorDetail = null;
        mcp.enabled = false;
        mcp.status = 'stopped';
        this.updateMcpConfig(mcpIdentifier, mcp);
      }

    } catch (error) {

      const mcp = this.getMcpByIdentifier(mcpIdentifier);
      if(mcp) {
        mcp.latestError = 'unknown';
        mcp.latestErrorDetail = error instanceof Error ? error.message : 'Unknown error';
        mcp.status = 'stopped';
        this.updateMcpConfig(mcpIdentifier, mcp);
      }

      log.error(`Failed to stop MCP client: ${mcp.identifier}`, error);
      throw error;
    }
  }

  /**
   * 获取指定 MCP 客户端状态
   * @param mcpIdentifier MCP 标识符
   */
  async getMcpStatus(mcpIdentifier: string): Promise<string> {
    const mcp = this.getAllMcps().find(mcp => mcp.identifier === mcpIdentifier);
    if (!mcp) {
      throw new Error(`MCP not found: ${mcpIdentifier}`);
    }

    // 如果MCP配置中有状态，优先返回配置中的状态
    if (mcp.status) {
      return mcp.status;
    }

    // 否则根据客户端连接状态判断
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

  /**
   * 处理 OAuth 认证错误（使用状态机）
   */
  private async handleOAuthError(mcp: Mcp, error: unknown, autoOAuth: boolean = false): Promise<boolean> {
    if (!is401Error(error) || !autoOAuth) {
      return false;
    }

    try {
      log.info(`Starting OAuth state machine flow for MCP: ${mcp.identifier}`);
      // 创建 OAuth 状态机
      const stateMachine = new OAuthStateMachine(
        mcp.config.url!,
        mcp,
        (updates) => this.updateMcpConfig(mcp.identifier, updates)
      );

      // 运行自动化流程直到需要用户交互
      const result = await stateMachine.run();

      if (result.result === 'ERROR') {
        const errorMsg = stateMachine.getError() || 'OAuth state machine failed';
        log.error(`OAuth state machine error for MCP ${mcp.identifier}: ${errorMsg}`);
        return false;
      }

      if (result.result === 'AUTHORIZED') {
        log.info(`OAuth flow completed successfully for MCP: ${mcp.identifier}`);
        return true;
      }

      return false;
    } catch (error) {
      log.error(`OAuth state machine failed for MCP: ${mcp.identifier}`, error);
      return false;
    }
  }

  /**
   * 处理 OAuth 认证错误（传统方式，保留作为后备）
   */
  // private async handleOAuthErrorLegacy(mcp: Mcp, error: unknown): Promise<boolean> {
  //   if (!this.is401Error(error) || !mcp.oauth?.autoOAuth) {
  //     return false;
  //   }

  //   try {
  //     log.info(`Starting OAuth flow for MCP: ${mcp.identifier}`);

  //     // 1. 元数据发现
  //     const discoveryResult = await this.metadataService.discoverAllMetadata(mcp.config.url!);

  //     if (!discoveryResult.authServerMetadata) {
  //       log.error(`OAuth metadata discovery failed for MCP: ${mcp.identifier}`);
  //       return false;
  //     }

  //     // 2. 作用域确定
  //     const scope = this.determineScope(mcp, discoveryResult.resourceMetadata);

  //     // 3. 创建 OAuth 客户端提供者
  //     const oauthProvider = new ElectronOAuthClientProvider(
  //       mcp.config.url!,
  //       scope,
  //       mcp,
  //       (updates) => this.updateMcpConfig(mcp.identifier, updates)
  //     );

  //     // 4. 执行完整 OAuth 流程
  //     const result = await oauthProvider.performOAuthFlow(
  //       discoveryResult.authServerUrl,
  //       discoveryResult.authServerMetadata,
  //       scope,
  //       discoveryResult.resourceUrl?.toString()
  //     );

  //     if (result === 'AUTHORIZED') {
  //       // 5. 更新配置并保存元数据
  //       await this.updateMcpOAuthData(mcp.identifier, oauthProvider, discoveryResult);
  //       return true;
  //     }

  //     return false;
  //   } catch (error) {
  //     log.error(`OAuth flow failed for MCP: ${mcp.identifier}`, error);
  //     return false;
  //   }
  // }


  /**
   * 更新 MCP 配置
   */
  private updateMcpConfig(mcpIdentifier: string, updates: Partial<Mcp>): void {
    try {
      const mcpConfig = configManager.getSection('mcp');
      const mcpIndex = mcpConfig.installedMcps.findIndex(m => m.identifier === mcpIdentifier);
      
      if (mcpIndex !== -1) {
        mcpConfig.installedMcps[mcpIndex] = {
          ...mcpConfig.installedMcps[mcpIndex],
          ...updates
        };
        
        configManager.setSection('mcp', mcpConfig);
        log.debug(`MCP configuration updated: ${mcpIdentifier}`);
      }
    } catch (error) {
      log.error(`Failed to update MCP configuration: ${mcpIdentifier}`, error);
    }
  }

  /**
   * 手动触发 OAuth 流程（使用状态机）
   */
  // async triggerOAuthFlow(mcpIdentifier: string): Promise<{
  //   success: boolean;
  //   authorizationUrl?: string;
  //   error?: string;
  // }> {
  //   const mcp = this.getMcpByIdentifier(mcpIdentifier);
  //   if (!mcp) {
  //     throw new Error(`MCP not found: ${mcpIdentifier}`);
  //   }

  //   if (!mcp.oauth?.autoOAuth) {
  //     throw new Error(`OAuth not enabled for MCP: ${mcpIdentifier}`);
  //   }

  //   try {
  //     log.info(`Manual OAuth trigger for MCP: ${mcpIdentifier}`);

  //     // 创建 OAuth 状态机
  //     const stateMachine = new OAuthStateMachine(
  //       mcp.config.url!,
  //       mcp,
  //       (updates) => this.updateMcpConfig(mcp.identifier, updates)
  //     );

  //     // 运行自动化流程直到需要用户交互
  //     const result = await stateMachine.runUntilUserInteraction();

  //     if (result.result === 'ERROR') {
  //       const errorMsg = stateMachine.getError() || 'OAuth state machine failed';
  //       return {
  //         success: false,
  //         error: getOAuthErrorDescription(errorMsg)
  //       };
  //     }

  //     if (result.result === 'AUTHORIZED') {
  //       return { success: true };
  //     }

  //     if (result.result === 'IN_PROGRESS' && result.authorizationUrl) {
  //       return {
  //         success: true,
  //         authorizationUrl: result.authorizationUrl
  //       };
  //     }

  //     return {
  //       success: false,
  //       error: 'OAuth flow in unexpected state'
  //     };
  //   } catch (error) {
  //     log.error(`Manual OAuth trigger failed for MCP: ${mcpIdentifier}`, error);
  //     return {
  //       success: false,
  //       error: getOAuthErrorDescription(error)
  //     };
  //   }
  // }

  /**
   * 手动触发 OAuth 流程（传统方式，保留作为后备）
   */
  // async triggerOAuthFlowLegacy(mcpIdentifier: string): Promise<boolean> {
  //   const mcp = this.getMcpByIdentifier(mcpIdentifier);
  //   if (!mcp) {
  //     throw new Error(`MCP not found: ${mcpIdentifier}`);
  //   }

  //   if (!mcp.oauth?.autoOAuth) {
  //     throw new Error(`OAuth not enabled for MCP: ${mcpIdentifier}`);
  //   }

  //   return this.handleOAuthErrorLegacy(mcp, new Error('Manual OAuth trigger'));
  // }

  /**
   * 完成 OAuth 授权流程（用户提供授权码后）
   */
  // async completeOAuthFlow(mcpIdentifier: string, authorizationCode: string, state: string): Promise<{
  //   success: boolean;
  //   error?: string;
  // }> {
  //   debugger;
  //   const mcp = this.getMcpByIdentifier(mcpIdentifier);
  //   if (!mcp) {
  //     throw new Error(`MCP not found: ${mcpIdentifier}`);
  //   }

  //   try {
  //     log.info(`Completing OAuth flow for MCP: ${mcpIdentifier}`);

  //     // 创建 OAuth 状态机
  //     const stateMachine = new OAuthStateMachine(
  //       mcp.config.url!,
  //       mcp,
  //       (updates) => this.updateMcpConfig(mcp.identifier, updates)
  //     );

  //     // 提供授权码并完成流程
  //     const result = await stateMachine.provideAuthorizationCode(authorizationCode, state);

  //     if (result === 'AUTHORIZED') {
  //       log.info(`OAuth flow completed successfully for MCP: ${mcpIdentifier}`);

  //       // 重新连接客户端使用新的令牌
  //       try {
  //         const clientInstance = this.getClientInstance(mcp);
  //         if (clientInstance) {
  //           // 关闭现有连接
  //           await clientInstance.client.close();

  //           // 创建新的客户端实例
  //           const newClientInstance = await this.createClientInstance(mcp);

  //           // 替换客户端实例
  //           const index = this.clients.findIndex(c => c.mcp.identifier === mcp.identifier);
  //           if (index !== -1) {
  //             this.clients[index] = newClientInstance;
  //           }

  //           // 重新连接
  //           await this.connectClient(newClientInstance);

  //           // 更新工具缓存
  //           await this.cacheAllTools();
  //           await toolRegistry.refreshToolRegisters();
  //         }
  //       } catch (reconnectError) {
  //         log.warn(`Failed to reconnect after OAuth completion: ${mcpIdentifier}`, reconnectError);
  //       }

  //       return { success: true };
  //     }

  //     const errorMsg = stateMachine.getError() || 'OAuth completion failed';
  //     return {
  //       success: false,
  //       error: getOAuthErrorDescription(errorMsg)
  //     };
  //   } catch (error) {
  //     log.error(`OAuth completion failed for MCP: ${mcpIdentifier}`, error);
  //     return {
  //       success: false,
  //       error: getOAuthErrorDescription(error)
  //     };
  //   }
  // }

  /**
   * 获取 OAuth 状态机当前状态（用于调试）
   */
  async getOAuthState(mcpIdentifier: string): Promise<any> {
    const mcp = this.getMcpByIdentifier(mcpIdentifier);
    if (!mcp) {
      throw new Error(`MCP not found: ${mcpIdentifier}`);
    }

    const stateMachine = new OAuthStateMachine(
      mcp.config.url!,
      mcp,
      (updates) => this.updateMcpConfig(mcp.identifier, updates)
    );

    return stateMachine.getCurrentState();
  }

  /**
   * 清除 OAuth 数据
   */
  async clearOAuthData(mcpIdentifier: string): Promise<void> {
    try {
      // 停止 token 自动刷新
      this.clearTokenRefreshTimer(mcpIdentifier);

      // 从安全存储中删除敏感数据
      await configManager.deleteAllOAuthData(mcpIdentifier);

      // 清除配置文件中的非敏感元数据
      const updates: Partial<Mcp> = {
        oauthMetadata: undefined
      };

      this.updateMcpConfig(mcpIdentifier, updates);
      log.info(`OAuth data cleared for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to clear OAuth data for MCP: ${mcpIdentifier}`, error);
      throw error;
    }
  }

  /**
   * 清理所有资源，包括停止所有 token 刷新任务
   */
  cleanup(): void {
    log.info('Cleaning up MCP Client Manager resources');

    // 停止所有 token 刷新任务
    this.clearAllTokenRefreshTimers();

    // 断开所有客户端连接
    this.clients.forEach(client => {
      try {
        client.client.close();
      } catch (error) {
        log.error(`Error closing client ${client.mcp.identifier}:`, error);
      }
    });

    this.clients = [];
    this.cachedTools = [];

    log.info('MCP Client Manager cleanup completed');
  }

  /**
   * 检查 token 是否已过期（提前 5 分钟）
   */
  private isTokenExpired(tokens: any): boolean {
    if (!tokens.expires_at) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    // 提前 5 分钟（300 秒）判断 token 是否过期
    return tokens.expires_at <= (now + 5 * 60);
  }

  /**
   * 安排 token 自动刷新
   */
  private async scheduleTokenRefresh(mcpIdentifier: string): Promise<void> {
    try {
      // 清除现有的定时器
      this.clearTokenRefreshTimer(mcpIdentifier);
      const tokens = await configManager.getOAuthTokens(mcpIdentifier);

      if (!tokens || !tokens.refresh_token || !tokens.expires_at) {
        log.debug(`No valid token or refresh_token found for MCP: ${mcpIdentifier}`);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = tokens.expires_at;
      const refreshAt = expiresAt - this.REFRESH_BUFFER_SECONDS;

      if (refreshAt <= now) {
        // Token 已经过期或即将过期，稍后刷新
        log.info(`Token for ${mcpIdentifier} is expired or expiring soon, scheduling immediate refresh`);
        setTimeout(() => this.performTokenRefresh(mcpIdentifier), 1000);
      } else {
        // 安排未来的刷新
        const delayMs = (refreshAt - now) * 1000;
        log.info(`Scheduling token refresh for ${mcpIdentifier} in ${Math.round(delayMs / 1000)} seconds`);

        const timer = setTimeout(() => {
          this.performTokenRefresh(mcpIdentifier);
        }, delayMs);

        this.tokenRefreshTimers.set(mcpIdentifier, timer);
      }
    } catch (error) {
      log.error(`Failed to schedule token refresh for ${mcpIdentifier}:`, error);
    }
  }

  /**
   * 执行 token 刷新
   */
  private async performTokenRefresh(mcpIdentifier: string): Promise<void> {
    try {
      log.info(`Refreshing token for MCP: ${mcpIdentifier}`);

      const success = await this.refreshOAuthToken(mcpIdentifier);
      if (success) {
        this.scheduleTokenRefresh(mcpIdentifier);
      } else {
        log.error(`Token refresh failed for ${mcpIdentifier}, marking as auth error`);
        await this.markMcpAsAuthError(mcpIdentifier);
      }
    } catch (error) {
      log.error(`Token refresh failed for ${mcpIdentifier}:`, error);
      await this.markMcpAsAuthError(mcpIdentifier);
    }
  }

  /**
   * 手动刷新指定 MCP 的 OAuth token
   */
  async refreshOAuthToken(mcpIdentifier: string): Promise<boolean> {
    try {
      const mcp = this.getMcpByIdentifier(mcpIdentifier);
      if (!mcp) {
        log.warn(`MCP not found: ${mcpIdentifier}`);
        return false;
      }

      const oauthProvider = new ElectronOAuthClientProvider(
        mcp.config.url || '',
        mcp.oauth?.scopes,
        mcp
      );

      const refreshedTokens = await oauthProvider.refreshToken();
      return refreshedTokens !== undefined;
    } catch (error) {
      log.error(`Failed to refresh OAuth token for ${mcpIdentifier}:`, error);
      return false;
    }
  }


  /**
   * 将 MCP 标记为认证错误
   */
  private async markMcpAsAuthError(mcpIdentifier: string): Promise<void> {
    try {
      const mcp = this.getMcpByIdentifier(mcpIdentifier);
      if (mcp) {
        const updates = {
          latestError: 'auth' as const,
          latestErrorDetail: 'OAuth token refresh failed',
          enabled: false
        };

        this.updateMcpConfig(mcpIdentifier, updates);
        log.info(`MCP ${mcpIdentifier} marked as having auth error due to token refresh failure`);
      }
    } catch (error) {
      log.error(`Failed to mark MCP ${mcpIdentifier} as auth error:`, error);
    }
  }

  /**
   * 清除 token 刷新定时器
   */
  private clearTokenRefreshTimer(mcpIdentifier: string): void {
    const timer = this.tokenRefreshTimers.get(mcpIdentifier);
    if (timer) {
      clearTimeout(timer);
      this.tokenRefreshTimers.delete(mcpIdentifier);
    }
  }

  /**
   * 清除所有 token 刷新定时器
   */
  private clearAllTokenRefreshTimers(): void {
    this.tokenRefreshTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.tokenRefreshTimers.clear();
  }
}

// 导出单例实例
export const mcpClientManager = new McpClientManager();
