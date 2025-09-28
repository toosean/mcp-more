import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Square, Edit, Settings, Folder, Globe, Loader2, AlertTriangle, Package } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { DisplayMCP } from '@/types/mcp';
import MCPActionsDropdown from './MCPActionsDropdown';
import AvatarImage from '@/components/ui/AvatarImage';

interface InstalledMCPCardProps {
  mcp: DisplayMCP;
  isLoading: boolean;
  hasInputs: boolean;
  currentLanguage: string;
  onToggleStatus: (id: string) => void;
  onEdit: (id: string) => void;
  onConfigure: (mcp: DisplayMCP) => void;
  onDelete: (id: string) => void;
  onDetail: (id: string) => void;
  onInspect: (mcp: DisplayMCP) => void;
  mcpsWithInputs: Set<string>;
}

export default function InstalledMCPCard({
  mcp,
  isLoading,
  hasInputs,
  currentLanguage,
  onToggleStatus,
  onEdit,
  onConfigure,
  onDelete,
  onDetail,
  onInspect,
  mcpsWithInputs,
}: InstalledMCPCardProps) {
  const { t } = useI18n();

  // Get source type display info
  const getSourceInfo = (source: 'manual' | 'json' | 'market' | null) => {
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

    return {
      icon: Package,
      label: t('installed.source.manual'),
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/20'
    };
  };

  // Format date string for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      const isZhCN = currentLanguage === 'zh-CN';

      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
          const minutes = Math.floor(diff / (1000 * 60));
          if (minutes <= 0) return t('installed.time.justNow');
          return t('installed.time.minutesAgo', { minutes });
        }
        return t('installed.time.hoursAgo', { hours });
      }

      if (days < 7) {
        return t('installed.time.daysAgo', { days });
      }

      return date.toLocaleDateString(currentLanguage, {
        year: 'numeric',
        month: isZhCN ? 'numeric' : 'short',
        day: 'numeric'
      });
    } catch (error) {
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

  const sourceInfo = getSourceInfo(mcp.source);
  const SourceIcon = sourceInfo.icon;

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* 头像区域 */}
          <div className="flex-shrink-0">
            <AvatarImage
              avatarPath={mcp.authorAvatarPath}
              alt={`${mcp.author || 'Unknown'} avatar`}
              className="w-12 h-12 rounded-full object-cover bg-muted"
            />
          </div>

          {/* 主要内容区域 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{mcp.name}</h3>
                  <Badge
                    variant={
                      mcp.status === 'running' ? 'default' :
                      mcp.status === 'starting' || mcp.status === 'stopping' ? 'secondary' :
                      'outline'
                    }
                    className={
                      mcp.status === 'starting' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      mcp.status === 'stopping' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      ''
                    }
                  >
                    {t(`installed.status.${mcp.status}`)}
                  </Badge>
                  {mcp.version && (
                    <Badge variant="outline" className="text-xs">
                      v{mcp.version}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-xs flex items-center gap-1 ${sourceInfo.color} ${sourceInfo.bgColor} ${sourceInfo.borderColor}`}
                  >
                    <SourceIcon className="h-3 w-3" />
                    {sourceInfo.label}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {mcp.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {mcp.author && (
                    <span>{t('installed.time.by')} {mcp.author}</span>
                  )}
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
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  variant={mcp.status === 'running' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => onToggleStatus(mcp.identifier)}
                  disabled={isLoading || mcp.status === 'starting' || mcp.status === 'stopping'}
                  className={mcp.status === 'running'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  }
                >
                  {isLoading || mcp.status === 'starting' || mcp.status === 'stopping' ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      {mcp.status === 'starting' ? t('installed.status.startingAction') :
                       mcp.status === 'stopping' ? t('installed.status.stoppingAction') :
                       mcp.status === 'running' ? t('installed.status.stoppingAction') : t('installed.status.startingAction')}
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

                {(mcp.source === 'manual' || mcp.source === 'json') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(mcp.identifier)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {t('installed.buttons.edit')}
                  </Button>
                )}

                {(mcpsWithInputs?.has(mcp.identifier)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onConfigure(mcp)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    {t('installed.buttons.config')}
                  </Button>
                )}

                <MCPActionsDropdown
                  mcp={mcp}
                  onDetail={onDetail}
                  onInspect={onInspect}
                  onDelete={onDelete}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Runtime warning for running MCPs with missing runtimes */}
        {mcp.status === 'running' && mcp.missingRuntimes && mcp.missingRuntimes.length > 0 && (
          <div className="flex items-center gap-2 p-1 mt-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <span className="font-medium">{t('installed.runtime.warning')}</span>{' '}
              <span>{t('installed.runtime.missingRuntimes', { runtimes: mcp.missingRuntimes.join(', ') })}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}