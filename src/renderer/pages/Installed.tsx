import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import AddMCPDialog from '@/components/mcp/AddMCPDialog';
import { Package, Plus, Square, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/use-i18n';
import { useConfig } from '@/hooks/use-config';
import { useMcpManager } from '@/services/mcpManager';
import { useConfirm } from '@/hooks/use-confirm';
import { useOAuthConfirmDialog } from '@/hooks/use-oauth-confirm-dialog';
import MCPConfigurationDialog from '@/components/mcp/MCPConfigurationDialog';
import { FormFieldConfig } from '@/components/DynamicForm';
import { DisplayMCP } from '@/types/mcp';
import { useInstalledMcps } from '@/hooks/use-installed-mcps';
import StatisticsCards from '@/components/installed/StatisticsCards';
import InstalledMCPCard from '@/components/mcp/InstalledMCPCard';
import InspectDialog from '@/components/installed/InspectDialog';
import { Mcp } from '../../config/types';

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
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configMcp, setConfigMcp] = useState<DisplayMCP | null>(null);
  const [configInputs, setConfigInputs] = useState<FormFieldConfig[]>([]);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [restartMcp, setRestartMcp] = useState<DisplayMCP | null>(null);
  const [mcpsWithInputs, setMcpsWithInputs] = useState<Set<string>>(new Set());
  const [showInspectDialog, setShowInspectDialog] = useState(false);
  const [inspectMcpIdentifier, setInspectMcpIdentifier] = useState<string | null>(null);

  const { t } = useI18n();
  const { updateConfig, getConfig } = useConfig();
  const { startMcp, stopMcp, uninstallMcp } = useMcpManager();
  const { confirm, ConfirmDialog } = useConfirm<{ mcpName: string; mcpIdentifier: string }>();
  const { handleOAuthConfirm, OAuthConfirmDialog } = useOAuthConfirmDialog();
  const { mcps, currentLanguage, loadMcps } = useInstalledMcps();

  // Load MCPs with inputs information
  useEffect(() => {
    const loadMcpsWithInputs = async () => {
      try {
        const config = await getConfig();
        const mcpsWithInputsSet = new Set<string>();
        config?.mcp?.installedMcps?.forEach((mcp: Mcp) => {
          if (mcp.inputs && mcp.inputs.length > 0) {
            mcpsWithInputsSet.add(mcp.identifier);
          }
        });
        setMcpsWithInputs(mcpsWithInputsSet);
      } catch (error) {
        console.error('Failed to load MCPs with inputs:', error);
        setMcpsWithInputs(new Set());
      }
    };

    loadMcpsWithInputs();
  }, [getConfig, mcps]);

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
      await uninstallMcp(mcp.identifier);
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
      setConfirmDeleteDialog({ open: false, mcp: null });
    }
  };

  const handleDetail = (id: string) => {
    navigate(`/mcp/${id}`);
  };

  const handleInspect = (mcp: DisplayMCP) => {
    setInspectMcpIdentifier(mcp.identifier);
    setShowInspectDialog(true);
  };

  const toggleStatus = async (id: string) => {
    const mcp = mcps.find(m => m.identifier === id);
    if (!mcp) return;

    setLoadingStates(prev => ({ ...prev, [id]: true }));

    try {
      const currentConfig = await getConfig();
      if (!currentConfig?.mcp?.installedMcps) return;

      const currentMcp = currentConfig.mcp.installedMcps.find(m => m.identifier === id);
      if (!currentMcp) return;

      currentMcp.enabled = mcp.status === 'running' ? false : true;

      await window.configAPI.setConfig({
        mcp: {
          ...currentConfig.mcp,
          installedMcps: currentConfig.mcp.installedMcps.map(m => m.identifier === id ? currentMcp : m)
        }
      });

      if (mcp.status === 'running') {
        await stopMcp(mcp.identifier);
        toast({
          title: t('installed.toast.stopped'),
          description: t('installed.toast.stoppedDesc', { name: mcp.name }),
        });
      } else if (mcp.status === 'stopped') {
        try {
          await startMcp(mcp.identifier, mcp.name);
        } catch (error) {
          const errorMessage: string = error.toString();
          if (errorMessage.includes('McpStartNeedsAuthError')) {
            const configMcp = currentConfig.mcp.installedMcps.find(m => m.identifier === id);
            let shouldRetry = false;
            if (configMcp?.authMethod || configMcp?.authMethod?.includes('oauth')) {
              shouldRetry = await confirm(
                { mcpName: mcp.name, mcpIdentifier: mcp.identifier },
                {
                  title: t('installed.authDialog.title'),
                  description: t('installed.authDialog.description', { name: mcp.name }),
                  confirmText: t('installed.authDialog.retry'),
                  cancelText: t('installed.authDialog.cancel'),
                }
              );
            } else {
              shouldRetry = await handleOAuthConfirm(mcp.name);
            }

            if (shouldRetry) {
              try {
                await startMcp(mcp.identifier, mcp.name, true);
              } catch (retryError) {
                toast({
                  title: t('common.error'),
                  description: t('installed.toast.startFailed'),
                  variant: 'destructive'
                });
              }
            }
          } else {
            toast({
              title: t('common.error'),
              description: t('installed.toast.startFailed'),
              variant: 'destructive'
            });
          }
        }
      }

      await loadMcps();
    } catch (error) {
      console.error('Toggle MCP status error:', error);
      toast({
        title: t('common.error'),
        description: t('installed.toast.toggleFailed'),
        variant: 'destructive'
      });
    } finally {
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

  const updatesAvailable = Math.floor(mcps.length * 0.3);

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

  const handleConfigure = async (mcp: DisplayMCP) => {
    const currentConfig = await getConfig();
    const fullMcp = currentConfig?.mcp?.installedMcps?.find(m => m.identifier === mcp.identifier);

    if (fullMcp && fullMcp.inputs && fullMcp.inputs.length > 0) {
      const inputsWithValues = fullMcp.inputs.map(input => ({
        ...input,
        defaultValue: fullMcp.inputValues?.[input.id] || ''
      }));

      setConfigMcp(mcp);
      setConfigInputs(inputsWithValues);
      setShowConfigDialog(true);
    } else {
      toast({
        title: t('installed.config.noInputs') || 'No configuration needed',
        description: t('installed.config.noInputsDesc', { name: mcp.name }) || `${mcp.name} does not require configuration.`,
        variant: 'default'
      });
    }
  };

  const handleConfigSubmit = async (values: Record<string, string>) => {
    if (!configMcp) return;

    try {
      const currentConfig = await getConfig();
      const updatedMcps = currentConfig.mcp.installedMcps.map(mcp => {
        if (mcp.identifier === configMcp.identifier) {
          return {
            ...mcp,
            inputValues: values
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

      setShowConfigDialog(false);
      setConfigInputs([]);

      toast({
        title: t('installed.config.saved') || 'Configuration saved',
        description: t('installed.config.savedDesc', { name: configMcp.name }) || `Configuration for ${configMcp.name} has been saved.`,
      });

      await loadMcps();

      if (configMcp.status === 'running') {
        setRestartMcp(configMcp);
        setShowRestartDialog(true);
      }

      setConfigMcp(null);
    } catch (error) {
      console.error('Failed to save MCP configuration:', error);
      toast({
        title: t('common.error') || 'Error',
        description: t('installed.config.saveFailed') || 'Failed to save configuration',
        variant: 'destructive'
      });
    }
  };

  const handleConfigCancel = () => {
    setShowConfigDialog(false);
    setConfigMcp(null);
    setConfigInputs([]);
  };

  const handleRestartNow = async () => {
    if (!restartMcp) return;

    try {
      setShowRestartDialog(false);

      toast({
        title: t('installed.restart.restarting') || 'Restarting MCP',
        description: t('installed.restart.restartingDesc', { name: restartMcp.name }) || `Restarting ${restartMcp.name} to apply configuration changes...`,
      });

      await stopMcp(restartMcp.identifier);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await startMcp(restartMcp.identifier, restartMcp.name);
      await loadMcps();

      toast({
        title: t('installed.restart.success') || 'MCP restarted',
        description: t('installed.restart.successDesc', { name: restartMcp.name }) || `${restartMcp.name} has been restarted with new configuration.`,
      });

    } catch (error) {
      console.error('Failed to restart MCP:', error);
      toast({
        title: t('common.error') || 'Error',
        description: t('installed.restart.failed') || 'Failed to restart MCP',
        variant: 'destructive'
      });
    } finally {
      setRestartMcp(null);
    }
  };

  const handleRestartLater = () => {
    setShowRestartDialog(false);
    setRestartMcp(null);
    toast({
      title: t('installed.restart.postponed') || 'Restart postponed',
      description: t('installed.restart.postponedDesc') || 'Configuration changes will take effect after the next restart.',
      variant: 'default'
    });
  };

  const handleDialogClose = useCallback((open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingMCP(null);
    }
  }, []);

  const handleMCPAddedOrUpdated = useCallback(async (mcpIdentifier: string) => {
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

      const startPromises = stoppedMcps.map(async (mcp) => {
        try {
          await window.mcpAPI.startMcp(mcp.identifier);
        } catch (error) {
          console.error(`Failed to start MCP ${mcp.name}:`, error);
          throw new Error(`Failed to start ${mcp.name}`);
        }
      });

      await Promise.all(startPromises);

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

      const stopPromises = runningMcps.map(async (mcp) => {
        try {
          await window.mcpAPI.stopMcp(mcp.identifier);
        } catch (error) {
          console.error(`Failed to stop MCP ${mcp.name}:`, error);
          throw new Error(`Failed to stop ${mcp.name}`);
        }
      });

      await Promise.all(stopPromises);

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
      <StatisticsCards
        totalCalls={totalCalls}
        runningCount={runningCount}
        totalInstalled={mcps.length}
      />

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
              <InstalledMCPCard
                key={mcp.identifier}
                mcp={mcp}
                isLoading={loadingStates[mcp.identifier] || false}
                hasInputs={mcpsWithInputs.has(mcp.identifier)}
                currentLanguage={currentLanguage}
                onToggleStatus={toggleStatus}
                onEdit={handleEditMCP}
                onConfigure={handleConfigure}
                onDelete={showDeleteConfirmation}
                onDetail={handleDetail}
                onInspect={handleInspect}
                mcpsWithInputs={mcpsWithInputs}
              />
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

      {/* Auth Retry Confirmation Dialog */}
      <ConfirmDialog />
      <OAuthConfirmDialog />

      {/* MCP Configuration Dialog */}
      {configMcp && (
        <MCPConfigurationDialog
          isOpen={showConfigDialog}
          onClose={handleConfigCancel}
          mcpName={configMcp.name}
          inputs={configInputs}
          onSubmit={handleConfigSubmit}
          mode="configure"
        />
      )}

      {/* Restart Confirmation Dialog */}
      <AlertDialog
        open={showRestartDialog}
        onOpenChange={setShowRestartDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('installed.restartDialog.title') || 'Restart Required'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('installed.restartDialog.description', { name: restartMcp?.name || '' }) ||
               `To apply the configuration changes, ${restartMcp?.name || 'this MCP'} needs to be restarted. Would you like to restart it now?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRestartLater}>
              {t('installed.restartDialog.notNow') || 'Not Now'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestartNow}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('installed.restartDialog.restart') || 'Restart Now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inspect MCP Tools Dialog */}
      <InspectDialog
        open={showInspectDialog}
        onOpenChange={setShowInspectDialog}
        mcpIdentifier={inspectMcpIdentifier}
      />
    </div>
  );
}