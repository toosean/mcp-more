/**
 * Electron OAuth 客户端提供者
 * 实现 OAuth 2.1 + PKCE 流程，专为 Electron 环境优化
 */

import { 
  OAuthClientMetadata, 
  OAuthClientInformation, 
  TokenRequest,
  RefreshTokenRequest,
  OAuthTokenResponse,
} from './types';
import { Mcp, OAuthTokens } from '../../../config/types';
import { AuthorizationServerMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
//import { OAuthCallbackServer } from '../../../main/oauth/callbackServer';
import { MetadataDiscoveryService } from './metadataDiscovery';
import { selectClientAuthMethod, applyClientAuthentication, validateClientAuthMethod } from './clientAuth';
import { configManager } from '../../../config/ConfigManager';
import log from 'electron-log';

export interface OAuthClientProvider {
  redirectUrl: string;
  clientMetadata: OAuthClientMetadata;
  tokens(): Promise<OAuthTokens | undefined>;
  saveTokens(tokens: OAuthTokens): Promise<void>;
  clientInformation(): Promise<OAuthClientInformation | undefined>;
  saveClientInformation(clientInfo: OAuthClientInformation): Promise<void>;
  registerClient(authServerUrl: string, authServerMetadata: AuthorizationServerMetadata): Promise<OAuthClientInformation>;
}

export class ElectronOAuthClientProvider implements OAuthClientProvider {
  private metadataService: MetadataDiscoveryService;
  private _mcp: Mcp;

  constructor(
    private serverUrl: string,
    private scope?: string,
    private mcp?: Mcp,
    private updateMcpConfig?: (updates: Partial<Mcp>) => void
  ) {
    this.metadataService = new MetadataDiscoveryService();
    this._mcp = mcp;
  }

  get redirectUrl(): string {
    const portNumber = configManager.get('general', 'portNumber');
    return `http://localhost:${portNumber}/oauth/callback`;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: 'none', // 使用 PKCE，不需要客户端密钥
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: 'mcp-more',
      client_uri: 'https://github.com/toosean/mcp-more',
      scope: this.scope || '',
    };
  }

  get mcpReference(): Mcp {
    return this._mcp;
  }

  /**
   * 获取当前令牌
   */
  async tokens(): Promise<OAuthTokens | undefined> {
    if (!this.mcp?.identifier) {
      return undefined;
    }
    return await configManager.getOAuthTokens(this.mcp.identifier);
  }

  /**
   * 保存令牌
   */
  async saveTokens(tokens: OAuthTokens): Promise<void> {
    if (!this.mcp?.identifier) {
      throw new Error('MCP identifier is required to save tokens');
    }
    await configManager.saveOAuthTokens(this.mcp.identifier, tokens);
    log.log('OAuth tokens saved for MCP:', this.mcp.identifier);
  }

  /**
   * 获取客户端信息 - 三层优先级
   */
  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    if (!this.mcp?.identifier) {
      return undefined;
    }

    // 1. 用户配置的客户端信息（最高优先级）
    if (this.mcp?.oauth?.clientId) {
      const clientSecret = await configManager.getClientSecret(this.mcp.identifier);
      return {
        client_id: this.mcp.oauth.clientId,
        client_secret: clientSecret || undefined,
        ...this.clientMetadata
      };
    }

    // 2. 动态注册的客户端信息
    const clientInfo = await configManager.getClientInfo(this.mcp.identifier);
    if (clientInfo) {
      return {
        ...clientInfo,
        ...this.clientMetadata
      };
    }

    // 3. 没有客户端信息，需要动态注册
    return undefined;
  }

  /**
   * 保存客户端信息（敏感数据存储到安全存储）
   */
  async saveClientInformation(clientInformation: OAuthClientInformation): Promise<void> {
    if (!this.mcp?.identifier) {
      throw new Error('MCP identifier is required to save client information');
    }

    const { client_secret, ...safeInfo } = clientInformation;

    // 保存 client_secret 到安全存储（如果存在）
    if (client_secret) {
      await configManager.saveClientSecret(this.mcp.identifier, client_secret);
    }

    // 保存客户端信息到安全存储
    await configManager.saveClientInfo(this.mcp.identifier, {
      client_id: safeInfo.client_id,
      redirect_uris: safeInfo.redirect_uris,
      client_name: safeInfo.client_name || 'mcp-more'
    });

    log.log('OAuth client information saved for MCP:', this.mcp.identifier);
  }

  /**
   * 执行完整的 OAuth 授权流程
   */
  // async performOAuthFlow(
  //   authServerUrl: string,
  //   authServerMetadata: AuthorizationServerMetadata,
  //   requestedScopes?: string,
  //   resourceUrl?: string
  // ): Promise<OAuthFlowResult> {
  //   let callbackParams: any = null;
    
  //   try {
  //     log.log('Starting OAuth flow for:', this.serverUrl);

  //     // 1. 验证授权服务器支持
  //     this.metadataService.validateAuthorizationServerSupport(authServerMetadata);

  //     // 2. 获取或注册客户端
  //     let clientInfo = await this.clientInformation();
  //     if (!clientInfo && authServerMetadata.registration_endpoint) {
  //       clientInfo = await this.registerClient(authServerUrl, authServerMetadata);
  //       this.saveClientInformation(clientInfo);
  //     }

  //     if (!clientInfo) {
  //       throw new Error('Unable to obtain client information and server does not support dynamic registration');
  //     }

  //     // 3. 启动回调服务器
  //     const callbackUrl = await this.callbackServer.startServer();
  //     log.log('OAuth callback server ready:', callbackUrl);

  //     // 4. 生成 PKCE 参数
  //     const pkceParams = await this.pkceService.generateChallenge();

  //     // 5. 构建授权请求
  //     const state = this.pkceService.generateState();
      
  //     // 存储会话信息
  //     const sessionKey = sessionStorage.storeSession(this.serverUrl, {
  //       state,
  //       codeVerifier: pkceParams.codeVerifier,
  //       codeChallenge: pkceParams.codeChallenge,
  //       codeChallengeMethod: pkceParams.codeChallengeMethod,
  //       scopes: requestedScopes || this.scope,
  //       resourceUrl
  //     });
      
  //     const authRequest: AuthorizationRequest = {
  //       response_type: 'code',
  //       client_id: clientInfo.client_id,
  //       redirect_uri: callbackUrl,
  //       scope: requestedScopes || this.scope,
  //       state,
  //       code_challenge: pkceParams.codeChallenge,
  //       code_challenge_method: pkceParams.codeChallengeMethod,
  //       resource: resourceUrl
  //     };

  //     // 6. 构建授权 URL
  //     const authUrl = this.browserLauncher.buildAuthorizationUrl(
  //       authServerMetadata.authorization_endpoint,
  //       {
  //         response_type: authRequest.response_type,
  //         client_id: authRequest.client_id,
  //         redirect_uri: authRequest.redirect_uri,
  //         scope: authRequest.scope,
  //         state: authRequest.state,
  //         code_challenge: authRequest.code_challenge,
  //         code_challenge_method: authRequest.code_challenge_method,
  //         resource: authRequest.resource
  //       }
  //     );

  //     // 7. 打开浏览器
  //     const browserResult = await this.browserLauncher.openAuthorizationUrl(authUrl);
  //     if (!browserResult.success) {
  //       throw new Error(browserResult.message);
  //     }

  //     // 8. 等待回调
  //     log.log('Waiting for OAuth callback...');
  //     callbackParams = await this.callbackServer.waitForCallback();

  //     // 9. 处理错误
  //     if (callbackParams.error) {
  //       log.error('OAuth authorization error:', callbackParams.error_description || callbackParams.error);
  //       return 'ERROR';
  //     }

  //     // 10. 从会话存储验证状态参数和获取 PKCE 参数
  //     if (!callbackParams.state) {
  //       throw new Error('OAuth state parameter missing');
  //     }
      
  //     const session = sessionStorage.getSession(this.serverUrl, callbackParams.state);
  //     if (!session) {
  //       throw new Error('OAuth state parameter invalid or expired - possible CSRF attack');
  //     }

  //     // 11. 验证授权码
  //     if (!callbackParams.code) {
  //       throw new Error('No authorization code received');
  //     }

  //     // 12. 交换访问令牌（使用会话中的 PKCE 参数）
  //     const tokenRequest: TokenRequest = {
  //       grant_type: 'authorization_code',
  //       code: callbackParams.code,
  //       redirect_uri: callbackUrl,
  //       client_id: clientInfo.client_id,
  //       code_verifier: session.codeVerifier,
  //       resource: session.resourceUrl
  //     };

  //     const tokens = await this.exchangeAuthorizationCode(
  //       authServerMetadata.token_endpoint,
  //       tokenRequest,
  //       clientInfo,
  //       { authServerMetadata }
  //     );

  //     // 13. 保存令牌
  //     this.saveTokens(tokens);

  //     // 14. 清理会话
  //     sessionStorage.removeSession(this.serverUrl, callbackParams.state);

  //     log.log('OAuth flow completed successfully');
  //     return 'AUTHORIZED';

  //   } catch (error) {
  //     log.error('OAuth flow failed:', error);
  //     return 'ERROR';
  //   } finally {
  //     // 清理资源
  //     this.callbackServer.close();
      
  //     // 清理失败的会话
  //     if (callbackParams?.state) {
  //       sessionStorage.removeSession(this.serverUrl, callbackParams.state);
  //     }
  //   }
  // }

  /**
   * 动态客户端注册（使用SDK的registerClient函数）
   */
  async registerClient(
    authServerUrl: string,
    authServerMetadata: AuthorizationServerMetadata
  ): Promise<OAuthClientInformation> {
    if (!authServerMetadata.registration_endpoint) {
      throw new Error('Dynamic client registration not supported');
    }

    log.log('Registering OAuth client using SDK registerClient');

    try {
      // 使用SDK的registerClient函数，类似Inspector的做法
      const { registerClient } = await import('@modelcontextprotocol/sdk/client/auth.js');

      const clientInfo = await registerClient(authServerUrl, {
        metadata: authServerMetadata,
        clientMetadata: this.clientMetadata
      });

      log.log('Client registered successfully:', { client_id: clientInfo.client_id });
      return clientInfo;
    } catch (error) {
      log.error('Dynamic client registration failed:', error);
      throw new Error(`Client registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 交换授权码获取访问令牌
   */
  public async exchangeAuthorizationCode(
    tokenEndpoint: string,
    tokenRequest: TokenRequest,
    clientInfo: OAuthClientInformation,
    metadata: { authServerMetadata: AuthorizationServerMetadata }
  ): Promise<OAuthTokens> {
    log.log('Exchanging authorization code for tokens');

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    const body = new URLSearchParams({
      grant_type: tokenRequest.grant_type,
      code: tokenRequest.code,
      redirect_uri: tokenRequest.redirect_uri,
      client_id: tokenRequest.client_id,
      code_verifier: tokenRequest.code_verifier,
      ...(tokenRequest.resource && { resource: tokenRequest.resource })
    });

    // 选择并应用客户端认证方法
    const authMethod = selectClientAuthMethod(metadata.authServerMetadata, clientInfo);
    const isHttps = tokenEndpoint.startsWith('https:');
    validateClientAuthMethod(authMethod, clientInfo, isHttps);
    
    applyClientAuthentication(authMethod, clientInfo, headers, body);

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers,
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const tokenResponse = await response.json() as OAuthTokenResponse;

    // 计算过期时间
    const expiresAt = tokenResponse.expires_in 
      ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in
      : undefined;

    const tokens: OAuthTokens = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: expiresAt,
      scope: tokenResponse.scope
    };

    log.log('Tokens received successfully');
    return tokens;
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(): Promise<OAuthTokens | undefined> {
    const currentTokens = await this.tokens();
    if (!currentTokens?.refresh_token) {
      log.log('No refresh token available');
      return undefined;
    }

    try {
      // 重新发现元数据（以防配置更改）
      const metadata = await this.metadataService.discoverAllMetadata(this.serverUrl);
      if (!metadata.authServerMetadata) {
        throw new Error('Cannot refresh token: authorization server metadata not available');
      }

      const clientInfo = await this.clientInformation();
      if (!clientInfo) {
        throw new Error('Cannot refresh token: client information not available');
      }

      const refreshRequest: RefreshTokenRequest = {
        grant_type: 'refresh_token',
        refresh_token: currentTokens.refresh_token,
        client_id: clientInfo.client_id,
        resource: metadata.resourceUrl?.toString()
      };

      log.log('Refreshing access token');

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      };

      // 添加客户端认证（如果有客户端密钥）
      if (clientInfo.client_secret) {
        const credentials = btoa(`${clientInfo.client_id}:${clientInfo.client_secret}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const body = new URLSearchParams({
        grant_type: refreshRequest.grant_type,
        refresh_token: refreshRequest.refresh_token,
        client_id: refreshRequest.client_id,
        ...(refreshRequest.resource && { resource: refreshRequest.resource })
      });

      const response = await fetch(metadata.authServerMetadata.token_endpoint, {
        method: 'POST',
        headers,
        body: body.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('Token refresh failed:', response.status, errorText);
        return undefined;
      }

      const tokenResponse = await response.json() as OAuthTokenResponse;

      // 计算过期时间
      const expiresAt = tokenResponse.expires_in 
        ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in
        : undefined;

      const newTokens: OAuthTokens = {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || currentTokens.refresh_token, // 保留原有 refresh_token 如果没有新的
        expires_at: expiresAt,
        scope: tokenResponse.scope || currentTokens.scope
      };

      this.saveTokens(newTokens);
      log.log('Token refreshed successfully');
      
      return newTokens;
    } catch (error) {
      log.error('Failed to refresh token:', error);
      return undefined;
    }
  }

}