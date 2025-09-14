/**
 * OAuth 回调本地服务器
 * 处理 OAuth 授权码回调
 */

import * as http from 'http';
import { AddressInfo } from 'net';
import { URL } from 'url';

export interface CallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export class OAuthCallbackServer {
  private server?: http.Server;
  private port: number = 0;
  private resolveCallback?: (params: CallbackParams) => void;
  private rejectCallback?: (error: Error) => void;
  private timeoutHandle?: NodeJS.Timeout;

  /**
   * 启动本地回调服务器
   */
  async startServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.server = http.createServer(this.handleRequest.bind(this));

        this.server.listen(0, 'localhost', () => {
          const address = this.server!.address() as AddressInfo;
          this.port = address.port;
          const callbackUrl = `http://localhost:${this.port}/oauth/callback`;
          
          console.log(`OAuth callback server started at: ${callbackUrl}`);
          resolve(callbackUrl);
        });

        this.server.on('error', (error) => {
          console.error('OAuth callback server error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Failed to start OAuth callback server:', error);
        reject(error as Error);
      }
    });
  }

  /**
   * 等待 OAuth 回调
   */
  async waitForCallback(timeoutMs: number = 30000): Promise<CallbackParams> {
    return new Promise((resolve, reject) => {
      this.resolveCallback = resolve;
      this.rejectCallback = reject;

      // 设置超时
      this.timeoutHandle = setTimeout(() => {
        this.cleanup();
        reject(new Error('OAuth callback timeout'));
      }, timeoutMs);
    });
  }

  /**
   * 处理 HTTP 请求
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    try {
      const url = new URL(req.url!, `http://localhost:${this.port}`);
      
      console.log(`OAuth callback received: ${req.method} ${url.pathname}${url.search}`);

      if (url.pathname === '/oauth/callback') {
        this.handleOAuthCallback(url, res);
      } else if (url.pathname === '/') {
        this.handleRoot(res);
      } else {
        this.handleNotFound(res);
      }
    } catch (error) {
      console.error('Error handling OAuth callback request:', error);
      this.handleInternalError(res);
    }
  }

  /**
   * 处理 OAuth 回调
   */
  private handleOAuthCallback(url: URL, res: http.ServerResponse): void {
    // 提取回调参数
    const params: CallbackParams = {
      code: url.searchParams.get('code') || undefined,
      state: url.searchParams.get('state') || undefined,
      error: url.searchParams.get('error') || undefined,
      error_description: url.searchParams.get('error_description') || undefined,
      error_uri: url.searchParams.get('error_uri') || undefined,
    };

    // 发送成功页面
    if (params.error) {
      this.sendErrorPage(res, params);
    } else {
      this.sendSuccessPage(res);
    }

    // 通知等待的回调
    if (this.resolveCallback) {
      this.resolveCallback(params);
      this.cleanup();
    }

    // 延迟关闭服务器，给浏览器时间渲染页面
    setTimeout(() => this.close(), 2000);
  }

  /**
   * 处理根路径请求
   */
  private handleRoot(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <head>
          <title>OAuth Authorization</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>OAuth Authorization</h1>
          <p>Waiting for OAuth callback...</p>
          <p>Please complete the authorization process in your browser.</p>
        </body>
      </html>
    `);
  }

  /**
   * 发送成功页面
   */
  private sendSuccessPage(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <head>
          <title>Authorization Complete</title>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 50px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .success { color: #28a745; }
            .icon { font-size: 48px; margin-bottom: 20px; }
            button { background: #007cff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 20px; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon success">✓</div>
            <h1 class="success">Authorization Complete</h1>
            <p>OAuth authorization was successful!</p>
            <p>You can now close this window and return to mcp-more.</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            // Auto-close after 3 seconds
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);
  }

  /**
   * 发送错误页面
   */
  private sendErrorPage(res: http.ServerResponse, params: CallbackParams): void {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <head>
          <title>Authorization Error</title>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 50px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .error { color: #dc3545; }
            .icon { font-size: 48px; margin-bottom: 20px; }
            .details { text-align: left; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 4px; }
            button { background: #007cff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 20px; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon error">✗</div>
            <h1 class="error">Authorization Failed</h1>
            <p>OAuth authorization encountered an error.</p>
            ${params.error ? `
              <div class="details">
                <strong>Error:</strong> ${params.error}<br>
                ${params.error_description ? `<strong>Description:</strong> ${params.error_description}<br>` : ''}
                ${params.error_uri ? `<strong>More info:</strong> <a href="${params.error_uri}" target="_blank">${params.error_uri}</a>` : ''}
              </div>
            ` : ''}
            <p>Please try again or contact support if the problem persists.</p>
            <button onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
    `);
  }

  /**
   * 处理 404
   */
  private handleNotFound(res: http.ServerResponse): void {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  /**
   * 处理 500
   */
  private handleInternalError(res: http.ServerResponse): void {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.resolveCallback = undefined;
    this.rejectCallback = undefined;

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = undefined;
    }
  }

  /**
   * 关闭服务器
   */
  close(): void {
    if (this.server) {
      console.log('Closing OAuth callback server');
      this.server.close();
      this.server = undefined;
      this.port = 0;
    }

    this.cleanup();

    // 如果仍有等待的回调，触发取消错误
    if (this.rejectCallback) {
      this.rejectCallback(new Error('OAuth callback server closed'));
      this.cleanup();
    }
  }

  /**
   * 获取当前回调 URL
   */
  getCallbackUrl(): string | null {
    if (this.port === 0) {
      return null;
    }
    return `http://localhost:${this.port}/oauth/callback`;
  }

  /**
   * 检查服务器是否正在运行
   */
  isRunning(): boolean {
    return this.server !== undefined && this.port !== 0;
  }
}