import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Star, Settings, Eye, Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/hooks/use-toast';
import { 
  installPackage, 
  uninstallPackage, 
  isPackageInstalled,
  getPackageStatus,
  togglePackageEnabled
} from '@/services/mcpManager';
import { MarketMcp } from '../../types/market';

interface MCPCardProps {
  id: string;
  name: string;
  description: string | null;
  author: string | null;
  version: string | null;
  downloads: number | null;
  rating: number | null;
  categories?: string[];
  type: string | null;
  // 移除所有回调函数，改为内部处理
}

export default function MCPCard({
  id,
  name,
  description,
  author,
  version,
  downloads,
  rating,
  categories,
  type
}: MCPCardProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  
  // 内部状态管理
  const [isInstalled, setIsInstalled] = useState(false);
  const [packageStatus, setPackageStatus] = useState<'running' | 'stopped' | 'error' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  
  // 初始化时检查安装状态
  useEffect(() => {
    const checkInstallStatus = () => {
      const installed = isPackageInstalled(id);
      setIsInstalled(installed);
      
      if (installed) {
        const status = getPackageStatus(id);
        setPackageStatus(status);
      }
    };
    
    checkInstallStatus();
  }, [id]);
  // 内部操作处理函数
  const handleInstall = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      const packageData: MarketMcp = {
        identifier: id,
        name,
        description,
        logoUrl: null,
        author,
        version,
        publishedAt: null,
        updatedAt: null,
        license: null,
        downloads,
        type,
        rating,
        transport: null,
        configuration: null
      };
      
      toast({
        title: "Installing MCP",
        description: `Installing ${name}...`,
      });
      
      await installPackage(packageData);
      
      setIsInstalled(true);
      setPackageStatus('running');
      
      toast({
        title: "Installation Complete",
        description: `${name} has been installed successfully!`,
      });
      
    } catch (error) {
      console.error('Installation failed:', error);
      toast({
        title: "Installation Failed",
        description: `Failed to install ${name}. Please try again.`,
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
        description: `Removing ${name}...`,
      });
      
      await uninstallPackage(id);
      
      setIsInstalled(false);
      setPackageStatus('unknown');
      
      toast({
        title: "Uninstallation Complete",
        description: `${name} has been removed successfully!`,
      });
      
    } catch (error) {
      console.error('Uninstallation failed:', error);
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
    console.log('Navigating to detail page for:', id); // 调试日志
    navigate(`/mcp/${id}`);
  };
  
  const handleToggleEnabled = async () => {
    if (isLoading || !isInstalled) return;
    
    try {
      setIsLoading(true);
      
      const newStatus = await togglePackageEnabled(id);
      setPackageStatus(newStatus ? 'running' : 'stopped');
      
      toast({
        title: newStatus ? "Package Enabled" : "Package Disabled",
        description: `${name} is now ${newStatus ? 'running' : 'stopped'}.`,
      });
      
    } catch (error) {
      console.error('Failed to toggle package status:', error);
      toast({
        title: "Operation Failed",
        description: `Failed to ${packageStatus === 'running' ? 'stop' : 'start'} ${name}.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="group transition-all duration-300 hover:shadow-card hover:shadow-glow/10 bg-gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight">{name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              by {author || 'Unknown'} • v{version || 'N/A'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-current text-yellow-500" />
            {rating?.toFixed(1) || '0.0'}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {description || 'No description available'}
        </p>
        
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {categories.slice(0, 3).map((category) => (
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
        )}
        
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Download className="h-3 w-3" />
            {downloads?.toLocaleString() || '0'}
          </div>
          {type && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">类型:</span>
              <Badge variant="outline" className="text-xs px-2 py-0">
                {type}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <div className="flex gap-2 w-full">
          {isInstalled ? (
            <>
              {/* 显示运行状态 */}
              <div className="flex items-center gap-2 px-2">
                <div className={`w-2 h-2 rounded-full ${
                  packageStatus === 'running' ? 'bg-green-500' :
                  packageStatus === 'stopped' ? 'bg-yellow-500' :
                  packageStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <span className="text-xs text-muted-foreground">
                  {packageStatus.charAt(0).toUpperCase() + packageStatus.slice(1)}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleConfigure}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Settings className="h-3 w-3 mr-1" />
                )}
                Configure
              </Button>
              
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
                  'Uninstall'
                )}
              </Button>
            </>
          ) : (
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
                {isLoading ? 'Installing...' : 'Install'}
              </Button>
              
              <Button
                onClick={handleDetail}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="px-3"
              >
                <Eye className="h-3 w-3 mr-1" />
                Detail
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}