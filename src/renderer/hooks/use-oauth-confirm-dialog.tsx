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

export type OAuthConfirmHandler = (mcpName: string) => Promise<boolean>;

interface OAuthDialogState {
  open: boolean;
  mcpName: string;
  resolve?: (value: boolean) => void;
}

export function useOAuthConfirmDialog() {
  const { t } = useI18n();
  const [oauthDialog, setOAuthDialog] = useState<OAuthDialogState>({
    open: false,
    mcpName: ''
  });

  const handleOAuthConfirm: OAuthConfirmHandler = (mcpName: string) => {
    return new Promise((resolve) => {
      setOAuthDialog({
        open: true,
        mcpName,
        resolve
      });
    });
  };

  const handleOAuthConfirmAccept = () => {
    if (oauthDialog.resolve) {
      oauthDialog.resolve(true);
    }
    setOAuthDialog({ open: false, mcpName: '' });
  };

  const handleOAuthConfirmCancel = () => {
    if (oauthDialog.resolve) {
      oauthDialog.resolve(false);
    }
    setOAuthDialog({ open: false, mcpName: '' });
  };

  const OAuthConfirmDialog = () => (
    <AlertDialog
      open={oauthDialog.open}
      onOpenChange={(open) => !open && handleOAuthConfirmCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('mcpManager.dialogs.oauthConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('mcpManager.dialogs.oauthConfirmRequired', { name: oauthDialog.mcpName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleOAuthConfirmCancel}>
            {t('mcpManager.dialogs.notNow')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleOAuthConfirmAccept}>
            {t('mcpManager.dialogs.startOAuth')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    handleOAuthConfirm,
    OAuthConfirmDialog
  };
}