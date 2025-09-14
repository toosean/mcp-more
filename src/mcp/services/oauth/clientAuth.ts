/**
 * 客户端认证方法选择和应用
 * 支持 OAuth 2.1 标准的多种客户端认证方法
 */

import { AuthorizationServerMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import { OAuthClientInformation } from './types';

export type ClientAuthMethod = 'client_secret_basic' | 'client_secret_post' | 'none';

/**
 * 选择最适合的客户端认证方法
 */
export function selectClientAuthMethod(
  authServerMetadata: AuthorizationServerMetadata,
  clientInfo: OAuthClientInformation
): ClientAuthMethod {
  const supportedMethods = authServerMetadata.token_endpoint_auth_methods_supported || ['client_secret_basic'];
  
  // 如果没有客户端密钥，只能使用 'none'（PKCE）
  if (!clientInfo.client_secret) {
    if (supportedMethods.includes('none')) {
      return 'none';
    }
    throw new Error('Server does not support PKCE (none authentication method)');
  }

  // 优先级：client_secret_basic > client_secret_post > none
  const preferredOrder: ClientAuthMethod[] = ['client_secret_basic', 'client_secret_post', 'none'];
  
  for (const method of preferredOrder) {
    if (supportedMethods.includes(method)) {
      return method;
    }
  }

  throw new Error(`Server does not support any of the client authentication methods: ${supportedMethods.join(', ')}`);
}

/**
 * 应用客户端认证到请求
 */
export function applyClientAuthentication(
  method: ClientAuthMethod,
  clientInfo: OAuthClientInformation,
  headers: Record<string, string>,
  body: URLSearchParams
): void {
  switch (method) {
    case 'client_secret_basic':
      if (!clientInfo.client_secret) {
        throw new Error('Client secret is required for client_secret_basic authentication');
      }
      const credentials = btoa(`${clientInfo.client_id}:${clientInfo.client_secret}`);
      headers['Authorization'] = `Basic ${credentials}`;
      break;

    case 'client_secret_post':
      if (!clientInfo.client_secret) {
        throw new Error('Client secret is required for client_secret_post authentication');
      }
      body.set('client_secret', clientInfo.client_secret);
      break;

    case 'none':
      // PKCE only - no additional authentication required
      // client_id is already included in the request body
      break;

    default:
      throw new Error(`Unsupported client authentication method: ${method}`);
  }
}

/**
 * 验证客户端认证方法是否安全
 */
export function validateClientAuthMethod(
  method: ClientAuthMethod,
  clientInfo: OAuthClientInformation,
  isHttps: boolean
): void {
  // 对于 client_secret_post，建议使用 HTTPS
  if (method === 'client_secret_post' && !isHttps) {
    console.warn('Using client_secret_post over HTTP is not recommended for security reasons');
  }

  // 对于公共客户端（没有客户端密钥），只能使用 PKCE
  if (!clientInfo.client_secret && method !== 'none') {
    throw new Error(`Public clients must use PKCE (none authentication method), but ${method} was selected`);
  }

  // 对于机密客户端，不建议使用 none 方法（除非同时使用 PKCE）
  if (clientInfo.client_secret && method === 'none') {
    console.warn('Confidential clients using none authentication method should also use PKCE for enhanced security');
  }
}