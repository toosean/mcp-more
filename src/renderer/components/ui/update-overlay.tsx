import React from 'react';
import { Button } from './button';
import { Progress } from './progress';
import { X, Download } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

interface UpdateOverlayProps {
  isVisible: boolean;
  progress: number;
  version?: string;
  onCancel: () => void;
}

export const UpdateOverlay: React.FC<UpdateOverlayProps> = ({
  isVisible,
  progress,
  version,
  onCancel
}) => {
  const { t } = useI18n();
  
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">{t('updateOverlay.downloading')}</h3>
          </div>
        </div>
        
        {version && (
          <p className="text-sm text-muted-foreground mb-4">
            {t('updateOverlay.downloadingVersion', { version })}
          </p>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>{t('updateOverlay.downloadProgress')}</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={onCancel}>
              {t('updateOverlay.cancelDownload')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};