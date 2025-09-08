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
import { useConfig } from '@/hooks/use-config';
import { Mcp } from '../../../config/types';

interface AddMCPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMcpAddedOrUpdated?: (mcpIdentifier: string) => void;
  editingMCP?: Mcp | null;
}

export default function AddMCPDialog({ open, onOpenChange, onMcpAddedOrUpdated, editingMCP }: AddMCPDialogProps) {
  const { t } = useI18n();
  const { updateConfig, getConfig } = useConfig();
  
  const isEditing = !!editingMCP;
  const isLocalMCP = editingMCP?.config?.command && editingMCP?.source !== 'json';
  const isRemoteMCP = editingMCP?.config?.url && editingMCP?.source !== 'json';
  const isJSONMCP = editingMCP?.source === 'json';

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

  // Validation helper
  const validateMCPIdentifier = useCallback(async (name: string, mcpId?: string): Promise<{ isValid: boolean; error?: string }> => {
    try {
      const config = await getConfig();
      const existingMcps = config?.mcp?.installedMcps || [];
      
      const generatedId = mcpId || mcpHelpers.generateMCPId(name);
      
      // Skip validation if editing the same MCP
      if (isEditing && editingMCP?.identifier === generatedId) {
        return { isValid: true };
      }
      
      const duplicateExists = existingMcps.some(mcp => 
        mcp.identifier === generatedId || 
        (mcp.name.toLowerCase() === name.toLowerCase())
      );
      
      if (duplicateExists) {
        return { 
          isValid: false, 
          error: t('addMCP.errors.duplicateIdentifier', { name })
        };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Failed to validate MCP identifier' };
    }
  }, [getConfig, mcpHelpers.generateMCPId, isEditing, editingMCP, t]);

  // Common form validation
  const validateForm = useCallback(async (formData: { name: string; [key: string]: any }): Promise<{ isValid: boolean; error?: string }> => {
    if (!formData.name?.trim()) {
      return { isValid: false, error: t('addMCP.errors.nameRequired') || 'Name is required' };
    }
    
    return await validateMCPIdentifier(formData.name);
  }, [validateMCPIdentifier, t]);


  const handleLocalMCPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('local-name') as string;
    const command = formData.get('local-path') as string;
    const envText = formData.get('local-env') as string || '';

    // Validate form
    const validation = await validateForm({ name, command });
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
      const mcpId = editingMCP?.identifier || mcpHelpers.generateMCPId(name);
      const updatedMCP: Mcp = isEditing && editingMCP ? {
        ...editingMCP,
        name,
        updated: new Date().toISOString(),
        config: {
          ...editingMCP.config,
          command,
          environment: mcpHelpers.parseEnvironmentVariables(envText),
        }
      } : {
        source: 'manual',
        identifier: mcpId,
        name,
        description: null,
        author: null,
        category: null,
        version: null,
        updated: null,
        license: null,
        homepage: null,
        repository: null,
        installed: new Date().toISOString(),
        enabled: true,
        config: {
          url: null,
          command,
          environment: mcpHelpers.parseEnvironmentVariables(envText),
          json: null
        }
      };

      await updateMCPConfig(updatedMCP, mcpId);
      
      toast({
        title: isEditing ? t('addMCP.toast.localUpdated') : t('addMCP.toast.localAdded'),
        description: isEditing ? t('addMCP.toast.localUpdatedDesc') : t('addMCP.toast.localAddedDesc'),
      });
      onMcpAddedOrUpdated?.(name);
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
    const validation = await validateForm({ name, url });
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
      const mcpId = editingMCP?.identifier || mcpHelpers.generateMCPId(name);
      const updatedMCP: Mcp = isEditing && editingMCP ? {
        ...editingMCP,
        name,
        homepage: url,
        repository: url,
        updated: new Date().toISOString(),
        config: {
          ...editingMCP.config,
          url,
        }
      } : {
        source: 'manual',
        identifier: mcpId,
        name,
        description: null,
        author: null,
        category: null,
        version: null,
        updated: null,
        license: null,
        homepage: url,
        repository: url,
        installed: new Date().toISOString(),
        enabled: true,
        config: {
          url,
          command: null,
          environment: null,
          json: null
        }
      };

      await updateMCPConfig(updatedMCP, mcpId);

      toast({
        title: isEditing ? t('addMCP.toast.remoteUpdated') : t('addMCP.toast.remoteAdded'),
        description: isEditing ? t('addMCP.toast.remoteUpdatedDesc') : t('addMCP.toast.remoteAddedDesc'),
      });
      onMcpAddedOrUpdated?.(mcpId);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Failed to save MCP configuration',
        variant: 'destructive'
      });
    }
  };

  // Common MCP config update helper
  const updateMCPConfig = useCallback(async (updatedMCP: Mcp, mcpId: string) => {
    const config = await getConfig();
    let updatedMcps: Mcp[];

    if (isEditing && editingMCP) {
      updatedMcps = config?.mcp?.installedMcps?.map(mcp => 
        mcp.identifier === mcpId ? updatedMCP : mcp
      ) || [updatedMCP];
    } else {
      updatedMcps = [...(config?.mcp?.installedMcps || []), updatedMCP];
    }

    await updateConfig({
      mcp: {
        ...config?.mcp,
        installedMcps: updatedMcps
      }
    });
  }, [getConfig, updateConfig, isEditing, editingMCP]);

  // Helper function to merge command and args
  const mergeCommandAndArgs = (command: string | null, args: string[] | null): string | null => {
    if (!command) return null;
    if (args && Array.isArray(args) && args.length > 0) {
      return `${command} ${args.join(' ')}`;
    }
    return command;
  };

  // Helper function to create MCP package from JSON data
  const createMCPFromJsonData = (
    mcpData: any, 
    key: string, 
    jsonToSave: string, 
    isUpdate: boolean = false, 
    existingMCP?: Mcp
  ): Mcp => {
    const mcpId = existingMCP?.identifier || mcpHelpers.generateMCPId(mcpData.name || key);
    const finalCommand = mergeCommandAndArgs(mcpData.command, mcpData.args);
    
    if (isUpdate && existingMCP) {
      return {
        ...existingMCP,
        name: mcpData.name || existingMCP.name,
        description: mcpData.description || existingMCP.description,
        author: mcpData.author || existingMCP.author,
        category: mcpData.category || existingMCP.category,
        version: mcpData.version || existingMCP.version,
        license: mcpData.license || existingMCP.license,
        homepage: mcpData.homepage || mcpData.url || existingMCP.homepage,
        repository: mcpData.repository || mcpData.url || existingMCP.repository,
        updated: new Date().toISOString(),
        enabled: mcpData.enabled !== false,
        config: {
          url: mcpData.url || null,
          command: finalCommand,
          environment: mcpData.env || mcpData.environment || {},
          json: jsonToSave
        }
      };
    } else {
      return {
        source: 'json',
        identifier: mcpData.identifier || mcpId,
        name: mcpData.name || key,
        description: mcpData.description || null,
        author: mcpData.author || null,
        category: mcpData.category || null,
        version: mcpData.version || null,
        updated: mcpData.updated || null,
        license: mcpData.license || null,
        homepage: mcpData.homepage || mcpData.url || null,
        repository: mcpData.repository || mcpData.url || null,
        installed: new Date().toISOString(),
        enabled: mcpData.enabled !== false,
        config: {
          url: mcpData.url || null,
          command: finalCommand,
          environment: mcpData.env || mcpData.environment || {},
          json: jsonToSave
        }
      };
    }
  };

  // Helper function to parse JSON and determine import format
  const parseJsonForImport = (jsonConfig: any, jsonText: string) => {
    let mcpsToImport: Record<string, any> = {};
    
    if (jsonConfig.mcpServers) {
      // Claude config format
      mcpsToImport = jsonConfig.mcpServers;
    } else if (jsonConfig.name && (jsonConfig.command || jsonConfig.url)) {
      // Single MCP format
      const mcpId = mcpHelpers.generateMCPId(jsonConfig.name);
      mcpsToImport[mcpId] = jsonConfig;
    } else {
      // Assume it's already in the right format
      mcpsToImport = jsonConfig;
    }

    const isSingleMCP = Object.keys(mcpsToImport).length === 1 && 
      (jsonConfig.name || !jsonConfig.mcpServers);

    return { mcpsToImport, isSingleMCP };
  };

  // Helper function to generate JSON to save for each MCP
  const generateJsonToSave = (
    key: string, 
    mcpData: any, 
    isSingleMCP: boolean, 
    jsonText: string, 
    jsonConfig: any
  ): string => {
    if (isSingleMCP) {
      // 单个 MCP 导入：保存完整的原始 JSON
      return jsonText;
    } else {
      // 多个 MCP 导入：为每个 MCP 保存其对应的 JSON 片段，包装在合适的结构中
      if (jsonConfig.mcpServers) {
        // Claude 配置格式：保存单个 MCP 的配置，包装在 mcpServers 结构中
        return JSON.stringify({
          mcpServers: {
            [key]: mcpData
          }
        }, null, 2);
      } else {
        // 其他格式：直接保存 MCP 数据
        return JSON.stringify(mcpData, null, 2);
      }
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
      const jsonConfig = JSON.parse(jsonText);
      const config = await getConfig();
      let firstMcpId: string | undefined;
      let updatedMcps = [...(config?.mcp?.installedMcps || [])];

      if (isEditing && editingMCP) {
        // 编辑现有的 JSON MCP
        const mcpId = editingMCP.identifier || mcpHelpers.generateMCPId(editingMCP.identifier || 'json-mcp');
        const updatedMCP = createMCPFromJsonData(jsonConfig, 'edit', jsonText, true, editingMCP);
        updatedMcps = updatedMcps.map(mcp => 
          mcp.identifier === mcpId ? updatedMCP : mcp
        );
        firstMcpId = updatedMCP.identifier;
      } else {
        // 导入新的 JSON MCP
        const { mcpsToImport, isSingleMCP } = parseJsonForImport(jsonConfig, jsonText);

        // 检查是否超过一个 MCP
        const mcpEntries = Object.entries(mcpsToImport);
        if(mcpEntries.length > 1) {
          toast({
            title: t('common.error'),
            description: t('addMCP.errors.singleMcpOnly') || 'Only one MCP can be imported at a time',
            variant: 'destructive'
          });
          return;
        }
        
        for (const [key, mcpData] of mcpEntries) {
          // Validate for duplicate identifier
          const mcpName = mcpData.name || key;
          const validation = await validateMCPIdentifier(mcpName);
          if (!validation.isValid) {
            toast({
              title: t('common.error'),
              description: validation.error,
              variant: 'destructive'
            });
            return;
          }
          
          const mcpId = mcpHelpers.generateMCPId(mcpName);
          const jsonToSave = generateJsonToSave(key, mcpData, isSingleMCP, jsonText, jsonConfig);
          const newMCP = createMCPFromJsonData(mcpData, key, jsonToSave, false);
          updatedMcps.push(newMCP);
          firstMcpId = newMCP.identifier;
        }
      }

      await updateConfig({
        mcp: {
          ...config?.mcp,
          installedMcps: updatedMcps
        }
      });

      toast({
        title: t('addMCP.toast.jsonImported'),
        description: t('addMCP.toast.jsonImportedDesc'),
      });

      onMcpAddedOrUpdated?.(firstMcpId);
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