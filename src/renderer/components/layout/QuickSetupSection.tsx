import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useProfiles } from '@/hooks/use-profiles';
import { useAppSetup } from '@/hooks/use-app-setup';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getIconComponent } from '@/utils/profile-icons';
import { parseProfileIdFromUrl } from '@/utils/mcp-url';
import AppSetupButton from '@/components/mcp-app/AppSetupButton';
import SetupLogsDialog from '@/components/mcp-app/SetupLogsDialog';

import ClaudeDesktopLogo from '@/assets/client-logos/ClaudeDesktop.png';
import ClaudeCodeLogo from '@/assets/client-logos/ClaudeCode.png';
import CursorLogo from '@/assets/client-logos/Cursor.png';
import VSCodeLogo from '@/assets/client-logos/VSCode.png';
import AugmentCodeLogo from '@/assets/client-logos/Augment.png';

// 客户端 LOGO 映射
const CLIENT_LOGOS: Record<string, string> = {
  'claude-desktop': ClaudeDesktopLogo,
  'claude-code': ClaudeCodeLogo,
  'cursor': CursorLogo,
  'vscode': VSCodeLogo,
  'augment-code': AugmentCodeLogo,
};

interface InstalledApp {
  appId: string;
  appName: string;
  installed: boolean;
  version?: string;
  configPath?: string;
  error?: string;
  isConfigured?: boolean;
  configuredProfiles?: Array<{
    profileId: string | null;
    profileName: string;
    alias: string;
    url: string;
    icon?: string;
  }>;
}

export default function QuickSetupSection() {
  const navigate = useNavigate();
  const { t, currentLanguage } = useI18n();
  const { profiles } = useProfiles();

  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const {
    setupApp,
    setupInProgress,
    setupLogs,
    showLogsDialog,
    setShowLogsDialog,
    currentSetupApp
  } = useAppSetup({
    onSuccess: async () => {
      // 配置成功后关闭主对话框
      setShowDialog(false);

      // 延迟重新检测，让用户有时间查看日志
      // 当用户关闭日志对话框后，自然会触发重新检测
      // 注意：不立即调用 detectInstalledApps()，避免组件卸载导致日志对话框关闭
    }
  });

  // 检测已安装且未配置的应用（最多3个）
  useEffect(() => {
    detectInstalledApps();
  }, []);

  // 当日志对话框关闭时，重新检测应用
  useEffect(() => {
    if (!showLogsDialog && !setupInProgress) {
      // 延迟一点时间再检测，确保对话框完全关闭
      const timer = setTimeout(() => {
        detectInstalledApps();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showLogsDialog, setupInProgress]);

  const detectInstalledApps = async () => {
    try {
      const alias = 'mm'; // 使用固定的 alias

      // 获取所有已安装的应用
      const apps = await window.mcpAppAPI.getInstalledApps();

      // 检查每个应用是否已配置
      const configCheckPromises = apps.map(async (app) => {
        const isConfigured = await window.mcpAppAPI.isAppConfigured(app.appId, alias);

        // 获取已配置的 profiles
        let configuredProfiles: InstalledApp['configuredProfiles'] = [];
        if (isConfigured) {
          const configuredServers = await window.mcpAppAPI.getAppConfiguredServers(app.appId);
          configuredProfiles = configuredServers.map(server => {
            const profileId = parseProfileIdFromUrl(server.url);

            if (profileId === null) {
              // 默认配置（无 profile）
              return {
                profileId: null,
                profileName: t('quickSetup.defaultProfile'),
                alias: server.alias,
                url: server.url,
                icon: 'Settings'
              };
            } else {
              // 特定 profile
              const profile = profiles.find(p => p.id === profileId);
              return {
                profileId,
                profileName: profile?.name || profileId,
                alias: server.alias,
                url: server.url,
                icon: profile?.icon || 'Settings'
              };
            }
          }).filter(Boolean) as InstalledApp['configuredProfiles'];
        }

        return {
          appId: app.appId,
          appName: app.appName,
          installed: app.installed,
          version: app.version,
          configPath: app.configPath,
          error: app.error,
          isConfigured,
          configuredProfiles
        };
      });

      const configCheckResults = await Promise.all(configCheckPromises);

      // 过滤出未配置的应用，并限制为最多3个
      const unconfiguredApps = configCheckResults
        .slice(0, 3);

      setInstalledApps(unconfiguredApps);
    } catch (error) {
      console.error('Failed to detect installed apps:', error);
    }
  };

  // 一键配置
  const handleQuickSetup = async (profileId?: string) => {
    if (!selectedApp) return;
    await setupApp(selectedApp.appId, selectedApp.appName, profileId);
  };

  const handleAppClick = (app: InstalledApp) => {
    setSelectedApp(app);
    setShowDialog(true);
  };

  return (
    <>
      <div className="p-4 border-t border-border">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          {t('sidebar.quickSetup.title')}
        </div>
        <div className="space-y-1">
          {installedApps.map((app) => (
            <button
              key={app.appId}
              onClick={() => handleAppClick(app)}
              className="flex items-center gap-3 rounded-lg px-3 py-1 text-sm transition-colors w-full text-left text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <img
                src={CLIENT_LOGOS[app.appId]}
                alt={app.appName}
                className="h-4 w-4 rounded object-cover"
              />
              <div className="flex flex-row flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="truncate">{app.appName}</span>
                  {app.configuredProfiles && app.configuredProfiles.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {app.configuredProfiles.map((profile, idx) => {
                        const IconComponent = getIconComponent(profile.icon);
                        return (
                          <span
                            key={profile.profileId || idx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground"
                          >
                            {(profile.profileId && IconComponent) && <IconComponent className="w-3 h-3 mr-0.5" />}
                            {profile.profileName}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs">
                      <FolderOpen className="w-3 h-3" />
                      {t('quickSetup.notConfigured')}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* App Setup Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedApp && (
                <>
                  <img
                    src={CLIENT_LOGOS[selectedApp.appId]}
                    alt={selectedApp.appName}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  {selectedApp.appName}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {t('quickSetup.setupDialogDescription')}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              {/* App Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('quickSetup.installed')}
                  </Badge>
                  {selectedApp.version && (
                    <span className="text-sm text-muted-foreground">
                      {t('quickSetup.version')}: {selectedApp.version}
                    </span>
                  )}
                </div>

                {selectedApp.configuredProfiles && selectedApp.configuredProfiles.length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      {t('quickSetup.configuredLabel')}
                    </span>
                    {selectedApp.configuredProfiles.map((profile, index) => {
                      const IconComponent = getIconComponent(profile.icon);
                      return (
                        <span key={index} className="inline-flex items-center gap-1">
                          {index > 0 && ', '}
                          <IconComponent className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span className="text-blue-600 dark:text-blue-400">
                            {profile.profileName}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <AppSetupButton
                  isConfigured={selectedApp.isConfigured || false}
                  isSetupInProgress={setupInProgress}
                  profiles={profiles}
                  onSetup={handleQuickSetup}
                  setupButtonText={t('quickSetup.defaultSetup')}
                  settingUpText={t('quickSetup.settingUp')}
                  selectProfileText={t('quickSetup.selectProfile')}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Setup Logs Dialog */}
      <SetupLogsDialog
        open={showLogsDialog}
        onOpenChange={setShowLogsDialog}
        appName={currentSetupApp}
        logs={setupLogs}
        isSetupInProgress={setupInProgress}
      />
    </>
  );
}
