import { MarketMcp, MarketMcpDetail } from '../types/market';
import { useConfig } from '@/hooks/use-config';
import { Mcp } from '../../config/types';
import { toast } from '@/hooks/use-toast';
import { getMcpInstallConfiguration } from './marketApi';
import i18n from '@/i18n';

export type McpInstallStatus = 'installed' | 'upgradeable' | 'not_installed';

export function useMcpManager() {

  const { getConfig, updateConfig } = useConfig();

  const installMcpManually = async (mcpData: {
    name: string;
    command?: string;
    url?: string;
    json?: string;
    environment?: Record<string, string>;
    editingMCP?: Mcp | null;
  }): Promise<{ success: boolean; mcpId: string; error?: string }> => {
    try {
      const { name, command, url, json, environment, editingMCP } = mcpData;
      const config = await getConfig();
      const existingMcps = config?.mcp?.installedMcps || [];
      
      // Generate MCP ID
      const generateMCPId = (name: string): string => {
        return `TOOL/${name.toLowerCase().replace(/\s+/g, '_')}`;
      };
      
      const mcpId = editingMCP?.identifier || generateMCPId(name);
      const isEditing = !!editingMCP;
      
      // Check for duplicates (skip if editing the same MCP)
      if (!isEditing || editingMCP?.identifier !== mcpId) {
        const duplicateExists = existingMcps.some(mcp => 
          mcp.identifier === mcpId || 
          (mcp.name.toLowerCase() === name.toLowerCase())
        );
        
        if (duplicateExists) {
          return { 
            success: false, 
            mcpId,
            error: i18n.t('mcpManager.errors.duplicateName', { name })
          };
        }
      }
      
      let updatedMCP: Mcp;
      
      if (json) {
        // Handle JSON import
        const jsonConfig = JSON.parse(json);
        let mcpsToImport: Record<string, any> = {};
        
        if (jsonConfig.mcpServers) {
          mcpsToImport = jsonConfig.mcpServers;
        } else if (jsonConfig.name && (jsonConfig.command || jsonConfig.url)) {
          const mcpKey = generateMCPId(jsonConfig.name);
          mcpsToImport[mcpKey] = jsonConfig;
        } else {
          mcpsToImport = jsonConfig;
        }
        
        const mcpEntries = Object.entries(mcpsToImport);
        if (mcpEntries.length > 1) {
          return {
            success: false,
            mcpId,
            error: i18n.t('mcpManager.errors.singleMcpOnly')
          };
        }
        
        const [key, mcpJsonData] = mcpEntries[0];
        const finalCommand = mergeCommandAndArgs(mcpJsonData.command, mcpJsonData.args);
        
        if (isEditing && editingMCP) {
          updatedMCP = {
            ...editingMCP,
            name: mcpJsonData.name || editingMCP.name,
            description: mcpJsonData.description || editingMCP.description,
            author: mcpJsonData.author || editingMCP.author,
            version: mcpJsonData.version || editingMCP.version,
            license: mcpJsonData.license || editingMCP.license,
            updated: new Date().toISOString(),
            enabled: mcpJsonData.enabled !== false,
            config: {
              url: mcpJsonData.url || null,
              command: finalCommand,
              environment: mcpJsonData.env || mcpJsonData.environment || {},
              json: json
            }
          };
        } else {
          updatedMCP = {
            source: 'json',
            identifier: mcpJsonData.identifier || mcpId,
            name: mcpJsonData.name || key,
            description: mcpJsonData.description || null,
            author: mcpJsonData.author || null,
            version: mcpJsonData.version || null,
            updated: mcpJsonData.updated || null,
            license: mcpJsonData.license || null,
            installed: new Date().toISOString(),
            enabled: mcpJsonData.enabled !== false,
            config: {
              url: mcpJsonData.url || null,
              command: finalCommand,
              environment: mcpJsonData.env || mcpJsonData.environment || {},
              json: json
            }
          };
        }
      } else {
        // Handle local or remote MCP
        if (isEditing && editingMCP) {
          updatedMCP = {
            ...editingMCP,
            name,
            updated: new Date().toISOString(),
            config: {
              ...editingMCP.config,
              command: command || null,
              url: url || null,
              environment: environment || null
            }
          };
        } else {
          updatedMCP = {
            source: 'manual',
            identifier: mcpId,
            name,
            description: null,
            author: null,
            version: null,
            updated: null,
            license: null,
            installed: new Date().toISOString(),
            enabled: true,
            config: {
              url: url || null,
              command: command || null,
              environment: environment || null,
              json: null
            }
          };
        }
      }
      
      // Update config
      let updatedMcps: Mcp[];
      if (isEditing && editingMCP) {
        updatedMcps = existingMcps.map(mcp => 
          mcp.identifier === mcpId ? updatedMCP : mcp
        );
      } else {
        updatedMcps = [...existingMcps, updatedMCP];
      }
      
      await updateConfig({
        mcp: {
          ...config?.mcp,
          installedMcps: updatedMcps
        }
      });

      try{
        await window.mcpAPI.startMcp(updatedMCP.identifier);
      } catch (error) {
        window.logAPI.error(`Failed to start MCP ${updatedMCP.name}:`, error);
        toast({
          title: i18n.t('mcpManager.errors.failedToStart', { name: updatedMCP.name }),
          description: error instanceof Error ? error.message : i18n.t('mcpManager.errors.unknownError'),
          variant: 'destructive'
        });
      }
      
      return { success: true, mcpId: updatedMCP.identifier };
    } catch (error) {
      return {
        success: false,
        mcpId: '',
        error: error instanceof Error ? error.message : i18n.t('mcpManager.errors.unknownError')
      };
    }
  };

  /**
   * 检查包是否已安装
   * @param identifier 包标识符
   * @returns 包版本号，如果未安装则返回 null
   */
  const getMcpInstallStatus = async (identifier: string, publishTime?: string): Promise<McpInstallStatus> => {
    const config = await getConfig();
    const installedMcps = config.mcp.installedMcps;
    const installedMcp = installedMcps.find(mcp => mcp.identifier === identifier);

    if(!installedMcp) {
      return 'not_installed';
    }

    if(installedMcp.updated  && publishTime)
    {
      const installedPublishAt = new Date(installedMcp.updated);
      const publishAt = new Date(publishTime);
      if(installedPublishAt < publishAt) {
        return 'upgradeable';
      }else{
        return 'installed';
      }

    }else{
      return 'installed';
    }


    

  }

  const mergeCommandAndArgs = (command: string | null, args: string[] | null): string | null => {
    if (!command) return null;
    if (args && Array.isArray(args) && args.length > 0) {
      return `${command} ${args.join(' ')}`;
    }
    return command;
  };

  const parseMcpJson = async (mcpConfiguration: string) => {
    
    const json = JSON.parse(mcpConfiguration);
    const mcpServer = json.mcpServers[Object.keys(json.mcpServers)[0]];

    let finalCommand = null;
    if(mcpServer.command) {
      finalCommand = mergeCommandAndArgs(mcpServer.command, mcpServer.args);
    }

    return {
      url: mcpServer.url || mcpServer.serverUrl,
      command: finalCommand,
      environment: mcpServer.env,
      json: mcpConfiguration
    };
  }

  /**
   * 模拟安装包
   * TODO: 替换为实际的安装逻辑
   */
  const installMcp = async (mcp: MarketMcp | MarketMcpDetail): Promise<void> => {

    const config = await getConfig();

    const installedMcps = config.mcp.installedMcps;
    const installedMcp = installedMcps.find(existingMcp => existingMcp.identifier === mcp.identifier);

    if (installedMcp) {
      throw new Error(i18n.t('mcpManager.errors.alreadyInstalled'));
    }

    // 获取安装配置
    const installConfig = await getMcpInstallConfiguration(mcp.identifier);
    if (!installConfig || !installConfig.configuration) {
      throw new Error(i18n.t('mcpManager.errors.fetchConfigFailed'));
    }

    const mcpConfig = await parseMcpJson(installConfig.configuration);
    const newMcp = {
      source: 'market' as const,
      identifier: mcp.identifier,
      name: mcp.name,
      description: mcp.description,
      author: mcp.author,
      version: mcp.version,
      updated: mcp.updatedAt,
      license: mcp.license,
      installed: new Date().toISOString(),
      enabled: true,
      config: {
        url: mcpConfig.url,
        command: mcpConfig.command,
        environment: mcpConfig.environment,
        json: mcpConfig.json,
      },
    };
    installedMcps.push(newMcp);
    
    updateConfig({
      mcp: {
        installedMcps: installedMcps,
      },
    });
    
    // here we don't await it, let it work in the background
    startMcp(newMcp.identifier, newMcp.name);

    // everything is happen too fast, let's wait for 2 seconds
    // make user feel the progress
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const startMcp = async (identifier: string, name?: string): Promise<void> => {
    const toastId = toast({
      title: i18n.t('mcpManager.messages.running', { name: name ?? identifier }),
      description: i18n.t('mcpManager.messages.startingUp', { name: name ?? identifier }),
      progress: true,
    });

    window.mcpAPI.startMcp(identifier).then(() => {
      toastId.dismiss();
      toast({
        title: i18n.t('mcpManager.messages.started', { name: name ?? identifier }),
        description: i18n.t('mcpManager.messages.startedSuccess', { name: name ?? identifier }),
      });
    }).catch((error) => {
      window.logAPI.error(`Failed to start MCP ${name ?? identifier}:`, error);
      toastId.dismiss();
    });
  }

  const upgradeMcp = async (mcp: MarketMcp | MarketMcpDetail): Promise<void> => {

    await uninstallMcp(mcp.identifier);
    await installMcp(mcp);
    
  }

  /**
   * 模拟卸载包
   * TODO: 替换为实际的卸载逻辑
   */
  const uninstallMcp = async (identifier: string): Promise<void> => {

    const config = await getConfig();
    
    let installedMcps = config.mcp.installedMcps;
    const installedMcp = installedMcps.find(mcp => mcp.identifier === mcp.identifier);

    if (!installedMcp) {
      throw new Error(i18n.t('mcpManager.errors.notInstalled'));
    }

    await window.mcpAPI.stopMcp(identifier);

    installedMcps = installedMcps.filter(mcp => mcp.identifier !== identifier);

    updateConfig({
      mcp: {
        installedMcps: installedMcps,
      },
    });
  }

  return {
    startMcp,
    getMcpInstallStatus,
    parseMcpJson,
    installMcp,
    upgradeMcp,
    uninstallMcp,
    installMcpManually,
  }
}
