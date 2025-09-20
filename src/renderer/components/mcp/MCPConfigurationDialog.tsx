import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DynamicForm, { FormFieldConfig, DynamicFormRef } from '@/components/DynamicForm';
import { useI18n } from '@/hooks/use-i18n';
import { useConfig } from '@/hooks/use-config';
import { toast } from '@/hooks/use-toast';
import { DisplayMCP } from '@/types/mcp';

interface MCPConfigurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mcp: DisplayMCP;
  inputs: FormFieldConfig[];
  onSubmit?: (values: Record<string, string>) => void; // Optional for install mode
  onSkip?: () => void; // Optional for installation flow
  onSuccess?: (needsRestart: boolean) => void; // Called after successful config save
  onReloadMcps?: () => Promise<void>; // Function to reload MCPs list
  mode: 'install' | 'configure'; // Different modes for different contexts
}

export default function MCPConfigurationDialog({
  isOpen,
  onClose,
  mcp,
  inputs,
  onSubmit,
  onSkip,
  onSuccess,
  onReloadMcps,
  mode
}: MCPConfigurationDialogProps) {
  const { t } = useI18n();
  const { updateConfig, getConfig } = useConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<DynamicFormRef>(null);

  const handleFormSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // Convert all values to strings as expected by the inputHandler
      const stringValues = Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key] || '');
        return acc;
      }, {} as Record<string, string>);

      if (mode === 'install' && onSubmit) {
        // For install mode, use the original onSubmit callback
        onSubmit(stringValues);
      } else if (mode === 'configure') {
        // For configure mode, handle the config submission internally
        await handleConfigureSubmit(stringValues);
      }
    } catch (error) {
      console.error('Failed to submit MCP configuration:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfigureSubmit = async (values: Record<string, string>) => {
    try {
      const currentConfig = await getConfig();
      const updatedMcps = currentConfig.mcp.installedMcps.map(mcpItem => {
        if (mcpItem.identifier === mcp.identifier) {
          return {
            ...mcpItem,
            inputValues: values
          };
        }
        return mcpItem;
      });

      await updateConfig({
        mcp: {
          ...currentConfig.mcp,
          installedMcps: updatedMcps
        }
      });

      // Close dialog and reload MCPs
      onClose();
      if (onReloadMcps) {
        await onReloadMcps();
      }

      // Check if restart is needed and notify parent
      const needsRestart = mcp.status === 'running';
      if (onSuccess) {
        onSuccess(needsRestart);
      }

    } catch (error) {
      console.error('Failed to save MCP configuration:', error);
      toast({
        title: t('common.error') || 'Error',
        description: t('installed.config.saveFailed') || 'Failed to save configuration',
        variant: 'destructive'
      });
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleSubmitClick = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'install'
              ? (t('mcpConfiguration.install.title', { mcpName: mcp.name }) || `Configure ${mcp.name}`)
              : (t('mcpConfiguration.configure.title', { mcpName: mcp.name }) || `Configure ${mcp.name}`)
            }
          </DialogTitle>
          <DialogDescription>
            {mode === 'install'
              ? (t('mcpConfiguration.install.description') || 'Please configure the following settings before installation.')
              : (t('mcpConfiguration.configure.description') || 'Update the configuration settings for this MCP.')
            }
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <DynamicForm
            ref={formRef}
            config={inputs}
            onSubmit={handleFormSubmit}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          {mode === 'install' && onSkip && (
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              {t('mcpConfiguration.install.notNow') || 'Not Now'}
            </Button>
          )}
          {mode === 'configure' && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
          )}
          <Button
            onClick={handleSubmitClick}
            disabled={isSubmitting}
          >
            {isSubmitting ? (t('common.submitting') || 'Submitting...') : (t('common.submit') || 'Submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}