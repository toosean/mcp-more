import { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useI18n } from '@/hooks/use-i18n';

import iconProd from '@/assets/icon.png';
import iconDev from '@/assets/icon-dev.png';

const icon = process.env.NODE_ENV === 'development' ? iconDev : iconProd; 

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const { t } = useI18n();

  useEffect(() => {
    // 检查初始最大化状态和平台信息
    window.windowControlAPI.isMaximized().then(setIsMaximized);
    window.appInfoAPI.getPlatform().then(platform => {
      setIsMac(platform === 'darwin');
    });

    // 监听窗口最大化状态变化事件
    const handleMaximizedChange = (_: any, maximized: boolean) => {
      setIsMaximized(maximized);
    };

    // 使用eventAPI监听窗口状态变化
    const unsubscribe = window.eventAPI.on('window:maximized', handleMaximizedChange);

    // 清理函数
    return unsubscribe;
  }, []);

  const handleMinimize = () => {
    window.windowControlAPI.minimize();
  };

  const handleMaximize = async () => {
    if (isMaximized) {
      await window.windowControlAPI.unmaximize();
      setIsMaximized(false);
    } else {
      await window.windowControlAPI.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = () => {
    window.windowControlAPI.close();
  };

  // macOS红绿灯按钮组件
  const MacTrafficLights = () => (
    <div className="flex items-center gap-2 px-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
      {/* 关闭按钮 - 红色 */}
      <button
        className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center group"
        onClick={handleClose}
        title={t('titleBar.close')}
      >
        <X className="w-2 h-2 text-red-800 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      {/* 最小化按钮 - 黄色 */}
      <button
        className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors flex items-center justify-center group"
        onClick={handleMinimize}
        title={t('titleBar.minimize')}
      >
        <Minus className="w-2 h-2 text-yellow-800 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      {/* 最大化按钮 - 绿色 */}
      <button
        className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center group"
        onClick={handleMaximize}
        title={isMaximized ? t('titleBar.restore') : t('titleBar.maximize')}
      >
        {isMaximized ? 
          <Copy className="w-2 h-2 text-green-800 opacity-0 group-hover:opacity-100 transition-opacity" /> :
          <Square className="w-1.5 h-1.5 text-green-800 opacity-0 group-hover:opacity-100 transition-opacity" />
        }
      </button>
    </div>
  );

  // Windows风格按钮组件
  const WindowsControls = () => (
    <div className="flex" style={{ WebkitAppRegion: 'no-drag' } as any}>
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 hover:bg-muted rounded-none ${
          isDevelopment ? 'bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-200 dark:hover:bg-orange-800/50' : ''
        }`}
        onClick={handleMinimize}
        title={isDevelopment ? t('titleBar.devMode.customMinimize') : t('titleBar.minimize')}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 hover:bg-muted rounded-none ${
          isDevelopment ? 'bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-200 dark:hover:bg-orange-800/50' : ''
        }`}
        onClick={handleMaximize}
        title={isDevelopment ? t('titleBar.devMode.customMaximizeRestore') : (isMaximized ? t('titleBar.restore') : t('titleBar.maximize'))}
      >
        {isMaximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 rounded-none ${
          isDevelopment 
            ? 'bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-300 dark:hover:bg-orange-700/50 hover:text-destructive' 
            : 'hover:bg-destructive hover:text-destructive-foreground'
        }`}
        onClick={handleClose}
        title={isDevelopment ? t('titleBar.devMode.customClose') : t('titleBar.close')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className={`flex items-center bg-background border-b border-border h-8 select-none ${
      isDevelopment ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' : ''
    } ${isMac ? 'justify-center' : 'justify-between'}`}>
      
      {isMac ? (
        <>
          {/* macOS布局：左侧红绿灯按钮 */}
          <div className="absolute left-0 top-0 h-8 flex items-center">
            <MacTrafficLights />
          </div>
          
          {/* macOS布局：居中的标题和Logo */}
          <div
            className="flex items-center gap-2"
            style={{ WebkitAppRegion: 'drag' } as any}
          >
            <img
              src={icon}
              alt="MCP More"
              className="w-4 h-4 flex-shrink-0"
            />
            <span className="text-sm font-medium text-foreground">
              MCP More
              <span className="ml-2 text-xs px-2 py-0.5 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded">
                Preview
              </span>
              
            </span>
          </div>
        </>
      ) : (
        <>
          {/* Windows布局：左侧标题和Logo */}
          <div
            className="flex-1 flex items-center px-4 h-full gap-2"
            style={{ WebkitAppRegion: 'drag' } as any}
          >
            <img
              src={icon}
              alt="MCP More"
              className="w-5 h-5 flex-shrink-0"
            />
            <span className="text-sm font-medium text-foreground">
              MCP More
              <span className="ml-2 text-xs px-2 py-0.5 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded">
                Preview
              </span>

            </span>
          </div>
          
          {/* Windows布局：右侧控制按钮 */}
          <WindowsControls />
        </>
      )}
    </div>
  );
}