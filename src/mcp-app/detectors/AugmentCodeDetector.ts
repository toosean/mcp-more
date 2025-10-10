import * as path from 'path';
import * as fs from 'fs/promises';
import log from 'electron-log';
import { app } from 'electron';
import {
  MCPAppDetector,
  MCPAppDetectionResult,
  MCPAppSetupResult,
  MCPMoreSetupConfig,
  ConfiguredMCPServer
} from '../interfaces/types';
import { isMCPMoreServerUrl } from './utils';

/**
 * Augment Code 检测器
 * Augment Code 是一个 AI 编程助手，支持通过设置面板配置 MCP 服务器
 * 注意：Augment Code 主要通过其 UI 配置，此检测器提供基础支持
 */
export class AugmentCodeDetector implements MCPAppDetector {
  readonly appId = 'augment-code';
  readonly appName = 'Augment Code';
  readonly priority = 65;

  /**
   * 获取配置文件路径
   * Augment Code 的配置位置可能因版本和安装方式而异
   */
  async getConfigPath(): Promise<string | null> {
    const homeDir = app.getPath('home');
    const platform = process.platform;

    let configPath: string;

    if (platform === 'win32') {
      // Windows: %APPDATA%\Augment\settings.json (推测)
      const appData = app.getPath('appData');
      configPath = path.join(appData, 'Augment', 'settings.json');
    } else if (platform === 'darwin') {
      // macOS: ~/Library/Application Support/Augment/settings.json (推测)
      configPath = path.join(homeDir, 'Library', 'Application Support', 'Augment', 'settings.json');
    } else {
      // Linux: ~/.config/Augment/settings.json (推测)
      configPath = path.join(homeDir, '.config', 'Augment', 'settings.json');
    }

    return configPath;
  }

  /**
   * 检测 Augment Code 是否安装
   * 通过检查配置目录是否存在来判断
   */
  async detect(): Promise<MCPAppDetectionResult> {
    try {
      const configPath = await this.getConfigPath();

      if (!configPath) {
        return {
          appId: this.appId,
          appName: this.appName,
          installed: false,
          error: 'Could not determine config path'
        };
      }

      // 检查配置目录是否存在
      const configDir = path.dirname(configPath);
      try {
        await fs.access(configDir);

        // 配置目录存在，说明 Augment Code 已安装
        return {
          appId: this.appId,
          appName: this.appName,
          installed: true,
          configPath
        };
      } catch (error) {
        // 配置目录不存在，说明 Augment Code 未安装
        return {
          appId: this.appId,
          appName: this.appName,
          installed: false,
          error: 'Augment Code config directory not found'
        };
      }
    } catch (error) {
      log.error('Augment Code detection failed:', error);
      return {
        appId: this.appId,
        appName: this.appName,
        installed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 读取配置文件
   */
  async readConfig(): Promise<any | null> {
    try {
      const configPath = await this.getConfigPath();
      if (!configPath) {
        return null;
      }

      const configExists = await fs.access(configPath).then(() => true).catch(() => false);
      if (!configExists) {
        return null;
      }

      const configContent = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      log.error('Failed to read Augment Code config:', error);
      throw error;
    }
  }

  /**
   * 写入配置文件
   */
  async writeConfig(config: any): Promise<boolean> {
    try {
      const configPath = await this.getConfigPath();
      if (!configPath) {
        throw new Error('Config path not found');
      }

      // 确保配置目录存在
      const configDir = path.dirname(configPath);
      await fs.mkdir(configDir, { recursive: true });

      // 写入配置文件
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      log.info(`Augment Code config written to: ${configPath}`);
      return true;
    } catch (error) {
      log.error('Failed to write Augment Code config:', error);
      return false;
    }
  }

  /**
   * 备份配置文件
   */
  async backupConfig(): Promise<string | null> {
    try {
      const configPath = await this.getConfigPath();
      if (!configPath) {
        return null;
      }

      const configExists = await fs.access(configPath).then(() => true).catch(() => false);
      if (!configExists) {
        return null;
      }

      // 创建备份文件名（带时间戳）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${configPath}.backup-${timestamp}`;

      // 复制文件
      await fs.copyFile(configPath, backupPath);
      log.info(`Augment Code config backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      log.error('Failed to backup Augment Code config:', error);
      return null;
    }
  }

  /**
   * 一键配置 Augment Code
   * 注意：Augment Code 推荐通过其 UI 设置面板配置 MCP 服务器
   * 此方法提供基础的配置文件写入支持
   */
  async setup(mcpMoreConfig: MCPMoreSetupConfig): Promise<MCPAppSetupResult> {
    const logs: string[] = [];

    try {
      // 1. 检测是否安装
      logs.push('Detecting Augment Code installation...');
      const detection = await this.detect();
      if (!detection.installed) {
        logs.push(`Augment Code not installed - ${detection.error || 'Config directory not found'}`);
        return {
          success: false,
          appId: this.appId,
          message: 'Augment Code is not installed',
          error: 'Augment Code config directory not found. Note: Augment Code is recommended to be configured through its UI Settings Panel',
          logs
        };
      }
      logs.push('Augment Code detected');

      // 2. 备份现有配置
      const configPath = await this.getConfigPath();
      logs.push(`Config path: ${configPath}`);

      logs.push('Backing up existing configuration...');
      const backupPath = await this.backupConfig();
      if (backupPath) {
        logs.push(`Configuration backed up to: ${backupPath}`);
      } else {
        logs.push('No existing configuration to backup');
      }

      // 3. 读取现有配置
      logs.push('Reading existing configuration...');
      let existingConfig = await this.readConfig();
      if (!existingConfig) {
        logs.push('No existing configuration found, creating new one');
        existingConfig = {};
      } else {
        logs.push('Existing configuration loaded successfully');
      }

      // 4. 确保 mcpServers 对象存在
      if (!existingConfig.mcpServers) {
        logs.push('Creating mcpServers configuration section');
        existingConfig.mcpServers = {};
      }

      // 5. 添加或更新 MCP More 配置
      logs.push(`Adding MCP More configuration (alias: ${mcpMoreConfig.alias}, URL: ${mcpMoreConfig.url})`);
      existingConfig.mcpServers[mcpMoreConfig.alias] = {
        url: mcpMoreConfig.url
      };

      // 6. 写入配置
      logs.push('Writing configuration to file...');
      const writeSuccess = await this.writeConfig(existingConfig);
      if (!writeSuccess) {
        logs.push('Failed to write configuration file');
        return {
          success: false,
          appId: this.appId,
          message: 'Failed to write configuration',
          error: 'Failed to write config file',
          logs
        };
      }
      logs.push('Configuration written successfully');

      logs.push('Augment Code setup completed! You may also configure MCP servers through Augment Settings Panel -> Import from JSON');

      return {
        success: true,
        appId: this.appId,
        message: 'Augment Code configured successfully (recommended to verify in Augment Settings Panel)',
        configPath: configPath || undefined,
        backupPath: backupPath || undefined,
        needsRestart: false,
        logs
      };
    } catch (error) {
      log.error('Augment Code setup failed:', error);
      logs.push(`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        appId: this.appId,
        message: 'Setup failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        logs
      };
    }
  }

  /**
   * 验证配置是否成功
   */
  async verify(): Promise<boolean> {
    try {
      const config = await this.readConfig();
      return config !== null && config.mcpServers !== undefined;
    } catch (error) {
      log.error('Augment Code verification failed:', error);
      return false;
    }
  }

  /**
   * 检查指定 alias 是否已配置
   */
  async isConfigured(alias: string): Promise<boolean> {
    try {
      const config = await this.readConfig();
      if (!config || !config.mcpServers) {
        return false;
      }
      return alias in config.mcpServers;
    } catch (error) {
      log.error('Failed to check Augment Code configuration:', error);
      return false;
    }
  }

  /**
   * 获取所有已配置的 MCP More 服务器（通过 localhost URL pattern 匹配）
   */
  async getConfiguredMCPMoreServers(): Promise<ConfiguredMCPServer[]> {
    try {
      const config = await this.readConfig();
      if (!config || !config.mcpServers) {
        return [];
      }

      const mcpMoreServers: ConfiguredMCPServer[] = [];

      // 遍历所有配置的 MCP 服务器
      for (const [alias, serverConfig] of Object.entries(config.mcpServers)) {
        if (serverConfig && typeof serverConfig === 'object' && 'url' in serverConfig) {
          const url = serverConfig.url as string;
          // 检查 URL 是否匹配 MCP More 服务器（localhost + 配置的端口）
          if (isMCPMoreServerUrl(url)) {
            mcpMoreServers.push({ alias, url });
          }
        }
      }

      return mcpMoreServers;
    } catch (error) {
      log.error('Failed to get configured MCP More servers:', error);
      return [];
    }
  }
}
