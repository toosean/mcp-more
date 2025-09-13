/**
 * 市场 API 服务模块
 * 提供市场相关的 API 调用功能，连接到 Cloudflare Workers 后端
 */

import { 
  MarketMcp, 
  MarketCategory, 
  MarketApiParams, 
  MarketPackagesResponse, 
  MarketCategoriesResponse, 
  MarketMcpDetail,
  MarketMcpDetailResponse,
  MarketHomeApiResponse,
  McpInstallConfiguration,
  McpInstallConfigurationResponse,
  SortBy
} from '../types/market';

// 后端 API 基础 URL - 需要根据实际部署地址修改
const API_BASE_URL = window.env.VITE_API_URL;

/**
 * 发起 HTTP 请求的通用函数
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': navigator.language || 'en-US',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * 获取市场包列表
 */
export async function getMarketMcps(params: MarketApiParams = {}): Promise<MarketPackagesResponse> {
  const { 
    page = 1, 
    pageSize = 20, 
    query, 
    category, 
    sortBy = 'popular' 
  } = params;
  
  const searchParams = new URLSearchParams();
  searchParams.append('page', page.toString());
  searchParams.append('pageSize', pageSize.toString());
  searchParams.append('sortBy', sortBy);
  
  if (query) {
    searchParams.append('query', query);
  }
  
  if (category) {
    searchParams.append('category', category);
  }
  
  return apiRequest<MarketPackagesResponse>(`/api/mcps?${searchParams.toString()}`);
}

/**
 * 获取市场分类列表
 */
export async function getMarketCategories(): Promise<MarketCategoriesResponse> {
  return apiRequest<MarketCategoriesResponse>('/api/categories');
}

/**
 * 获取包详情
 */
export async function getMcpDetail(identifier: string): Promise<MarketMcpDetail | null> {
  try {
    const response = await apiRequest<MarketMcpDetailResponse>(`/api/mcps/${encodeURIComponent(identifier)}`);
    return response.success ? response.result : null;
  } catch (error) {
    console.error(`Failed to fetch package detail for ${identifier}:`, error);
    return null;
  }
}

/**
 * 获取市场首页数据（热门和推荐包）
 */
export async function getMarketHome(): Promise<MarketHomeApiResponse> {
  return apiRequest<MarketHomeApiResponse>('/api/market');
}

/**
 * 搜索包
 */
export async function searchPackages(
  query: string, 
  category?: string, 
  sortBy: SortBy = 'popular'
): Promise<MarketPackagesResponse> {
  return getMarketMcps({
    page: 1,
    pageSize: 20,
    query,
    category,
    sortBy
  });
}

/**
 * 获取最新包
 */
export async function getLatestPackages(limit: number = 10): Promise<MarketMcp[]> {
  try {
    const response = await getMarketMcps({
      page: 1,
      pageSize: limit,
      sortBy: 'latest'
    });
    
    if (response.success) {
      return response.result.list;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch latest packages:', error);
    return [];
  }
}

/**
 * 获取MCP安装配置
 */
export async function getMcpInstallConfiguration(identifier: string): Promise<McpInstallConfiguration | null> {
  try {
    
    const response = await apiRequest<McpInstallConfigurationResponse>(`/api/mcps/${encodeURIComponent(identifier)}/install-configuration`, {
      method: 'POST',
    });

    return response.success ? response.result : null;
  } catch (error) {
    console.error(`Failed to fetch install configuration for ${identifier}:`, error);
    return null;
  }
}