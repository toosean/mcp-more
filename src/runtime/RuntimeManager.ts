import log from 'electron-log';
import { RuntimeProvider } from './runtimeHandler';


export interface RuntimeInfo {
  name: string;
  version?: string;
  paths?: string[];
  isInstalled: boolean;
  installLink?: string;
}

export interface InstallResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * 运行时管理器
 * 负责检测、安装和管理各种运行时环境
 */
export class RuntimeManager {
  private static supportRuntimes = ['Node.js', 'Python'];
  private static instance: RuntimeManager;
  
  private cachedRuntimeInfos: RuntimeInfo[] = null;
  
  private constructor() {}

  public static getInstance(): RuntimeManager {
    if (!RuntimeManager.instance) {
      RuntimeManager.instance = new RuntimeManager();
    }
    return RuntimeManager.instance;
  }

  public async refreshRuntimes(): Promise<void> {
    const runtimeInfos: RuntimeInfo[] = [];
    
    for (const runtimeName of RuntimeManager.supportRuntimes) {
      try {
        const provider = new RuntimeProvider(runtimeName);
        const version = await provider.getInstalledVersion();
        const executablePath = await provider.getExecutablePath();
        
        const runtimeInfo: RuntimeInfo = {
          name: runtimeName,
          version: version || undefined,
          paths: executablePath || undefined,
          isInstalled: version !== null,
          installLink: this.getInstallLink(runtimeName)
        };
        
        runtimeInfos.push(runtimeInfo);
        log.info(`Runtime ${runtimeName}: ${version ? `v${version}` : 'Not installed'}`);
      } catch (error) {
        log.error(`Failed to check runtime ${runtimeName}:`, error);
        runtimeInfos.push({
          name: runtimeName,
          isInstalled: false,
          installLink: this.getInstallLink(runtimeName)
        });
      }
    }
    
    this.cachedRuntimeInfos = runtimeInfos;
  }

  public async getRuntimeInfosAsync(): Promise<RuntimeInfo[]> {
    if(this.cachedRuntimeInfos == null){
      await this.refreshRuntimes();
    }
    return this.cachedRuntimeInfos;
  }


  public async getRuntimeInfoAsync(runtimeName: string): Promise<RuntimeInfo | undefined> {
    const runtimes = await this.getRuntimeInfosAsync();
    return runtimes.find(runtime => 
      runtime.name.toLowerCase() === runtimeName.toLowerCase()
    );
  }

  public async isRuntimeInstalledAsync(runtimeName: string): Promise<boolean> {
    if(RuntimeManager.supportRuntimes.includes(runtimeName)){
      return true;
    }
    return await this.isRuntimeInstalledAsync(runtimeName);
  }

  public getInstallLink(runtimeName: string): string | null {
    try {
      const provider = new RuntimeProvider(runtimeName);
      return provider.getInstallExternalLink();
    } catch (error) {
      log.error(`Failed to get install link for ${runtimeName}:`, error);
      return null;
    }
  }
  
}

// 导出单例实例
export const runtimeManager = RuntimeManager.getInstance();