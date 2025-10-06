import { useState } from 'react';
import { useI18n } from './use-i18n';
import { useConfig } from './use-config';
import { toast } from './use-toast';
import { generateMcpUrl } from '@/utils/mcp-url';

interface UseAppSetupOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useAppSetup = (options: UseAppSetupOptions = {}) => {
  const { currentLanguage } = useI18n();
  const { getConfig } = useConfig();

  const [setupInProgress, setSetupInProgress] = useState(false);
  const [setupLogs, setSetupLogs] = useState<string[]>([]);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [currentSetupApp, setCurrentSetupApp] = useState<string>('');

  const setupApp = async (appId: string, appName: string, profileId?: string) => {
    setSetupInProgress(true);
    setSetupLogs([]);
    setCurrentSetupApp(appName);
    setShowLogsDialog(true);

    try {
      const config = await getConfig();
      const portNumber = config?.general?.portNumber || 7195;
      const mcpUrl = generateMcpUrl(portNumber, profileId);

      const setupConfig = {
        url: mcpUrl,
        alias: 'mm',
        profileId: profileId
      };

      const result = await window.mcpAppAPI.setupApp(appId, setupConfig);

      if (result.logs && result.logs.length > 0) {
        setSetupLogs(result.logs);
      }

      if (result.success) {
        toast({
          title: currentLanguage === 'zh-CN' ? '配置成功' : 'Setup successful',
          description: result.message,
        });

        if (result.needsRestart) {
          toast({
            title: currentLanguage === 'zh-CN' ? '需要重启' : 'Restart required',
            description: currentLanguage === 'zh-CN'
              ? '请重启应用以使配置生效'
              : 'Please restart the application for changes to take effect',
          });
        }

        options.onSuccess?.();
      } else {
        toast({
          title: currentLanguage === 'zh-CN' ? '配置失败' : 'Setup failed',
          description: result.error || result.message,
          variant: 'destructive'
        });

        if (result.error) {
          options.onError?.(new Error(result.error));
        }
      }

      return result;
    } catch (error) {
      console.error('Setup failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSetupLogs(prev => [...prev, `❌ ${errorMessage}`]);
      toast({
        title: currentLanguage === 'zh-CN' ? '配置失败' : 'Setup failed',
        description: errorMessage,
        variant: 'destructive'
      });

      if (error instanceof Error) {
        options.onError?.(error);
      }

      return null;
    } finally {
      setSetupInProgress(false);
    }
  };

  const resetLogs = () => {
    setSetupLogs([]);
    setCurrentSetupApp('');
  };

  return {
    setupApp,
    setupInProgress,
    setupLogs,
    showLogsDialog,
    setShowLogsDialog,
    currentSetupApp,
    resetLogs
  };
};
