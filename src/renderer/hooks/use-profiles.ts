import { useState, useEffect, useCallback } from 'react';
import { Profile } from 'src/config/types';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载所有 Profiles
  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allProfiles = await window.configAPI.getProfiles();
      setProfiles(allProfiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
      window.logAPI.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建 Profile
  const createProfile = useCallback(async (profile: Omit<Profile, 'createdAt' | 'updatedAt'>) => {
    try {
      const newProfile = await window.configAPI.createProfile(profile);
      setProfiles(prev => [...prev, newProfile]);
      return newProfile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create profile';
      setError(errorMessage);
      window.logAPI.error('Failed to create profile:', err);
      throw new Error(errorMessage);
    }
  }, []);

  // 更新 Profile
  const updateProfile = useCallback(async (profileId: string, updates: Partial<Omit<Profile, 'id' | 'createdAt'>>) => {
    try {
      const updatedProfile = await window.configAPI.updateProfile(profileId, updates);
      if (updatedProfile) {
        setProfiles(prev => prev.map(p => p.id === profileId ? updatedProfile : p));
        return updatedProfile;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      window.logAPI.error('Failed to update profile:', err);
      throw new Error(errorMessage);
    }
  }, []);

  // 删除 Profile
  const deleteProfile = useCallback(async (profileId: string) => {
    try {
      const success = await window.configAPI.deleteProfile(profileId);
      if (success) {
        setProfiles(prev => prev.filter(p => p.id !== profileId));
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete profile';
      setError(errorMessage);
      window.logAPI.error('Failed to delete profile:', err);
      throw new Error(errorMessage);
    }
  }, []);

  // 更新 Profile 最后使用时间
  const updateProfileLastUsed = useCallback(async (profileId: string) => {
    try {
      const success = await window.configAPI.updateProfileLastUsed(profileId);
      if (success) {
        // 重新加载 profiles 以获取最新状态
        await loadProfiles();
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile last used time';
      setError(errorMessage);
      window.logAPI.error('Failed to update profile last used time:', err);
      throw new Error(errorMessage);
    }
  }, [loadProfiles]);

  // 向 Profile 分配 MCP
  const assignMcpToProfile = useCallback(async (profileId: string, mcpIdentifier: string) => {
    try {
      const success = await window.configAPI.assignMcpToProfile(profileId, mcpIdentifier);
      if (success) {
        // 直接更新本地状态，避免重新加载整个列表
        setProfiles(prev => prev.map(profile => 
          profile.id === profileId 
            ? { ...profile, mcpIdentifiers: [...profile.mcpIdentifiers, mcpIdentifier] }
            : profile
        ));
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign MCP to profile';
      setError(errorMessage);
      window.logAPI.error('Failed to assign MCP to profile:', err);
      throw new Error(errorMessage);
    }
  }, []);

  // 从 Profile 移除 MCP
  const removeMcpFromProfile = useCallback(async (profileId: string, mcpIdentifier: string) => {
    try {
      const success = await window.configAPI.removeMcpFromProfile(profileId, mcpIdentifier);
      if (success) {
        // 直接更新本地状态，避免重新加载整个列表
        setProfiles(prev => prev.map(profile => 
          profile.id === profileId 
            ? { ...profile, mcpIdentifiers: profile.mcpIdentifiers.filter((id: string) => id !== mcpIdentifier) }
            : profile
        ));
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove MCP from profile';
      setError(errorMessage);
      window.logAPI.error('Failed to remove MCP from profile:', err);
      throw new Error(errorMessage);
    }
  }, []);

  // 获取已安装的 MCP 列表
  const getInstalledMcps = useCallback(async () => {
    try {
      const config = await window.configAPI.getConfig();
      return config.mcp.installedMcps;
    } catch (err) {
      window.logAPI.error('Failed to get installed MCPs:', err);
      return [];
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return {
    profiles,
    loading,
    error,

    // 操作方法
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    updateProfileLastUsed,
    assignMcpToProfile,
    removeMcpFromProfile,
    getInstalledMcps,

    // 清除错误
    clearError: () => setError(null),
  };
}

export default useProfiles;