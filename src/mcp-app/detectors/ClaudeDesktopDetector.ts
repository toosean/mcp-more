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
 * Claude Desktop 检测器
 * Claude Desktop 使用独立的配置文件格式（claude_desktop_config.json）
 */
export class ClaudeDesktopDetector implements MCPAppDetector {
  readonly appId = 'claude-desktop';
  readonly appName = 'Claude Desktop';
  readonly priority = 70;

  /**
   * 获取 Claude Desktop 配置文件路径
   */
  async getConfigPath(): Promise<string | null> {
    const homeDir = app.getPath('home');
    const platform = process.platform;

    let configPath: string;

    if (platform === 'win32') {
      // Windows: %APPDATA%\Claude\claude_desktop_config.json
      const appData = app.getPath('appData');
      configPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
    } else if (platform === 'darwin') {
      // macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
      configPath = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    } else {
      // Linux: ~/.config/Claude/claude_desktop_config.json (推测)
      configPath = path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
    }

    return configPath;
  }

  /**
   * 检测 Claude Desktop 是否安装
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

        // 配置目录存在，说明 Claude Desktop 已安装
        return {
          appId: this.appId,
          appName: this.appName,
          installed: true,
          configPath
        };
      } catch (error) {
        // 配置目录不存在，说明 Claude Desktop 未安装
        return {
          appId: this.appId,
          appName: this.appName,
          installed: false,
          error: 'Claude Desktop config directory not found'
        };
      }
    } catch (error) {
      log.error('Claude Desktop detection failed:', error);
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
      log.error('Failed to read Claude Desktop config:', error);
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
      log.info(`Claude Desktop config written to: ${configPath}`);
      return true;
    } catch (error) {
      log.error('Failed to write Claude Desktop config:', error);
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
      log.info(`Claude Desktop config backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      log.error('Failed to backup Claude Desktop config:', error);
      return null;
    }
  }

  /**
   * 一键配置 Claude Desktop
   *
   * 注意：Claude Desktop 支持两种配置格式：
   * 1. command+args 格式（用于 stdio transport）
   * 2. url 格式（用于 HTTP/SSE transport，MCP More 使用此格式）
   */
  async setup(mcpMoreConfig: MCPMoreSetupConfig): Promise<MCPAppSetupResult> {
    const logs: string[] = [];

    try {
      // 1. 检测是否安装
      logs.push('Detecting Claude Desktop installation...');
      const detection = await this.detect();
      if (!detection.installed) {
        logs.push(`Claude Desktop not installed - ${detection.error || 'Config directory not found'}`);
        return {
          success: false,
          appId: this.appId,
          message: 'Claude Desktop is not installed',
          error: 'Claude Desktop config directory not found',
          logs
        };
      }
      logs.push('Claude Desktop detected');

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
      // 使用 URL 格式配置（HTTP transport）
      logs.push(`Adding MCP More configuration (alias: ${mcpMoreConfig.alias}, URL: ${mcpMoreConfig.url})`);

      existingConfig.mcpServers[mcpMoreConfig.alias] = {
        url: mcpMoreConfig.url
      };

      logs.push('MCP More server configuration added (HTTP transport)');

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

      logs.push('Claude Desktop setup completed! Please restart Claude Desktop for changes to take effect');

      return {
        success: true,
        appId: this.appId,
        message: 'Claude Desktop configured successfully',
        configPath: configPath || undefined,
        backupPath: backupPath || undefined,
        needsRestart: true,  // Claude Desktop 需要重启才能生效
        logs
      };
    } catch (error) {
      log.error('Claude Desktop setup failed:', error);
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
      log.error('Claude Desktop verification failed:', error);
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
      log.error('Failed to check Claude Desktop configuration:', error);
      return false;
    }
  }

  /**
   * 获取所有已配置的 MCP More 服务器
   *
   * Claude Desktop 支持两种配置格式：
   * 1. url 格式：{ "url": "http://localhost:7195/mcp" }
   * 2. command+args 格式：{ "command": "...", "args": [...] }
   * 我们同时检查这两种格式
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
        if (!serverConfig || typeof serverConfig !== 'object') {
          continue;
        }

        // 检查 URL 格式（优先，MCP More 使用此格式）
        if ('url' in serverConfig) {
          const url = serverConfig.url as string;
          if (isMCPMoreServerUrl(url)) {
            mcpMoreServers.push({ alias, url });
            continue;
          }
        }

        // 检查 command+args 格式（兼容旧配置）
        if ('args' in serverConfig) {
          const args = serverConfig.args;
          if (Array.isArray(args)) {
            for (const arg of args) {
              if (typeof arg === 'string' && isMCPMoreServerUrl(arg)) {
                mcpMoreServers.push({ alias, url: arg });
                break;
              }
            }
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
