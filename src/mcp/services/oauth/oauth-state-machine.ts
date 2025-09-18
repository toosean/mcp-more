/**
 * OAuth 状态机实现
 * 基于 MCP Inspector 的状态机模式，管理 OAuth 2.1 + PKCE 流程的各个阶段
 */

import { ElectronOAuthClientProvider } from './ElectronOAuthClientProvider';
import { MetadataDiscoveryService } from './metadataDiscovery';
import { sessionStorage } from './sessionStorage';
import { PKCEService } from './pkce';
import { selectResourceURL, discoverScopes } from './oauthUtils';
import { Mcp } from '../../../config/types';
import {
  OAuthStep,
  OAuthFlowState as ImportedOAuthFlowState,
  StateTransition,
  StateMachineContext as ImportedStateMachineContext,
  OAuthFlowResult
} from './types';
import { mcpServerManager } from '../mcpServer';
import { CallbackParams } from 'src/main/oauth/callbackServer';
import log from 'electron-log';
import { shell } from 'electron';

/**
 * OAuth 流程状态定义（使用导入的类型）
 */
export interface OAuthFlowState extends ImportedOAuthFlowState {}

/**
 * 状态机上下文（使用导入的类型）
 */
interface StateMachineContext {
  mcp: Mcp;
  state: OAuthFlowState;
  serverUrl: string;
  provider: ElectronOAuthClientProvider;
  updateState: (updates: Partial<OAuthFlowState>) => void;
}

/**
 * OAuth 状态转换定义
 */
const oauthTransitions: Record<OAuthStep, StateTransition> = {
  metadata_discovery: {
    canTransition: async () => true, // 总是可以开始元数据发现

    execute: async (context: StateMachineContext) => {
      const { serverUrl, updateState } = context;
      const metadataService = new MetadataDiscoveryService();

      log.log('OAuth State Machine: Starting metadata discovery for', serverUrl);

      try {
        // 发现受保护资源元数据
        const resourceMetadata = await metadataService.discoverOAuthProtectedResourceMetadata(serverUrl);

        // 确定授权服务器 URL
        let authServerUrl = serverUrl;
        if (resourceMetadata?.authorization_servers?.length) {
          authServerUrl = resourceMetadata.authorization_servers[0];
        }

        // 发现授权服务器元数据
        const oauthMetadata = await metadataService.discoverAuthorizationServerMetadata(authServerUrl);

        if (!oauthMetadata) {
          throw new Error('Failed to discover OAuth metadata');
        }

        // 验证授权服务器支持
        metadataService.validateAuthorizationServerSupport(oauthMetadata);

        updateState({
          resourceMetadata,
          authServerUrl,
          oauthMetadata,
          step: 'client_registration'
        });

        log.log('OAuth State Machine: Metadata discovery completed');
      } catch (error) {
        log.error('OAuth State Machine: Metadata discovery failed:', error);
        updateState({
          error: error instanceof Error ? error.message : 'Metadata discovery failed',
          step: 'complete'
        });
      }
    }
  },

  client_registration: {
    canTransition: async (context: StateMachineContext) => {
      return !!context.state.oauthMetadata;
    },

    execute: async (context: StateMachineContext) => {
      const { state, provider, updateState } = context;

      log.log('OAuth State Machine: Starting client registration');
      try {
        if (!state.oauthMetadata) {
          throw new Error('OAuth metadata not available');
        }

        // 获取客户端元数据并更新支持的作用域（类似Inspector）
        const clientMetadata = provider.clientMetadata;

        // 优先使用资源元数据中的作用域，回退到OAuth元数据中的作用域
        const scopesSupported =
          state.resourceMetadata?.scopes_supported ||
          state.oauthMetadata.scopes_supported;

        // 将所有支持的作用域添加到客户端注册中（Inspector模式）
        if (scopesSupported?.length) {
          clientMetadata.scope = scopesSupported.join(' ');
          log.log('OAuth State Machine: Updated client metadata with scopes:', clientMetadata.scope);
        }

        // 发现最终使用的作用域
        const scopes = await discoverScopes(state.serverUrl, state.resourceMetadata);

        // Try Static client first, with DCR as fallback（Inspector模式）
        let clientInfo = await provider.clientInformation();

        if (!clientInfo && state.oauthMetadata.registration_endpoint) {
          log.log('OAuth State Machine: Registering new OAuth client using DCR');
          // 通过提供者的方法进行动态注册（Inspector模式）
          clientInfo = await provider.registerClient(state.authServerUrl, state.oauthMetadata);
          provider.saveClientInformation(clientInfo);
        }

        if (!clientInfo) {
          throw new Error('Unable to obtain client information and server does not support dynamic registration');
        }

        updateState({
          oauthClientInfo: clientInfo,
          scopes,
          step: 'authorization_redirect'
        });

        log.log('OAuth State Machine: Client registration completed');
      } catch (error) {
        log.error('OAuth State Machine: Client registration failed:', error);
        updateState({
          error: error instanceof Error ? error.message : 'Client registration failed',
          step: 'complete'
        });
      }
    }
  },

  authorization_redirect: {
    canTransition: async (context: StateMachineContext) => {
      return !!(context.state.oauthMetadata && context.state.oauthClientInfo);
    },

    execute: async (context: StateMachineContext) => {
      const { state, serverUrl, updateState } = context;
      log.log('OAuth State Machine: Preparing authorization redirect');

      try {
        if (!state.oauthMetadata || !state.oauthClientInfo) {
          throw new Error('Required OAuth metadata or client information not available');
        }

        // 生成 PKCE 参数
        const pkceService = new PKCEService();
        const pkceParams = await pkceService.generateChallenge();
        const stateParam = pkceService.generateState();

        // 选择资源 URL
        const resourceUrl = await selectResourceURL(serverUrl, state.resourceMetadata);

        // 存储会话信息
        sessionStorage.storeSession(serverUrl, {
          state: stateParam,
          codeVerifier: pkceParams.codeVerifier,
          codeChallenge: pkceParams.codeChallenge,
          codeChallengeMethod: pkceParams.codeChallengeMethod,
          scopes: state.scopes,
          resourceUrl: resourceUrl?.toString()
        });

        // 构建授权 URL
        const authUrl = new URL(state.oauthMetadata.authorization_endpoint);
        const params = {
          response_type: 'code',
          client_id: state.oauthClientInfo.client_id,
          redirect_uri: state.oauthClientInfo.redirect_uris[0],
          scope: state.scopes || '',
          state: stateParam,
          code_challenge: pkceParams.codeChallenge,
          code_challenge_method: pkceParams.codeChallengeMethod,
          ...(resourceUrl && { resource: resourceUrl.toString() })
        };

        Object.entries(params).forEach(([key, value]) => {
          if (value) authUrl.searchParams.append(key, value);
        });

        const authUrlString = authUrl.toString();

        const returnPromise = new Promise<OAuthFlowState>((resolve, reject) => {
          mcpServerManager.subscribeOAuthCallback((url: URL, res: any) => {
            // 提取回调参数
            const params: CallbackParams = {
              code: url.searchParams.get('code') || undefined,
              state: url.searchParams.get('state') || undefined,
              error: url.searchParams.get('error') || undefined,
              error_description: url.searchParams.get('error_description') || undefined,
              error_uri: url.searchParams.get('error_uri') || undefined,
            };
  
            if(stateParam !== params.state) {
              //TODO: handle error
              reject(new Error('State mismatch'));
              return;
            }
  
            // 发送成功页面
            if (params.error) {
              //this.sendErrorPage(res, params);
              reject(new Error('Error'));
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <html>
                  <head>
                    <title>Authorization Complete</title>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                      .container { max-width: 500px; margin: 50px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
                      .success { color: #28a745; }
                      .icon { font-size: 48px; margin-bottom: 20px; }
                      button { background: #007cff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 20px; }
                      button:hover { background: #0056b3; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="icon success">✓</div>
                      <h1 class="success">Authorization Complete</h1>
                      <p>OAuth authorization was successful!</p>
                      <p>You can now close this window and return to mcp-more.</p>
                      <button onclick="window.close()">Close Window</button>
                    </div>
                    <script>
                      // Auto-close after 3 seconds
                      setTimeout(() => window.close(), 3000);
                    </script>
                  </body>
                </html>
              `);
            }

            resolve({
              ...context.state,
              authorizationCode: params.code,
              state: stateParam,
              codeVerifier: pkceParams.codeVerifier,
              step: 'authorization_code'
            });

          });
        });

        // 自动打开浏览器（类似Inspector的处理方式）
        await shell.openExternal(authUrlString);

        // 等待回调
        const result = await returnPromise;
        updateState(result);

      } catch (error) {
        log.error('OAuth State Machine: Authorization redirect preparation failed:', error);
        updateState({
          error: error instanceof Error ? error.message : 'Authorization redirect preparation failed',
          step: 'complete'
        });
      }


    }
  },

  authorization_code: {
    canTransition: async () => true, // 总是可以检查授权码

    execute: async (context: StateMachineContext) => {
      const { state, updateState } = context;

      log.log('OAuth State Machine: Validating authorization code');

      if (!state.authorizationCode) {
        updateState({
          validationError: 'Authorization code is required',
          error: 'No authorization code provided'
        });
        return;
      }

      // 清除验证错误并继续到令牌请求
      updateState({
        validationError: undefined,
        step: 'token_request'
      });

      log.log('OAuth State Machine: Authorization code validated');
    }
  },

  token_request: {
    canTransition: async (context: StateMachineContext) => {
      return !!(
        context.state.authorizationCode &&
        context.state.oauthMetadata &&
        context.state.oauthClientInfo
      );
    },

    execute: async (context: StateMachineContext) => {
      const { state, serverUrl, provider, updateState } = context;

      log.log('OAuth State Machine: Starting token request');

      try {
        if (!state.authorizationCode || !state.oauthMetadata || !state.oauthClientInfo) {
          throw new Error('Required parameters not available for token request');
        }

        // 从会话存储获取 PKCE 参数
        log.log('OAuth State Machine: Server URL:', serverUrl);
        log.log('OAuth State Machine: Getting session for state:', state.state);
        const session = sessionStorage.getSession(serverUrl, state.state);
        if (!session?.codeVerifier) {
          throw new Error('PKCE code verifier not found in session');
        }

        // 构建令牌请求
        const tokenRequest = {
          grant_type: 'authorization_code' as const,
          code: state.authorizationCode,
          redirect_uri: state.oauthClientInfo.redirect_uris[0],
          client_id: state.oauthClientInfo.client_id,
          code_verifier: session.codeVerifier,
          resource: session.resourceUrl
        };

        // 交换令牌
        const tokens = await provider.exchangeAuthorizationCode(
          state.oauthMetadata.token_endpoint,
          tokenRequest,
          state.oauthClientInfo,
          { authServerMetadata: state.oauthMetadata }
        );

        // 保存令牌
        provider.saveTokens(tokens);

        updateState({
          oauthTokens: tokens,
          step: 'complete'
        });

        log.log('OAuth State Machine: Token request completed successfully');
      } catch (error) {
        log.error('OAuth State Machine: Token request failed:', error);
        updateState({
          error: error instanceof Error ? error.message : 'Token request failed',
          step: 'complete'
        });
      }
    }
  },

  complete: {
    canTransition: async () => false, // 终端状态

    execute: async () => {
      log.log('OAuth State Machine: Flow completed');
      // 无操作，这是终端状态
    }
  }
};

/**
 * OAuth 状态机主类
 */
export class OAuthStateMachine {
  private state: OAuthFlowState;
  private provider: ElectronOAuthClientProvider;

  constructor(
    private serverUrl: string,
    private mcp: Mcp,
    private updateMcpConfig: (updates: Partial<Mcp>) => void,
  ) {
    this.state = {
      step: 'metadata_discovery',
      serverUrl
    };

    this.provider = new ElectronOAuthClientProvider(
      serverUrl,
      mcp.oauth?.scopes,
      mcp,
      updateMcpConfig
    );
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): OAuthFlowState {
    return { ...this.state };
  }

  /**
   * 更新状态
   */
  private updateState = (updates: Partial<OAuthFlowState>) => {
    this.state = { ...this.state, ...updates };
  };

  /**
   * 执行单个步骤
   */
  async executeStep(): Promise<OAuthFlowResult> {
    const currentStep = this.state.step;
    const transition = oauthTransitions[currentStep];

    if (!transition) {
      throw new Error(`No transition defined for step: ${currentStep}`);
    }

    const context: StateMachineContext = {
      state: this.state,
      serverUrl: this.serverUrl,
      provider: this.provider,
      updateState: this.updateState,
      mcp: this.mcp
    };

    // 检查是否可以执行该步骤
    const canExecute = await transition.canTransition(context);
    if (!canExecute) {
      log.warn(`OAuth State Machine: Cannot execute step ${currentStep}`);
      return 'ERROR';
    }

    // 执行步骤
    await transition.execute(context);

    // 检查是否有错误
    if (this.state.error) {
      return 'ERROR';
    }

    // 如果完成，返回成功
    if (this.state.step === 'complete' && this.state.oauthTokens) {
      return 'AUTHORIZED';
    }

    return 'IN_PROGRESS';
  }

  /**
   * 运行完整的 OAuth 流程直到需要用户交互
   */
  async run(): Promise<{
    result: OAuthFlowResult;
    authorizationUrl?: string;
  }> {
    log.log('OAuth State Machine: Starting automated flow');

    while (this.state.step !== 'complete' &&
           //this.state.step !== 'authorization_code' &&
           !this.state.error) {

      const stepResult = await this.executeStep();

      if (stepResult === 'ERROR') {
        return { result: 'ERROR' };
      }
    }

    // 如果到达授权码步骤，返回授权 URL
    // if (this.state.step === 'authorization_code' && this.state.authorizationUrl) {
    //   return {
    //     result: 'IN_PROGRESS',
    //     authorizationUrl: this.state.authorizationUrl
    //   };
    // }

    // 如果有错误
    if (this.state.error) {
      return { result: 'ERROR' };
    }

    // 如果已完成
    if (this.state.step === 'complete' && this.state.oauthTokens) {
      return { result: 'AUTHORIZED' };
    }

    return { result: 'IN_PROGRESS' };
  }

  /**
   * 提供授权码并继续流程
   */
  // async provideAuthorizationCode(state: OAuthFlowState): Promise<OAuthFlowResult> {
  //   console.log('OAuth State Machine: Received authorization code');

  //   this.updateState({ 
  //     ...state,
  //     step: 'authorization_code'
  //   });

  //   // 继续执行剩余步骤
  //   while (this.state.step !== 'complete' && !this.state.error) {
  //     const stepResult = await this.executeStep();

  //     if (stepResult === 'ERROR') {
  //       return 'ERROR';
  //     }

  //     if (stepResult === 'AUTHORIZED') {
  //       return 'AUTHORIZED';
  //     }
  //   }

  //   if (this.state.error) {
  //     return 'ERROR';
  //   }

  //   return this.state.oauthTokens ? 'AUTHORIZED' : 'ERROR';
  // }

  /**
   * 获取错误信息
   */
  getError(): string | undefined {
    return this.state.error || this.state.validationError;
  }

  /**
   * 重置状态机到初始状态
   */
  reset(): void {
    this.state = {
      step: 'metadata_discovery',
      serverUrl: this.serverUrl
    };
  }
}