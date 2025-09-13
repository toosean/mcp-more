import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { RuntimeInfo } from '@/types/global';
import { toast } from '@/hooks/use-toast';

export default function RuntimeList() {
  const { t } = useI18n();
  const [runtimeList, setRuntimeList] = useState<RuntimeInfo[]>([]);
  const [runtimeLoading, setRuntimeLoading] = useState<boolean>(false);

  // 获取运行时列表
  const loadRuntimeList = async (delay: boolean = false) => {
    setRuntimeLoading(true);
    try {
      const runtimes = await window.runtimeAPI.checkRuntimesAsync();
      if(delay) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      setRuntimeList(runtimes);
    } catch (err) {
      window.logAPI?.error('Failed to load runtime list:', err);
      setRuntimeList([]);
    } finally {
      setRuntimeLoading(false);
    }
  };

  useEffect(() => {
    loadRuntimeList(false);
  }, []);

  // 处理运行时安装
  const handleInstallRuntime = async (runtimeName: string) => {
    // 获取安装链接
    const runtime = runtimeList.find(r => r.name === runtimeName);
    const installLink = runtime?.installLink;
    
    if (installLink) {
      // 打开安装链接
      window.shellAPI?.openExternal(installLink);
      toast({
        title: t('settings.runtimeList.actions.install') + ' ' + runtimeName,
        description: t('settings.runtimeList.messages.installOpened'),
      });
    } else {
      toast({
        title: t('settings.runtimeList.messages.installLinkUnavailable'),
        description: t('settings.runtimeList.messages.installLinkUnavailableDesc', { name: runtimeName }),
        variant: "destructive",
      });
    }
  };

  // 处理立即刷新
  const handleRefresh = async () => {
    await loadRuntimeList(true);
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('settings.runtimeList.title')}</CardTitle>
            <CardDescription>{t('settings.runtimeList.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {runtimeLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('settings.runtimeList.status.checking')}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {runtimeList.map((runtime) => (
              <div key={runtime.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    runtime.isInstalled 
                      ? "bg-green-500" 
                      : "bg-gray-400"
                  }`} />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {runtime.name}
                    </span>
                    {runtime.paths && runtime.paths.map((path) => (
                      <span className="text-xs text-muted-foreground" title={path}>
                        {path.length > 50 ? '...' + path.slice(path.length - 30) : path}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  {runtime.isInstalled ? (
                    <div className="flex flex-col items-end">
                      <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 dark:text-green-300 dark:border-green-800 dark:bg-green-950/30">
                        {t('settings.runtimeList.status.installed')}
                      </Badge>
                      {runtime.version && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {runtime.version}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:bg-gray-800/50 transition-colors"
                      onClick={() => handleInstallRuntime(runtime.name)}
                      title={t('settings.runtimeList.actions.installTooltip', { name: runtime.name })}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {t('settings.runtimeList.actions.install')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {runtimeList.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-sm">
                  {t('settings.runtimeList.description')}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 底部刷新按钮 */}
        <div className="flex justify-center pt-4 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={runtimeLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${runtimeLoading ? 'animate-spin' : ''}`} />
            {t('settings.runtimeList.actions.refresh')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}