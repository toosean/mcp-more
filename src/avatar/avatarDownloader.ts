import { app } from 'electron';
import { join } from 'path';
import { mkdir, writeFile, access, unlink } from 'fs/promises';
import log from 'electron-log';

/**
 * 主进程头像下载器工具类
 * 负责下载和保存 MCP 作者头像到本地
 */
export class AvatarDownloader {
  private static readonly AVATAR_DIR = 'avatars';

  /**
   * 获取头像存储目录路径
   */
  private static getAvatarDir(): string {
    const userDataPath = app.getPath('userData');
    return join(userDataPath, this.AVATAR_DIR);
  }

  /**
   * 确保头像目录存在
   */
  private static async ensureAvatarDir(): Promise<void> {
    const avatarDir = this.getAvatarDir();
    try {
      await access(avatarDir);
    } catch {
      await mkdir(avatarDir, { recursive: true });
      log.info('Created avatar directory:', avatarDir);
    }
  }

  /**
   * 生成安全的文件名
   */
  private static generateSafeFilename(identifier: string, url: string): string {
    // 从 URL 获取文件扩展名
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const extension = pathname.split('.').pop()?.toLowerCase() || 'png';

    // 只保留常见图片格式
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const finalExtension = allowedExtensions.includes(extension) ? extension : 'png';

    // 生成安全的文件名
    const safeIdentifier = identifier.replace(/[^a-zA-Z0-9\-_.]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    return `${safeIdentifier}_${timestamp}.${finalExtension}`;
  }

  /**
   * 下载头像并保存到本地
   * @param identifier MCP 标识符
   * @param avatarUrl 头像 URL
   * @returns 本地文件路径或 null（如果失败）
   */
  public static async downloadAvatar(identifier: string, avatarUrl: string): Promise<string | null> {
    try {
      if (!avatarUrl || !avatarUrl.startsWith('http')) {
        log.warn('Invalid avatar URL:', avatarUrl);
        return null;
      }

      // 确保目录存在
      await this.ensureAvatarDir();

      // 下载头像
      log.info(`Downloading avatar for ${identifier} from ${avatarUrl}`);

      // 设置30秒超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(avatarUrl, {
        headers: {
          'User-Agent': 'MCP-More/1.0.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 检查内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        log.warn('Invalid content type for avatar:', contentType);
        return null;
      }

      // 检查文件大小（限制 1MB）
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 1 * 1024 * 1024) {
        log.warn('Avatar file too large:', contentLength);
        return null;
      }

      // 读取文件数据
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 生成文件名和完整路径
      const filename = this.generateSafeFilename(identifier, avatarUrl);
      const avatarDir = this.getAvatarDir();
      const filePath = join(avatarDir, filename);

      // 保存文件
      await writeFile(filePath, buffer);

      log.info(`Avatar saved for ${identifier}: ${filePath}`);
      return filePath;

    } catch (error) {
      log.error(`Failed to download avatar for ${identifier}:`, error);
      return null;
    }
  }

  /**
   * 删除本地头像文件
   * @param filePath 文件路径
   */
  public static async deleteAvatar(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
      log.info('Deleted avatar file:', filePath);
    } catch (error) {
      log.warn('Failed to delete avatar file:', filePath, error);
    }
  }

  /**
   * 检查头像文件是否存在
   * @param filePath 文件路径
   */
  public static async avatarExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 读取头像文件并转换为 base64 data URL
   * @param filePath 文件路径
   * @returns base64 data URL 或 null（如果失败）
   */
  public static async getAvatarAsDataURL(filePath: string): Promise<string | null> {
    try {
      if (!await this.avatarExists(filePath)) {
        return null;
      }

      const { readFile } = await import('fs/promises');
      const imageBuffer = await readFile(filePath);

      // 从文件扩展名推断 MIME 类型
      const extension = filePath.split('.').pop()?.toLowerCase() || 'png';
      const mimeTypes: { [key: string]: string } = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      const mimeType = mimeTypes[extension] || 'image/png';

      // 转换为 base64 data URL
      const base64String = imageBuffer.toString('base64');
      return `data:${mimeType};base64,${base64String}`;

    } catch (error) {
      log.error(`Failed to read avatar as data URL: ${filePath}`, error);
      return null;
    }
  }
}