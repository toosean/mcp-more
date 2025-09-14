/**
 * 系统浏览器启动器
 * 在用户默认浏览器中打开 OAuth 授权 URL
 */

import { shell } from 'electron';

export class BrowserLauncher {
  /**
   * 在系统默认浏览器中打开 URL
   */
  async openUrl(url: string): Promise<void> {
    try {
      console.log(`Opening OAuth URL in system browser: ${url}`);
      
      // 验证 URL 格式
      const parsedUrl = new URL(url);
      if (!parsedUrl.protocol.startsWith('http')) {
        throw new Error(`Invalid URL protocol: ${parsedUrl.protocol}`);
      }

      // 使用 Electron 的 shell.openExternal 打开 URL
      await shell.openExternal(url);
      
      console.log('Successfully opened OAuth URL in system browser');
    } catch (error) {
      console.error('Failed to open OAuth URL in browser:', error);
      throw new Error(`Failed to open OAuth URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 构建带参数的授权 URL
   */
  buildAuthorizationUrl(
    baseUrl: string,
    params: Record<string, string | undefined>
  ): string {
    try {
      const url = new URL(baseUrl);
      
      // 添加查询参数
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      });

      return url.toString();
    } catch (error) {
      console.error('Failed to build authorization URL:', error);
      throw new Error(`Invalid authorization URL: ${baseUrl}`);
    }
  }

  /**
   * 验证授权 URL 的安全性
   */
  validateAuthorizationUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      // 只允许 HTTPS（生产环境）和 HTTP localhost（开发环境）
      if (parsedUrl.protocol === 'https:') {
        return true;
      }
      
      if (parsedUrl.protocol === 'http:' && 
          (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')) {
        console.warn('Using HTTP authorization URL for localhost - only allowed in development');
        return true;
      }

      console.error(`Insecure authorization URL rejected: ${url}`);
      return false;
    } catch (error) {
      console.error('Invalid authorization URL:', error);
      return false;
    }
  }

  /**
   * 打开授权 URL 并返回用户友好的消息
   */
  async openAuthorizationUrl(url: string): Promise<{ success: boolean; message: string }> {
    try {
      // 验证 URL 安全性
      if (!this.validateAuthorizationUrl(url)) {
        return {
          success: false,
          message: 'Invalid or insecure authorization URL'
        };
      }

      await this.openUrl(url);

      return {
        success: true,
        message: 'Authorization URL opened in your default browser. Please complete the authorization process.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to open authorization URL: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}