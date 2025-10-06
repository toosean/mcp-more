import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  FolderOpen,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useProfiles } from '@/hooks/use-profiles';
import { useAppSetup } from '@/hooks/use-app-setup';
import { toast } from '@/hooks/use-toast';
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

interface AppDetectionResult {
  appId: string;
  appName: string;
  installed: boolean;
  version?: string;
  configPath?: string;
  error?: string;
  detecting?: boolean;
  isConfigured?: boolean;
  configuredProfiles?: Array<{
    profileId: string | null;
    profileName: string;
    alias: string;
    url: string;
    icon?: string;
  }>;
}

export default function QuickSetup() {
  const navigate = useNavigate();
  const { t, currentLanguage } = useI18n();
  const { profiles } = useProfiles();

  const [apps, setApps] = useState<AppDetectionResult[]>([]);
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);

  const {
    setupApp,
    setupInProgress,
    setupLogs,
    showLogsDialog,
    setShowLogsDialog,
    currentSetupApp
  } = useAppSetup({
    onSuccess: async () => {
      // 重新检测以更新配置状态
      if (currentAppId) {
        await updateAppConfiguredStatus(currentAppId);
      }
    }
  });

  // 检测所有应用
  const detectApps = async () => {
    try {
      // 1. 获取所有支持的应用列表
      const supportedApps = await window.mcpAppAPI.getSupportedApps();

      // 2. 初始化应用列表，所有应用都设置为 detecting 状态
      const initialApps: AppDetectionResult[] = supportedApps.map(app => ({
        appId: app.appId,
        appName: app.appName,
        installed: false,
        detecting: true
      }));

      setApps(initialApps);

      // 3. 使用 MCPAppManager 的 detectAllApps 方法进行并行检测
      const results = await window.mcpAppAPI.detectAllApps();

      // 4. 检查每个应用是否已配置
      const configCheckPromises = results.map(async (result) => {
        // 只检查已安装的应用
        if (result.installed) {
          // 获取该应用中所有已配置的 MCP More 服务器
          const configuredServers = await window.mcpAppAPI.getAppConfiguredServers(result.appId);

          // 解析每个服务器的 URL，确定对应的 profile
          const configuredProfiles = configuredServers.map(server => {
            const profileId = parseProfileIdFromUrl(server.url);

            if (profileId === null) {
              // 默认配置（无 profile）
              return {
                profileId: null,
                profileName: currentLanguage === 'zh-CN' ? '默认' : 'Default',
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
          }).filter(Boolean) as Array<{ profileId: string | null; profileName: string; alias: string; url: string; icon?: string }>;

          return {
            ...result,
            detecting: false,
            isConfigured: configuredProfiles.length > 0,
            configuredProfiles
          };
        }
        return {
          ...result,
          detecting: false,
          isConfigured: false,
          configuredProfiles: []
        };
      });

      const formattedResults = await Promise.all(configCheckPromises);

      // 5. 将已安装的排在前面
      const sortedResults = [...formattedResults].sort((a, b) => {
        if (a.installed && !b.installed) return -1;
        if (!a.installed && b.installed) return 1;
        return 0;
      });

      setApps(sortedResults);
    } catch (error) {
      console.error('Failed to detect apps:', error);
      toast({
        title: currentLanguage === 'zh-CN' ? '检测失败' : 'Detection failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // 组件加载时自动检测
  useEffect(() => {
    detectApps();
  }, []);

  // 更新指定应用的配置状态
  const updateAppConfiguredStatus = async (appId: string) => {
    try {
      const configuredServers = await window.mcpAppAPI.getAppConfiguredServers(appId);

      const configuredProfiles = configuredServers.map(server => {
        const profileId = parseProfileIdFromUrl(server.url);

        if (profileId === null) {
          return {
            profileId: null,
            profileName: currentLanguage === 'zh-CN' ? '默认' : 'Default',
            alias: server.alias,
            url: server.url,
            icon: 'Settings'
          };
        } else {
          const profile = profiles.find(p => p.id === profileId);
          return {
            profileId,
            profileName: profile?.name || profileId,
            alias: server.alias,
            url: server.url,
            icon: profile?.icon || 'Settings'
          };
        }
      }).filter(Boolean) as Array<{ profileId: string | null; profileName: string; alias: string; url: string; icon?: string }>;

      setApps(prevApps =>
        prevApps.map(a =>
          a.appId === appId ? { ...a, isConfigured: configuredProfiles.length > 0, configuredProfiles } : a
        )
      );
    } catch (error) {
      console.error('Failed to update app configured status:', error);
    }
  };

  // 一键配置
  const handleQuickSetup = async (appId: string, profileId?: string) => {
    const app = apps.find(a => a.appId === appId);
    if (!app) return;

    setCurrentAppId(appId);
    await setupApp(appId, app.appName, profileId);
  };

  // 打开配置目录
  const handleOpenConfigDir = async (appId: string) => {
    try {
      await window.mcpAppAPI.openConfigDirectory(appId);
    } catch (error) {
      console.error('Failed to open config directory:', error);
      toast({
        title: currentLanguage === 'zh-CN' ? '打开失败' : 'Failed to open',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // 跳转到手动设置向导
  const handleManualSetup = () => {
    navigate('/setup-guide');
  };

  const handleBack = () => {
    navigate('/settings');
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t('quickSetup.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('quickSetup.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleManualSetup}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {t('quickSetup.manualSetup')}
        </Button>
        <Button
          variant="outline"
          onClick={detectApps}
          disabled={apps.some(app => app.detecting)}
        >
          {apps.some(app => app.detecting) ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {t('quickSetup.reDetect')}
        </Button>
      </div>

      {/* App List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {apps.map((app) => (
          <Card key={app.appId} className={app.installed ? 'border-green-500/50' : ''}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <img
                  src={CLIENT_LOGOS[app.appId]}
                  alt={app.appName}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 flex-wrap">
                    {app.appName}
                    {app.detecting ? (
                      <Badge variant="outline">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        {t('quickSetup.detecting')}
                      </Badge>
                    ) : app.installed ? (
                      <>
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('quickSetup.installed')}
                        </Badge>
                        {app.isConfigured && (
                          <Badge variant="outline" className="border-blue-500 text-blue-700 dark:text-blue-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {currentLanguage === 'zh-CN' ? '已配置' : 'Configured'}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        {t('quickSetup.notFound')}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {app.version && `${t('quickSetup.version')}: ${app.version}`}
                    {app.configuredProfiles && app.configuredProfiles.length > 0 && (
                      <div className="mt-1 text-xs">
                        <span className="text-muted-foreground">
                          {currentLanguage === 'zh-CN' ? '已配置：' : 'Configured: '}
                        </span>
                        {app.configuredProfiles.map((profile, index) => {
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
                  </CardDescription>
                </div>
                {app.installed && app.configPath && !app.detecting && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={app.error === 'Detector not implemented yet'}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenConfigDir(app.appId)}>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        {t('quickSetup.openConfig')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <AppSetupButton
                isConfigured={app.isConfigured || false}
                isSetupInProgress={setupInProgress && currentAppId === app.appId}
                isDisabled={app.detecting || !app.installed || app.error === 'Detector not implemented yet'}
                profiles={profiles}
                currentLanguage={currentLanguage}
                onSetup={(profileId) => handleQuickSetup(app.appId, profileId)}
                setupButtonText={t('quickSetup.quickSetupButton')}
                settingUpText={t('quickSetup.settingUp')}
                selectProfileText={t('quickSetup.selectProfile')}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Setup Logs Dialog */}
      <SetupLogsDialog
        open={showLogsDialog}
        onOpenChange={setShowLogsDialog}
        appName={currentSetupApp}
        logs={setupLogs}
        isSetupInProgress={setupInProgress}
        currentLanguage={currentLanguage}
      />
    </div>
  );
}
