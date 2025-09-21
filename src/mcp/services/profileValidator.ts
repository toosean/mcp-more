import log from 'electron-log';
import { configManager } from '../../config/ConfigManager.js';
import type { Request, Response } from 'express';

/**
 * Profile 验证结果
 */
export interface ProfileValidationResult {
  isValid: boolean;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Profile 验证器
 * 负责验证 Profile 功能是否启用以及特定 Profile 是否存在
 */
export class ProfileValidator {
  
  /**
   * 验证 Profile 请求
   * @param profileId Profile ID，如果为空则表示默认 profile
   * @returns 验证结果
   */
  validateProfileRequest(profileId?: string): ProfileValidationResult {
    // 如果没有 profileId，表示使用默认 profile，无需验证
    if (!profileId) {
      return { isValid: true };
    }

    const config = configManager.getConfig();

    // 检查 Profile 功能是否启用
    if (!config.general.enableProfile) {
      log.warn(`Profile endpoint accessed but feature disabled: profileId=${profileId}`);
      return {
        isValid: false,
        error: {
          code: -32001,
          message: 'Profile feature is disabled. Enable it in Settings to use profile-specific endpoints.',
          data: { profileId }
        }
      };
    }

    // 检查特定 Profile 是否存在
    const profileExists = config.mcp.profiles.some(profile => profile.id === profileId);
    if (!profileExists) {
      log.warn(`Profile not found: profileId=${profileId}`);
      return {
        isValid: false,
        error: {
          code: -32002,
          message: `Profile '${profileId}' not found. Please check if the profile exists and try again.`,
          data: { 
            profileId,
            availableProfiles: config.mcp.profiles.map(p => ({ id: p.id, name: p.name }))
          }
        }
      };
    }

    return { isValid: true };
  }

  /**
   * 处理 Profile 验证失败的 HTTP 响应
   * @param req Express 请求对象
   * @param res Express 响应对象
   * @param validationResult 验证结果
   */
  async handleValidationError(req: Request, res: Response, validationResult: ProfileValidationResult): Promise<void> {
    if (!validationResult.error) {
      throw new Error('No validation error found');
    }

    const statusCode = validationResult.error.code === -32001 ? 404 : 404; // Profile 功能禁用或不存在都返回 404

    res.status(statusCode).json({
      jsonrpc: '2.0',
      error: validationResult.error,
      id: null,
    });

    log.warn(`Profile validation failed: ${req.method} ${req.path} - ${validationResult.error.message}`);
  }

  /**
   * 中间件风格的验证函数
   * @param req Express 请求对象
   * @param res Express 响应对象
   * @returns 如果验证失败返回 false，成功返回 true
   */
  async validateAndHandle(req: Request, res: Response): Promise<boolean> {
    const profileId = req.params.profileId;
    const validationResult = this.validateProfileRequest(profileId);

    if (!validationResult.isValid) {
      await this.handleValidationError(req, res, validationResult);
      return false;
    }

    return true;
  }

}

// 导出单例实例
export const profileValidator = new ProfileValidator();