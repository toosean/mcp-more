/**
 * 市场相关类型定义
 */

import { Mcp } from '../../config/types';

// MCP 包类型枚举
export type McpType = 'local' | 'remote' | 'hybrid';

// 排序方式枚举
export type SortBy = 'popular' | 'recent' | 'rating';

// 市场中的 MCP 包信息
export interface MarketMcp {
  /** 唯一标识符 */
  identifier: string;
  /** 包名称 */
  name: string;
  /** 包描述 */
  description: string;
  /** 作者信息 */
  author: string;
  /** 版本号 */
  version: string;
  /** 下载次数 */
  downloads: number;
  /** 评分 (0-5) */
  rating: number;
  /** 分类ID列表 */
  categories: string[];
  /** 包类型 */
  type: McpType;
  /** 是否已安装 */
  isInstalled?: boolean;
  /** 发布时间 */
  publishedAt?: string;
  /** 更新时间 */
  updatedAt?: string;
  /** 许可证 */
  license?: string;
  /** 主页链接 */
  homepage?: string;
  /** 仓库链接 */
  repository?: string;
  /** README 内容 */
  readme?: string;
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

// 包详情页面数据
export interface MarketMcpDetail extends MarketMcp {
  /** 详细的长描述 */
  longDescription: string;
  /** 版本历史 */
  versions: Array<{
    version: string;
    releaseDate: string;
    changelog: string;
  }>;
  /** 作者详细信息 */
  authorInfo: {
    name: string;
    email?: string;
    website?: string;
    avatar?: string;
  };
  /** 相关包推荐 */
  relatedPackages: string[];
  /** 使用统计 */
  usageStats: {
    weeklyDownloads: number;
    monthlyDownloads: number;
    dependentsCount: number;
  };
  /** 评论和评价 */
  reviews?: Array<{
    id: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>;
}

// API 请求参数类型
export interface MarketApiParams {
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 搜索过滤器 */
  filter?: MarketFilter;
}

// API 响应数据类型
export interface MarketApiResponse<T> {
  /** 响应数据 */
  data: T;
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

// 包列表 API 响应
export type MarketPackagesResponse = MarketApiResponse<MarketMcp[]>;

// 分类列表 API 响应
export type MarketCategoriesResponse = MarketApiResponse<MarketCategory[]>;

// 安装操作结果
export interface InstallResult {
  /** 操作是否成功 */
  success: boolean;
  /** 错误消息（如果失败） */
  error?: string;
  /** 安装后的包信息 */
  installedPackage?: Mcp;
}

