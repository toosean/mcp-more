import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/hooks/use-i18n';
import { useConfig } from '@/hooks/use-config';
import { Search, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ToolExecutionDialog from './ToolExecutionDialog';

interface InspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mcpIdentifier: string | null;
}

export default function InspectDialog({
  open,
  onOpenChange,
  mcpIdentifier,
}: InspectDialogProps) {
  const { t } = useI18n();
  const { getConfig } = useConfig();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mcpName, setMcpName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any | null>(null);

  // Load MCP tools when dialog opens
  useEffect(() => {
    if (open && mcpIdentifier) {
      handleLoadTools();
    } else {
      setTools([]);
      setMcpName('');
      setError(null);
      setSearchQuery('');
      setExecutionDialogOpen(false);
      setSelectedTool(null);
    }
  }, [open, mcpIdentifier]);

  const handleLoadTools = async () => {
    if (!mcpIdentifier) return;

    try {
      setLoading(true);
      setTools([]);
      setError(null);

      // Get MCP name from config
      const config = await getConfig();
      const mcp = config?.mcp?.installedMcps?.find(m => m.identifier === mcpIdentifier);
      setMcpName(mcp?.name || mcpIdentifier);

      // Get MCP tools from the API
      const response = await window.mcpAPI.getMcpTools(mcpIdentifier);

      if (response.success) {
        setTools(response.tools || []);
        setError(null);
      } else {
        // Handle different error scenarios
        let errorMessage = response.error || 'Failed to load MCP tools information';

        if (response.status && response.status !== 'running') {
          if (response.status === 'stopped') {
            errorMessage = t('installed.inspect.mcpNotRunning') || 'MCP is not running. Please start the MCP first to view its tools.';
          } else if (response.status === 'starting') {
            errorMessage = t('installed.inspect.mcpStarting') || 'MCP is starting up. Please wait a moment and try again.';
          } else if (response.status === 'stopping') {
            errorMessage = t('installed.inspect.mcpStopping') || 'MCP is stopping. Please wait a moment and try again.';
          } else if (response.status === 'not_found') {
            errorMessage = t('installed.inspect.mcpNotFound') || 'MCP configuration not found.';
          }
        }

        setError(errorMessage);
        setTools([]);
      }

    } catch (error) {
      console.error('Failed to get MCP tools:', error);
      setError(t('installed.inspect.loadFailed') || 'Failed to load MCP tools information');
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter tools based on search query
  const filteredTools = tools.filter(tool => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      tool.name.toLowerCase().includes(query) ||
      (tool.description && tool.description.toLowerCase().includes(query))
    );
  });

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleExecuteTool = (tool: any) => {
    setSelectedTool(tool);
    setExecutionDialogOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {t('installed.inspect.title') || 'Inspect MCP Tools'} - {mcpName}
          </DialogTitle>
          <DialogDescription>
            {t('installed.inspect.description') || 'View available tools, their descriptions, and required parameters for this MCP.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                {t('installed.inspect.loading') || 'Loading MCP tools...'}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-destructive">
                    {t('common.error') || 'Error'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="space-y-2">
                <p>{t('installed.inspect.noTools') || 'No tools available for this MCP'}</p>
                <p className="text-sm">
                  {t('installed.inspect.noToolsHint') || 'This MCP may not provide any tools, or it might need to be restarted.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {t('installed.inspect.toolsList') || 'Available Tools'}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {filteredTools.length} / {tools.length} {tools.length === 1 ?
                    (t('installed.inspect.tool') || 'tool') :
                    (t('installed.inspect.tools') || 'tools')
                  }
                </Badge>
              </div>

              {/* Search Box */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('installed.inspect.searchPlaceholder') || 'Search tools by name or description...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Tools List */}
              {filteredTools.length === 0 && searchQuery ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="space-y-2">
                    <p>{t('installed.inspect.noSearchResults') || 'No tools found matching your search.'}</p>
                    <p className="text-sm">
                      {t('installed.inspect.noSearchResultsHint') || 'Try adjusting your search terms or clear the search to view all tools.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTools.map((tool, index) => (
                  <div
                    key={index}
                    className="group border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                              {tool.name}
                            </code>
                            <Badge variant="outline" className="text-xs">
                              {t('installed.inspect.toolBadge') || 'Tool'}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExecuteTool(tool)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            {t('installed.toolExecution.execute') || 'Execute'}
                          </Button>
                        </div>

                        {tool.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {tool.description}
                          </p>
                        )}

                        {/* Parameters summary */}
                        {tool.inputSchema && tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0 ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{t('installed.inspect.parameters') || 'Parameters'}:</span>
                            <span>
                              {Object.keys(tool.inputSchema.properties).length} {Object.keys(tool.inputSchema.properties).length === 1 ?
                                (t('installed.inspect.parameter') || 'parameter') :
                                (t('installed.inspect.parameters') || 'parameters')
                              }
                            </span>
                            {tool.inputSchema.required && tool.inputSchema.required.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-destructive">
                                  {tool.inputSchema.required.length} {t('installed.inspect.required') || 'required'}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            {t('installed.inspect.noParameters') || 'No parameters required'}
                          </p>
                        )}

                        {/* Detailed parameters - expandable section */}
                        {tool.inputSchema && tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0 && (
                          <details className="group/details mt-2">
                            <summary className="cursor-pointer text-xs text-primary hover:text-primary/80 select-none">
                              {t('installed.inspect.viewParameters') || 'View parameter details'}
                            </summary>
                            <div className="mt-2 pl-3 border-l-2 border-muted space-y-2">
                              {Object.entries(tool.inputSchema.properties).map(([paramName, paramInfo]: [string, any]) => (
                                <div key={paramName} className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <code className="text-xs font-mono bg-muted px-1 rounded">
                                      {paramName}
                                    </code>
                                    <Badge variant="secondary" className="text-xs">
                                      {paramInfo.type || 'any'}
                                    </Badge>
                                    {tool.inputSchema.required && tool.inputSchema.required.includes(paramName) && (
                                      <Badge variant="destructive" className="text-xs">
                                        {t('installed.inspect.required') || 'Required'}
                                      </Badge>
                                    )}
                                  </div>

                                  {paramInfo.description && (
                                    <p className="text-xs text-muted-foreground pl-2">
                                      {paramInfo.description}
                                    </p>
                                  )}

                                  {paramInfo.enum && (
                                    <div className="text-xs text-muted-foreground pl-2">
                                      <span className="font-medium">
                                        {t('installed.inspect.allowedValues') || 'Allowed values:'}
                                      </span>
                                      <span className="ml-1 font-mono">
                                        {paramInfo.enum.map((value: any) => `"${value}"`).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {t('common.close') || 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Tool Execution Dialog */}
      <ToolExecutionDialog
        open={executionDialogOpen}
        onOpenChange={setExecutionDialogOpen}
        tool={selectedTool}
        mcpIdentifier={mcpIdentifier}
      />
    </Dialog>
  );
}