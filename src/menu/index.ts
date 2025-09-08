import { Menu } from 'electron';
import log from 'electron-log';

/**
 * 菜单管理器类
 * 负责管理应用菜单的创建、配置和更新
 */
export class MenuManager {
  /**
   * 设置应用菜单
   * 根据开发/生产环境和平台配置不同的菜单策略
   */
  setupApplicationMenu(): void {
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment) {
      this.setupProductionMenu();
    }
    log.info('Application menu configured for', isDevelopment ? 'development' : 'production', 'mode');
  }

  /**
   * 设置生产模式菜单
   * 移除菜单
   */
  private setupProductionMenu(): void {
    Menu.setApplicationMenu(null);
    log.debug('Production menu setup completed');
  }

}

// 导出单例实例
export const menuManager = new MenuManager();