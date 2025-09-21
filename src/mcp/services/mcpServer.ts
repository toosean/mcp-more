import express from 'express';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import log from 'electron-log';
import { sessionManager } from './sessionManager.js';
import { toolRegistry } from './toolRegistry.js';
import { windowManager } from '../../window/index.js';
import { configManager } from '../../config/ConfigManager.js';
import { profileValidator } from './profileValidator.js';

// 类型声明
import type { Application, Request, Response } from 'express';

/**
 * MCP HTTP 服务器管理器
 * 负责启动和管理 MCP HTTP 服务器
 */
export class McpServerManager {
    private app: Application;
    private server: any;
    private mcpServers: McpServer[] = [];
    private listening = false;
    private port: number = 0;
    private oauthCallback: ((url: URL, res: Response) => void)[] | undefined;

    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.oauthCallback = [];
    }

    /**
     * 设置中间件
     */
    private setupMiddleware(): void {
        this.app.use(express.json());
    }

    public subscribeOAuthCallback(callback: (url: URL, res: Response) => void): void {
        log.log('subscribeOAuthCallback: ', callback);
        this.oauthCallback?.push(callback);
        log.log('oauthCallback length: ', this.oauthCallback?.length);
    }

    /**
     * 设置路由
     */
    private setupRoutes(): void {
        // Handle POST requests for client-to-server communication (default profile)
        this.app.post('/mcp', this.handleMCPRequest.bind(this));

        // Handle GET requests for server-to-client notifications via SSE (default profile)
        this.app.get('/mcp', this.handleSessionRequest.bind(this));

        // Handle DELETE requests for session termination (default profile)
        this.app.delete('/mcp', this.handleSessionRequest.bind(this));

        // 动态设置Profile相关路由
        this.setupProfileRoutes();

        // Handle GET requests for OAuth callback
        this.app.get('/oauth/callback', this.handleOAuthCallback.bind(this));
    }

    /**
     * 设置Profile相关路由
     */
    private setupProfileRoutes(): void {
        // 总是注册Profile路由，但在处理函数中检查配置状态
        // Handle POST requests for client-to-server communication (specific profile)
        this.app.post('/:profileId/mcp', this.handleMCPRequest.bind(this));

        // Handle GET requests for server-to-client notifications via SSE (specific profile)
        this.app.get('/:profileId/mcp', this.handleSessionRequest.bind(this));

        // Handle DELETE requests for session termination (specific profile)
        this.app.delete('/:profileId/mcp', this.handleSessionRequest.bind(this));

        log.info('Profile routes registered (will check enableProfile at runtime)');
    }


    /**
     * 处理 MCP 请求
     */
    private async handleMCPRequest(req: Request, res: Response): Promise<void> {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        const profileId = req.params.profileId; // 从路径参数获取 profileId

        // 验证 Profile 请求
        const isValid = await profileValidator.validateAndHandle(req, res);
        if (!isValid) {
            return;
        }

        let transport;

        if (sessionId && sessionManager.hasSession(sessionId)) {
            // 重用现有传输
            transport = sessionManager.getTransport(sessionId);
        } else if (!sessionId && isInitializeRequest(req.body)) {
            // 新的初始化请求
            transport = sessionManager.createTransport();

            // 创建 MCP 服务器
            const mcpServer = new McpServer({
                name: "mcp-more",
                version: "1.0.0"
            });

            this.mcpServers.push(mcpServer);

            // 根据 Profile 注册工具到服务器
            if (profileId) {
                // 特定 Profile：只注册该 Profile 中的 MCP 工具
                await toolRegistry.registerToolsForProfile(mcpServer, profileId);
                log.info(`MCP Server initialized for profile: ${profileId}`);
            } else {
                // 默认：注册所有工具
                await toolRegistry.registerAllTools(mcpServer);
                log.info('MCP Server initialized with all tools (default profile)');
            }

            // 连接到预初始化的 MCP 服务器
            await mcpServer.connect(transport);

            // 当传输关闭时，删除 MCP 服务器
            transport.onclose = () => {
                this.mcpServers = this.mcpServers.filter(mcpServer => mcpServer !== mcpServer);
            };

        } else {
            // 无效请求
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Bad Request: No valid session ID provided',
                },
                id: null,
            });
            return;
        }

        if (transport) {
            // 处理请求
            await transport.handleRequest(req, res, req.body);
        }
    }

    /**
     * 处理会话请求 (GET/DELETE)
     */
    private async handleSessionRequest(req: Request, res: Response): Promise<void> {
        const profileId = req.params.profileId; // 从路径参数获取 profileId

        // 验证 Profile 请求
        const isValid = await profileValidator.validateAndHandle(req, res);
        if (!isValid) {
            return;
        }

        const sessionId = req.headers['mcp-session-id'] as string | undefined;

        if (!sessionId || !sessionManager.hasSession(sessionId)) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }

        const transport = sessionManager.getTransport(sessionId);
        if (transport) {
            await transport.handleRequest(req, res);
        }
    }

    private async handleOAuthCallback(req: Request, res: Response): Promise<void> {
        
        try {
            const url = new URL(req.url!, `http://localhost:${this.port}`);
            
            log.log(`OAuth callback received: ${req.method} ${url.pathname}${url.search}`);
        
            if (url.pathname === '/oauth/callback') {
                this.oauthCallback?.forEach(callback => callback(url, res));
            } 
            
        } catch (error) {
            log.error('Error handling OAuth callback request:', error);
        }
    }

    /**
     * 获取所有 MCP 服务器
     * @returns MCP 服务器数组
     */
    getAllMcpServers(): McpServer[] {
        return this.mcpServers;
    }

    isListening(): boolean {
        return this.listening;
    }

    /**
     * 启动服务器
     * @param port 端口号
     */
    async start(port: number = 7195): Promise<void> {

        this.server = this.app.listen(port);
        this.port = port;

        this.server.on('listening', () => {
            log.info(`MCP Server started on port ${port}`);
            this.listening = true;
        })

        this.server.on('error', (err: any) => {
            log.error('MCP Server start failed:', err);
            this.listening = false;
            
            // simple delay to avoid window not initialized
            setTimeout(() => {
                windowManager.toast(
                  'MCP Server start failed',
                  err.message || 'MCP Server start failed',
                  'destructive'
              );
            }, 5000);

        });
    }

    /**
     * 停止服务器
     */
    async stop(): Promise<void> {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    log.info('MCP Server stopped');
                    sessionManager.clearAllSessions();
                    resolve();
                });
            });
        }
    }
}

// 导出单例实例
export const mcpServerManager = new McpServerManager();