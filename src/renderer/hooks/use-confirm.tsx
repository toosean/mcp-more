import { useState, ReactNode } from 'react';
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

export interface ConfirmDialogConfig {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

interface ConfirmDialogState<T = any> {
  open: boolean;
  data?: T;
  config?: ConfirmDialogConfig;
  resolve?: (value: boolean) => void;
}

export type ConfirmHandler<T = any> = (data: T, config: ConfirmDialogConfig) => Promise<boolean>;

export function useConfirm<T = any>() {
  const [dialogState, setDialogState] = useState<ConfirmDialogState<T>>({
    open: false,
  });

  const confirm: ConfirmHandler<T> = (data: T, config: ConfirmDialogConfig) => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        data,
        config,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    if (dialogState.resolve) {
      dialogState.resolve(true);
    }
    setDialogState({ open: false });
  };

  const handleCancel = () => {
    if (dialogState.resolve) {
      dialogState.resolve(false);
    }
    setDialogState({ open: false });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    }
  };

  const ConfirmDialog = () => (
    <AlertDialog open={dialogState.open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogState.config?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialogState.config?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {dialogState.config?.cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              dialogState.config?.confirmVariant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {dialogState.config?.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    confirm,
    ConfirmDialog,
    dialogState: dialogState.data, // 暴露当前对话框的数据，供外部使用
  };
}