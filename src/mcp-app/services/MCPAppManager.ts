import log from 'electron-log';
import { shell } from 'electron';
import * as path from 'path';
import {
  MCPAppDetector,
  MCPAppDetectionResult,
  MCPAppInfo,
  MCPAppSetupResult,
  MCPMoreSetupConfig,
  IMCPAppManager,
  ConfiguredMCPServer
} from '../interfaces/types';
import { VSCodeDetector } from '../detectors/VSCodeDetector';
import { CursorDetector } from '../detectors/CursorDetector';
import { ClaudeDesktopDetector } from '../detectors/ClaudeDesktopDetector';
import { ClaudeCodeDetector } from '../detectors/ClaudeCodeDetector';
import { WindsurfDetector } from '../detectors/WindsurfDetector';
import { AugmentCodeDetector } from '../detectors/AugmentCodeDetector';

/**
 * 支持的 MCP 应用列表（按优先级排序）
 */
const SUPPORTED_MCP_APPS: MCPAppInfo[] = [
  {
    appId: 'claude-code',
    appName: 'Claude Code',
    priority: 90,
    description: 'Claude Code CLI tool'
  },
  {
    appId: 'cursor',
    appName: 'Cursor',
    priority: 80,
    description: 'Cursor AI Editor'
  },
  {
    appId: 'windsurf',
    appName: 'Windsurf',
    priority: 75,
    description: 'Windsurf AI Editor by Codeium'
  },
  {
    appId: 'claude-desktop',
    appName: 'Claude Desktop',
    priority: 70,
    description: 'Claude Desktop Application'
  },
  {
    appId: 'augment-code',
    appName: 'Augment Code',
    priority: 65,
    description: 'Augment Code AI Assistant'
  },
  {
    appId: 'vscode',
    appName: 'VS Code',
    priority: 60,
    description: 'Visual Studio Code with MCP extension'
  }
];

/**
 * MCP 应用管理器
 * 统一管理所有 MCP 客户端应用的检测和配置
 */
export class MCPAppManager implements IMCPAppManager {
  private detectors: Map<string, MCPAppDetector> = new Map();

  constructor() {
    log.info('MCPAppManager initialized');

    // 注册检测器（按优先级顺序）
    this.registerDetector(new ClaudeCodeDetector());
    this.registerDetector(new CursorDetector());
    this.registerDetector(new WindsurfDetector());
    this.registerDetector(new ClaudeDesktopDetector());
    this.registerDetector(new AugmentCodeDetector());
    this.registerDetector(new VSCodeDetector());

    log.info(`Registered ${this.detectors.size} detectors`);
  }

  /**
   * 注册检测器
   */
  registerDetector(detector: MCPAppDetector): void {
    this.detectors.set(detector.appId, detector);
    log.debug(`Registered detector for: ${detector.appName}`);
  }

  /**
   * 获取所有支持的应用信息
   */
  getSupportedApps(): MCPAppInfo[] {
    return [...SUPPORTED_MCP_APPS];
  }

  /**
   * 检测所有应用（并行检测）
   */
  async detectAllApps(): Promise<MCPAppDetectionResult[]> {
    log.info('Detecting all MCP apps in parallel...');
    
    // 创建所有检测任务
    const detectionTasks = SUPPORTED_MCP_APPS.map(async (appInfo) => {
      try {
        const result = await this.detectApp(appInfo.appId);
        return result;
      } catch (error) {
        log.error(`Failed to detect app ${appInfo.appId}:`, error);
        // 即使检测失败，也返回一个默认结果
        return {
          appId: appInfo.appId,
          appName: appInfo.appName,
          installed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 等待所有检测任务完成
    const results = await Promise.all(detectionTasks);

    log.info(`Detection completed. Found ${results.filter(r => r.installed).length} installed apps`);
    return results;
  }

  /**
   * 检测特定应用
   */
  async detectApp(appId: string): Promise<MCPAppDetectionResult> {
    const detector = this.getDetector(appId);
    const appInfo = SUPPORTED_MCP_APPS.find(app => app.appId === appId);

    if (!detector) {
      log.warn(`No detector found for app: ${appId}`);
      return {
        appId,
        appName: appInfo?.appName || appId,
        installed: false,
        error: 'Detector not implemented yet'
      };
    }

    try {
      const result = await detector.detect();
      log.debug(`Detection result for ${appId}:`, result);
      return result;
    } catch (error) {
      log.error(`Detection failed for ${appId}:`, error);
      return {
        appId,
        appName: appInfo?.appName || appId,
        installed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取已安装的应用（按优先级排序，可限制返回数量）
   */
  async getInstalledApps(limit?: number): Promise<MCPAppDetectionResult[]> {
    const allResults = await this.detectAllApps();

    // 过滤出已安装的应用
    const installedApps = allResults.filter(result => result.installed);

    // 按优先级排序（高优先级在前）
    installedApps.sort((a, b) => {
      const priorityA = SUPPORTED_MCP_APPS.find(app => app.appId === a.appId)?.priority || 0;
      const priorityB = SUPPORTED_MCP_APPS.find(app => app.appId === b.appId)?.priority || 0;
      return priorityB - priorityA;
    });

    // 如果指定了限制数量，则截取
    if (limit && limit > 0) {
      return installedApps.slice(0, limit);
    }

    return installedApps;
  }

  /**
   * 配置特定应用
   */
  async setupApp(appId: string, config: MCPMoreSetupConfig): Promise<MCPAppSetupResult> {
    const detector = this.getDetector(appId);
    const appInfo = SUPPORTED_MCP_APPS.find(app => app.appId === appId);

    if (!detector) {
      log.error(`No detector found for app: ${appId}`);
      return {
        success: false,
        message: 'Detector not implemented yet',
        appId,
        error: 'Detector not implemented yet'
      };
    }

    try {
      log.info(`Setting up ${appId} with config:`, config);
      const result = await detector.setup(config);

      if (result.success) {
        log.info(`Successfully set up ${appId}`);
      } else {
        log.warn(`Setup failed for ${appId}:`, result.error);
      }

      return result;
    } catch (error) {
      log.error(`Setup failed for ${appId}:`, error);
      return {
        success: false,
        message: 'Setup failed',
        appId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 打开应用配置目录
   */
  async openConfigDirectory(appId: string): Promise<void> {
    const detector = this.getDetector(appId);

    if (!detector) {
      throw new Error(`No detector found for app: ${appId}`);
    }

    try {
      const configPath = await detector.getConfigPath();

      if (!configPath) {
        throw new Error(`Config path not found for ${appId}`);
      }

      // 打开配置文件所在的目录
      const configDir = path.dirname(configPath);
      await shell.openPath(configDir);
      log.info(`Opened config directory for ${appId}: ${configDir}`);
    } catch (error) {
      log.error(`Failed to open config directory for ${appId}:`, error);
      throw error;
    }
  }

  /**
   * 获取检测器实例
   */
  getDetector(appId: string): MCPAppDetector | null {
    return this.detectors.get(appId) || null;
  }

  /**
   * 备份指定应用的配置
   */
  async backupAppConfig(appId: string): Promise<string | null> {
    const detector = this.getDetector(appId);

    if (!detector) {
      log.error(`No detector found for app: ${appId}`);
      return null;
    }

    try {
      const backupPath = await detector.backupConfig();
      if (backupPath) {
        log.info(`Backed up config for ${appId} to: ${backupPath}`);
      } else {
        log.warn(`No backup created for ${appId}`);
      }
      return backupPath;
    } catch (error) {
      log.error(`Failed to backup config for ${appId}:`, error);
      return null;
    }
  }

  /**
   * 检查应用是否已配置指定的 alias
   */
  async isAppConfigured(appId: string, alias: string): Promise<boolean> {
    const detector = this.getDetector(appId);

    if (!detector) {
      log.error(`No detector found for app: ${appId}`);
      return false;
    }

    try {
      return await detector.isConfigured(alias);
    } catch (error) {
      log.error(`Failed to check configuration for ${appId}:`, error);
      return false;
    }
  }

  /**
   * 获取应用中所有已配置的 MCP More 服务器
   */
  async getAppConfiguredMCPMoreServers(appId: string): Promise<ConfiguredMCPServer[]> {
    const detector = this.getDetector(appId);

    if (!detector) {
      log.error(`No detector found for app: ${appId}`);
      return [];
    }

    try {
      return await detector.getConfiguredMCPMoreServers();
    } catch (error) {
      log.error(`Failed to get configured MCP More servers for ${appId}:`, error);
      return [];
    }
  }
}

// 导出单例实例
export const mcpAppManager = new MCPAppManager();
