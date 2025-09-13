/**
 * 市场相关类型定义
 */

import { Mcp } from '../../config/types';

// 排序方式枚举
export type SortBy = 'popular' | 'latest' | 'rating';

// 市场中的 MCP 包信息 (对应后端的 McpVo)
export interface MarketMcp {
  /** 唯一标识符 */
  identifier: string;
  /** 包名称 */
  name: string;
  /** 包描述 */
  description: string | null;
  /** Logo URL */
  logoUrl: string | null;
  /** 作者信息 */
  author: string | null;
  /** 版本号 */
  version: string | null;
  /** 发布时间 */
  publishedAt: string | null;
  /** 更新时间 */
  updatedAt: string | null;
  /** 许可证 */
  license: string | null;
  /** 下载次数 */
  downloads: number | null;
  /** 包类型 */
  type: string | null;
  /** 评分 (0-5) */
  rating: number | null;
  /** 传输方式 */
  transport: string | null;
  /** 配置 */
  configuration: string | null;
  /** 是否已安装 */
  isInstalled?: boolean;
}

// 市场分类
export interface MarketCategory {
  /** 分类名称 */
  identifier: string;
  /** 分类描述 */
  title?: string;
  /** 分类图标 */
  icon?: string;
  /** 分类数量 */
  count?: number;
}

// 搜索过滤器
export interface MarketFilter {
  /** 搜索关键词 */
  query?: string;
  /** 分类过滤 */
  categoryId?: string;
  /** 排序方式 */
  sortBy: SortBy;
}

// 包详情页面数据 (对应后端的 McpDetailVo)
export interface MarketMcpDetail {
  /** 唯一标识符 */
  identifier: string;
  /** 包名称 */
  name: string;
  /** 包描述 */
  description: string | null;
  /** Logo URL */
  logoUrl: string | null;
  /** 作者信息 */
  author: string | null;
  /** 作者邮箱 */
  authorEmail: string | null;
  /** 作者头像 */
  authorAvatar: string | null;
  /** 版本号 */
  version: string | null;
  /** 发布时间 */
  publishedAt: string | null;
  /** 更新时间 */
  updatedAt: string | null;
  /** 许可证 */
  license: string | null;
  /** 主页链接 */
  homepage: string | null;
  /** 仓库链接 */
  repository: string | null;
  /** README 内容 */
  readme: string | null;
  /** 下载次数 */
  downloads: number | null;
  /** 包类型 */
  type: string | null;
  /** 评分 (0-5) */
  rating: number | null;
  /** 传输方式 */
  transport: string | null;
  /** 配置 */
  configuration: string | null;
  /** 是否已安装 */
  isInstalled?: boolean;
}

// API 请求参数类型
export interface MarketApiParams {
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 搜索查询 */
  query?: string;
  /** 分类过滤 */
  category?: string;
  /** 排序方式 */
  sortBy?: SortBy;
}

// 后端通用响应结构
export interface BackendApiResponse<T> {
  success: boolean;
  result: T;
}

// 列表响应结构
export interface ListResponse<T> {
  list: T[];
  total: number;
}

// 包列表 API 响应
export type MarketPackagesResponse = BackendApiResponse<ListResponse<MarketMcp>>;

// 分类列表 API 响应
export type MarketCategoriesResponse = BackendApiResponse<ListResponse<MarketCategory>>;

// 包详情 API 响应
export type MarketMcpDetailResponse = BackendApiResponse<MarketMcpDetail>;

// 市场首页数据响应
export interface MarketHomeResponse {
  trending: MarketMcp[];
  featured: MarketMcp[];
}

export type MarketHomeApiResponse = BackendApiResponse<MarketHomeResponse>;

// 安装操作结果
export interface InstallResult {
  /** 操作是否成功 */
  success: boolean;
  /** 错误消息（如果失败） */
  error?: string;
  /** 安装后的包信息 */
  installedPackage?: Mcp;
}

// MCP安装配置
export interface McpInstallConfiguration {
  /** 包标识符 */
  identifier: string;
  /** 传输方式 */
  transport: string | null;
  /** 配置 */
  configuration: string | null;
  /** Runtimes */
  runtimes: string[] | null;
}

// MCP安装配置API响应
export type McpInstallConfigurationResponse = BackendApiResponse<McpInstallConfiguration>;

