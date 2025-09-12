import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  Zap, 
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  Moon,
  Sun,
  Monitor,
  Loader2,
  Languages,
  Bug,
  BookOpen
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { useConfig } from '@/hooks/use-config';
import { useI18n } from '@/hooks/use-i18n';
import { AppConfig, Theme } from '../../config/types';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { setTheme } = useTheme();
  const { getConfig, loading, error, updateConfig, resetConfig } = useConfig();
  const { t, changeLanguage } = useI18n();
  const navigate = useNavigate();
  
  // 本地状态用于临时编辑
  const [localGeneral, setLocalGeneral] = useState<Partial<AppConfig['general']>>({});
  const [appVersion, setAppVersion] = useState<string>('loading...');
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [simulatingUpdate, setSimulatingUpdate] = useState<boolean>(false);
  const [showResetDialog, setShowResetDialog] = useState<boolean>(false);

  // 监听更新事件来重置模拟状态
  useEffect(() => {
    const handleUpdateComplete = () => {
      setSimulatingUpdate(false);
    };

    const handleUpdateError = () => {
      setSimulatingUpdate(false);
    };

    const unsubscribeComplete = window.updaterAPI.onDownloadComplete(handleUpdateComplete);
    const unsubscribeError = window.updaterAPI.onError(handleUpdateError);

    return () => {
      unsubscribeComplete();
      unsubscribeError();
    };
  }, []);

  // 获取应用版本和开发模式状态
  useEffect(() => {
    const loadAppVersion = async () => {
      try {
        const version = await window.appInfoAPI.getVersion();
        setAppVersion(`v${version}`);
        
        // 检测开发模式
        const isPackaged = await window.appInfoAPI.isPackaged();
        setIsDevMode(!isPackaged);
      } catch (err) {
        window.logAPI.error('Failed to load app version:', err);
        setAppVersion('v1.0.0'); // 回退到默认值
        setIsDevMode(false);
      }
    };
    
    loadAppVersion();
  }, []);

  // 当配置加载完成后，同步到本地状态
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getConfig();
      if (config) {
        setLocalGeneral(config.general);

        // 同步主题到 next-themes
        if (config.general.theme !== 'system') {
          setTheme(config.general.theme);
        }
      }
    }
    loadConfig();
  }, [setTheme]);

  // 通用的自动保存函数
  const autoSave = async (key: keyof AppConfig['general'], value: any, additionalAction?: () => void) => {
    const newGeneral = { ...localGeneral, [key]: value };
    setLocalGeneral(newGeneral);
    
    try {
      await updateConfig({
        general: newGeneral,
      });
      
      // 执行额外的操作（如应用主题、切换语言等）
      if (additionalAction) {
        additionalAction();
      }
    } catch (err) {
      toast({
        title: t('settings.messages.saveFailed.title'),
        description: err instanceof Error ? err.message : t('settings.messages.saveFailed.description'),
        variant: "destructive",
      });
    }
  };

  const handleDetectClient = () => {
    toast({
      title: t('settings.messages.detectClient.title'),
      description: t('settings.messages.detectClient.description'),
    });
  };

  const handleQuickGuide = () => {
    navigate('/setup-guide');
  };

  const handleExportConfig = async () => {
    try {
      const configData = await window.configAPI.exportConfig();
      const blob = new Blob([JSON.stringify(configData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mcp-more-config.json';
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: t('settings.messages.exportSuccess.title'),
        description: t('settings.messages.exportSuccess.description'),
      });
    } catch (err) {
      toast({
        title: t('settings.messages.exportFailed.title'),
        description: t('settings.messages.exportFailed.description'),
        variant: "destructive",
      });
    }
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const importedConfig = JSON.parse(text);
          await window.configAPI.importConfig(importedConfig);
          
          toast({
            title: t('settings.messages.importSuccess.title'),
            description: t('settings.messages.importSuccess.description'),
          });
        } catch (err) {
          toast({
            title: t('settings.messages.importFailed.title'),
            description: t('settings.messages.importFailed.description'),
            variant: "destructive",
          });
        }
      }
    };
    input.click();
  };

  const handleReset = async (e?: React.MouseEvent) => {
    // 防止默认行为和事件冒泡
    e?.preventDefault();
    e?.stopPropagation();
    
    // 显示确认对话框
    setShowResetDialog(true);
  };

  const handleConfirmReset = async () => {
    try {
      await resetConfig();
      
      // 获取重置后的配置并立即应用
      const newConfig = await getConfig();
      if (newConfig) {
        // 立即应用主题
        if (newConfig.general.theme) {
          setTheme(newConfig.general.theme);
        }
        
        // 立即应用语言
        if (newConfig.general.language) {
          changeLanguage(newConfig.general.language);
        }
        
        // 更新本地状态
        setLocalGeneral(newConfig.general);
      }
      
      setShowResetDialog(false);
      toast({
        title: t('settings.messages.resetSuccess.title'),
        description: t('settings.messages.resetSuccess.description'),
      });
    } catch (err) {
      toast({
        title: t('settings.messages.resetFailed.title'),
        description: t('settings.messages.resetFailed.description'),
        variant: "destructive",
      });
    }
  };

  const handleViewLogs = async () => {
    try {
      await window.appInfoAPI.showLogsDirectory();
      toast({
        title: t('settings.messages.openLogsSuccess.title'),
        description: t('settings.messages.openLogsSuccess.description'),
      });
    } catch (err) {
      toast({
        title: t('settings.messages.openLogsFailed.title'),
        description: t('settings.messages.openLogsFailed.description'),
        variant: "destructive",
      });
    }
  };

  // 模拟更新下载过程
  const handleSimulateUpdate = async () => {
    if (simulatingUpdate) return;
    
    setSimulatingUpdate(true);
    
    try {
      toast({
        title: t('settings.devMode.title'),
        description: t('settings.devMode.simulateUpdateStart'),
      });

      // 通过IPC触发模拟更新
      const result = await window.updaterAPI.simulateUpdate();
      
      if (result.success) {
        window.logAPI.info('Mock update simulation started:', result.message);
      } else {
        throw new Error(result.error || t('settings.devMode.simulateStartFailed'));
      }
      
    } catch (err) {
      toast({
        title: t('settings.devMode.simulateFailed'),
        description: err instanceof Error ? err.message : t('settings.devMode.simulateError'),
        variant: "destructive",
      });
      setSimulatingUpdate(false);
    }
  };

  // 显示加载状态
  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-destructive">{t('settings.messages.loadConfigError')}: {error}</p>
          <Button onClick={() => window.location.reload()}>{t('common.loading')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 min-h-0">
      {/* Header */}
      <div className="space-y-2 flex-shrink-0">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {t('settings.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('settings.description')}
        </p>
      </div>

      {/* Quick Setup Card */}
      <Card className="bg-gradient-primary/10 border-primary/20 flex-shrink-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle>{t('settings.quickSetup.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.quickSetup.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* <Button onClick={handleDetectClient} className="bg-gradient-primary hover:opacity-90 flex-1 sm:flex-none">
              <Zap className="h-4 w-4 mr-2" />
              {t('settings.quickSetup.detectClient')}
            </Button> */}
            <Button onClick={handleQuickGuide} className="bg-gradient-primary hover:opacity-90 flex-1 sm:flex-none">
              <BookOpen className="h-4 w-4 mr-2" />
              {t('settings.quickSetup.quickGuide')}
            </Button>
            {/* <Button variant="outline" onClick={handleExportConfig} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              {t('settings.quickSetup.exportConfig')}
            </Button>
            <Button variant="outline" onClick={handleImportConfig} className="flex-1 sm:flex-none">
              <Upload className="h-4 w-4 mr-2" />
              {t('settings.quickSetup.importConfig')}
            </Button> */}
          </div>
        </CardContent>
      </Card>

      {/* Content Area - with proper scrolling */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* General Settings */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <CardTitle>{t('settings.general.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings.general.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('settings.general.autoStart.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.general.autoStart.description')}
                </p>
              </div>
              <Switch 
                checked={localGeneral.autoStart || false} 
                onCheckedChange={(checked) => autoSave('autoStart', checked)} 
              />
            </div>
                        
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('settings.general.minimizeOnStartup.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.general.minimizeOnStartup.description')}
                </p>
              </div>
              <Switch 
                checked={localGeneral.minimizeOnStartup || false} 
                onCheckedChange={(checked) => autoSave('minimizeOnStartup', checked)} 
              />
            </div>

            {/* <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('settings.general.enableTelemetry.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.general.enableTelemetry.description')}
                </p>
              </div>
              <Switch 
                checked={localGeneral.enableTelemetry || false} 
                onCheckedChange={(checked) => autoSave('enableTelemetry', checked)} 
              />
            </div> */}
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('settings.general.theme.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.general.theme.description')}
                </p>
              </div>
              <Select 
                value={localGeneral.theme || 'system'} 
                onValueChange={(value: Theme) => autoSave('theme', value, () => setTheme(value))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-3 w-3" />
                      {t('settings.general.theme.light')}
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-3 w-3" />
                      {t('settings.general.theme.dark')}
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-3 w-3" />
                      {t('settings.general.theme.system')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('settings.general.language.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.general.language.description')}
                </p>
              </div>
              <Select 
                value={localGeneral.language || 'zh-CN'} 
                onValueChange={(value: string) => autoSave('language', value, () => changeLanguage(value))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">
                    <div className="flex items-center gap-2">
                      <Languages className="h-3 w-3" />
                      English
                    </div>
                  </SelectItem>
                  <SelectItem value="zh-CN">
                    <div className="flex items-center gap-2">
                      <Languages className="h-3 w-3" />
                      简体中文
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="port-number">{t('settings.general.portNumber.label')}</Label>
              <Input
                id="port-number"
                type="number"
                value={String(localGeneral.portNumber)}
                onChange={(e) => {
                  const portNumber = parseInt(e.target.value);
                  if (portNumber >= 1 && portNumber <= 65535) {
                    autoSave('portNumber', portNumber);
                  } else {
                    setLocalGeneral(prev => ({ ...prev, portNumber }));
                  }
                }}
                min="1"
                max="65535"
              />
              <p className="text-sm text-muted-foreground">
                {t('settings.general.portNumber.description')}
              </p>
            </div>
            
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>{t('settings.system.title')}</CardTitle>
            <CardDescription>
              {t('settings.system.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('settings.system.version')}</div>
                <Badge variant="outline">{appVersion}</Badge>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('settings.system.status')}</div>
                <Badge className="bg-success text-success-foreground">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('settings.system.healthy')}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('settings.system.uptime')}</div>
                <div className="text-sm font-medium">4h 32m</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('settings.system.memoryUsage')}</div>
                <div className="text-sm font-medium">124 MB</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button variant="outline" className="w-full" onClick={handleViewLogs}>
                {t('settings.system.viewLogs')}
              </Button>
              
              {/* 开发模式专用按钮 */}
              {isDevMode && (
                <Button 
                  variant="outline" 
                  className="w-full border-orange-500/50 text-orange-600 hover:bg-orange-500/10" 
                  onClick={handleSimulateUpdate}
                  disabled={simulatingUpdate}
                >
                  {simulatingUpdate ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('settings.devMode.simulatingUpdate')}
                    </>
                  ) : (
                    <>
                      <Bug className="h-4 w-4 mr-2" />
                      {t('settings.devMode.simulateUpdateDownload')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Reset Button - Fixed at bottom */}
      <div className="flex justify-start flex-shrink-0">
        <Button type="button" variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('settings.actions.resetAll')}
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.actions.resetAll')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.messages.resetConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}