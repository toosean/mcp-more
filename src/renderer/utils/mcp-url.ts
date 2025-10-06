/**
 * 生成基于 profile 的 MCP URL
 * @param portNumber - 端口号
 * @param profileId - Profile ID（可选）
 * @returns MCP URL
 */
export const generateMcpUrl = (portNumber: number, profileId?: string): string => {
  if (profileId) {
    // 特定 Profile：使用 /{profileId}/mcp 路径
    return `http://localhost:${portNumber}/${profileId}/mcp`;
  } else {
    // 默认：使用 /mcp 路径
    return `http://localhost:${portNumber}/mcp`;
  }
};

/**
 * 从 URL 中解析 profile ID
 * @param url - MCP URL
 * @returns profile ID 或 null（默认配置）
 */
export const parseProfileIdFromUrl = (url: string): string | null => {
  const urlMatch = url.match(/http:\/\/localhost:\d+\/(.*)\/mcp/) ||
                   url.match(/http:\/\/localhost:\d+\/(mcp)/);

  if (urlMatch) {
    const pathPart = urlMatch[1];
    if (pathPart === 'mcp') {
      return null; // 默认配置
    }
    return pathPart; // Profile ID
  }
  return null;
};
