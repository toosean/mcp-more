import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Star, Settings, Eye, Loader2, Trash, ArrowUp } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/hooks/use-toast';
import { McpInstallStatus, useMcpManager } from '@/services/mcpManager';
import { MarketMcp } from '../../types/market';

interface MCPCardProps {
  mcp: MarketMcp;
}

export default function MCPCard({
  mcp
}: MCPCardProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  // 内部状态管理
  const [installedStatus, setInstalledStatus] = useState<McpInstallStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getMcpInstallStatus, installMcp, uninstallMcp, upgradeMcp } = useMcpManager();


  const checkInstallStatus = async () => {
    const installedStatus = await getMcpInstallStatus(mcp.identifier, mcp.publishedAt);
    setInstalledStatus(installedStatus);

  };
  // 初始化时检查安装状态
  useEffect(() => {
    checkInstallStatus();
  }, [mcp.identifier]);
  // 内部操作处理函数

  const handleUpgrade = async () => {

    if (isLoading) return;

    try {
      setIsLoading(true);
      
      await upgradeMcp(mcp);
      checkInstallStatus();
      
    } catch (error) {
      window.logAPI.error('Upgrade failed:', error);
      toast({
        title: "Upgrade Failed",
        description: `Failed to upgrade ${mcp.name}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }

  };
  const handleInstall = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      await installMcp(mcp);
      checkInstallStatus();

    } catch (error) {
      window.logAPI.error('Installation failed:', error);
      toast({
        title: "Installation Failed",
        description: `Failed to install ${mcp.name}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUninstall = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      toast({
        title: "Uninstalling MCP",
        description: `Removing ${mcp.name}...`,
      });

      await uninstallMcp(mcp.identifier);
      checkInstallStatus();

      toast({
        title: "Uninstallation Complete",
        description: `${name} has been removed successfully!`,
      });

    } catch (error) {
      window.logAPI.error('Uninstallation failed:', error);
      toast({
        title: "Uninstallation Failed",
        description: `Failed to remove ${name}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigure = () => {
    // 导航到配置页面或打开配置对话框
    toast({
      title: "Opening Configuration",
      description: `Opening configuration for ${name}...`,
    });

    // TODO: 实现实际的配置页面导航
    // navigate(`/configure/${id}`);
  };

  const handleDetail = () => {
    navigate(`/mcp/${mcp.identifier}`);
  };

  return (
    <Card className="group transition-all duration-300 hover:shadow-card hover:shadow-glow/10 bg-gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight">{mcp.name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              by {mcp.author || 'Unknown'} • v{mcp.version || 'N/A'}
            </CardDescription>
          </div>
          {mcp.rating > 0 && (<div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-current text-yellow-500" />
            {mcp.rating?.toFixed(1) || '0.0'}
          </div>)}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {mcp.description || 'No description available'}
        </p>

        {/* {mcp.categories && mcp.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {mcp.categories.slice(0, 3).map((category) => (
              <Badge key={category} variant="secondary" className="text-xs px-2 py-0">
                {category}
              </Badge>
            ))}
            {categories.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                +{categories.length - 3}
              </Badge>
            )}
          </div>
        )} */}

        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Download className="h-3 w-3" />
            {mcp.downloads?.toLocaleString() || '0'}
          </div>
          {mcp.type && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('market.typeLabel')}:</span>
              <Badge variant="outline" className="text-xs px-2 py-0">
                {t(`market.type.${mcp.type.toLowerCase()}`, mcp.type)}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex gap-2 w-full">
          {installedStatus === 'installed' && (
            <>
              {/* 显示运行状态 */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleUninstall}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Trash className="h-3 w-3 mr-1" />
                )}
                {isLoading ? '正在卸载...' : '卸载'}
              </Button>
            </>
          )}

          {installedStatus === 'not_installed' && (
            <>
              <Button
                onClick={handleInstall}
                size="sm"
                disabled={isLoading}
                className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Download className="h-3 w-3 mr-1" />
                )}
                {isLoading ? '正在安装...' : '安装'}
              </Button>
            </>
          )}

          {installedStatus === 'upgradeable' && (
            <>
              <Button
                onClick={handleUpgrade}
                size="sm"
                disabled={isLoading}
                className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <ArrowUp className="h-3 w-3 mr-1" />
                )}
                {isLoading ? '正在升级...' : '升级'}
              </Button>
            </>
          )}

          {/* Detail 按钮统一分离出来 */}
          <Button
            onClick={handleDetail}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="px-3"
          >
            <Eye className="h-3 w-3 mr-1" />
            详情
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}