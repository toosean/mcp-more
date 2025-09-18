/**
 * OAuth 工具函数集合
 * 包含错误检测、作用域发现、资源URL选择等实用功能
 */

import { MetadataDiscoveryService } from './metadataDiscovery';
import { OAuthProtectedResourceMetadata } from '../../../config/types';
import { AuthorizationServerMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';

/**
 * 检测是否为 401 未授权错误
 * 支持多种错误格式的检测
 */
export const is401Error = (error: unknown): boolean => {
  if (!error) return false;

  // HTTP 状态码 401
  if (error instanceof Error && error.message.includes('401')) return true;

  // 包含 "Unauthorized" 文本
  if (error instanceof Error && error.message.includes('Unauthorized')) return true;

  // 包含 "authentication" 相关文本（不区分大小写）
  if (error instanceof Error && error.message.toLowerCase().includes('authentication')) return true;

  // 检查错误对象的 status 属性
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    if (errorObj.status === 401 || errorObj.code === 401) return true;
  }

  // SSE 特定错误检测（如果将来需要）
  // if (error instanceof SseError && error.code === 401) return true;

  return false;
};

/**
 * 智能作用域发现机制
 * 按优先级顺序尝试不同的作用域来源
 */
export const discoverScopes = async (
  serverUrl: string,
  resourceMetadata?: OAuthProtectedResourceMetadata
): Promise<string | undefined> => {
  const metadataService = new MetadataDiscoveryService();

  try {
    console.log('OAuth Utils: Discovering scopes for', serverUrl);

    // 第一优先级：受保护资源元数据中的作用域
    if (resourceMetadata?.scopes_supported?.length) {
      const scopes = resourceMetadata.scopes_supported.join(' ');
      console.log('OAuth Utils: Found scopes from resource metadata:', scopes);
      return scopes;
    }

    // 第二优先级：OAuth 授权服务器元数据中的作用域
    let authServerUrl = serverUrl;
    if (resourceMetadata?.authorization_servers?.length) {
      authServerUrl = resourceMetadata.authorization_servers[0];
    }

    const oauthMetadata = await metadataService.discoverAuthorizationServerMetadata(authServerUrl);
    if (oauthMetadata?.scopes_supported?.length) {
      const scopes = oauthMetadata.scopes_supported.join(' ');
      console.log('OAuth Utils: Found scopes from authorization server metadata:', scopes);
      return scopes;
    }

    console.log('OAuth Utils: No scopes discovered');
    return undefined;
  } catch (error) {
    console.debug('OAuth Utils: Failed to discover scopes:', error);
    return undefined;
  }
};

/**
 * 资源 URL 选择和验证（RFC 8707 资源指示器支持）
 * 验证请求的资源是否与配置的资源匹配
 */
export const selectResourceURL = async (
  serverUrl: string | URL,
  resourceMetadata?: OAuthProtectedResourceMetadata
): Promise<URL | undefined> => {
  const defaultResource = new URL(serverUrl);

  console.log('OAuth Utils: Selecting resource URL for', defaultResource.href);

  // 只有存在资源元数据时才包含资源参数
  if (!resourceMetadata?.resource) {
    console.log('OAuth Utils: No resource metadata available');
    return undefined;
  }

  try {
    // 验证资源元数据的资源是否与请求兼容
    const configuredResource = new URL(resourceMetadata.resource);

    if (!checkResourceAllowed(defaultResource, configuredResource)) {
      const error = `Protected resource ${configuredResource.href} does not match expected ${defaultResource.href}`;
      console.error('OAuth Utils:', error);
      throw new Error(error);
    }

    console.log('OAuth Utils: Selected resource URL:', configuredResource.href);
    // 使用元数据中的资源，因为这是服务器告诉我们请求的内容
    return configuredResource;
  } catch (error) {
    console.error('OAuth Utils: Resource URL selection failed:', error);
    throw error;
  }
};

/**
 * 检查资源是否允许访问
 * 验证相同来源或精确匹配
 */
function checkResourceAllowed(
  requestedResource: URL,
  configuredResource: URL
): boolean {
  // 相同来源检查
  if (requestedResource.origin === configuredResource.origin) {
    return true;
  }

  // 精确匹配检查
  if (requestedResource.href === configuredResource.href) {
    return true;
  }

  return false;
}

/**
 * 构建授权查询参数
 * 过滤掉空值并正确编码参数
 */
export const buildAuthorizationParams = (params: Record<string, string | undefined>): URLSearchParams => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });

  return searchParams;
};

/**
 * 解析 OAuth 回调 URL 参数
 * 提取授权码、状态参数、错误信息等
 */
export const parseCallbackParams = (url: string): {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
} => {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    return {
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
      error: params.get('error') || undefined,
      error_description: params.get('error_description') || undefined,
      error_uri: params.get('error_uri') || undefined,
    };
  } catch (error) {
    console.error('OAuth Utils: Failed to parse callback URL:', error);
    return {};
  }
};

/**
 * 验证状态参数防止 CSRF 攻击
 */
export const validateStateParameter = (
  receivedState: string | undefined,
  expectedState: string | undefined
): boolean => {
  if (!receivedState || !expectedState) {
    console.warn('OAuth Utils: Missing state parameter - possible CSRF attack');
    return false;
  }

  const isValid = receivedState === expectedState;
  if (!isValid) {
    console.warn('OAuth Utils: State parameter mismatch - possible CSRF attack');
  }

  return isValid;
};

/**
 * 检查令牌是否即将过期
 * 默认提前 5 分钟判断为即将过期
 */
export const isTokenExpiringSoon = (
  expiresAt?: number,
  bufferMinutes: number = 5
): boolean => {
  if (!expiresAt) {
    return false; // 没有过期时间信息，假设未过期
  }

  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = bufferMinutes * 60;

  return (expiresAt - now) <= bufferSeconds;
};

/**
 * 计算令牌过期时间
 */
export const calculateTokenExpiration = (expiresInSeconds?: number): number | undefined => {
  if (!expiresInSeconds) {
    return undefined;
  }

  return Math.floor(Date.now() / 1000) + expiresInSeconds;
};

/**
 * 清理敏感数据（用于日志记录）
 * 移除或混淆敏感信息如令牌、密钥等
 */
export const sanitizeForLogging = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  // 需要清理的敏感字段
  const sensitiveFields = [
    'access_token',
    'refresh_token',
    'client_secret',
    'code',
    'code_verifier',
    'authorization',
    'password'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      if (typeof sanitized[field] === 'string') {
        const value = sanitized[field] as string;
        // 只显示前4个字符和后4个字符，中间用星号替代
        if (value.length > 8) {
          sanitized[field] = `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
        } else {
          sanitized[field] = '***';
        }
      } else {
        sanitized[field] = '[REDACTED]';
      }
    }
  });

  return sanitized;
};

/**
 * 生成随机字符串（用于状态参数等）
 */
export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

/**
 * 验证 URL 格式
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};