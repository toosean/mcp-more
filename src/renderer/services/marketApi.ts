/**
 * 市场 API 服务模块
 * 提供市场相关的 API 调用功能（目前返回 mock 数据）
 */

import { 
  MarketMcp, 
  MarketCategory, 
  MarketApiParams, 
  MarketPackagesResponse, 
  MarketCategoriesResponse, 
  MarketMcpDetail,
  MarketFilter
} from '../types/market';

// Mock 数据
const mockMCPs: MarketMcp[] = [
  {
    identifier: '1',
    name: 'File Manager Pro',
    description: 'Advanced file system operations with support for cloud storage providers. Features batch operations, intelligent search, and secure file handling.',
    author: 'DevTools Inc',
    version: '2.1.0',
    downloads: 15420,
    rating: 4.8,
    categories: ['file-system', 'cloud', 'productivity', 'automation'],
    type: 'local',
    publishedAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-03-20T10:30:00Z',
    license: 'MIT',
    homepage: 'https://github.com/devtools/file-manager-pro',
    repository: 'https://github.com/devtools/file-manager-pro',
  },
  {
    identifier: '2',
    name: 'Database Connector',
    description: 'Universal database connectivity for PostgreSQL, MySQL, MongoDB, and more. Includes query optimization and connection pooling.',
    author: 'DataFlow',
    version: '1.5.2',
    downloads: 12890,
    rating: 4.6,
    categories: ['database', 'sql', 'nosql', 'connector'],
    type: 'remote',
    publishedAt: '2024-02-01T12:00:00Z',
    updatedAt: '2024-03-25T14:15:00Z',
    license: 'Apache-2.0',
    homepage: 'https://dataflow.com/db-connector',
    repository: 'https://github.com/dataflow/db-connector',
  },
  {
    identifier: '3',
    name: 'API Gateway',
    description: 'Seamless REST and GraphQL API integration with authentication, rate limiting, and response caching capabilities.',
    author: 'NetCore Labs',
    version: '3.0.1',
    downloads: 8750,
    rating: 4.9,
    categories: ['api', 'rest', 'graphql', 'gateway'],
    type: 'hybrid',
    publishedAt: '2024-01-10T09:30:00Z',
    updatedAt: '2024-03-18T16:45:00Z',
    license: 'BSD-3-Clause',
    homepage: 'https://netcore-labs.com/api-gateway',
    repository: 'https://github.com/netcore-labs/api-gateway'
  },
  {
    identifier: '4',
    name: 'ML Model Hub',
    description: 'Deploy and manage machine learning models with built-in inference endpoints and model versioning.',
    author: 'AI Solutions',
    version: '1.8.0',
    downloads: 6420,
    rating: 4.7,
    categories: ['ml', 'ai', 'inference', 'models'],
    type: 'local',
    publishedAt: '2024-02-20T11:00:00Z',
    updatedAt: '2024-03-22T13:20:00Z',
    license: 'GPL-3.0',
    homepage: 'https://ai-solutions.com/ml-hub',
    repository: 'https://github.com/ai-solutions/ml-hub'
  },
  {
    identifier: '5',
    name: 'Notification Center',
    description: 'Multi-channel notification system supporting email, SMS, push notifications, and webhooks.',
    author: 'MessageFlow',
    version: '2.3.1',
    downloads: 9830,
    rating: 4.5,
    categories: ['notifications', 'email', 'sms', 'webhooks'],
    type: 'remote',
    publishedAt: '2024-01-25T15:30:00Z',
    updatedAt: '2024-03-15T09:45:00Z',
    license: 'MIT',
    homepage: 'https://messageflow.com/notification-center',
    repository: 'https://github.com/messageflow/notification-center'
  },
  {
    identifier: '6',
    name: 'Security Scanner',
    description: 'Automated security vulnerability scanning with real-time threat detection and compliance reporting.',
    author: 'CyberGuard',
    version: '1.2.0',
    downloads: 4590,
    rating: 4.8,
    categories: ['security', 'scanning', 'compliance', 'threats'],
    type: 'hybrid',
    publishedAt: '2024-03-01T10:15:00Z',
    updatedAt: '2024-03-28T12:00:00Z',
    license: 'Apache-2.0',
    homepage: 'https://cyberguard.com/security-scanner',
    repository: 'https://github.com/cyberguard/security-scanner'
  }
];

const mockCategories: MarketCategory[] = [
  { identifier: 'file-system', title: 'File System', count: 2 },
  { identifier: 'database', title: 'Database', count: 1 },
  { identifier: 'api', title: 'API Integration', count: 1 },
  { identifier: 'ml', title: 'Machine Learning', count: 1 },
  { identifier: 'security', title: 'Security', count: 1 },
  { identifier: 'notifications', title: 'Notifications', count: 1 },
  { identifier: 'productivity', title: 'Productivity', count: 2 }
];

/**
 * 模拟 API 延迟
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取市场包列表
 */
export async function getMarketPackages(params: MarketApiParams = {}): Promise<MarketPackagesResponse> {
  await delay(500); // 模拟网络延迟

  const { page = 1, limit = 20, filter = { sortBy: 'popular' } } = params;
  let filteredMCPs = [...mockMCPs];

  // 搜索过滤
  if (filter.query) {
    const query = filter.query.toLowerCase();
    filteredMCPs = filteredMCPs.filter(mcp =>
      mcp.name.toLowerCase().includes(query) ||
      mcp.description.toLowerCase().includes(query) ||
      mcp.author.toLowerCase().includes(query)
    );
  }

  // 类型过滤
  if (filter.categoryId) {
    // filteredMCPs = filteredMCPs.filter(mcp => mcp.tags.some(tag => tag.toLowerCase().includes(filter.categoryId.toLowerCase())));
  }

  // 排序
  if (filter.sortBy) {
    filteredMCPs.sort((a, b) => {
      if (filter.sortBy === 'popular') return b.downloads - a.downloads;
      if (filter.sortBy === 'recent') return new Date(b.updatedAt || b.publishedAt || 0).getTime() - new Date(a.updatedAt || a.publishedAt || 0).getTime();
      return b.rating - a.rating;
    });
  }

  // 分页
  const total = filteredMCPs.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = filteredMCPs.slice(startIndex, endIndex);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * 获取市场分类列表
 */
export async function getMarketCategories(): Promise<MarketCategoriesResponse> {
  await delay(300);

  return {
    data: mockCategories,
    total: mockCategories.length,
    page: 1,
    limit: mockCategories.length,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  };
}

/**
 * 获取包详情
 */
export async function getPackageDetail(id: string): Promise<MarketMcpDetail | null> {
  await delay(400);

  const mcp = mockMCPs.find(m => m.identifier === id);
  if (!mcp) return null;

  // 扩展为详情数据
  const detail: MarketMcpDetail = {
    ...mcp,
    longDescription: `${mcp.description}\n\nThis is a comprehensive MCP package that provides ${mcp.name.toLowerCase()} functionality with enterprise-grade features and reliability.`,
    versions: [
      { version: mcp.version, releaseDate: mcp.updatedAt || mcp.publishedAt || '', changelog: 'Latest stable release with bug fixes and improvements.' },
      { version: '2.0.0', releaseDate: '2024-03-01T00:00:00Z', changelog: 'Major version release with breaking changes and new features.' },
      { version: '1.9.0', releaseDate: '2024-02-15T00:00:00Z', changelog: 'Feature release with performance improvements.' }
    ],
    authorInfo: {
      name: mcp.author,
      website: mcp.homepage,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mcp.author)}`
    },
    relatedPackages: [],
    usageStats: {
      weeklyDownloads: Math.floor(mcp.downloads * 0.1),
      monthlyDownloads: Math.floor(mcp.downloads * 0.4),
      dependentsCount: Math.floor(Math.random() * 50) + 1
    },
    reviews: [
      {
        id: '1',
        userId: 'user1',
        userName: 'Developer123',
        rating: 5,
        comment: 'Excellent package, works perfectly!',
        createdAt: '2024-03-20T10:00:00Z'
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'CodeMaster',
        rating: 4,
        comment: 'Good functionality, could use better documentation.',
        createdAt: '2024-03-18T15:30:00Z'
      }
    ]
  };

  return detail;
}

/**
 * 搜索包
 */
export async function searchPackages(query: string, filters?: Partial<MarketFilter>): Promise<MarketPackagesResponse> {
  return getMarketPackages({
    page: 1,
    limit: 20,
    filter: { query, sortBy: 'popular', ...filters }
  });
}

/**
 * 获取热门包
 */
export async function getTrendingPackages(limit: number = 10): Promise<MarketMcp[]> {
  await delay(300);
  
  return mockMCPs
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, limit);
}

/**
 * 获取最新包
 */
export async function getLatestPackages(limit: number = 10): Promise<MarketMcp[]> {
  await delay(300);
  
  return mockMCPs
    .sort((a, b) => 
      new Date(b.updatedAt || b.publishedAt || 0).getTime() - 
      new Date(a.updatedAt || a.publishedAt || 0).getTime()
    )
    .slice(0, limit);
}