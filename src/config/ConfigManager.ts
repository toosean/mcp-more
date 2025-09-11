import Store from 'electron-store';
import log from 'electron-log';
import { app } from 'electron';
import { AppConfig, defaultConfig, PartialAppConfig } from './types';

/**
 * 配置管理器类
 * 提供类型安全的配置存储和读取功能
 */
export class ConfigManager {
  private store: any; // 使用 any 类型避免类型定义问题

  constructor() {
    // 根据环境决定配置名
    const configName = process.env.NODE_ENV === 'development' ? 'mcp-more-config-dev' : 'mcp-more-config';
    
    // 初始化 electron-store
    this.store = new Store({
      defaults: defaultConfig,
      name: configName
    });

    // 检查并执行配置迁移
    this.migrateConfigIfNeeded();
  }

  /**
   * 获取完整配置
   */
  getConfig(): AppConfig {
    return {
      general: this.store.get('general', defaultConfig.general),
      mcp: this.store.get('mcp', defaultConfig.mcp),
      configVersion: this.store.get('configVersion', defaultConfig.configVersion),
      lastSaved: this.store.get('lastSaved', defaultConfig.lastSaved),
    };
  }

  /**
   * 获取配置的特定部分
   */
  getSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    return this.store.get(section, defaultConfig[section]);
  }

  /**
   * 获取特定配置项
   */
  get<K extends keyof AppConfig, T extends keyof AppConfig[K]>(
    section: K,
    key: T
  ): AppConfig[K][T] {
    const sectionData = this.getSection(section);
    return sectionData[key];
  }

  /**
   * 设置完整配置
   */
  setConfig(config: PartialAppConfig): void {
    // 检查是否有 autoStart 设置变更
    const oldAutoStart = this.get('general', 'autoStart');
    
    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined) {
        this.store.set(key, value);
      }
    });
    this.store.set('lastSaved', new Date().toISOString());

    // 如果 general 配置中包含 autoStart 并且值发生了变化，更新系统设置
    if (config.general && 'autoStart' in config.general) {
      const newAutoStart = config.general.autoStart;
      if (newAutoStart !== oldAutoStart) {
        this.updateAutoStartSetting(newAutoStart!);
      }
    }
  }

  /**
   * 设置配置的特定部分
   */
  setSection<K extends keyof AppConfig>(
    section: K,
    value: Partial<AppConfig[K]>
  ): void {
    const currentSection = this.getSection(section);
    const updatedSection = Object.assign({}, currentSection, value);
    this.store.set(section, updatedSection);
    this.store.set('lastSaved', new Date().toISOString());

    // 如果是更新 general 部分且包含 autoStart，需要更新系统设置
    if (section === 'general' && value && 'autoStart' in value) {
      this.updateAutoStartSetting(value.autoStart as boolean);
    }
  }

  /**
   * 设置特定配置项
   */
  set<K extends keyof AppConfig, T extends keyof AppConfig[K]>(
    section: K,
    key: T,
    value: AppConfig[K][T]
  ): void {
    const currentSection = this.getSection(section);
    const updatedSection = Object.assign({}, currentSection, { [key]: value });
    this.store.set(section, updatedSection);
    this.store.set('lastSaved', new Date().toISOString());

    // 如果是 autoStart 设置变更，需要更新系统设置
    if (section === 'general' && key === 'autoStart') {
      this.updateAutoStartSetting(value as boolean);
    }
  }

  /**
   * 重置配置到默认值
   */
  resetToDefaults(): void {
    this.store.clear();
    Object.entries(defaultConfig).forEach(([key, value]) => {
      this.store.set(key, value);
    });
  }

  /**
   * 重置特定部分到默认值
   */
  resetSection<K extends keyof AppConfig>(section: K): void {
    this.store.set(section, defaultConfig[section]);
    this.store.set('lastSaved', new Date().toISOString());
  }

  /**
   * 导出配置
   */
  exportConfig(): AppConfig {
    return this.getConfig();
  }

  /**
   * 从对象导入配置
   */
  importConfig(config: Partial<AppConfig>): void {
    const validatedConfig = this.validateConfig(config);
    this.setConfig(validatedConfig);
  }

  /**
   * 监听配置变化
   */
  onConfigChange<K extends keyof AppConfig>(
    section: K,
    callback: (newValue: AppConfig[K], oldValue: AppConfig[K]) => void
  ): () => void {
    return this.store.onDidChange(section, callback);
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath(): string {
    return this.store.path;
  }

  /**
   * 检查配置是否存在
   */
  hasConfig(): boolean {
    return this.store.size > 0;
  }

  /**
   * 配置迁移逻辑
   */
  private migrateConfigIfNeeded(): void {
    const currentVersion = this.store.get('configVersion', '0.0.0');
    const targetVersion = defaultConfig.configVersion;

    if (currentVersion !== targetVersion) {
      log.info(`Config migration: ${currentVersion} -> ${targetVersion}`);
      this.store.set('configVersion', targetVersion);
      this.store.set('lastSaved', new Date().toISOString());
    }
  }

  /**
   * 验证配置格式
   */
  private validateConfig(config: Partial<AppConfig>): PartialAppConfig {
    const validatedConfig: PartialAppConfig = {};

    if (config.general) {
      validatedConfig.general = {
        ...config.general,
        portNumber: Math.max(1, Math.min(65535, config.general.portNumber || defaultConfig.general.portNumber)),
      };
    }

    if (config.mcp) {
      validatedConfig.mcp = config.mcp;
    }

    return validatedConfig;
  }

  /**
   * 更新系统自启动设置
   */
  private updateAutoStartSetting(autoStart: boolean): void {
    if (!app) {
      log.warn('App is not available, cannot update auto start setting');
      return;
    }

    try {
      if (process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux') {
        const currentAutoStart = app.getLoginItemSettings().openAtLogin;
        
        if (autoStart !== currentAutoStart) {
          app.setLoginItemSettings({
            openAtLogin: autoStart,
            openAsHidden: autoStart // 自启动时隐藏窗口
          });
        }

        log.info(`Auto start ${autoStart ? 'enabled' : 'disabled'} from config change`);
      } else {
        throw new Error('Unsupported platform');
      }
    } catch (error) {
      log.error('Failed to update auto start setting:', error);
    }
  }
}

// 导出单例实例
export const configManager = new ConfigManager();