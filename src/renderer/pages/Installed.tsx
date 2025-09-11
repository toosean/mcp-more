import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import MCPCard from '@/components/mcp/MCPCard';
import AddMCPDialog from '@/components/mcp/AddMCPDialog';
import { Package, Settings, Trash2, Play, Square, Eye, Activity, Plus, Edit, Folder, Globe, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/use-i18n';
import { useConfig } from '@/hooks/use-config';
import { Odometer } from '@/components/ui/odometer';
import { Mcp } from '../../config/types';
import { useMcpManager } from '@/services/mcpManager';
interface DisplayMCP {
  identifier: string;
  name: string;
  description: string | null;
  author: string | null;
  version: string | null;
  downloads: number | null;
  rating: number | null;
  status: 'running' | 'stopped';
  lastUpdated: string | null;
  installed: string | null;
  calls: number | null;
  source: 'manual' | 'json' | 'market' | null;
}

export default function Installed() {
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMCP, setEditingMCP] = useState<Mcp | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState<{open: boolean, mcp: DisplayMCP | null}>({
    open: false,
    mcp: null
  });
  const { t } = useI18n();
  const { updateConfig, getConfig } = useConfig();
  const { startMcp } = useMcpManager();

  // Get source type display info
  const getSourceInfo = (source: 'manual' | 'json' | 'market' | null) => {
    // 将 manual 和 json 都归类为手动添加
    if (source === 'manual' || source === 'json') {
      return {
        icon: Folder,
        label: t('installed.source.manual'),
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20'
      };
    }
    
    if (source === 'market') {
      return {
        icon: Globe,
        label: t('installed.source.market'),
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20'
      };
    }
    
    // 默认情况
    return {
      icon: Package,
      label: t('installed.source.manual'), // 默认显示为手动添加
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/20'
    };
  };

  // Current language for formatting
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  
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
  
  // Format date string for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return dateString;
      
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      const isZhCN = currentLanguage === 'zh-CN';
      
      // If less than 1 day, show relative time
      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
          const minutes = Math.floor(diff / (1000 * 60));
          if (minutes <= 0) return t('installed.time.justNow');
          return t('installed.time.minutesAgo', { minutes });
        }
        return t('installed.time.hoursAgo', { hours });
      }
      
      // If less than 7 days, show days ago
      if (days < 7) {
        return t('installed.time.daysAgo', { days });
      }
      
      // Otherwise show formatted date based on locale
      return date.toLocaleDateString(currentLanguage, {
        year: 'numeric',
        month: isZhCN ? 'numeric' : 'short',
        day: 'numeric'
      });
    } catch (error) {
      // If parsing fails, return original string
      return dateString;
    }
  };

  // Get full date string for tooltip
  const getFullDate = (dateString: string | null): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const isZhCN = currentLanguage === 'zh-CN';
      
      return date.toLocaleString(currentLanguage, {
        year: 'numeric',
        month: isZhCN ? 'numeric' : 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        ...(isZhCN && { hour12: false })
      });
    } catch (error) {
      return dateString;
    }
  };

  // Convert MCPPackage to DisplayMCP format
  const [mcps, setMcps] = useState<DisplayMCP[]>([]);
  
  // Load and convert MCPs
  const loadMcps = useCallback(async () => {
    try {
      const config = await getConfig();
      if (!config?.mcp?.installedMcps) {
        setMcps([]);
        return;
      }

      const displayMcps = config.mcp.installedMcps
        .map((mcp: Mcp, index: number) => {
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
          
          return {
            identifier: mcp.identifier,
            name: mcp.name || 'Unknown MCP',
            description: mcp.description ?? null,
            author: mcp.author,
            version: mcp.version,
            downloads: null as number | null, // Not tracked for manual MCPs
            rating: null as number | null, // Not tracked for manual MCPs
            status: mcp.enabled ? 'running' : 'stopped' as 'running' | 'stopped',
            lastUpdated: validateDate(updatedDate),
            installed: validateDate(installedDate),
            calls: null as number | null,
            source: mcp.source,
          };
        })
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
  }, [getConfig]);

  // Load MCPs on mount
  useEffect(() => {
    loadMcps();
  }, [loadMcps]);

  const showDeleteConfirmation = (id: string) => {
    const mcp = mcps.find(m => m.identifier === id);
    if (!mcp) return;
    
    setConfirmDeleteDialog({
      open: true,
      mcp: mcp
    });
  };

  const handleConfirmUninstall = async () => {
    const mcp = confirmDeleteDialog.mcp;
    if (!mcp) return;

    try {
      const currentConfig = await getConfig();
      if (!currentConfig?.mcp?.installedMcps) return;

      // Stop client
      try{
        await window.mcpAPI.stopMcp(mcp.identifier);
      } catch (error) {
        // 在删除包的过程中，报错则不处理
        window.logAPI.error('Failed to stop MCP:', error);
      }

      const updatedMcps = currentConfig.mcp.installedMcps.filter(installedMcp => 
        installedMcp.identifier !== mcp.identifier
      );

      await updateConfig({
        mcp: {
          ...currentConfig.mcp,
          installedMcps: updatedMcps
        }
      });

      // Close dialog and refresh MCPs
      setConfirmDeleteDialog({ open: false, mcp: null });
      await loadMcps();

      toast({
        title: t('installed.toast.uninstalled'),
        description: t('installed.toast.uninstalledDesc', { name: mcp.name }),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('installed.toast.uninstallFailed'),
        variant: 'destructive'
      });
      // Close dialog even if error occurs
      setConfirmDeleteDialog({ open: false, mcp: null });
    }
  };

  const handleDetail = (id: string) => {
    navigate(`/mcp/${id}`);
  };

  const toggleStatus = async (id: string) => {
    const mcp = mcps.find(m => m.identifier === id);
    if (!mcp) return;

    // 设置loading状态
    setLoadingStates(prev => ({ ...prev, [id]: true }));

    try {
      const currentConfig = await getConfig();
      if (!currentConfig?.mcp?.installedMcps) return;

      if (mcp.status === 'running') {
        // 停止客户端
        await window.mcpAPI.stopMcp(mcp.identifier);
        toast({
          title: t('installed.toast.stopped'),
          description: t('installed.toast.stoppedDesc', { name: mcp.name }),
        });
      } else {
        // 启动客户端
        startMcp(mcp.identifier, mcp.name);
      }

      // 更新配置中的enabled状态
      const updatedMcps = currentConfig.mcp.installedMcps.map((mcp) => {
        const pkgId = mcp.identifier;
        if (pkgId === id) {
          return {
            ...mcp,
            enabled: !mcp.enabled
          };
        }
        return mcp;
      });

      await updateConfig({
        mcp: {
          ...currentConfig.mcp,
          installedMcps: updatedMcps
        }
      });

      // Refresh MCPs
      await loadMcps();

    } catch (error) {
      console.error('Toggle MCP status error:', error);
      toast({
        title: t('common.error'),
        description: t('installed.toast.toggleFailed'),
        variant: 'destructive'
      });
    } finally {
      // 清除loading状态
      setLoadingStates(prev => ({ ...prev, [id]: false }));
    }
  };

  const runningCount = mcps.filter(mcp => mcp.status === 'running').length;
  const [totalCalls, setTotalCalls] = useState(0);
  
  // Load total calls
  useEffect(() => {
    const loadTotalCalls = async () => {
      try {
        const config = await getConfig();
        setTotalCalls(statistics?.totalCalls || config?.mcp?.statistics?.totalCalls || 0);
      } catch (error) {
        setTotalCalls(0);
      }
    };
    loadTotalCalls();
  }, [statistics, getConfig]);
  
  // Mock data for updates available (in real app, this would come from checking versions)
  const updatesAvailable = Math.floor(mcps.length * 0.3); // About 30% of MCPs have updates

  const handleAddMCP = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditMCP = async (id: string) => {
    const currentConfig = await getConfig();
    const mcpEdit = currentConfig?.mcp?.installedMcps?.find(mcp =>
      mcp.identifier === id
    );
    if (mcpEdit && (mcpEdit.source === 'manual' || mcpEdit.source === 'json')) {
      setEditingMCP(mcpEdit);
    }
  };


  const handleDialogClose = useCallback((open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingMCP(null);
    }
  }, []);

  const handleMCPAddedOrUpdated = useCallback(async (mcpIdentifier: string) => {
    // 重新加载MCPs
    await loadMcps();
    setEditingMCP(null);
  }, [loadMcps]);

  const handleStartAll = async () => {
    const stoppedMcps = mcps.filter(mcp => mcp.status === 'stopped');
    if (stoppedMcps.length === 0) {
      toast({
        title: t('installed.toast.allRunning'),
        description: t('installed.toast.allRunningDesc'),
      });
      return;
    }

    try {
      const currentConfig = await getConfig();
      if (!currentConfig?.mcp?.installedMcps) return;

      // 启动所有停止的MCPs
      const startPromises = stoppedMcps.map(async (mcp) => {
        try {
          await window.mcpAPI.startMcp(mcp.identifier);
        } catch (error) {
          console.error(`Failed to start MCP ${mcp.name}:`, error);
          throw new Error(`Failed to start ${mcp.name}`);
        }
      });

      await Promise.all(startPromises);

      // 更新配置中的enabled状态
      const updatedMcps = currentConfig.mcp.installedMcps.map((mcp) => ({
        ...mcp,
        enabled: true
      }));

      await updateConfig({
        mcp: {
          ...currentConfig.mcp,
          installedMcps: updatedMcps
        }
      });

      // Refresh MCPs
      await loadMcps();

      toast({
        title: t('installed.toast.startedAll'),
        description: t('installed.toast.startedAllDesc', { count: stoppedMcps.length }),
      });
    } catch (error) {
      console.error('Start all MCPs error:', error);
      toast({
        title: t('common.error'),
        description: t('installed.toast.startAllFailed'),
        variant: 'destructive'
      });
    }
  };

  const handleStopAll = async () => {
    const runningMcps = mcps.filter(mcp => mcp.status === 'running');
    if (runningMcps.length === 0) {
      toast({
        title: t('installed.toast.allStopped'),
        description: t('installed.toast.allStoppedDesc'),
      });
      return;
    }

    try {
      const currentConfig = await getConfig();
      if (!currentConfig?.mcp?.installedMcps) return;

      // 停止所有运行的MCPs
      const stopPromises = runningMcps.map(async (mcp) => {
        try {
          await window.mcpAPI.stopMcp(mcp.identifier);
        } catch (error) {
          console.error(`Failed to stop MCP ${mcp.name}:`, error);
          throw new Error(`Failed to stop ${mcp.name}`);
        }
      });

      await Promise.all(stopPromises);

      // 更新配置中的enabled状态
      const updatedMcps = currentConfig.mcp.installedMcps.map((mcp) => ({
        ...mcp,
        enabled: false
      }));

      await updateConfig({
        mcp: {
          ...currentConfig.mcp,
          installedMcps: updatedMcps
        }
      });

      // Refresh MCPs
      await loadMcps();

      toast({
        title: t('installed.toast.stoppedAll'),
        description: t('installed.toast.stoppedAllDesc', { count: runningMcps.length }),
      });
    } catch (error) {
      console.error('Stop all MCPs error:', error);
      toast({
        title: t('common.error'),
        description: t('installed.toast.stopAllFailed'),
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    const unsubscribe = window.configAPI.onStatisticsUpdate((newStatistics: any) => {
      setStatistics(newStatistics);
    });

    return unsubscribe;
  }, []);

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {t('installed.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('installed.description')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-600/20 via-blue-600/20 to-indigo-600/20 border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-indigo-400/10"></div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-200">
              {t('installed.stats.totalCalls')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <Odometer 
                value={totalCalls}
                className="text-2xl font-bold text-cyan-800 dark:text-cyan-100"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-600/20 via-green-600/20 to-teal-600/20 border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-teal-400/10"></div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-200">
              {t('installed.stats.currentlyRunning')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <Odometer 
                value={runningCount}
                className="text-2xl font-bold text-emerald-800 dark:text-emerald-100"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 border-violet-500/30 shadow-lg shadow-violet-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 via-transparent to-fuchsia-400/10"></div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-violet-700 dark:text-violet-200">
              {t('installed.stats.totalInstalled')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <Odometer 
                value={mcps.length}
                className="text-2xl font-bold text-violet-800 dark:text-violet-100"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button className="bg-gradient-primary hover:opacity-90" onClick={handleAddMCP}>
          <Plus className="h-4 w-4 mr-2" />
          {t('installed.actions.addMCP')}
        </Button>
        <AddMCPDialog 
          open={isAddDialogOpen || !!editingMCP} 
          onOpenChange={handleDialogClose} 
          onMcpAddedOrUpdated={handleMCPAddedOrUpdated}
          editingMCP={editingMCP}
        />
        <Button variant="outline" onClick={handleStartAll}>
          <Play className="h-4 w-4 mr-2" />
          {t('installed.actions.startAll')}
        </Button>
        <Button variant="outline" onClick={handleStopAll}>
          <Square className="h-4 w-4 mr-2" />
          {t('installed.actions.stopAll')}
        </Button>
      </div>

      {/* Installed MCPs Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('installed.sections.yourMCPs')}</h2>
          {updatesAvailable > 0 ? (
            <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
              {updatesAvailable} {updatesAvailable > 1 ? t('installed.updates.availablePlural') : t('installed.updates.available')}
            </Badge>
          ) : (
            <Badge variant="secondary">
              {t('installed.updates.allUpToDate')}
            </Badge>
          )}
        </div>
        
        {mcps.length === 0 ? (
          <Card className="bg-gradient-card border-border/50 p-8">
            <div className="text-center space-y-4">
              <Package className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">{t('installed.empty.title')}</h3>
                <p className="text-muted-foreground">
                  {t('installed.empty.description')}
                </p>
              </div>
              <Button 
                className="bg-gradient-primary hover:opacity-90"
                onClick={() => navigate('/')}
              >
                {t('installed.empty.browseMarket')}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {mcps.map((mcp) => (
              <Card key={mcp.identifier} className="bg-gradient-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{mcp.name}</h3>
                        <Badge variant={mcp.status === 'running' ? 'default' : 'secondary'}>
                          {t(`installed.status.${mcp.status}`)}
                        </Badge>
                        {mcp.version && <Badge variant="outline" className="text-xs">
                          v{mcp.version}
                        </Badge>}
                        {(() => {
                          const sourceInfo = getSourceInfo(mcp.source);
                          const SourceIcon = sourceInfo.icon;
                          return (
                            <Badge 
                              variant="outline" 
                              className={`text-xs flex items-center gap-1 ${sourceInfo.color} ${sourceInfo.bgColor} ${sourceInfo.borderColor}`}
                            >
                              <SourceIcon className="h-3 w-3" />
                              {sourceInfo.label}
                            </Badge>
                          );
                        })()}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {mcp.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {mcp.author && <span>{t('installed.time.by')} {mcp.author}</span>}
                        {mcp.lastUpdated && (
                          <span title={getFullDate(mcp.lastUpdated)}>
                            {t('installed.time.updated')} {formatDate(mcp.lastUpdated)}
                          </span>
                        )}
                        {mcp.installed && (
                          <span title={getFullDate(mcp.installed)}>
                            {t('installed.time.installed')} {formatDate(mcp.installed)}
                          </span>
                        )}
                      </div>
                      
                      {/* <div className="flex flex-wrap gap-1">
                        {mcp.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div> */}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant={mcp.status === 'running' ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => toggleStatus(mcp.identifier)}
                        disabled={loadingStates[mcp.identifier]}
                        className={mcp.status === 'running' 
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                        }
                      >
                        {loadingStates[mcp.identifier] ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            {mcp.status === 'running' ? t('installed.status.stopping') : t('installed.status.starting')}
                          </>
                        ) : mcp.status === 'running' ? (
                          <>
                            <Square className="h-3 w-3 mr-1" />
                            {t('installed.status.stop')}
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            {t('installed.status.start')}
                          </>
                        )}
                      </Button>
                      {mcp.source === 'market' && <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDetail(mcp.identifier)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {t('installed.buttons.detail')}
                      </Button>}
                      {(mcp.source === 'manual' || mcp.source === 'json') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMCP(mcp.identifier)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          {t('installed.buttons.edit')}
                        </Button>
                      )}
                      {/* <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfigure(mcp.id)}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        {t('installed.buttons.config')}
                      </Button> */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => showDeleteConfirmation(mcp.identifier)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={confirmDeleteDialog.open} 
        onOpenChange={(open) => setConfirmDeleteDialog({ open, mcp: open ? confirmDeleteDialog.mcp : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('installed.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('installed.deleteDialog.description', { name: confirmDeleteDialog.mcp?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('installed.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmUninstall}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('installed.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}