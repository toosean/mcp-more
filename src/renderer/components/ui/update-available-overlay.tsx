import React from 'react';
import { Button } from './button';
import { ScrollArea } from './scroll-area';
import { Download, Calendar, FileText, X } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

interface UpdateAvailableOverlayProps {
  isVisible: boolean;
  updateInfo?: {
    version: string;
    releaseDate?: string;
    releaseNotes?: string;
  };
  onDownload: () => void;
  onLater: () => void;
}

export const UpdateAvailableOverlay: React.FC<UpdateAvailableOverlayProps> = ({
  isVisible,
  updateInfo,
  onDownload,
  onLater
}) => {
  const { t } = useI18n();
  
  if (!isVisible || !updateInfo) return null;

  const formatReleaseNotes = (notes?: string) => {
    if (!notes) return t('updateAvailable.noReleaseNotes');
    
    // 将换行符转换为JSX元素
    return notes.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < notes.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-lg border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('updateAvailable.newVersionFound')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('updateAvailable.versionAvailable', { version: updateInfo.version })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLater}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2">
          {updateInfo.releaseDate && (
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{t('updateAvailable.releaseDate', { date: formatDate(updateInfo.releaseDate) })}</span>
            </div>
          )}

          {/* Release Notes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">{t('updateAvailable.updateContent')}</h4>
            </div>
            
            <ScrollArea className="h-48 rounded-md border p-4">
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {formatReleaseNotes(updateInfo.releaseNotes)}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t">
          <Button variant="outline" onClick={onLater}>
            {t('updateAvailable.remindLater')}
          </Button>
          <Button onClick={onDownload} className="bg-gradient-primary hover:opacity-90">
            <Download className="h-4 w-4 mr-2" />
            {t('updateAvailable.downloadAndInstall')}
          </Button>
        </div>
      </div>
    </div>
  );
};