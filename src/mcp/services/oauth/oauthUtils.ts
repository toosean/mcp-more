/**
 * OAuth 工具函数集合
 * 包含错误检测、作用域发现、资源URL选择等实用功能
 */

import { MetadataDiscoveryService } from './metadataDiscovery';
import { OAuthProtectedResourceMetadata } from '../../../config/types';
import { AuthorizationServerMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import log from 'electron-log';

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
    log.log('OAuth Utils: Discovering scopes for', serverUrl);

    // 第一优先级：受保护资源元数据中的作用域
    if (resourceMetadata?.scopes_supported?.length) {
      const scopes = resourceMetadata.scopes_supported.join(' ');
      log.log('OAuth Utils: Found scopes from resource metadata:', scopes);
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
      log.log('OAuth Utils: Found scopes from authorization server metadata:', scopes);
      return scopes;
    }

    log.log('OAuth Utils: No scopes discovered');
    return undefined;
  } catch (error) {
    log.debug('OAuth Utils: Failed to discover scopes:', error);
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

  log.log('OAuth Utils: Selecting resource URL for', defaultResource.href);

  // 只有存在资源元数据时才包含资源参数
  if (!resourceMetadata?.resource) {
    log.log('OAuth Utils: No resource metadata available');
    return undefined;
  }

  try {
    // 验证资源元数据的资源是否与请求兼容
    const configuredResource = new URL(resourceMetadata.resource);

    if (!checkResourceAllowed(defaultResource, configuredResource)) {
      const error = `Protected resource ${configuredResource.href} does not match expected ${defaultResource.href}`;
      log.error('OAuth Utils:', error);
      throw new Error(error);
    }

    log.log('OAuth Utils: Selected resource URL:', configuredResource.href);
    // 使用元数据中的资源，因为这是服务器告诉我们请求的内容
    return configuredResource;
  } catch (error) {
    log.error('OAuth Utils: Resource URL selection failed:', error);
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


