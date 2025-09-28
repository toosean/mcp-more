import { useState, useCallback, useEffect } from 'react';
import { DisplayMCP } from '@/types/mcp';
import { useConfig } from '@/hooks/use-config';
import { RuntimeInfo } from '@/types/global';
import { Mcp } from 'src/config';

export function useInstalledMcps() {
  const [mcps, setMcps] = useState<DisplayMCP[]>([]);
  const [runtimeList, setRuntimeList] = useState<RuntimeInfo[]>([]);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const { getConfig } = useConfig();

  // Load language setting
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const config = await getConfig();
        setCurrentLanguage(config?.general?.language || 'en-US');
      } catch (error) {
        setCurrentLanguage('en-US');
      }
    };
    loadLanguage();
  }, [getConfig]);

  // Load runtime information
  useEffect(() => {
    const loadRuntimeInfo = async () => {
      setRuntimeLoading(true);
      try {
        const runtimes = await window.runtimeAPI.checkRuntimesAsync();
        setRuntimeList(runtimes);
      } catch (error) {
        window.logAPI.error('Failed to load runtime list:', error);
        setRuntimeList([]);
      } finally {
        setRuntimeLoading(false);
      }
    };
    loadRuntimeInfo();
  }, []);

  // Check for missing runtimes for each MCP
  const checkMissingRuntimes = useCallback((mcpRuntimes: string[] | null | undefined): string[] => {
    if (!mcpRuntimes || mcpRuntimes.length === 0) {
      return [];
    }

    const missingRuntimes: string[] = [];
    for (const requiredRuntime of mcpRuntimes) {
      const runtimeInfo = runtimeList.find(r => r.name === requiredRuntime);
      if (!runtimeInfo || !runtimeInfo.isInstalled) {
        missingRuntimes.push(requiredRuntime);
      }
    }

    return missingRuntimes;
  }, [runtimeList]);

  // Load and convert MCPs
  const loadMcps = useCallback(async () => {
    try {
      const config = await getConfig();
      if (!config?.mcp?.installedMcps) {
        setMcps([]);
        return;
      }

      const displayMcpsUnsorted = await Promise.all(config.mcp.installedMcps
        .map(async (mcp: Mcp, index: number) => {
          // Process dates and provide defaults if missing
          const now = new Date().toISOString();
          let installedDate = mcp.installed;
          let updatedDate = mcp.updated;

          // If no installed date but package exists, use current time as fallback
          if (!installedDate && mcp.name) {
            installedDate = now;
          }

          // Validate and normalize dates
          const validateDate = (dateString: string | null): string | null => {
            if (!dateString) return null;
            try {
              const date = new Date(dateString);
              return isNaN(date.getTime()) ? null : date.toISOString();
            } catch {
              return null;
            }
          };

          const missingRuntimes = checkMissingRuntimes(mcp.runtimes);

          // Get actual status from API
          let status: 'stopped' | 'starting' | 'running' | 'stopping' = 'stopped';
          try {
            status = await window.mcpAPI.getMcpStatus(mcp.identifier);
          } catch (error) {
            // If we can't get status, fall back to enabled state
            status = mcp.enabled ? 'running' : 'stopped';
          }

          return {
            identifier: mcp.identifier,
            name: mcp.name || 'Unknown MCP',
            description: mcp.description ?? null,
            author: mcp.author,
            authorAvatarPath: mcp.authorAvatarPath,
            version: mcp.version,
            downloads: null as number | null,
            rating: null as number | null,
            status: status,
            lastUpdated: validateDate(updatedDate),
            installed: validateDate(installedDate),
            calls: null as number | null,
            source: mcp.source,
            runtimes: mcp.runtimes,
            missingRuntimes: missingRuntimes,
          };
        }));

      const displayMcps = displayMcpsUnsorted
        .sort((a: DisplayMCP, b: DisplayMCP) => {
          // Sort by installed date, latest first (null values go to the end)
          if (!a.installed && !b.installed) return 0;
          if (!a.installed) return 1;
          if (!b.installed) return -1;

          try {
            const dateA = new Date(a.installed);
            const dateB = new Date(b.installed);

            // Check if dates are valid
            if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;

            return dateB.getTime() - dateA.getTime();
          } catch {
            return 0;
          }
        });

      setMcps(displayMcps);
    } catch (error) {
      console.error('Failed to load MCPs:', error);
      setMcps([]);
    }
  }, [getConfig, checkMissingRuntimes]);

  // Load MCPs on mount
  useEffect(() => {
    loadMcps();
  }, [loadMcps]);

  // Auto-refresh MCPs every 2 seconds to update status when there are transitioning MCPs
  useEffect(() => {
    const hasTransitioningMcps = mcps.some(mcp =>
      mcp.status === 'starting' || mcp.status === 'stopping'
    );

    if (!hasTransitioningMcps) {
      return;
    }

    const interval = setInterval(() => {
      loadMcps();
    }, 2000);

    return () => clearInterval(interval);
  }, [loadMcps, mcps]);

  return {
    mcps,
    currentLanguage,
    runtimeLoading,
    loadMcps,
  };
}