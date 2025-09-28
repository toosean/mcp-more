import { ipcMain } from 'electron';
import log from 'electron-log';
import { AvatarDownloader } from './avatarDownloader';

/**
 * 设置头像相关的 IPC 处理器
 */
export function setupAvatarIpcHandlers(): void {
  // 下载头像
  ipcMain.handle('avatar:download', async (_, identifier: string, avatarUrl: string): Promise<string | null> => {
    try {
      return await AvatarDownloader.downloadAvatar(identifier, avatarUrl);
    } catch (error) {
      log.error('Failed to download avatar via IPC:', error);
      return null;
    }
  });

  // 删除头像
  ipcMain.handle('avatar:delete', async (_, filePath: string): Promise<void> => {
    try {
      await AvatarDownloader.deleteAvatar(filePath);
    } catch (error) {
      log.error('Failed to delete avatar via IPC:', error);
      throw error;
    }
  });

  // 检查头像是否存在
  ipcMain.handle('avatar:exists', async (_, filePath: string): Promise<boolean> => {
    try {
      return await AvatarDownloader.avatarExists(filePath);
    } catch (error) {
      log.error('Failed to check avatar existence via IPC:', error);
      return false;
    }
  });

  // 获取头像 data URL
  ipcMain.handle('avatar:getDataURL', async (_, filePath: string): Promise<string | null> => {
    try {
      return await AvatarDownloader.getAvatarAsDataURL(filePath);
    } catch (error) {
      log.error('Failed to get avatar data URL via IPC:', error);
      return null;
    }
  });

  log.info('Avatar IPC handlers set up');
}