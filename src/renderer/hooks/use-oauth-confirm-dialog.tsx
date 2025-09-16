import { useI18n } from '@/hooks/use-i18n';
import { useConfirm } from '@/hooks/use-confirm';

export type OAuthConfirmHandler = (mcpName: string) => Promise<boolean>;

export function useOAuthConfirmDialog() {
  const { t } = useI18n();
  const { confirm, ConfirmDialog } = useConfirm<string>();

  const handleOAuthConfirm: OAuthConfirmHandler = (mcpName: string) => {
    return confirm(mcpName, {
      title: t('mcpManager.dialogs.oauthConfirmTitle'),
      description: t('mcpManager.dialogs.oauthConfirmRequired', { name: mcpName }),
      confirmText: t('mcpManager.dialogs.startOAuth'),
      cancelText: t('mcpManager.dialogs.notNow'),
    });
  };

  return {
    handleOAuthConfirm,
    OAuthConfirmDialog: ConfirmDialog,
  };
}