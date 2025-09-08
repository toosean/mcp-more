import { useState, useEffect, useCallback } from 'react';
import { AppConfig, PartialAppConfig } from '../../config/types';

/**
 * 配置管理 Hook
 * 提供类型安全的配置读取和更新功能
 */
export function useConfig() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化时检查配置是否可用
  useEffect(() => {
    const initializeConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        await window.configAPI.getConfig();
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载配置失败');
        setLoading(false);
        window.logAPI.error('Failed to initialize config:', err);
      }
    };

    initializeConfig();
  }, []);

  // 每次都获取最新配置
  const getConfig = useCallback(async () => {
    try {
      const fullConfig = await window.configAPI.getConfig();
      return fullConfig;
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取配置失败');
      window.logAPI.error('Failed to load config:', err);
    }
  }, []);

  // 更新配置
  const updateConfig = useCallback(async (newConfig: PartialAppConfig) => {
    try {
      setError(null);

      newConfig.lastSaved = new Date().toISOString();
      await window.configAPI.setConfig(newConfig);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
      window.logAPI.error('Failed to update config:', err);
    }
  }, []);

  const resetConfig = useCallback(async () => {
    try {
      setError(null);
      await window.configAPI.reset();
      // 直接获取重置后的配置，避免设置 loading 状态
      const resetConfigData = await window.configAPI.getConfig();
      updateConfig(resetConfigData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset config');
      window.logAPI.error('Failed to reset config:', err);
    }
  }, []);

  return {
    loading,
    error,
    resetConfig,
    getConfig,
    updateConfig,
  };
}

/**
 * 配置部分管理 Hook
 * 用于管理配置的特定部分
 */
export function useConfigSection<K extends keyof AppConfig>(section: K) {
  const [sectionData, setSectionData] = useState<AppConfig[K] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载配置部分
  const loadSection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.configAPI.getSection(section);
      setSectionData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载配置部分失败');
      window.logAPI.error(`Failed to load config section ${section}:`, err);
    } finally {
      setLoading(false);
    }
  }, [section]);

  // 更新配置部分
  const updateSection = useCallback(async (newData: Partial<AppConfig[K]>) => {
    try {
      setError(null);
      await window.configAPI.setSection(section, newData);
      await loadSection();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新配置部分失败');
      window.logAPI.error(`Failed to update config section ${section}:`, err);
    }
  }, [section, loadSection]);

  // 重置配置部分
  const resetSection = useCallback(async () => {
    try {
      setError(null);
      await window.configAPI.resetSection(section);
      await loadSection();
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置配置部分失败');
      window.logAPI.error(`Failed to reset config section ${section}:`, err);
    }
  }, [section, loadSection]);

  // 初始化时加载配置部分
  useEffect(() => {
    loadSection();
  }, [loadSection]);

  // 监听配置变化
  useEffect(() => {
    const unsubscribe = window.configAPI.onConfigChange(section, (newValue) => {
      setSectionData(newValue);
    });

    return unsubscribe;
  }, [section]);

  return {
    data: sectionData,
    loading,
    error,
    updateSection,
    resetSection,
    reloadSection: loadSection,
  };
}

/**
 * 配置项管理 Hook
 * 用于管理单个配置项
 */
export function useConfigItem<K extends keyof AppConfig>(
  section: K,
  key: string,
  defaultValue?: any
) {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载配置项
  const loadItem = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const itemValue = await window.configAPI.getItem(section, key);
      setValue(itemValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载配置项失败');
      window.logAPI.error(`Failed to load config item ${section}.${key}:`, err);
    } finally {
      setLoading(false);
    }
  }, [section, key]);

  // 更新配置项
  const updateItem = useCallback(async (newValue: any) => {
    try {
      setError(null);
      await window.configAPI.setItem(section, key, newValue);
      setValue(newValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新配置项失败');
      window.logAPI.error(`Failed to update config item ${section}.${key}:`, err);
    }
  }, [section, key]);

  // 初始化时加载配置项
  useEffect(() => {
    loadItem();
  }, [loadItem]);

  return {
    value,
    loading,
    error,
    updateItem,
    reloadItem: loadItem,
  };
}
