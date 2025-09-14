/**
 * OAuth 会话存储和服务器特定状态管理
 * 为 Electron 环境优化的会话管理
 */

import * as crypto from 'crypto';

export interface OAuthSession {
  serverUrl: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  scopes?: string;
  resourceUrl?: string;
  timestamp: number;
  expiresAt: number;
}

export class SessionStorage {
  private sessions = new Map<string, OAuthSession>();
  private readonly SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * 生成服务器特定的密钥
   * 确保不同服务器的会话隔离
   */
  getServerSpecificKey(serverUrl: string, additionalData?: string): string {
    const normalizedUrl = new URL(serverUrl).origin.toLowerCase();
    const data = additionalData ? `${normalizedUrl}:${additionalData}` : normalizedUrl;
    
    return crypto
      .createHash('sha256')
      .update(data, 'utf8')
      .digest('hex')
      .substring(0, 32); // 使用前32个字符作为密钥
  }

  /**
   * 存储 OAuth 会话
   */
  storeSession(serverUrl: string, session: Omit<OAuthSession, 'serverUrl' | 'timestamp' | 'expiresAt'>): string {
    const sessionKey = this.getServerSpecificKey(serverUrl, session.state);
    const now = Date.now();
    
    const fullSession: OAuthSession = {
      ...session,
      serverUrl,
      timestamp: now,
      expiresAt: now + this.SESSION_TIMEOUT_MS
    };

    this.sessions.set(sessionKey, fullSession);
    
    console.debug(`OAuth session stored for server: ${serverUrl}, key: ${sessionKey}`);
    
    // 清理过期会话
    this.cleanExpiredSessions();
    
    return sessionKey;
  }

  /**
   * 获取 OAuth 会话
   */
  getSession(serverUrl: string, state: string): OAuthSession | undefined {
    const sessionKey = this.getServerSpecificKey(serverUrl, state);
    const session = this.sessions.get(sessionKey);

    if (!session) {
      console.debug(`OAuth session not found for server: ${serverUrl}, state: ${state}`);
      return undefined;
    }

    // 检查会话是否过期
    if (Date.now() > session.expiresAt) {
      console.debug(`OAuth session expired for server: ${serverUrl}, state: ${state}`);
      this.sessions.delete(sessionKey);
      return undefined;
    }

    return session;
  }

  /**
   * 删除 OAuth 会话
   */
  removeSession(serverUrl: string, state: string): boolean {
    const sessionKey = this.getServerSpecificKey(serverUrl, state);
    const existed = this.sessions.has(sessionKey);
    
    if (existed) {
      this.sessions.delete(sessionKey);
      console.debug(`OAuth session removed for server: ${serverUrl}, state: ${state}`);
    }
    
    return existed;
  }

  /**
   * 获取服务器的所有会话
   */
  getServerSessions(serverUrl: string): OAuthSession[] {
    const serverOrigin = new URL(serverUrl).origin.toLowerCase();
    const sessions: OAuthSession[] = [];

    for (const session of this.sessions.values()) {
      if (new URL(session.serverUrl).origin.toLowerCase() === serverOrigin) {
        // 检查是否过期
        if (Date.now() <= session.expiresAt) {
          sessions.push(session);
        }
      }
    }

    return sessions;
  }

  /**
   * 清理过期的会话
   */
  cleanExpiredSessions(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      this.sessions.delete(key);
    });

    if (keysToRemove.length > 0) {
      console.debug(`Cleaned ${keysToRemove.length} expired OAuth sessions`);
    }
  }

  /**
   * 清理服务器的所有会话
   */
  clearServerSessions(serverUrl: string): number {
    const serverOrigin = new URL(serverUrl).origin.toLowerCase();
    const keysToRemove: string[] = [];

    for (const [key, session] of this.sessions.entries()) {
      if (new URL(session.serverUrl).origin.toLowerCase() === serverOrigin) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      this.sessions.delete(key);
    });

    if (keysToRemove.length > 0) {
      console.debug(`Cleared ${keysToRemove.length} OAuth sessions for server: ${serverUrl}`);
    }

    return keysToRemove.length;
  }

  /**
   * 清理所有会话
   */
  clearAllSessions(): number {
    const count = this.sessions.size;
    this.sessions.clear();
    
    if (count > 0) {
      console.debug(`Cleared all ${count} OAuth sessions`);
    }
    
    return count;
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats(): {
    total: number;
    expired: number;
    byServer: Record<string, number>;
  } {
    const now = Date.now();
    let expired = 0;
    const byServer: Record<string, number> = {};

    for (const session of this.sessions.values()) {
      if (now > session.expiresAt) {
        expired++;
      }
      
      const origin = new URL(session.serverUrl).origin;
      byServer[origin] = (byServer[origin] || 0) + 1;
    }

    return {
      total: this.sessions.size,
      expired,
      byServer
    };
  }

  /**
   * 验证会话完整性
   */
  validateSession(session: OAuthSession): boolean {
    try {
      // 验证基本字段
      if (!session.serverUrl || !session.state || !session.codeVerifier) {
        return false;
      }

      // 验证 URL 格式
      new URL(session.serverUrl);

      // 验证 PKCE 参数
      if (session.codeChallengeMethod !== 'S256') {
        return false;
      }

      // 验证时间戳
      if (session.timestamp <= 0 || session.expiresAt <= session.timestamp) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
}

// 单例实例，确保全局状态一致性
export const sessionStorage = new SessionStorage();