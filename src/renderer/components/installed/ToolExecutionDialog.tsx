import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/hooks/use-i18n';
import DynamicForm, { DynamicFormRef, FormFieldConfig } from '@/components/DynamicForm';
import JsonView from 'react18-json-view';
import 'react18-json-view/src/style.css';
import { Play, Loader2, CheckCircle, XCircle, Copy, Check } from 'lucide-react';

interface ToolExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: any | null;
  mcpIdentifier: string | null;
}

export default function ToolExecutionDialog({
  open,
  onOpenChange,
  tool,
  mcpIdentifier,
}: ToolExecutionDialogProps) {
  const { t } = useI18n();
  const formRef = useRef<DynamicFormRef>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setExecutionResult(null);
      setExecutionError(null);
      setHasExecuted(false);
      setIsExecuting(false);
      setCopySuccess(false);
    }
    onOpenChange(newOpen);
  };

  // Convert tool schema to form config
  const generateFormConfig = (tool: any): FormFieldConfig[] => {
    if (!tool?.inputSchema?.properties) return [];

    const properties = tool.inputSchema.properties;
    const required = tool.inputSchema.required || [];

    return Object.entries(properties).map(([key, prop]: [string, any]) => {
      const config: FormFieldConfig = {
        id: key,
        type: 'string', // default type is string
        title: prop.title || key,
        description: prop.description || `Parameter: ${key}`,
        required: required.includes(key),
        defaultValue: prop.default || '',
      };

      // Determine field type based on schema
      if (prop.enum && Array.isArray(prop.enum)) {
        config.type = 'select';
        config.options = prop.enum.map((value: any) => ({
          label: String(value),
          value: String(value),
        }));
      } else if (prop.type === 'boolean') {
        config.type = 'checkbox';
        config.checkedValue = 'true';
        config.defaultValue = prop.default ? 'true' : '';
      } else if (prop.format === 'password' || key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
        config.type = 'password';
      } else {
        config.type = 'string';
      }

      return config;
    });
  };

  // Execute tool with parameters
  const handleExecuteTool = async (formData: Record<string, any>) => {
    if (!tool || !mcpIdentifier) return;

    try {
      setIsExecuting(true);
      setExecutionError(null);
      setExecutionResult(null);

      // Convert form data to proper types based on schema
      const processedData = { ...formData };
      if (tool.inputSchema?.properties) {
        Object.entries(tool.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
          if (processedData[key] !== undefined && processedData[key] !== '') {
            if (prop.type === 'number' || prop.type === 'integer') {
              processedData[key] = Number(processedData[key]);
            } else if (prop.type === 'boolean') {
              processedData[key] = processedData[key] === 'true';
            }
          } else if (processedData[key] === '') {
            delete processedData[key];
          }
        });
      }

      // Call MCP tool execution API
      const result = await window.mcpAPI.callTool(mcpIdentifier, tool.name, processedData);

      setExecutionResult(result);
      setHasExecuted(true);
    } catch (error) {
      console.error('Tool execution failed:', error);
      setExecutionError(error instanceof Error ? error.message : 'Tool execution failed');
      setHasExecuted(true);
    } finally {
      setIsExecuting(false);
    }
  };

  // Copy execution result to clipboard
  const handleCopyResult = async () => {
    if (!executionResult) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(executionResult, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formConfig = tool ? generateFormConfig(tool) : [];
  const hasParameters = formConfig.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            {t('installed.toolExecution.title') || 'Execute Tool'}: {tool?.name}
          </DialogTitle>
          <DialogDescription>
            {tool?.description || (t('installed.toolExecution.description') || 'Configure parameters and execute this tool.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tool Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {t('installed.inspect.toolBadge') || 'Tool'}
              </Badge>
              <code className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                {tool?.name}
              </code>
            </div>
          </div>

          <Separator />

          {/* Parameters Form */}
          {hasParameters ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {t('installed.toolExecution.parameters') || 'Parameters'}
              </h3>
              <DynamicForm
                ref={formRef}
                config={formConfig}
                onSubmit={handleExecuteTool}
              />
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>{t('installed.inspect.noParameters') || 'No parameters required'}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.close') || 'Close'}
            </Button>

            <Button
              onClick={() => {
                if (hasParameters) {
                  formRef.current?.submit();
                } else {
                  handleExecuteTool({});
                }
              }}
              disabled={isExecuting}
              className="min-w-[100px]"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  {t('installed.toolExecution.executing') || 'Executing...'}
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-2" />
                  {t('installed.toolExecution.execute') || 'Execute'}
                </>
              )}
            </Button>
          </div>

          {/* Execution Results */}
          {hasExecuted && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">
                      {t('installed.toolExecution.results') || 'Execution Results'}
                    </h3>
                    {executionError ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>

                  {/* Copy Button - only show for successful results */}
                  {!executionError && executionResult && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyResult}
                      disabled={copySuccess}
                      className="gap-2"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="h-3 w-3" />
                          {t('installed.toolExecution.copied') || 'Copied!'}
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          {t('installed.toolExecution.copy') || 'Copy'}
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {executionError ? (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      {t('common.error') || 'Error'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {executionError}
                    </p>
                  </div>
                ) : executionResult ? (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <JsonView
                      src={executionResult}
                      theme="default"
                      enableClipboard={true}
                      style={{
                        fontSize: '13px',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}