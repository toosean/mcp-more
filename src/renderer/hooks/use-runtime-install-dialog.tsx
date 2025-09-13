import { useState } from 'react';
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
import { useI18n } from '@/hooks/use-i18n';
import { RuntimeInstallHandler } from '@/services/mcpManager';

interface RuntimeDialogState {
  open: boolean;
  runtimeName: string;
  resolve?: (value: boolean) => void;
}

export function useRuntimeInstallDialog() {
  const { t } = useI18n();
  const [runtimeDialog, setRuntimeDialog] = useState<RuntimeDialogState>({
    open: false,
    runtimeName: ''
  });

  const handleRuntimeInstall: RuntimeInstallHandler = (runtimeName: string) => {
    return new Promise((resolve) => {
      setRuntimeDialog({
        open: true,
        runtimeName,
        resolve
      });
    });
  };

  const handleRuntimeInstallConfirm = () => {
    if (runtimeDialog.resolve) {
      runtimeDialog.resolve(true);
    }
    setRuntimeDialog({ open: false, runtimeName: '' });
  };

  const handleRuntimeInstallCancel = () => {
    if (runtimeDialog.resolve) {
      runtimeDialog.resolve(false);
    }
    setRuntimeDialog({ open: false, runtimeName: '' });
  };

  const RuntimeInstallDialog = () => (
    <AlertDialog
      open={runtimeDialog.open}
      onOpenChange={(open) => !open && handleRuntimeInstallCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('mcpManager.dialogs.runtimeInstallTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('mcpManager.dialogs.runtimeInstallRequired', { name: runtimeDialog.runtimeName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleRuntimeInstallCancel}>
            {t('mcpManager.dialogs.skipRuntime')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleRuntimeInstallConfirm}>
            {t('mcpManager.dialogs.installRuntime')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    handleRuntimeInstall,
    RuntimeInstallDialog
  };
}