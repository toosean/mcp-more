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
 * Cursor 检测器
 * Cursor 是基于 VS Code 的 AI 代码编辑器，配置文件格式与 VS Code 类似
 */
export class CursorDetector implements MCPAppDetector {
  readonly appId = 'cursor';
  readonly appName = 'Cursor';
  readonly priority = 80;

  /**
   * 获取配置文件路径（用户全局配置）
   */
  async getConfigPath(): Promise<string | null> {
    const homeDir = app.getPath('home');
    const platform = process.platform;

    let configPath: string;

    if (platform === 'win32') {
      // Windows: %APPDATA%\Cursor\User\settings.json
      const appData = app.getPath('appData');
      configPath = path.join(appData, 'Cursor', 'User', 'settings.json');
    } else if (platform === 'darwin') {
      // macOS: ~/Library/Application Support/Cursor/User/settings.json
      configPath = path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json');
    } else {
      // Linux: ~/.config/Cursor/User/settings.json
      configPath = path.join(homeDir, '.config', 'Cursor', 'User', 'settings.json');
    }

    return configPath;
  }

  /**
   * 检测 Cursor 是否安装
   */
  async detect(): Promise<MCPAppDetectionResult> {
    try {
      // 尝试运行 cursor --version 命令，设置 3 秒超时
      const { stdout } = await execAsync('cursor --version', { timeout: 3000 });
      const lines = stdout.trim().split('\n');
      const version = lines[0]?.trim(); // 第一行是版本号

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
      log.debug(`Cursor not detected:`, error);

      // 检查是否是超时错误
      const isTimeout = error instanceof Error && error.message.includes('timeout');
      const errorMessage = isTimeout
        ? 'Command timeout - Cursor may not be responding'
        : 'Cursor CLI not found in PATH';

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

      // Cursor 的配置文件可能包含注释，需要处理
      // 简单处理：移除 // 和 /* */ 注释
      // const cleanedContent = configContent
      //   .replace(/\/\/.*$/gm, '')  // 移除单行注释
      //   .replace(/\/\*[\s\S]*?\*\//g, '');  // 移除多行注释

      return JSON.parse(configContent);
    } catch (error) {
      log.error('Failed to read Cursor config:', error);
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
      log.info(`Cursor config written to: ${configPath}`);
      return true;
    } catch (error) {
      log.error('Failed to write Cursor config:', error);
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
      log.info(`Cursor config backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      log.error('Failed to backup Cursor config:', error);
      return null;
    }
  }

  /**
   * 一键配置 Cursor
   */
  async setup(mcpMoreConfig: MCPMoreSetupConfig): Promise<MCPAppSetupResult> {
    const logs: string[] = [];

    try {
      // 1. 检测是否安装
      logs.push('Detecting Cursor installation...');
      const detection = await this.detect();
      if (!detection.installed) {
        logs.push(`Cursor not installed - ${detection.error || 'CLI command not found'}`);
        return {
          success: false,
          appId: this.appId,
          message: 'Cursor is not installed',
          error: 'Cursor CLI not found',
          logs
        };
      }
      logs.push(`Cursor detected (version: ${detection.version || 'unknown'})`);

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

      // 7. 写入配置
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

      logs.push('Cursor setup completed! Please reload Cursor window for changes to take effect');

      return {
        success: true,
        appId: this.appId,
        message: 'Cursor configured successfully',
        configPath: configPath || undefined,
        backupPath: backupPath || undefined,
        needsRestart: true,  // Cursor 需要重新加载窗口
        logs
      };
    } catch (error) {
      log.error('Cursor setup failed:', error);
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
      log.error('Cursor verification failed:', error);
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
      log.error('Failed to check Cursor configuration:', error);
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




