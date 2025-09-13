import { ipcMain } from 'electron';
import { runtimeManager } from './RuntimeManager';
import { RuntimeInfo, InstallResult } from './RuntimeManager';
import log from 'electron-log';


export function setupRuntimeIpcHandlers(): void {

  ipcMain.handle('runtime:check-runtimes', async (): Promise<RuntimeInfo[]> => {
    try {
      log.info('Starting runtime detection...');
      const runtimes = await runtimeManager.getRuntimeInfosAsync();
      log.info('Runtime detection completed:', runtimes);
      return runtimes;
    } catch (error) {
      log.error('Error in runtime detection:', error);
      throw error;
    }
  });


  ipcMain.handle('runtime:refresh-runtimes', async (): Promise<void> => {
    try {
      log.info('Starting runtime refresh...');
      await runtimeManager.refreshRuntimes();
      log.info('Runtime refresh completed');
    } catch (error) {
      log.error('Error in runtime refresh:', error);
      throw error;
    }
  });

  ipcMain.handle('runtime:is-runtime-installed', async (event, runtimeName: string) => {
    try {
      log.info(`Checking if runtime ${runtimeName} is installed...`);
      const isInstalled = await runtimeManager.isRuntimeInstalledAsync(runtimeName);
      log.info(`Runtime ${runtimeName} is installed: ${isInstalled}`);
      return isInstalled;
    } catch (error) {
      log.error(`Error in runtime installation check for ${runtimeName}:`, error);
      throw error;
    }
  });

  ipcMain.handle('runtime:get-runtime-info', async (event, runtimeName: string) => {
    try {
      log.info(`Getting runtime info for ${runtimeName}...`);
      const runtimeInfo = await runtimeManager.getRuntimeInfoAsync(runtimeName);
      log.info(`Runtime info for ${runtimeName}:`, runtimeInfo);
      return runtimeInfo;
    } catch (error) {
      log.error(`Error in runtime info for ${runtimeName}:`, error);
      throw error;
    }
  });

  // init runtimes when app start
  runtimeManager.getRuntimeInfosAsync();

  log.info('Runtime IPC handlers setup completed');
}