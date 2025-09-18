/**
 * PKCE (Proof Key for Code Exchange) 实现
 * RFC 7636 - Proof Key for Code Exchange by OAuth Public Clients
 */

import { PKCEParams } from './types';
import log from 'electron-log';

export class PKCEService {
  /**
   * 生成 PKCE 挑战参数
   * 使用 S256 方法（SHA256 + base64url）
   */
  async generateChallenge(): Promise<PKCEParams> {
    try {
      // 生成 43-128 字符的 code_verifier (RFC 7636 Section 4.1)
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const codeVerifier = this.base64URLEncode(array);

      // 生成 SHA256 挑战 (RFC 7636 Section 4.2)
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const hash = await crypto.subtle.digest('SHA-256', data);
      const codeChallenge = this.base64URLEncode(new Uint8Array(hash));

      const result: PKCEParams = {
        codeVerifier,
        codeChallenge,
        codeChallengeMethod: 'S256'
      };

      log.log('Generated PKCE challenge:', { 
        codeChallenge,
        codeChallengeMethod: 'S256',
        verifierLength: codeVerifier.length 
      });

      return result;
    } catch (error) {
      log.error('Failed to generate PKCE challenge:', error);
      throw new Error('PKCE challenge generation failed');
    }
  }

  /**
   * 验证 PKCE 挑战
   * 在客户端验证生成的挑战是否正确
   */
  async verifyChallenge(
    codeVerifier: string,
    codeChallenge: string
  ): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const hash = await crypto.subtle.digest('SHA-256', data);
      const computedChallenge = this.base64URLEncode(new Uint8Array(hash));

      const isValid = computedChallenge === codeChallenge;
      log.log('PKCE verification result:', { isValid });

      return isValid;
    } catch (error) {
      log.error('PKCE verification failed:', error);
      return false;
    }
  }

  /**
   * 验证 code_verifier 格式
   * RFC 7636 Section 4.1 - code_verifier 必须是 43-128 字符
   */
  validateCodeVerifier(codeVerifier: string): boolean {
    // RFC 7636: code_verifier = 43*128unreserved
    // unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
    const pattern = /^[A-Za-z0-9\-._~]{43,128}$/;
    return pattern.test(codeVerifier);
  }

  /**
   * 验证 code_challenge 格式
   */
  validateCodeChallenge(codeChallenge: string): boolean {
    // base64url 编码的 SHA256 哈希值应该是 43 个字符
    const pattern = /^[A-Za-z0-9_-]{43}$/;
    return pattern.test(codeChallenge);
  }

  /**
   * Base64 URL 编码
   * RFC 4648 Section 5 - Base64url Encoding
   */
  private base64URLEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL 解码
   */
  private base64URLDecode(str: string): Uint8Array {
    // 添加填充
    let padded = str;
    while (padded.length % 4) {
      padded += '=';
    }

    // 恢复标准 base64 字符
    const base64 = padded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  /**
   * 生成安全随机状态参数
   * 用于防止 CSRF 攻击
   */
  generateState(): string {
    // Generate a random state
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  /**
   * 检查浏览器是否支持 Web Crypto API
   */
  isSupported(): boolean {
    return (
      typeof crypto !== 'undefined' &&
      typeof crypto.subtle !== 'undefined' &&
      typeof crypto.getRandomValues === 'function'
    );
  }
}