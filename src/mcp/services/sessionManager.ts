import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import log from 'electron-log';
import { SessionTransportMap } from '../interfaces/types.js';

/**
 * 会话管理器
 * 负责管理 HTTP 传输会话的生命周期
 */
export class SessionManager {
    private transports: SessionTransportMap = {};

    /**
     * 创建新的传输实例
     * @returns StreamableHTTPServerTransport 实例
     */
    createTransport(): StreamableHTTPServerTransport {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
                // 存储传输实例
                this.transports[sessionId] = transport;
                log.debug(`Session initialized: ${sessionId}`);
            },
            // DNS rebinding protection is disabled by default for backwards compatibility
            // enableDnsRebindingProtection: true,
            // allowedHosts: ['127.0.0.1'],
        });

        // 清理传输实例
        transport.onclose = () => {
            if (transport.sessionId) {
                delete this.transports[transport.sessionId];
                log.debug(`Session closed: ${transport.sessionId}`);
            }
        };

        return transport;
    }

    /**
     * 根据会话 ID 获取传输实例
     * @param sessionId 会话 ID
     * @returns 传输实例或 undefined
     */
    getTransport(sessionId: string): StreamableHTTPServerTransport | undefined {
        return this.transports[sessionId];
    }

    /**
     * 检查会话是否存在
     * @param sessionId 会话 ID
     * @returns 是否存在
     */
    hasSession(sessionId: string): boolean {
        return sessionId in this.transports;
    }

    /**
     * 清理所有会话
     */
    clearAllSessions(): void {
        Object.keys(this.transports).forEach(sessionId => {
            const transport = this.transports[sessionId];
            try {
                transport.close();
            } catch (error) {
                log.error(`Failed to close session ${sessionId}:`, error);
            }
        });
        this.transports = {};
        log.info('All sessions cleared');
    }
}

// 导出单例实例
export const sessionManager = new SessionManager();