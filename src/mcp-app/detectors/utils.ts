import { configManager } from '../../config/ConfigManager';

/**
 * 检查 URL 是否匹配 MCP More 服务器
 *
 * 规则：
 * 1. URL 必须包含 'localhost'（不检查 127.0.0.1）
 * 2. URL 必须包含配置的端口号
 *
 * @param url - 要检查的 URL 字符串
 * @returns 如果 URL 匹配 MCP More 服务器则返回 true
 */
export function isMCPMoreServerUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  // 检查是否包含 localhost（不检查 127.0.0.1）
  if (!url.includes('localhost')) {
    return false;
  }

  // 获取配置的端口号
  const portNumber = configManager.get('general', 'portNumber');

  // 检查是否包含配置的端口号
  if (!url.includes(`:${portNumber}`)) {
    return false;
  }

  return true;
}
