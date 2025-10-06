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

interface SetupLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  logs: string[];
  isSetupInProgress: boolean;
  currentLanguage: string;
}

export default function SetupLogsDialog({
  open,
  onOpenChange,
  appName,
  logs,
  isSetupInProgress,
  currentLanguage
}: SetupLogsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {currentLanguage === 'zh-CN' ? '配置日志' : 'Setup Logs'} - {appName}
          </DialogTitle>
          <DialogDescription>
            {currentLanguage === 'zh-CN'
              ? '以下是配置过程的详细日志信息'
              : 'Detailed logs of the setup process'}
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
                    {currentLanguage === 'zh-CN' ? '正在配置...' : 'Setting up...'}
                  </>
                ) : (
                  currentLanguage === 'zh-CN' ? '暂无日志' : 'No logs available'
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            {currentLanguage === 'zh-CN' ? '关闭' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
