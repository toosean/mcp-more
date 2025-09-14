/**
 * OAuth 2.1 类型定义
 */

export interface OAuthClientMetadata {
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
  client_name?: string;
  client_uri?: string;
  scope?: string;
}

export interface OAuthClientInformation extends OAuthClientMetadata {
  client_id: string;
  client_secret?: string;
}

export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export interface AuthorizationRequest {
  response_type: 'code';
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: 'S256';
  resource?: string;
}

export interface TokenRequest {
  grant_type: 'authorization_code';
  code: string;
  redirect_uri: string;
  client_id: string;
  code_verifier: string;
  resource?: string;
}

export interface RefreshTokenRequest {
  grant_type: 'refresh_token';
  refresh_token: string;
  client_id: string;
  resource?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

export type OAuthFlowResult = 'AUTHORIZED' | 'ERROR' | 'CANCELLED' | 'IN_PROGRESS';

/**
 * OAuth 状态机相关类型
 */
export type OAuthStep =
  | 'metadata_discovery'
  | 'client_registration'
  | 'authorization_redirect'
  | 'authorization_code'
  | 'token_request'
  | 'complete';

export interface OAuthFlowState {
  step: OAuthStep;
  serverUrl: string;

  // 元数据发现阶段
  resourceMetadata?: any;
  authServerUrl?: string;
  oauthMetadata?: any;

  // 客户端注册阶段
  oauthClientInfo?: any;

  // 授权重定向阶段
  scopes?: string;
  authorizationUrl?: string;
  state?: string;
  codeVerifier?: string;

  // 授权码阶段
  authorizationCode?: string;
  validationError?: string;

  // 令牌请求阶段
  oauthTokens?: any;

  // 错误状态
  error?: string;
}

export interface StateMachineContext {
  state: OAuthFlowState;
  serverUrl: string;
  provider: any; // ElectronOAuthClientProvider，避免循环依赖
  updateState: (updates: Partial<OAuthFlowState>) => void;
}

export interface StateTransition {
  canTransition: (context: StateMachineContext) => Promise<boolean>;
  execute: (context: StateMachineContext) => Promise<void>;
}