import Store from 'electron-store';
import log from 'electron-log';
import { app } from 'electron';
import { AppConfig, defaultConfig, createDefaultConfig, PartialAppConfig, OAuthTokens, OAuthClientInfo, Profile } from './types';
import { secureStorage } from './SecureStorage';

/**
 * 配置管理器类
 * 提供类型安全的配置存储和读取功能
 */
export class ConfigManager {
  private store: any; // 使用 any 类型避免类型定义问题

  constructor() {
    // 根据环境决定配置名
    const configName = process.env.NODE_ENV === 'development' ? 'mcp-more-config-dev' : 'mcp-more-config';
    
    // 创建动态默认配置（包含系统语言检测）
    const dynamicDefaults = createDefaultConfig();
    
    // 初始化 electron-store
    this.store = new Store({
      defaults: dynamicDefaults,
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
      this.updateAutoStartSetting((value as any).autoStart);
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
   * OAuth 安全数据管理方法
   */

  /**
   * 保存 OAuth tokens（使用安全存储）
   */
  async saveOAuthTokens(mcpIdentifier: string, tokens: OAuthTokens): Promise<void> {
    try {
      await secureStorage.saveOAuthTokens(mcpIdentifier, tokens);
      log.info(`OAuth tokens saved securely for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to save OAuth tokens for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 获取 OAuth tokens（从安全存储）
   */
  async getOAuthTokens(mcpIdentifier: string): Promise<OAuthTokens | null> {
    try {
      return await secureStorage.getOAuthTokens(mcpIdentifier);
    } catch (error) {
      log.error(`Failed to get OAuth tokens for MCP ${mcpIdentifier}:`, error);
      return null;
    }
  }

  /**
   * 删除 OAuth tokens（从安全存储）
   */
  async deleteOAuthTokens(mcpIdentifier: string): Promise<void> {
    try {
      await secureStorage.deleteOAuthTokens(mcpIdentifier);
      log.info(`OAuth tokens deleted for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to delete OAuth tokens for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 保存 OAuth client secret（使用安全存储）
   */
  async saveClientSecret(mcpIdentifier: string, clientSecret: string): Promise<void> {
    try {
      await secureStorage.saveClientSecret(mcpIdentifier, clientSecret);
      log.info(`OAuth client secret saved securely for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to save OAuth client secret for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 获取 OAuth client secret（从安全存储）
   */
  async getClientSecret(mcpIdentifier: string): Promise<string | null> {
    try {
      return await secureStorage.getClientSecret(mcpIdentifier);
    } catch (error) {
      log.error(`Failed to get OAuth client secret for MCP ${mcpIdentifier}:`, error);
      return null;
    }
  }

  /**
   * 删除 OAuth client secret（从安全存储）
   */
  async deleteClientSecret(mcpIdentifier: string): Promise<void> {
    try {
      await secureStorage.deleteClientSecret(mcpIdentifier);
      log.info(`OAuth client secret deleted for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to delete OAuth client secret for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 保存 OAuth client info（使用安全存储）
   */
  async saveClientInfo(mcpIdentifier: string, clientInfo: OAuthClientInfo): Promise<void> {
    try {
      await secureStorage.saveClientInfo(mcpIdentifier, clientInfo);
      log.info(`OAuth client info saved securely for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to save OAuth client info for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 获取 OAuth client info（从安全存储）
   */
  async getClientInfo(mcpIdentifier: string): Promise<OAuthClientInfo | null> {
    try {
      return await secureStorage.getClientInfo(mcpIdentifier);
    } catch (error) {
      log.error(`Failed to get OAuth client info for MCP ${mcpIdentifier}:`, error);
      return null;
    }
  }

  /**
   * 删除 OAuth client info（从安全存储）
   */
  async deleteClientInfo(mcpIdentifier: string): Promise<void> {
    try {
      await secureStorage.deleteClientInfo(mcpIdentifier);
      log.info(`OAuth client info deleted for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to delete OAuth client info for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 删除特定 MCP 的所有 OAuth 相关数据（从安全存储）
   */
  async deleteAllOAuthData(mcpIdentifier: string): Promise<void> {
    try {
      await secureStorage.deleteAllOAuthData(mcpIdentifier);
      log.info(`All OAuth data deleted for MCP: ${mcpIdentifier}`);
    } catch (error) {
      log.error(`Failed to delete all OAuth data for MCP ${mcpIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * 检查是否存在 OAuth tokens
   */
  async hasOAuthTokens(mcpIdentifier: string): Promise<boolean> {
    try {
      return await secureStorage.hasOAuthTokens(mcpIdentifier);
    } catch (error) {
      log.error(`Failed to check OAuth tokens for MCP ${mcpIdentifier}:`, error);
      return false;
    }
  }

  /**
   * 检查是否存在 client secret
   */
  async hasClientSecret(mcpIdentifier: string): Promise<boolean> {
    try {
      return await secureStorage.hasClientSecret(mcpIdentifier);
    } catch (error) {
      log.error(`Failed to check client secret for MCP ${mcpIdentifier}:`, error);
      return false;
    }
  }

  /**
   * 检查是否存在 client info
   */
  async hasClientInfo(mcpIdentifier: string): Promise<boolean> {
    try {
      return await secureStorage.hasClientInfo(mcpIdentifier);
    } catch (error) {
      log.error(`Failed to check client info for MCP ${mcpIdentifier}:`, error);
      return false;
    }
  }

  /**
   * 获取所有存储的 MCP OAuth 账户（用于调试和管理）
   */
  async getAllOAuthAccounts(): Promise<string[]> {
    try {
      return await secureStorage.getAllOAuthAccounts();
    } catch (error) {
      log.error('Failed to get all OAuth accounts:', error);
      return [];
    }
  }

  /**
   * Profile 管理方法
   */

  /**
   * 获取所有 Profiles
   */
  getProfiles(): Profile[] {
    const mcpConfig = this.getSection('mcp');
    return mcpConfig.profiles || [];
  }

  /**
   * 根据 ID 获取 Profile
   */
  getProfile(profileId: string): Profile | undefined {
    const profiles = this.getProfiles();
    return profiles.find(p => p.id === profileId);
  }

  /**
   * 根据 Profile ID 获取 Profile（替代原来的 getActiveProfile）
   */
  getProfileById(profileId: string): Profile | undefined {
    return this.getProfile(profileId);
  }

  /**
   * 创建新 Profile
   */
  createProfile(profile: Omit<Profile, 'createdAt' | 'updatedAt'> & { id?: string }): Profile {
    const newProfile: Profile = {
      ...profile,
      id: profile.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const profiles = this.getProfiles();
    const updatedProfiles = [...profiles, newProfile];

    this.setSection('mcp', {
      ...this.getSection('mcp'),
      profiles: updatedProfiles,
    });

    log.info(`Profile created: ${newProfile.name} (${newProfile.id})`);
    return newProfile;
  }

  /**
   * 更新 Profile
   */
  updateProfile(profileId: string, updates: Partial<Omit<Profile, 'id' | 'createdAt'>>): Profile | null {
    const profiles = this.getProfiles();
    const profileIndex = profiles.findIndex(p => p.id === profileId);

    if (profileIndex === -1) {
      log.warn(`Profile not found: ${profileId}`);
      return null;
    }

    const updatedProfile: Profile = {
      ...profiles[profileIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedProfiles = [...profiles];
    updatedProfiles[profileIndex] = updatedProfile;

    this.setSection('mcp', {
      ...this.getSection('mcp'),
      profiles: updatedProfiles,
    });

    log.info(`Profile updated: ${updatedProfile.name} (${profileId})`);
    return updatedProfile;
  }

  /**
   * 删除 Profile
   */
  deleteProfile(profileId: string): boolean {
    const profiles = this.getProfiles();
    const profileIndex = profiles.findIndex(p => p.id === profileId);

    if (profileIndex === -1) {
      log.warn(`Profile not found: ${profileId}`);
      return false;
    }

    const profileToDelete = profiles[profileIndex];
    const updatedProfiles = profiles.filter(p => p.id !== profileId);

    this.setSection('mcp', {
      ...this.getSection('mcp'),
      profiles: updatedProfiles,
    });

    log.info(`Profile deleted: ${profileToDelete.name} (${profileId})`);
    return true;
  }

  /**
   * 更新 Profile 最后使用时间
   */
  updateProfileLastUsed(profileId: string): boolean {
    const profile = this.getProfile(profileId);
    if (!profile) {
      log.warn(`Profile not found: ${profileId}`);
      return false;
    }

    const updatedProfile = {
      ...profile,
      lastUsed: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const profiles = this.getProfiles();
    const updatedProfiles = profiles.map(p => p.id === profileId ? updatedProfile : p);

    this.setSection('mcp', {
      ...this.getSection('mcp'),
      profiles: updatedProfiles,
    });

    log.info(`Profile last used time updated: ${profile.name} (${profileId})`);
    return true;
  }

  /**
   * 获取 Profile 中分配的 MCP 标识符列表
   */
  getProfileMcpIdentifiers(profileId: string): string[] {
    const profile = this.getProfile(profileId);
    return profile?.mcpIdentifiers || [];
  }

  /**
   * 向 Profile 分配 MCP
   */
  assignMcpToProfile(profileId: string, mcpIdentifier: string): boolean {
    const profile = this.getProfile(profileId);
    if (!profile) {
      log.warn(`Profile not found: ${profileId}`);
      return false;
    }

    if (profile.mcpIdentifiers.includes(mcpIdentifier)) {
      log.debug(`MCP ${mcpIdentifier} already assigned to profile ${profileId}`);
      return true;
    }

    const updatedProfile = {
      ...profile,
      mcpIdentifiers: [...profile.mcpIdentifiers, mcpIdentifier],
      updatedAt: new Date().toISOString(),
    };

    return this.updateProfile(profileId, updatedProfile) !== null;
  }

  /**
   * 从 Profile 中移除 MCP
   */
  removeMcpFromProfile(profileId: string, mcpIdentifier: string): boolean {
    const profile = this.getProfile(profileId);
    if (!profile) {
      log.warn(`Profile not found: ${profileId}`);
      return false;
    }

    const updatedProfile = {
      ...profile,
      mcpIdentifiers: profile.mcpIdentifiers.filter(id => id !== mcpIdentifier),
      updatedAt: new Date().toISOString(),
    };

    return this.updateProfile(profileId, updatedProfile) !== null;
  }

  /**
   * 检查 MCP 是否分配给指定的 Profile
   */
  isMcpAssignedToProfile(profileId: string, mcpIdentifier: string): boolean {
    const profile = this.getProfile(profileId);
    if (!profile) {
      return false;
    }

    return profile.mcpIdentifiers.includes(mcpIdentifier);
  }

  /**
   * 获取指定 Profile 的 MCP 标识符列表
   */
  getProfileMcpIdentifiersList(profileId: string): string[] {
    const profile = this.getProfile(profileId);
    return profile?.mcpIdentifiers || [];
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