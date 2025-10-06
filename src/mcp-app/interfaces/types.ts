/**
 * MCP 应用检测和配置相关的类型定义
 */

/**
 * MCP 应用检测器基础接口
 * 每个 MCP 客户端（如 Claude Desktop、Claude Code）都需要实现此接口
 */
export interface MCPAppDetector {
  // 客户端基本信息
  readonly appId: string;           // 'claude-desktop', 'claude-code', 'cursor', etc.
  readonly appName: string;         // 'Claude Desktop', 'Claude Code', etc.
  readonly priority: number;        // 优先级（1-100，越大越优先）用于侧边栏显示排序

  // 检测方法
  detect(): Promise<MCPAppDetectionResult>;

  // 配置文件操作
  getConfigPath(): Promise<string | null>;
  readConfig(): Promise<any | null>;
  writeConfig(config: any): Promise<boolean>;
  backupConfig(): Promise<string | null>;

  // 一键配置
  setup(mcpMoreConfig: MCPMoreSetupConfig): Promise<MCPAppSetupResult>;

  // 验证配置是否成功
  verify(): Promise<boolean>;

  // 检查指定 alias 是否已配置
  isConfigured(alias: string): Promise<boolean>;

  // 获取所有已配置的 MCP 服务器（通过 localhost URL pattern 匹配 MCP More）
  getConfiguredMCPMoreServers(): Promise<ConfiguredMCPServer[]>;
}

/**
 * 检测结果
 */
export interface MCPAppDetectionResult {
  appId: string;
  appName: string;
  installed: boolean;              // 是否检测到已安装
  version?: string;                // 应用版本号（如果能获取）
  configPath?: string;             // 配置文件路径
  error?: string;                  // 检测过程中的错误信息
  logs?: string[];                 // 检测过程中的日志记录
}

/**
 * MCP More 配置信息（用于设置）
 */
export interface MCPMoreSetupConfig {
  url: string;                     // MCP More 服务器 URL
  alias: string;                   // MCP 别名，如 'x' 或 'mcp-more'
  profileId?: string;              // 可选的 Profile ID
}

/**
 * 已配置的 MCP 服务器信息
 */
export interface ConfiguredMCPServer {
  alias: string;                   // 配置的别名
  url: string;                     // 配置的 URL
}

/**
 * 配置结果
 */
export interface MCPAppSetupResult {
  success: boolean;
  message: string;                 // 用户友好的提示信息
  appId: string;
  configPath?: string;             // 写入的配置文件路径
  backupPath?: string;             // 配置文件备份路径（如果有备份）
  error?: string;                  // 错误信息（如果失败）
  needsRestart?: boolean;          // 是否需要重启应用才能生效
  logs?: string[];                 // 配置过程的日志记录
}

/**
 * 应用基本信息
 */
export interface MCPAppInfo {
  appId: string;
  appName: string;
  priority: number;
  description?: string;             // 应用描述
}

/**
 * MCP 应用管理器接口
 * 统一管理所有 MCP 客户端应用的检测和配置
 */
export interface IMCPAppManager {
  // 获取所有支持的应用信息
  getSupportedApps(): MCPAppInfo[];

  // 检测所有应用
  detectAllApps(): Promise<MCPAppDetectionResult[]>;

  // 检测特定应用
  detectApp(appId: string): Promise<MCPAppDetectionResult>;

  // 获取已安装的应用（按优先级排序，可限制返回数量）
  getInstalledApps(limit?: number): Promise<MCPAppDetectionResult[]>;

  // 配置特定应用
  setupApp(appId: string, config: MCPMoreSetupConfig): Promise<MCPAppSetupResult>;

  // 打开应用配置目录
  openConfigDirectory(appId: string): Promise<void>;

  // 获取检测器实例（内部使用）
  getDetector(appId: string): MCPAppDetector | null;

  // 备份指定应用的配置
  backupAppConfig(appId: string): Promise<string | null>;

  // 检查应用是否已配置指定的 alias
  isAppConfigured(appId: string, alias: string): Promise<boolean>;

  // 获取应用中所有已配置的 MCP More 服务器
  getAppConfiguredMCPMoreServers(appId: string): Promise<ConfiguredMCPServer[]>;
}
