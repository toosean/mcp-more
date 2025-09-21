import { ipcMain, BrowserWindow } from 'electron';
import { configManager } from './ConfigManager';
import { AppConfig, PartialAppConfig, Profile } from './types';

/**
 * 设置配置相关的 IPC 处理器
 */
export function setupConfigIpcHandlers(): void {
  // 获取完整配置
  ipcMain.handle('config:get', (): AppConfig => {
    return configManager.getConfig();
  });

  // 获取配置的特定部分
  ipcMain.handle('config:get-section', (_, section: keyof AppConfig) => {
    return configManager.getSection(section);
  });

  // 获取特定配置项
  ipcMain.handle('config:get-item', (_, section: keyof AppConfig, key: string) => {
    return configManager.get(section as any, key as any);
  });

  // 设置完整配置
  ipcMain.handle('config:set', (_, config: PartialAppConfig): void => {
    const oldConfig = configManager.getConfig();
    configManager.setConfig(config);

    // 广播配置变化事件
    Object.keys(config).forEach(section => {
      if (section in oldConfig) {
        const sectionKey = section as keyof AppConfig;
        BrowserWindow.getAllWindows().forEach(window => {
          window.webContents.send(`config:change:${section}`,
            configManager.getSection(sectionKey),
            oldConfig[sectionKey]
          );
        });
      }
    });
  });

  // 设置配置的特定部分
  ipcMain.handle('config:set-section', (_, section: keyof AppConfig, value: any): void => {
    const oldValue = configManager.getSection(section);
    configManager.setSection(section as any, value);

    // 广播配置变化事件
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(`config:change:${section}`,
        configManager.getSection(section),
        oldValue
      );
    });
  });

  // 设置特定配置项
  ipcMain.handle('config:set-item', (_, section: keyof AppConfig, key: string, value: any): void => {
    const oldSection = configManager.getSection(section);
    configManager.set(section as any, key as any, value);

    // 广播配置变化事件
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(`config:change:${section}`,
        configManager.getSection(section),
        oldSection
      );
    });
  });

  // 重置配置到默认值
  ipcMain.handle('config:reset', (): void => {
    const oldConfig = configManager.getConfig();
    configManager.resetToDefaults();

    // 广播所有配置变化事件
    const sections: (keyof AppConfig)[] = ['general', 'mcp'];
    sections.forEach(section => {
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(`config:change:${section}`,
          configManager.getSection(section),
          oldConfig[section]
        );
      });
    });
  });

  // 重置特定部分到默认值
  ipcMain.handle('config:reset-section', (_, section: keyof AppConfig): void => {
    const oldValue = configManager.getSection(section);
    configManager.resetSection(section as any);

    // 广播配置变化事件
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(`config:change:${section}`,
        configManager.getSection(section),
        oldValue
      );
    });
  });

  // 导出配置
  ipcMain.handle('config:export', (): AppConfig => {
    return configManager.exportConfig();
  });

  // 导入配置
  ipcMain.handle('config:import', (_, config: Partial<AppConfig>): void => {
    configManager.importConfig(config);
  });

  // 获取配置文件路径
  ipcMain.handle('config:get-path', (): string => {
    return configManager.getConfigPath();
  });

  // 检查配置是否存在
  ipcMain.handle('config:has-config', (): boolean => {
    return configManager.hasConfig();
  });

  // Profile 相关操作

  // 获取所有 Profiles
  ipcMain.handle('config:get-profiles', (): Profile[] => {
    return configManager.getProfiles();
  });

  // 获取指定 Profile
  ipcMain.handle('config:get-profile', (_, profileId: string): Profile | undefined => {
    return configManager.getProfile(profileId);
  });

  // 根据 ID 获取 Profile
  ipcMain.handle('config:get-profile-by-id', (_, profileId: string): Profile | undefined => {
    return configManager.getProfileById(profileId);
  });

  // 创建新 Profile
  ipcMain.handle('config:create-profile', (_, profile: Omit<Profile, 'createdAt' | 'updatedAt'>): Profile => {
    return configManager.createProfile(profile);
  });

  // 更新 Profile
  ipcMain.handle('config:update-profile', (_, profileId: string, updates: Partial<Omit<Profile, 'id' | 'createdAt'>>): Profile | null => {
    return configManager.updateProfile(profileId, updates);
  });

  // 删除 Profile
  ipcMain.handle('config:delete-profile', (_, profileId: string): boolean => {
    return configManager.deleteProfile(profileId);
  });

  // 更新 Profile 最后使用时间
  ipcMain.handle('config:update-profile-last-used', (_, profileId: string): boolean => {
    return configManager.updateProfileLastUsed(profileId);
  });

  // 向 Profile 分配 MCP
  ipcMain.handle('config:assign-mcp-to-profile', (_, profileId: string, mcpIdentifier: string): Promise<boolean> => {
    return configManager.assignMcpToProfile(profileId, mcpIdentifier);
  });

  // 从 Profile 移除 MCP
  ipcMain.handle('config:remove-mcp-from-profile', (_, profileId: string, mcpIdentifier: string): Promise<boolean> => {
    return configManager.removeMcpFromProfile(profileId, mcpIdentifier);
  });

  // 获取 Profile 的 MCP 标识符列表
  ipcMain.handle('config:get-profile-mcp-identifiers', (_, profileId: string): string[] => {
    return configManager.getProfileMcpIdentifiers(profileId);
  });

  // 检查 MCP 是否分配给指定的 Profile
  ipcMain.handle('config:is-mcp-assigned-to-profile', (_, profileId: string, mcpIdentifier: string): boolean => {
    return configManager.isMcpAssignedToProfile(profileId, mcpIdentifier);
  });

  // 获取指定 Profile 的 MCP 标识符列表
  ipcMain.handle('config:get-profile-mcp-identifiers-list', (_, profileId: string): string[] => {
    return configManager.getProfileMcpIdentifiersList(profileId);
  });
}

/**
 * 广播统计信息更新到所有窗口
 */
export function broadcastStatisticsUpdate(): void {
  const config = configManager.getConfig();
  const statistics = config.mcp?.statistics;
  
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('statistics:updated', statistics);
  });
}
