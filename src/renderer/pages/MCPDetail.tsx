import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Download,
  Star,
  Calendar,
  User,
  Package,
  FileText,
  Shield,
  Globe,
  Github,
  ExternalLink,
  Loader2,
  Settings,
  Trash2,
  Copy
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/use-i18n';
import { MarketMcpDetail } from '../types/market';
import { getMcpDetail } from '@/services/marketApi';
import { McpInstallStatus, useMcpManager } from '@/services/mcpManager';

export default function MCPDetail() {
  const { org, id } = useParams<{ org: string, id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [mcp, setMcp] = useState<MarketMcpDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [installedStatus, setInstalledStatus] = useState<McpInstallStatus | null>(null);
  const [installing, setInstalling] = useState(false);
  const { getMcpInstallStatus, installMcp, uninstallMcp, upgradeMcp } = useMcpManager();

  useEffect(() => {
    if (org && id) {
      loadMcpDetail(`${org}/${id}`);
    }
  }, [org, id]);

  useEffect(() => {
    if (mcp) {
      refreshInstalledStatus();
    }
  }, [mcp]);


  const refreshInstalledStatus = async () => {
    if (mcp) {
      const installedStatus = await getMcpInstallStatus(mcp.identifier, mcp.publishedAt);
      setInstalledStatus(installedStatus);
    }
  };
  
  const loadMcpDetail = async (identifier: string) => {
    try {
      setLoading(true);
      const detail = await getMcpDetail(identifier);
      setMcp(detail);

    } catch (error) {
      window.logAPI.error('Failed to load MCP detail:', error);
      toast({
        title: t('common.error'),
        description: t('mcpDetail.error.loadFailed'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t('mcpDetail.loading')}</span>
        </div>
      </div>
    );
  }

  if (!mcp && !loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">{t('mcpDetail.error.title')}</h1>
          <p className="text-muted-foreground">{t('mcpDetail.error.packageId')}: {org}/{id}</p>
          <p className="text-muted-foreground">{t('mcpDetail.error.description')}</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('mcpDetail.actions.backToMarket')}
          </Button>
        </div>
      </div>
    );
  }

  const handleUpgrade = async () => {
    if (!mcp || installing) return;

    try {
      setInstalling(true);
      toast({
        title: t('mcpDetail.toast.upgrading'),
        description: t('mcpDetail.toast.upgradingDesc', { name: mcp.name }),
      });

      await upgradeMcp(mcp);

      await refreshInstalledStatus();

      toast({
        title: t('mcpDetail.toast.upgradeComplete'),
        description: t('mcpDetail.toast.upgradeCompleteDesc', { name: mcp.name }),
      });

    } catch (error) {
      window.logAPI.error('Upgrade failed:', error);
      toast({
        title: t('mcpDetail.toast.upgradeFailed'),
        description: t('mcpDetail.toast.upgradeFailedDesc', { name: mcp.name }),
        variant: "destructive"
      });
    } finally {
      setInstalling(false);
    }
  };

  // Action handlers - 内部处理各种操作
  const handleInstall = async () => {
    if (!mcp || installing) return;

    try {
      setInstalling(true);
      toast({
        title: t('mcpDetail.toast.installing'),
        description: t('mcpDetail.toast.installingDesc', { name: mcp.name }),
      });

      await installMcp(mcp);

      await refreshInstalledStatus();

      toast({
        title: t('mcpDetail.toast.installComplete'),
        description: t('mcpDetail.toast.installCompleteDesc', { name: mcp.name }),
      });

    } catch (error) {
      window.logAPI.error('Installation failed:', error);
      toast({
        title: t('mcpDetail.toast.installFailed'),
        description: t('mcpDetail.toast.installFailedDesc', { name: mcp.name }),
        variant: "destructive"
      });
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!mcp || installing) return;

    try {
      setInstalling(true);
      toast({
        title: "Uninstalling MCP",
        description: `Removing ${mcp.name}...`,
      });

      await uninstallMcp(mcp.identifier);

      await refreshInstalledStatus();

      toast({
        title: "Uninstallation Complete",
        description: `${mcp.name} has been removed successfully!`,
      });

    } catch (error) {
      window.logAPI.error('Uninstallation failed:', error);
      toast({
        title: "Uninstallation Failed",
        description: `Failed to remove ${mcp.name}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setInstalling(false);
    }
  };

  const handleBackToMarket = () => {
    navigate(-1); // 返回上一页，更灵活
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToMarket}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {mcp.name}
          </h1>
          <p className="text-muted-foreground">
            by {mcp.author || 'Unknown'} • v{mcp.version || 'N/A'} • {`${mcp.identifier}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{mcp.description || 'No description available'}</p>
            </CardContent>
          </Card>

          {/* Documentation */}
          {mcp.readme && <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-foreground mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold text-foreground mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium text-foreground mb-2">{children}</h3>,
                    h4: ({ children }) => <h4 className="text-base font-medium text-foreground mb-2">{children}</h4>,
                    h5: ({ children }) => <h5 className="text-sm font-medium text-foreground mb-1">{children}</h5>,
                    h6: ({ children }) => <h6 className="text-xs font-medium text-foreground mb-1">{children}</h6>,
                    p: ({ children }) => <p className="text-muted-foreground mb-3 leading-relaxed">{children}</p>,
                    code: ({ children, ...props }) => {
                      if (props.className?.includes('language-')) {
                        return <code className="block bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto" {...props}>{children}</code>
                      }
                      return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>{children}</code>
                    },
                    pre: ({ children }) => <pre className="bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto mb-3">{children}</pre>,
                    ul: ({ children }) => <ul className="list-disc list-inside text-muted-foreground mb-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside text-muted-foreground mb-3 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-muted pl-4 italic text-muted-foreground mb-3">{children}</blockquote>,
                    a: ({ href, children }) => (
                      <a
                        href="#"
                        className="text-primary hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          if (href && window.shellAPI) {
                            window.shellAPI.openExternal(href);
                          }
                        }}
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children }) => <table className="w-full border-collapse border border-border mb-3">{children}</table>,
                    thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                    tbody: ({ children }) => <tbody>{children}</tbody>,
                    tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
                    th: ({ children }) => <th className="border border-border px-3 py-2 text-left font-medium text-foreground">{children}</th>,
                    td: ({ children }) => <td className="border border-border px-3 py-2 text-muted-foreground">{children}</td>,
                    img: ({ src, alt }) => <img src={src} alt={alt} className="max-w-full h-auto rounded-md mb-3" />,
                    hr: () => <hr className="border-t border-border my-6" />,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                    del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
                  }}
                >
                  {mcp.readme}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Install Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Package Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {installedStatus === 'not_installed' && (
                <>
                  <Button
                    onClick={handleInstall}
                    disabled={installing}
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  >
                    {installing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Install {mcp.name}
                      </>
                    )}
                  </Button>
                </>
              )}
              {installedStatus === 'installed' && (
                <>
                  <Button
                    onClick={handleUninstall}
                    disabled={installing}
                    variant="destructive"
                    className="w-full"
                  >
                    {installing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uninstalling...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Uninstall {mcp.name}
                      </>
                    )}
                  </Button>
                </>
              )}
              {installedStatus === 'upgradeable' && (
                <>              
                  <Button
                    onClick={handleUpgrade}
                    disabled={installing}
                    variant="destructive"
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  >
                    {installing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Upgrading...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Upgrade {mcp.name}
                      </>
                    )}
                  </Button>
                </>
              )}

              <div className="text-center text-sm text-muted-foreground">
                Version {mcp.version || 'N/A'} • {(mcp.downloads || 0).toLocaleString()} downloads
              </div>
            </CardContent>
          </Card>

          {/* Package Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Package Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Author</span>
                  </div>
                  <span className="text-sm font-medium">{mcp.author || 'Unknown'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Version</span>
                  </div>
                  <Badge variant="outline">{mcp.version || 'N/A'}</Badge>
                </div>

                {mcp.rating && (<div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm">Rating</span>
                  </div>
                  <span className="text-sm font-medium">{(mcp.rating || 0).toFixed(1)}/5.0</span>
                </div>)}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Downloads</span>
                  </div>
                  <span className="text-sm font-medium">{(mcp.downloads || 0).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Updated</span>
                  </div>
                  <span className="text-sm font-medium">{mcp.updatedAt ? new Date(mcp.updatedAt).toLocaleDateString() : 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">License</span>
                  </div>
                  <Badge variant="secondary">{mcp.license || 'Unknown'}</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                {mcp.homepage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      if (window.shellAPI) {
                        window.shellAPI.openExternal(mcp.homepage!);
                      }
                    }}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Homepage
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                )}

                {mcp.repository && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      if (window.shellAPI) {
                        window.shellAPI.openExternal(mcp.repository!);
                      }
                    }}
                  >
                    <Github className="h-4 w-4 mr-2" />
                    Repository
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}