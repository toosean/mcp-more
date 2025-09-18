/**
 * OAuth 元数据发现服务
 * 支持受保护资源元数据和授权服务器元数据发现
 */

import { OAuthProtectedResourceMetadata } from '../../../config/types';
import { AuthorizationServerMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import log from 'electron-log';

export class MetadataDiscoveryService {
  /**
   * 受保护资源元数据发现（优先）
   * RFC 8707 - Resource Indicators for OAuth 2.0
   */
  async discoverProtectedResourceMetadata(
    resourceUrl: string | URL
  ): Promise<OAuthProtectedResourceMetadata | undefined> {
    const url = new URL('/.well-known/oauth-protected-resource', resourceUrl);

    try {
      log.log(`Attempting to discover protected resource metadata from: ${url}`);
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        log.debug(`Protected resource metadata discovery failed: ${response.status} ${response.statusText}`);
        return undefined;
      }

      const metadata = await response.json() as OAuthProtectedResourceMetadata;
      log.log('Protected resource metadata discovered:', metadata);
      return metadata;
    } catch (error) {
      log.debug('Failed to discover protected resource metadata:', error);
      return undefined;
    }
  }

  /**
   * 授权服务器元数据发现（回退）
   * RFC 8414 - OAuth 2.0 Authorization Server Metadata
   * OpenID Connect Discovery 1.0
   */
  async discoverAuthorizationServerMetadata(
    authServerUrl: string | URL
  ): Promise<AuthorizationServerMetadata | undefined> {
    const discoveryPaths = [
      '/.well-known/oauth-authorization-server',
      '/.well-known/openid_configuration'
    ];

    for (const path of discoveryPaths) {
      try {
        const url = new URL(path, authServerUrl);
        log.log(`Attempting to discover authorization server metadata from: ${url}`);
        
        const response = await fetch(url.toString());

        if (response.ok) {
          const metadata = await response.json() as AuthorizationServerMetadata;

          // OIDC 提供商必须支持 S256 PKCE
          if (path.includes('openid_configuration')) {
            if (!metadata.code_challenge_methods_supported?.includes('S256')) {
              throw new Error(`OIDC provider does not support S256 PKCE required by MCP`);
            }
          }

          log.log('Authorization server metadata discovered:', metadata);
          return metadata;
        }
      } catch (error) {
        log.debug(`Failed to discover from ${path}:`, error);
        continue;
      }
    }

    return undefined;
  }

  /**
   * 选择资源 URL
   * 基于受保护资源元数据选择合适的资源指示器
   */
  private async selectResourceURL(
    serverUrl: string,
    resourceMetadata?: OAuthProtectedResourceMetadata
  ): Promise<URL | undefined> {
    // 如果没有资源元数据，使用服务器 URL 作为资源
    if (!resourceMetadata?.resource) {
      return new URL(serverUrl);
    }

    // 使用元数据中指定的资源
    return new URL(resourceMetadata.resource);
  }

  /**
   * 完整的元数据发现流程
   */
  async discoverAllMetadata(serverUrl: string): Promise<{
    resourceMetadata?: OAuthProtectedResourceMetadata;
    authServerMetadata?: AuthorizationServerMetadata;
    authServerUrl: string;
    resourceUrl?: URL;
  }> {
    let authServerUrl = serverUrl;

    log.log(`Starting metadata discovery for: ${serverUrl}`);

    // 1. 尝试发现受保护资源元数据
    const resourceMetadata = await this.discoverProtectedResourceMetadata(serverUrl);

    // 2. 从资源元数据获取授权服务器 URL
    if (resourceMetadata?.authorization_servers?.length) {
      authServerUrl = resourceMetadata.authorization_servers[0];
      log.log(`Using authorization server from resource metadata: ${authServerUrl}`);
    }

    // 3. 发现授权服务器元数据
    const authServerMetadata = await this.discoverAuthorizationServerMetadata(authServerUrl);

    // 4. 选择资源 URL
    const resourceUrl = await this.selectResourceURL(serverUrl, resourceMetadata);

    const result = {
      resourceMetadata,
      authServerMetadata,
      authServerUrl,
      resourceUrl
    };

    log.log('Metadata discovery completed:', result);
    return result;
  }

  /**
   * 验证授权服务器是否支持必需的功能
   */
  validateAuthorizationServerSupport(metadata: AuthorizationServerMetadata): void {
    // 检查必需的端点
    if (!metadata.authorization_endpoint) {
      throw new Error('Authorization endpoint not found in server metadata');
    }

    if (!metadata.token_endpoint) {
      throw new Error('Token endpoint not found in server metadata');
    }

    // 检查 PKCE 支持
    if (!metadata.code_challenge_methods_supported?.includes('S256')) {
      throw new Error('Authorization server does not support S256 PKCE method required by MCP');
    }

    // 检查授权码流程支持
    if (!metadata.response_types_supported?.includes('code')) {
      throw new Error('Authorization server does not support authorization code flow');
    }

    log.log('Authorization server validation passed');
  }

  /**
   * 确定可用的作用域
   */
  determineAvailableScopes(
    resourceMetadata?: OAuthProtectedResourceMetadata,
    authServerMetadata?: AuthorizationServerMetadata
  ): string[] {
    const scopes: string[] = [];

    // 从资源元数据获取作用域
    if (resourceMetadata?.scopes_supported) {
      scopes.push(...resourceMetadata.scopes_supported);
    }

    // 从授权服务器元数据获取作用域
    if (authServerMetadata?.scopes_supported) {
      scopes.push(...authServerMetadata.scopes_supported);
    }

    // 去重并返回
    return [...new Set(scopes)];
  }

  /**
   * 别名方法：发现OAuth受保护资源元数据
   * 为了与状态机中的调用保持一致
   */
  async discoverOAuthProtectedResourceMetadata(
    resourceUrl: string | URL
  ): Promise<OAuthProtectedResourceMetadata | undefined> {
    return this.discoverProtectedResourceMetadata(resourceUrl);
  }
}