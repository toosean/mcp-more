import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import log from 'electron-log';
import { app } from 'electron';
import {
  MCPAppDetector,
  MCPAppDetectionResult,
  MCPAppSetupResult,
  MCPMoreSetupConfig,
  ConfiguredMCPServer
} from '../interfaces/types';

const execAsync = promisify(exec);

/**
 * Claude Code 检测器
 * Claude Code 是 Anthropic 官方的 CLI 工具
 */
export class ClaudeCodeDetector implements MCPAppDetector {
  readonly appId = 'claude-code';
  readonly appName = 'Claude Code';
  readonly priority = 90; // 高优先级，因为是官方 CLI

  /**
   * 获取配置文件路径
   */
  async getConfigPath(): Promise<string | null> {
    const homeDir = app.getPath('home');
    const platform = process.platform;

    let configPath: string;

    if (platform === 'win32') {
      // Windows: %USERPROFILE%\.config\claude-code\mcp_servers.json
      configPath = path.join(homeDir, '.config', 'claude-code', 'mcp_servers.json');
    } else {
      // macOS/Linux: ~/.config/claude-code/mcp_servers.json
      configPath = path.join(homeDir, '.config', 'claude-code', 'mcp_servers.json');
    }

    return configPath;
  }

  /**
   * 检测 Claude Code 是否安装
   */
  async detect(): Promise<MCPAppDetectionResult> {
    try {
      // 尝试运行 claude --version 命令，设置 3 秒超时
      const { stdout } = await execAsync('claude --version', { timeout: 3000 });
      const version = stdout.trim();

      // 获取配置文件路径
      const configPath = await this.getConfigPath();

      return {
        appId: this.appId,
        appName: this.appName,
        installed: true,
        version,
        configPath: configPath || undefined,
      };
    } catch (error) {
      log.debug(`Claude Code not detected:`, error);

      // 检查是否是超时错误
      const isTimeout = error instanceof Error && error.message.includes('timeout');
      const errorMessage = isTimeout
        ? 'Command timeout - Claude Code may not be responding'
        : 'Claude Code CLI not found in PATH';

      return {
        appId: this.appId,
        appName: this.appName,
        installed: false,
        error: errorMessage
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
      log.error('Failed to read Claude Code config:', error);
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
      log.info(`Claude Code config written to: ${configPath}`);
      return true;
    } catch (error) {
      log.error('Failed to write Claude Code config:', error);
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
      log.info(`Claude Code config backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      log.error('Failed to backup Claude Code config:', error);
      return null;
    }
  }

  /**
   * 一键配置 Claude Code
   */
  async setup(mcpMoreConfig: MCPMoreSetupConfig): Promise<MCPAppSetupResult> {
    const logs: string[] = [];

    try {
      // 1. 检测是否安装
      logs.push('Detecting Claude Code installation...');
      const detection = await this.detect();
      if (!detection.installed) {
        logs.push(`Claude Code not installed - ${detection.error || 'CLI command not found'}`);
        return {
          success: false,
          appId: this.appId,
          message: 'Claude Code is not installed',
          error: 'Claude Code CLI not found',
          logs
        };
      }
      logs.push(`Claude Code detected (version: ${detection.version || 'unknown'})`);

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

      logs.push('Claude Code setup completed! The configuration will take effect immediately');

      return {
        success: true,
        appId: this.appId,
        message: 'Claude Code configured successfully',
        configPath: configPath || undefined,
        backupPath: backupPath || undefined,
        needsRestart: false, // Claude Code 会自动重新加载配置
        logs
      };
    } catch (error) {
      log.error('Claude Code setup failed:', error);
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
      log.error('Claude Code verification failed:', error);
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
      log.error('Failed to check Claude Code configuration:', error);
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
          // 检查 URL 是否匹配 localhost pattern（MCP More 服务器）
          if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
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
