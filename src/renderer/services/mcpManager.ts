import { MarketMcp, MarketMcpDetail } from '../types/market';
import { useConfig } from '@/hooks/use-config';
import { Mcp } from '../../config/types';
import { toast } from '@/hooks/use-toast';
import { getMcpInstallConfiguration } from './marketApi';
import i18n from '@/i18n';

// Type for runtime installation handler
export type RuntimeInstallHandler = (runtimeName: string) => Promise<boolean>;

// Type for OAuth confirmation handler
export type OAuthConfirmHandler = (mcpName: string) => Promise<boolean>;

export type McpInstallStatus = 'installed' | 'upgradeable' | 'not_installed';

export function useMcpManager() {

  const { getConfig, updateConfig } = useConfig();

  const installMcpManually = async (mcpData: {
    name: string;
    command?: string;
    url?: string;
    json?: string;
    environment?: Record<string, string>;
    oauth?: Partial<Mcp['oauth']>;
    editingMCP?: Mcp | null;
  }): Promise<{ success: boolean; mcpId: string; error?: string }> => {
    try {
      const { name, command, url, json, environment, oauth, editingMCP } = mcpData;
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
            oauth: oauth || editingMCP.oauth,
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
            oauth: oauth,
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

  const installMcp = async (mcp: MarketMcp | MarketMcpDetail, runtimeInstallHandler?: RuntimeInstallHandler, oauthConfirmHandler?: OAuthConfirmHandler): Promise<void> => {

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
      code: mcp.code,
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
      runtimes: installConfig.runtimes,
    };
    installedMcps.push(newMcp);
    
    updateConfig({
      mcp: {
        ...config.mcp,
        installedMcps: installedMcps,
      },
    });
    
    // here we don't await it, let it work in the background
    let shouldStartMcp = true;

    if(installConfig.runtimes && installConfig.runtimes.length > 0) {
      for(const runtimeName of installConfig.runtimes) {
        if(!(await window.runtimeAPI.isRuntimeInstalledAsync(runtimeName))) {
          // Show runtime installation prompt if handler is provided
          if (runtimeInstallHandler) {
            const shouldInstallRuntime = await runtimeInstallHandler(runtimeName);
  
            if (shouldInstallRuntime) {
              // User chose to install runtime, don't start MCP yet
              shouldStartMcp = false;
              // Open runtime installation page
              const runtimeInfo = await window.runtimeAPI.getRuntimeInfoAsync(runtimeName);
              if(runtimeInfo.installLink) {
                window.shellAPI.openExternal(runtimeInfo.installLink);
              }
             
            }
          }
        }
      }
    }

    if(shouldStartMcp && installConfig.authMethod && installConfig.authMethod.includes('oauth')) {
      shouldStartMcp = await oauthConfirmHandler(newMcp.name);
    }

    if(shouldStartMcp) {
      startMcp(newMcp.identifier, newMcp.name, true);
      // everything is happen too fast, let's wait for 2 seconds
      // make user feel the progress
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  }

  const startMcp = async (identifier: string, name?: string, autoOAuth: boolean = false): Promise<void> => {
    const toastId = toast({
      title: i18n.t('mcpManager.messages.running', { name: name ?? identifier }),
      description: i18n.t('mcpManager.messages.startingUp', { name: name ?? identifier }),
      progress: true,
    });

    window.mcpAPI.startMcp(identifier, autoOAuth).then(() => {
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
        ...config.mcp,
        installedMcps: installedMcps,
      },
    });
  }

  // OAuth functions
  // const triggerOAuthFlow = async (mcpIdentifier: string): Promise<{
  //   success: boolean;
  //   authorizationUrl?: string;
  //   error?: string;
  // }> => {
  //   try {
  //     return await window.mcpAPI.triggerOAuthFlow(mcpIdentifier);
  //   } catch (error) {
  //     console.error('Failed to trigger OAuth flow:', error);
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : 'Unknown error'
  //     };
  //   }
  // };

  // const completeOAuthFlow = async (mcpIdentifier: string, authorizationCode: string): Promise<{
  //   success: boolean;
  //   error?: string;
  // }> => {
  //   try {
  //     return await window.mcpAPI.completeOAuthFlow(mcpIdentifier, authorizationCode);
  //   } catch (error) {
  //     console.error('Failed to complete OAuth flow:', error);
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : 'Unknown error'
  //     };
  //   }
  // };

  // const getOAuthState = async (mcpIdentifier: string): Promise<any> => {
  //   try {
  //     return await window.mcpAPI.getOAuthState(mcpIdentifier);
  //   } catch (error) {
  //     console.error('Failed to get OAuth state:', error);
  //     return null;
  //   }
  // };

  // const clearOAuthData = async (mcpIdentifier: string): Promise<void> => {
  //   try {
  //     await window.mcpAPI.clearOAuthData(mcpIdentifier);
  //   } catch (error) {
  //     console.error('Failed to clear OAuth data:', error);
  //     throw error;
  //   }
  // };

  return {
    startMcp,
    getMcpInstallStatus,
    parseMcpJson,
    installMcp,
    upgradeMcp,
    uninstallMcp,
    installMcpManually,
    //triggerOAuthFlow,
    //completeOAuthFlow,
    //getOAuthState,
    //clearOAuthData,
  }
}
