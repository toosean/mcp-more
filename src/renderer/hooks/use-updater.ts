import { useState, useEffect, useCallback } from 'react';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond?: number;
}

interface UpdaterState {
  isVisible: boolean;
  progress: number;
  updateInfo: UpdateInfo | null;
  error: string | null;
  // 新增：更新可用状态
  isUpdateAvailable: boolean;
  availableUpdateInfo: UpdateInfo | null;
}

export const useUpdater = () => {
  const [state, setState] = useState<UpdaterState>({
    isVisible: false,
    progress: 0,
    updateInfo: null,
    error: null,
    isUpdateAvailable: false,
    availableUpdateInfo: null
  });

  // 显示更新遮罩
  const handleShowOverlay = useCallback((updateInfo: UpdateInfo) => {
    setState(prev => ({
      ...prev,
      isVisible: true,
      updateInfo,
      progress: 0,
      error: null
    }));
  }, []);

  // 隐藏更新遮罩
  const handleHideOverlay = useCallback(() => {
    setState(prev => ({
      ...prev,
      isVisible: false,
      updateInfo: null,
      progress: 0,
      error: null
    }));
  }, []);

  // 更新进度
  const handleProgress = useCallback((progress: UpdateProgress) => {
    setState(prev => ({
      ...prev,
      progress: progress.percent
    }));
  }, []);

  // 下载完成
  const handleDownloadComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      progress: 100
    }));
  }, []);

  // 更新出错
  const handleError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error,
      isVisible: false
    }));
  }, []);

  // 处理更新可用事件
  const handleUpdateAvailable = useCallback((updateInfo: UpdateInfo) => {
    setState(prev => ({
      ...prev,
      isUpdateAvailable: true,
      availableUpdateInfo: updateInfo
    }));
  }, []);

  // 用户选择下载更新
  const confirmDownload = useCallback(async () => {
    if (!state.availableUpdateInfo) return;
    
    try {
      // 调用IPC来开始下载
      const result = await window.updaterAPI.confirmDownload();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          isUpdateAvailable: false,
          availableUpdateInfo: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || '开始下载失败'
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: '开始下载时发生错误'
      }));
    }
  }, [state.availableUpdateInfo]);

  // 用户选择稍后提醒
  const dismissUpdate = useCallback(() => {
    setState(prev => ({
      ...prev,
      isUpdateAvailable: false,
      availableUpdateInfo: null
    }));
  }, []);

  // 取消下载
  const cancelDownload = useCallback(async () => {
    try {
      const result = await window.updaterAPI.cancelDownload();
      if (result.success) {
        handleHideOverlay();
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || '取消下载失败'
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: '取消下载时发生错误'
      }));
    }
  }, [handleHideOverlay]);

  useEffect(() => {
    // 注册事件监听器
    const unsubscribeShowOverlay = window.updaterAPI.onShowOverlay(handleShowOverlay);
    const unsubscribeHideOverlay = window.updaterAPI.onHideOverlay(handleHideOverlay);
    const unsubscribeProgress = window.updaterAPI.onProgress(handleProgress);
    const unsubscribeDownloadComplete = window.updaterAPI.onDownloadComplete(handleDownloadComplete);
    const unsubscribeError = window.updaterAPI.onError(handleError);
    const unsubscribeUpdateAvailable = window.updaterAPI.onUpdateAvailable(handleUpdateAvailable);

    return () => {
      // 清理事件监听器
      unsubscribeShowOverlay();
      unsubscribeHideOverlay();
      unsubscribeProgress();
      unsubscribeDownloadComplete();
      unsubscribeError();
      unsubscribeUpdateAvailable();
    };
  }, [
    handleShowOverlay,
    handleHideOverlay,
    handleProgress,
    handleDownloadComplete,
    handleError,
    handleUpdateAvailable
  ]);

  return {
    ...state,
    cancelDownload,
    confirmDownload,
    dismissUpdate,
    clearError: useCallback(() => {
      setState(prev => ({ ...prev, error: null }));
    }, [])
  };
};