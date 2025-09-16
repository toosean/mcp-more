import { useI18n } from '@/hooks/use-i18n';
import { useConfirm } from '@/hooks/use-confirm';
import { RuntimeInstallHandler } from '@/services/mcpManager';

export function useRuntimeInstallDialog() {
  const { t } = useI18n();
  const { confirm, ConfirmDialog } = useConfirm<string>();

  const handleRuntimeInstall: RuntimeInstallHandler = (runtimeName: string) => {
    return confirm(runtimeName, {
      title: t('mcpManager.dialogs.runtimeInstallTitle'),
      description: t('mcpManager.dialogs.runtimeInstallRequired', { name: runtimeName }),
      confirmText: t('mcpManager.dialogs.installRuntime'),
      cancelText: t('mcpManager.dialogs.skipRuntime'),
    });
  };

  return {
    handleRuntimeInstall,
    RuntimeInstallDialog: ConfirmDialog,
  };
}