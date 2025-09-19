import { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Folder, Globe, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/use-i18n';
import { Mcp } from '../../../config/types';
import { useMcpManager } from '../../services/mcpManager';

interface AddMCPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMcpAddedOrUpdated?: (mcpIdentifier: string) => void;
  editingMCP?: Mcp | null;
}

export default function AddMCPDialog({ open, onOpenChange, onMcpAddedOrUpdated, editingMCP }: AddMCPDialogProps) {
  const { t } = useI18n();
  const { installMcpManually } = useMcpManager();
  
  const isEditing = !!editingMCP;
  const isLocalMCP = editingMCP?.config?.command && editingMCP?.source !== 'json';
  const isRemoteMCP = editingMCP?.config?.url && editingMCP?.source !== 'json';
  const isJSONMCP = editingMCP?.source === 'json';

  // OAuth configuration state
  const [oauthConfig, setOauthConfig] = useState<Partial<Mcp['oauth']>>(
    editingMCP?.oauth || {}
  );

  // Memoized helper functions
  const mcpHelpers = useMemo(() => {
    const generateMCPId = (name: string): string => {
      return `TOOL/${name.toLowerCase().replace(/\s+/g, '_')}`;
    };

    const parseEnvironmentVariables = (envText: string): Record<string, string> => {
      const env: Record<string, string> = {};
      if (!envText.trim()) return env;
      
      const lines = envText.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && trimmedLine.includes('=')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          const value = valueParts.join('=');
          if (key.trim() && value.trim()) {
            env[key.trim()] = value.trim();
          }
        }
      }
      return env;
    };

    const serializeEnvironmentVariables = (env: Record<string, string> | null): string => {
      if (!env) return '';
      return Object.entries(env)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    };

    return { generateMCPId, parseEnvironmentVariables, serializeEnvironmentVariables };
  }, []);

  // Common form validation
  const validateForm = useCallback((formData: { name: string; [key: string]: any }): { isValid: boolean; error?: string } => {
    if (!formData.name?.trim()) {
      return { isValid: false, error: t('addMCP.errors.nameRequired') || 'Name is required' };
    }
    return { isValid: true };
  }, [t]);


  const handleLocalMCPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('local-name') as string;
    const command = formData.get('local-path') as string;
    const envText = formData.get('local-env') as string || '';

    // Validate form
    const validation = validateForm({ name, command });
    if (!validation.isValid) {
      toast({
        title: t('common.error'),
        description: validation.error,
        variant: 'destructive'
      });
      return;
    }

    if (!command?.trim()) {
      toast({
        title: t('common.error'),
        description: t('addMCP.errors.commandRequired') || 'Command is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await installMcpManually({
        name,
        command,
        env: mcpHelpers.parseEnvironmentVariables(envText),
        editingMCP
      });

      if (!result.success) {
        toast({
          title: t('common.error'),
          description: result.error || 'Failed to save MCP configuration',
          variant: 'destructive'
        });
        return;
      }
      
      toast({
        title: isEditing ? t('addMCP.toast.localUpdated') : t('addMCP.toast.localAdded'),
        description: isEditing ? t('addMCP.toast.localUpdatedDesc') : t('addMCP.toast.localAddedDesc'),
      });
      onMcpAddedOrUpdated?.(result.mcpId);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Failed to save MCP configuration',
        variant: 'destructive'
      });
    }
  };

  const handleRemoteMCPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('remote-name') as string;
    const url = formData.get('remote-url') as string;

    // Validate form
    const validation = validateForm({ name, url });
    if (!validation.isValid) {
      toast({
        title: t('common.error'),
        description: validation.error,
        variant: 'destructive'
      });
      return;
    }

    if (!url?.trim()) {
      toast({
        title: t('common.error'),
        description: t('addMCP.errors.urlRequired') || 'URL is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await installMcpManually({
        name,
        url,
        oauth: oauthConfig,
        editingMCP
      });

      if (!result.success) {
        toast({
          title: t('common.error'),
          description: result.error || 'Failed to save MCP configuration',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: isEditing ? t('addMCP.toast.remoteUpdated') : t('addMCP.toast.remoteAdded'),
        description: isEditing ? t('addMCP.toast.remoteUpdatedDesc') : t('addMCP.toast.remoteAddedDesc'),
      });
      onMcpAddedOrUpdated?.(result.mcpId);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Failed to save MCP configuration',
        variant: 'destructive'
      });
    }
  };


  const handleJSONImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const jsonText = formData.get('json-config') as string;

    if (!jsonText.trim()) {
      toast({
        title: t('common.error'),
        description: t('addMCP.errors.jsonRequired') || 'JSON configuration is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Parse JSON to get the name for validation
      const jsonConfig = JSON.parse(jsonText);
      let mcpName = '';
      
      if (jsonConfig.mcpServers) {
        const servers = Object.entries(jsonConfig.mcpServers);
        if (servers.length > 1) {
          toast({
            title: t('common.error'),
            description: t('addMCP.errors.singleMcpOnly') || 'Only one MCP can be imported at a time',
            variant: 'destructive'
          });
          return;
        }
        const [key, serverData] = servers[0] as [string, any];
        mcpName = serverData.name || key;
      } else if (jsonConfig.name) {
        mcpName = jsonConfig.name;
      } else {
        mcpName = Object.keys(jsonConfig)[0] || 'imported-mcp';
      }

      const result = await installMcpManually({
        name: mcpName,
        json: jsonText,
        editingMCP
      });

      if (!result.success) {
        toast({
          title: t('common.error'),
          description: result.error || 'Failed to import JSON configuration',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: t('addMCP.toast.jsonImported'),
        description: t('addMCP.toast.jsonImportedDesc'),
      });

      onMcpAddedOrUpdated?.(result.mcpId);
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof SyntaxError 
        ? t('addMCP.errors.invalidJson') || 'Invalid JSON format'
        : t('addMCP.errors.saveFailed') || 'Failed to save configuration';
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('editMCP.title') : t('addMCP.title')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('editMCP.description') : t('addMCP.description')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs 
          defaultValue={isEditing ? (isLocalMCP ? "local" : isRemoteMCP ? "remote" : "json") : "local"} 
          className="w-full"
        >
          {!isEditing ? (
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="local" className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                {t('addMCP.tabs.local')}
              </TabsTrigger>
              <TabsTrigger value="remote" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {t('addMCP.tabs.remote')}
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('addMCP.tabs.json')}
              </TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="grid w-full grid-cols-1">
              {isLocalMCP && (
                <TabsTrigger value="local" className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  {t('addMCP.tabs.local')}
                </TabsTrigger>
              )}
              {isRemoteMCP && (
                <TabsTrigger value="remote" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t('addMCP.tabs.remote')}
                </TabsTrigger>
              )}
              {isJSONMCP && (
                <TabsTrigger value="json" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('addMCP.tabs.json')}
                </TabsTrigger>
              )}
            </TabsList>
          )}
          
          <TabsContent value="local" className="space-y-4">
            <form onSubmit={handleLocalMCPSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="local-name">{t('addMCP.fields.name')}</Label>
                <Input
                  id="local-name"
                  name="local-name"
                  placeholder={t('addMCP.placeholders.name')}
                  defaultValue={isEditing && isLocalMCP ? editingMCP?.name || '' : ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="local-path">{t('addMCP.fields.command')}</Label>
                <Input
                  id="local-path"
                  name="local-path"
                  placeholder={t('addMCP.placeholders.command')}
                  defaultValue={isEditing && isLocalMCP ? editingMCP?.config?.command || '' : ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="local-env">{t('addMCP.fields.envVars')}</Label>
                <Textarea
                  id="local-env"
                  name="local-env"
                  placeholder={`KEY1=value1
KEY2=value2`}
                  defaultValue={isEditing && isLocalMCP ? mcpHelpers.serializeEnvironmentVariables(editingMCP?.config?.environment) : ''}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                {isEditing ? t('addMCP.buttons.updateLocal') : t('addMCP.buttons.addLocal')}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="remote" className="space-y-4">
            <form onSubmit={handleRemoteMCPSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="remote-name">{t('addMCP.fields.name')}</Label>
                <Input
                  id="remote-name"
                  name="remote-name"
                  placeholder={t('addMCP.placeholders.name')}
                  defaultValue={isEditing && isRemoteMCP ? editingMCP?.name || '' : ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote-url">{t('addMCP.fields.url')}</Label>
                <Input
                  id="remote-url"
                  name="remote-url"
                  placeholder={t('addMCP.placeholders.url')}
                  defaultValue={isEditing && isRemoteMCP ? editingMCP?.config?.url || '' : ''}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                {isEditing ? t('addMCP.buttons.updateRemote') : t('addMCP.buttons.addRemote')}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="json" className="space-y-4">
            <form onSubmit={handleJSONImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="json-config">{t('addMCP.fields.jsonConfig')}</Label>
                <Textarea
                  id="json-config"
                  name="json-config"
                  placeholder={`{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/mcp"
    }
  }
}`}
                  defaultValue={isEditing && isJSONMCP ? editingMCP?.config?.json || '' : ''}
                  rows={10}
                  className="font-mono text-sm"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                {isEditing ? t('addMCP.buttons.updateJson') : t('addMCP.buttons.importJson')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}