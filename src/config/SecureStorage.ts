import { safeStorage } from 'electron';
import Store from 'electron-store';
import log from 'electron-log';
import { OAuthTokens, OAuthClientInfo } from './types';

// Use electron-store with encryption for secure storage
const secureStore = new Store({
  name: 'secure-storage',
  encryptionKey: 'mcp-more-secure-key'
}) as any; // Use any to avoid TypeScript issues with electron-store methods

/**
 * 安全存储服务类
 * 使用 electron-store 加密存储 OAuth 敏感数据
 */
export class SecureStorage {
  private static readonly SERVICE_NAME = 'mcp-more';

  /**
   * 生成 OAuth tokens 的存储键名
   */
  private static getTokensKey(mcpIdentifier: string): string {
    return `oauth-tokens-${mcpIdentifier}`;
  }

  /**
   * 生成 OAuth client secret 的存储键名
   */
  private static getClientSecretKey(mcpIdentifier: string): string {
    return `oauth-client-secret-${mcpIdentifier}`;
  }

  /**
   * 生成 OAuth client info 的存储键名
   */
  private static getClientInfoKey(mcpIdentifier: string): string {
    return `oauth-client-info-${mcpIdentifier}`;
  }

  /**
   * 保存 OAuth tokens
   */
  async saveOAuthTokens(mcpIdentifier: string, tokens: OAuthTokens): Promise<void> {
    try {
      const key = SecureStorage.getTokensKey(mcpIdentifier);
      secureStore.set(key, tokens);
      log.info(`OAuth tokens saved for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to save OAuth tokens for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 获取 OAuth tokens
   */
  async getOAuthTokens(mcpIdentifier: string): Promise<OAuthTokens | null> {
    try {
      const key = SecureStorage.getTokensKey(mcpIdentifier);
      const tokens = secureStore.get(key) as OAuthTokens | undefined;
      return tokens || null;
    } catch (error) {
      log.error(`Failed to get OAuth tokens for MCP ${mcpIdentifier}:`, error);
      return null;
    }
  }

  /**
   * 删除 OAuth tokens
   */
  async deleteOAuthTokens(mcpIdentifier: string): Promise<void> {
    try {
      const key = SecureStorage.getTokensKey(mcpIdentifier);
      secureStore.delete(key);
      log.info(`OAuth tokens deleted for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to delete OAuth tokens for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 保存 OAuth client secret
   */
  async saveClientSecret(mcpIdentifier: string, clientSecret: string): Promise<void> {
    try {
      const key = SecureStorage.getClientSecretKey(mcpIdentifier);
      secureStore.set(key, clientSecret);
      log.info(`OAuth client secret saved for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to save OAuth client secret for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 获取 OAuth client secret
   */
  async getClientSecret(mcpIdentifier: string): Promise<string | null> {
    try {
      const key = SecureStorage.getClientSecretKey(mcpIdentifier);
      const secret = secureStore.get(key) as string | undefined;
      return secret || null;
    } catch (error) {
      log.error(`Failed to get OAuth client secret for MCP ${mcpIdentifier}:`, error);
      return null;
    }
  }

  /**
   * 删除 OAuth client secret
   */
  async deleteClientSecret(mcpIdentifier: string): Promise<void> {
    try {
      const key = SecureStorage.getClientSecretKey(mcpIdentifier);
      secureStore.delete(key);
      log.info(`OAuth client secret deleted for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to delete OAuth client secret for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 保存 OAuth client info (动态注册的客户端信息)
   */
  async saveClientInfo(mcpIdentifier: string, clientInfo: OAuthClientInfo): Promise<void> {
    try {
      const key = SecureStorage.getClientInfoKey(mcpIdentifier);
      secureStore.set(key, clientInfo);
      log.info(`OAuth client info saved for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to save OAuth client info for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 获取 OAuth client info
   */
  async getClientInfo(mcpIdentifier: string): Promise<OAuthClientInfo | null> {
    try {
      const key = SecureStorage.getClientInfoKey(mcpIdentifier);
      const clientInfo = secureStore.get(key) as OAuthClientInfo | undefined;
      return clientInfo || null;
    } catch (error) {
      log.error(`Failed to get OAuth client info for MCP ${mcpIdentifier}:`, error);
      return null;
    }
  }

  /**
   * 删除 OAuth client info
   */
  async deleteClientInfo(mcpIdentifier: string): Promise<void> {
    try {
      const key = SecureStorage.getClientInfoKey(mcpIdentifier);
      secureStore.delete(key);
      log.info(`OAuth client info deleted for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to delete OAuth client info for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 删除特定 MCP 的所有 OAuth 相关数据
   */
  async deleteAllOAuthData(mcpIdentifier: string): Promise<void> {
    await Promise.allSettled([
      this.deleteOAuthTokens(mcpIdentifier),
      this.deleteClientSecret(mcpIdentifier),
      this.deleteClientInfo(mcpIdentifier)
    ]);
    log.info(`All OAuth data deleted for MCP: ${mcpIdentifier}`);
  }

  /**
   * 检查是否存在 OAuth tokens
   */
  async hasOAuthTokens(mcpIdentifier: string): Promise<boolean> {
    const tokens = await this.getOAuthTokens(mcpIdentifier);
    return tokens !== null;
  }

  /**
   * 检查是否存在 client secret
   */
  async hasClientSecret(mcpIdentifier: string): Promise<boolean> {
    const secret = await this.getClientSecret(mcpIdentifier);
    return secret !== null;
  }

  /**
   * 检查是否存在 client info
   */
  async hasClientInfo(mcpIdentifier: string): Promise<boolean> {
    const info = await this.getClientInfo(mcpIdentifier);
    return info !== null;
  }

  /**
   * 获取所有存储的 MCP OAuth 账户（用于调试和管理）
   */
  async getAllOAuthAccounts(): Promise<string[]> {
    try {
      const allKeys = Object.keys(secureStore.store);
      const mcpIdentifiers = new Set<string>();

      allKeys.forEach((key) => {
        if (key.startsWith('oauth-tokens-')) {
          mcpIdentifiers.add(key.replace('oauth-tokens-', ''));
        } else if (key.startsWith('oauth-client-secret-')) {
          mcpIdentifiers.add(key.replace('oauth-client-secret-', ''));
        } else if (key.startsWith('oauth-client-info-')) {
          mcpIdentifiers.add(key.replace('oauth-client-info-', ''));
        }
      });

      return Array.from(mcpIdentifiers);
    } catch (error) {
      log.error('Failed to get all OAuth accounts:', error);
      return [];
    }
  }
}

// 导出单例实例
export const secureStorage = new SecureStorage();