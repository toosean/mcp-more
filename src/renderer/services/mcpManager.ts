/**
 * MCP 包管理服务
 * 处理安装、卸载、配置等操作
 */

import { MarketMcp, MarketMcpDetail } from '../types/market';

// 本地存储键名
const INSTALLED_MCPS_KEY = 'installed-mcps';

// 已安装的包列表接口
export interface InstalledMcp {
  identifier: string;
  name: string;
  version: string;
  installedAt: string;
  isEnabled: boolean;
}

/**
 * 获取已安装的包列表
 */
export function getInstalledMcps(): InstalledMcp[] {
  try {
    const stored = localStorage.getItem(INSTALLED_MCPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load installed MCPs:', error);
    return [];
  }
}

/**
 * 检查包是否已安装
 */
export function isPackageInstalled(identifier: string): boolean {
  const installed = getInstalledMcps();
  return installed.some(mcp => mcp.identifier === identifier);
}

/**
 * 获取已安装包的详细信息
 */
export function getInstalledPackageInfo(identifier: string): InstalledMcp | null {
  const installed = getInstalledMcps();
  return installed.find(mcp => mcp.identifier === identifier) || null;
}

/**
 * 模拟安装包
 * TODO: 替换为实际的安装逻辑
 */
export async function installPackage(mcp: MarketMcp | MarketMcpDetail): Promise<void> {
  // 模拟安装时间
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const installed = getInstalledMcps();
  const newInstallation: InstalledMcp = {
    identifier: mcp.identifier,
    name: mcp.name,
    version: mcp.version || '1.0.0',
    installedAt: new Date().toISOString(),
    isEnabled: true
  };
  
  // 检查是否已安装，如果已安装则更新
  const existingIndex = installed.findIndex(pkg => pkg.identifier === mcp.identifier);
  if (existingIndex >= 0) {
    installed[existingIndex] = newInstallation;
  } else {
    installed.push(newInstallation);
  }
  
  localStorage.setItem(INSTALLED_MCPS_KEY, JSON.stringify(installed));
  
  // 这里可以调用实际的安装 API
  // await window.electronAPI?.installMcp(mcp.identifier);
}

/**
 * 模拟卸载包
 * TODO: 替换为实际的卸载逻辑
 */
export async function uninstallPackage(identifier: string): Promise<void> {
  // 模拟卸载时间
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const installed = getInstalledMcps();
  const filtered = installed.filter(mcp => mcp.identifier !== identifier);
  
  localStorage.setItem(INSTALLED_MCPS_KEY, JSON.stringify(filtered));
  
  // 这里可以调用实际的卸载 API
  // await window.electronAPI?.uninstallMcp(identifier);
}

/**
 * 切换包的启用/禁用状态
 */
export async function togglePackageEnabled(identifier: string): Promise<boolean> {
  const installed = getInstalledMcps();
  const packageIndex = installed.findIndex(mcp => mcp.identifier === identifier);
  
  if (packageIndex === -1) {
    throw new Error('Package not found');
  }
  
  installed[packageIndex].isEnabled = !installed[packageIndex].isEnabled;
  localStorage.setItem(INSTALLED_MCPS_KEY, JSON.stringify(installed));
  
  return installed[packageIndex].isEnabled;
}

/**
 * 生成安装命令
 */
export function generateInstallCommand(identifier: string, method: 'cli' | 'npm' | 'yarn' = 'cli'): string {
  switch (method) {
    case 'npm':
      return `npm install @mcp/${identifier}`;
    case 'yarn':
      return `yarn add @mcp/${identifier}`;
    case 'cli':
    default:
      return `mcp install ${identifier}`;
  }
}

/**
 * 获取包的配置文件路径
 */
export function getPackageConfigPath(identifier: string): string {
  // TODO: 根据实际的配置文件结构调整
  return `~/.mcp/packages/${identifier}/config.json`;
}

/**
 * 检查包的依赖关系
 * TODO: 实现依赖检查逻辑
 */
export async function checkDependencies(identifier: string): Promise<{
  satisfied: boolean;
  missing: string[];
}> {
  // 模拟依赖检查
  return {
    satisfied: true,
    missing: []
  };
}

/**
 * 获取包的运行状态
 * TODO: 实现实际的状态检查
 */
export function getPackageStatus(identifier: string): 'running' | 'stopped' | 'error' | 'unknown' {
  const installed = getInstalledPackageInfo(identifier);
  if (!installed) return 'unknown';
  
  // 这里应该调用实际的状态检查 API
  return installed.isEnabled ? 'running' : 'stopped';
}