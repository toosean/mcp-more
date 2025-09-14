/**
 * OAuth 错误分类和用户友好的错误处理
 */

export enum OAuthErrorType {
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // 服务器配置错误
  METADATA_DISCOVERY_FAILED = 'METADATA_DISCOVERY_FAILED',
  UNSUPPORTED_SERVER = 'UNSUPPORTED_SERVER',
  INVALID_SERVER_RESPONSE = 'INVALID_SERVER_RESPONSE',
  
  // OAuth 协议错误
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED_CLIENT = 'UNAUTHORIZED_CLIENT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  UNSUPPORTED_RESPONSE_TYPE = 'UNSUPPORTED_RESPONSE_TYPE',
  INVALID_SCOPE = 'INVALID_SCOPE',
  SERVER_ERROR = 'SERVER_ERROR',
  TEMPORARILY_UNAVAILABLE = 'TEMPORARILY_UNAVAILABLE',
  
  // 客户端错误
  INVALID_CLIENT = 'INVALID_CLIENT',
  INVALID_GRANT = 'INVALID_GRANT',
  UNSUPPORTED_GRANT_TYPE = 'UNSUPPORTED_GRANT_TYPE',
  
  // PKCE 相关错误
  PKCE_NOT_SUPPORTED = 'PKCE_NOT_SUPPORTED',
  INVALID_CODE_VERIFIER = 'INVALID_CODE_VERIFIER',
  
  // 用户交互错误
  USER_CANCELLED = 'USER_CANCELLED',
  CALLBACK_TIMEOUT = 'CALLBACK_TIMEOUT',
  STATE_MISMATCH = 'STATE_MISMATCH',
  
  // 系统错误
  BROWSER_ERROR = 'BROWSER_ERROR',
  CALLBACK_SERVER_ERROR = 'CALLBACK_SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface OAuthErrorInfo {
  type: OAuthErrorType;
  message: string;
  userMessage: string;
  suggestion?: string;
  recoverable: boolean;
  retryable: boolean;
}

export class OAuthErrorClassifier {
  /**
   * 分类 OAuth 错误
   */
  static classifyError(error: unknown): OAuthErrorInfo {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // 网络相关错误
      if (message.includes('fetch') && (message.includes('failed') || message.includes('network'))) {
        return {
          type: OAuthErrorType.NETWORK_ERROR,
          message: error.message,
          userMessage: 'Network connection failed',
          suggestion: 'Please check your internet connection and server URL',
          recoverable: true,
          retryable: true
        };
      }
      
      if (message.includes('timeout')) {
        return {
          type: OAuthErrorType.TIMEOUT,
          message: error.message,
          userMessage: 'Request timed out',
          suggestion: 'Please try again or check if the server is responding',
          recoverable: true,
          retryable: true
        };
      }
      
      // OAuth 标准错误响应
      if (message.includes('access_denied')) {
        return {
          type: OAuthErrorType.ACCESS_DENIED,
          message: error.message,
          userMessage: 'Authorization was denied',
          suggestion: 'Please ensure you have permission to access this resource and try authorizing again',
          recoverable: true,
          retryable: true
        };
      }
      
      if (message.includes('invalid_client')) {
        return {
          type: OAuthErrorType.INVALID_CLIENT,
          message: error.message,
          userMessage: 'Client authentication failed',
          suggestion: 'Please check your client credentials or contact the server administrator',
          recoverable: false,
          retryable: false
        };
      }
      
      if (message.includes('invalid_grant')) {
        return {
          type: OAuthErrorType.INVALID_GRANT,
          message: error.message,
          userMessage: 'Authorization code is invalid or expired',
          suggestion: 'Please try the authorization process again',
          recoverable: true,
          retryable: true
        };
      }
      
      if (message.includes('invalid_scope')) {
        return {
          type: OAuthErrorType.INVALID_SCOPE,
          message: error.message,
          userMessage: 'Requested permissions are not available',
          suggestion: 'Please check the scope configuration or contact the server administrator',
          recoverable: false,
          retryable: false
        };
      }
      
      // PKCE 相关错误
      if (message.includes('code_challenge') || message.includes('code_verifier')) {
        return {
          type: OAuthErrorType.INVALID_CODE_VERIFIER,
          message: error.message,
          userMessage: 'Security verification failed',
          suggestion: 'Please try the authorization process again',
          recoverable: true,
          retryable: true
        };
      }
      
      if (message.includes('pkce') || message.includes('s256')) {
        return {
          type: OAuthErrorType.PKCE_NOT_SUPPORTED,
          message: error.message,
          userMessage: 'Server does not support required security features',
          suggestion: 'This server may not be compatible with OAuth 2.1 standards',
          recoverable: false,
          retryable: false
        };
      }
      
      // 状态和安全错误
      if (message.includes('state') && (message.includes('mismatch') || message.includes('invalid'))) {
        return {
          type: OAuthErrorType.STATE_MISMATCH,
          message: error.message,
          userMessage: 'Security verification failed - possible attack detected',
          suggestion: 'Please close all browser windows and try authorization again',
          recoverable: true,
          retryable: true
        };
      }
      
      // 元数据发现错误
      if (message.includes('metadata') || message.includes('well-known')) {
        return {
          type: OAuthErrorType.METADATA_DISCOVERY_FAILED,
          message: error.message,
          userMessage: 'Server configuration could not be discovered',
          suggestion: 'Please check the server URL or configure OAuth endpoints manually',
          recoverable: true,
          retryable: false
        };
      }
      
      // 用户取消
      if (message.includes('user') && message.includes('cancel')) {
        return {
          type: OAuthErrorType.USER_CANCELLED,
          message: error.message,
          userMessage: 'Authorization was cancelled',
          suggestion: 'Please try again when you\'re ready to authorize',
          recoverable: true,
          retryable: true
        };
      }
      
      // 回调超时
      if (message.includes('callback') && message.includes('timeout')) {
        return {
          type: OAuthErrorType.CALLBACK_TIMEOUT,
          message: error.message,
          userMessage: 'Authorization process timed out',
          suggestion: 'Please try again and complete the authorization more quickly',
          recoverable: true,
          retryable: true
        };
      }
      
      // 浏览器相关错误
      if (message.includes('browser') || message.includes('external')) {
        return {
          type: OAuthErrorType.BROWSER_ERROR,
          message: error.message,
          userMessage: 'Could not open authorization page',
          suggestion: 'Please check your default browser settings',
          recoverable: true,
          retryable: true
        };
      }
    }
    
    // 默认未知错误
    return {
      type: OAuthErrorType.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : String(error),
      userMessage: 'An unexpected error occurred during authorization',
      suggestion: 'Please try again or contact support if the problem persists',
      recoverable: true,
      retryable: true
    };
  }
  
  /**
   * 获取错误的恢复建议
   */
  static getRecoverySuggestion(errorType: OAuthErrorType): string {
    switch (errorType) {
      case OAuthErrorType.NETWORK_ERROR:
      case OAuthErrorType.TIMEOUT:
        return 'Check your internet connection and try again';
        
      case OAuthErrorType.ACCESS_DENIED:
        return 'Review the requested permissions and authorize again';
        
      case OAuthErrorType.INVALID_CLIENT:
        return 'Contact your administrator to verify client configuration';
        
      case OAuthErrorType.INVALID_SCOPE:
        return 'Adjust the requested permissions in OAuth configuration';
        
      case OAuthErrorType.METADATA_DISCOVERY_FAILED:
        return 'Configure OAuth endpoints manually in advanced settings';
        
      case OAuthErrorType.PKCE_NOT_SUPPORTED:
        return 'This server may not support OAuth 2.1 - contact the server administrator';
        
      case OAuthErrorType.USER_CANCELLED:
        return 'Try the authorization process again when ready';
        
      case OAuthErrorType.STATE_MISMATCH:
        return 'Clear browser data and restart the authorization process';
        
      default:
        return 'Try again or contact support if the problem persists';
    }
  }
  
  /**
   * 判断错误是否应该自动重试
   */
  static shouldAutoRetry(errorType: OAuthErrorType): boolean {
    const retryableErrors = [
      OAuthErrorType.NETWORK_ERROR,
      OAuthErrorType.TIMEOUT,
      OAuthErrorType.SERVER_ERROR,
      OAuthErrorType.TEMPORARILY_UNAVAILABLE
    ];
    
    return retryableErrors.includes(errorType);
  }
  
  /**
   * 判断错误是否需要用户干预
   */
  static requiresUserIntervention(errorType: OAuthErrorType): boolean {
    const userInterventionErrors = [
      OAuthErrorType.ACCESS_DENIED,
      OAuthErrorType.INVALID_CLIENT,
      OAuthErrorType.INVALID_SCOPE,
      OAuthErrorType.PKCE_NOT_SUPPORTED,
      OAuthErrorType.USER_CANCELLED,
      OAuthErrorType.UNSUPPORTED_SERVER
    ];
    
    return userInterventionErrors.includes(errorType);
  }
}