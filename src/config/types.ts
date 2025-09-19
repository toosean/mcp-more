import log from 'electron-log';

/**
 * MCP More 应用配置类型定义
 */

// 主题类型
export type Theme = 'light' | 'dark' | 'system';

// OAuth 相关类型定义
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
}

export interface OAuthClientInfo {
  client_id: string;
  redirect_uris: string[];
  client_name: string;
}

export interface OAuthProtectedResourceMetadata {
  resource?: string;
  authorization_servers?: string[];
  scopes_supported?: string[];
  bearer_methods_supported?: string[];
  resource_documentation?: string;
}

// 导入SDK的AuthorizationServerMetadata类型
import { AuthorizationServerMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import { FormFieldConfig } from '@/components/DynamicForm';

export interface OAuthMetadata {
  resourceMetadata?: OAuthProtectedResourceMetadata;
  authorizationServerMetadata?: AuthorizationServerMetadata;
  resourceUrl?: string;
  lastDiscovery?: number;
}

// 通用设置
export interface GeneralSettings {
  /** 在系统启动时一起启动 */
  autoStart: boolean;
  /** 启用遥测 */
  enableTelemetry: boolean;
  /** 界面主题 */
  theme: Theme;
  /** 语言设置 */
  language: string;
  /** 启动时最小化 */
  minimizeOnStartup: boolean;
  /** 端口号 */
  portNumber: number;
}

// MCP 包
export interface Mcp {
  source: 'manual' | 'json' | 'market' | null; //null | manual |json  表示本地安装
  identifier: string;
  name: string;
  code: string;
  description: string | null;
  author: string | null;
  version: string | null;
  updated: string | null;
  license: string | null;
  installed: string | null;
  enabled: boolean;
  status?: 'stopped' | 'starting' | 'running' | 'stopping';
  latestError?: 'auth' | 'unknown' | null;
  latestErrorDetail?: string | null;
  config: {
    url: string | null;
    command: string | null;
    env: Record<string, string> | null;
    headers?: Record<string, string> | null;
    json: string | null;
  },
  inputs?: FormFieldConfig[] | null;
  inputValues?: Record<string, string> | null;
  runtimes?: string[] | null;
  authMethod?: 'oauth'[] | null;
  
  // OAuth 配置（非敏感数据）
  oauth?: {
    /** 用户配置的客户端ID（非敏感） */
    clientId?: string;
    /** OAuth 授权范围 */
    scopes?: string;
    /** 授权服务器端点（可选，支持自动发现） */
    authorizationUrl?: string;
    tokenUrl?: string;
  };

  /** OAuth 元数据缓存 */
  oauthMetadata?: OAuthMetadata;
}

// MCP 统计信息
export interface McpStatistics {
  /** 总调用次数 */
  totalCalls: number;
  /** 每个 MCP 包的调用次数 */
  packageCalls: Record<string, number>; // key 为包名，value 为调用次数
}

// 市场配置
export interface MarketConfig {
  /** 市场 API 基础 URL */
  apiBaseUrl: string;
  /** 每页默认显示数量 */
  defaultPageSize: number;
}

// MCP 相关设置
export interface MCPSettings {
  /** 已安装的 MCP 包 */
  installedMcps: Mcp[]
  /** 自动发现本地 MCP 客户端 */
  autoDiscoverClients: boolean;
  /** MCP 统计信息 */
  statistics: McpStatistics;
  /** 市场配置 */
  market: MarketConfig;
}

// 应用配置的完整类型
export interface AppConfig {
  /** 通用设置 */
  general: GeneralSettings;
  /** MCP 相关设置 */
  mcp: MCPSettings;
  /** 配置版本，用于迁移 */
  configVersion: string;
  /** 最后保存时间 */
  lastSaved: string;
}

/**
 * 获取系统默认语言
 * 支持的语言列表：zh-CN, en-US
 */
function getSystemDefaultLanguage(): string {

  const supportedLanguages = ['zh-CN', 'en-US'];
  
  // 在主进程中，可以使用 app.getLocale()
  if (typeof process !== 'undefined' && process.versions?.electron) {
    try {
      // 如果是在主进程中，尝试获取系统语言
      const { app } = require('electron');
      
      let language = null;

      const systemLanguages = app.getPreferredSystemLanguages()
      if (systemLanguages.length > 0) {
        language = systemLanguages[0];
      }
      if (!language) {
        language = app?.getLocale?.() || 'en-US';
      }
      
      // 映射系统语言到支持的语言
      if (language.startsWith('zh')) {
        return 'zh-CN';
      }
      return 'en-US';
    } catch (error) {
      // 如果获取失败，回退到默认值
      log.warn('Failed to get system locale:', error);
    }
  }

  // 默认回退到英文
  return 'en-US';
}

/**
 * 创建默认配置的函数
 * 每次调用时都会重新计算系统语言
 */
export function createDefaultConfig(): AppConfig {
  return {
    general: {
      autoStart: true,
      enableTelemetry: false,
      theme: 'system',
      language: getSystemDefaultLanguage(),
      minimizeOnStartup: false,
      portNumber: 7195,
    },
    mcp: {
      installedMcps: [],
      autoDiscoverClients: true,
      statistics: {
        totalCalls: 0,
        packageCalls: {}
      },
      market: {
        apiBaseUrl: 'https://api.mcp-registry.org',
        defaultPageSize: 20
      }
    },
    configVersion: '1.0.0',
    lastSaved: new Date().toISOString(),
  };
}

// 配置的默认值 - 保持向后兼容
export const defaultConfig: AppConfig = createDefaultConfig();

// 配置更新的部分类型
export type PartialAppConfig = {
  [K in keyof AppConfig]?: Partial<AppConfig[K]>;
};
