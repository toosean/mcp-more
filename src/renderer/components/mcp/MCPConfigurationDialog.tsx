import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DynamicForm, { FormFieldConfig, DynamicFormRef } from '@/components/DynamicForm';
import { useI18n } from '@/hooks/use-i18n';

interface MCPConfigurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mcpName: string;
  inputs: FormFieldConfig[];
  onSubmit: (values: Record<string, string>) => void;
  onSkip?: () => void; // Optional for installation flow
  mode: 'install' | 'configure'; // Different modes for different contexts
}

export default function MCPConfigurationDialog({
  isOpen,
  onClose,
  mcpName,
  inputs,
  onSubmit,
  onSkip,
  mode
}: MCPConfigurationDialogProps) {
  const { t } = useI18n();
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

      onSubmit(stringValues);
    } catch (error) {
      console.error('Failed to submit MCP configuration:', error);
    } finally {
      setIsSubmitting(false);
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
              ? (t('mcpConfiguration.install.title', { mcpName }) || `Configure ${mcpName}`)
              : (t('mcpConfiguration.configure.title', { mcpName }) || `Configure ${mcpName}`)
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