import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/hooks/use-i18n';

interface SetupLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  logs: string[];
  isSetupInProgress: boolean;
}

export default function SetupLogsDialog({
  open,
  onOpenChange,
  appName,
  logs,
  isSetupInProgress
}: SetupLogsDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t('quickSetup.setupLogsTitle')} - {appName}
          </DialogTitle>
          <DialogDescription>
            {t('quickSetup.setupLogsDescription')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 w-full rounded-md border p-4">
          <div className="space-y-2 font-mono text-sm">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="text-foreground whitespace-pre-wrap">
                  {log}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {isSetupInProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('quickSetup.settingUpProgress')}
                  </>
                ) : (
                  t('quickSetup.noLogs')
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
