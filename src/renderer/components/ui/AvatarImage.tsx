import { useState, useEffect } from 'react';

interface AvatarImageProps {
  /** 头像文件路径 */
  avatarPath: string | null;
  /** 替代文本 */
  alt: string;
  /** CSS 类名 */
  className?: string;
  /** 加载失败时的回调 */
  onError?: () => void;
}

/**
 * 头像图片组件
 * 负责从本地文件路径加载头像并显示为 data URL
 */
export default function AvatarImage({ avatarPath, alt, className, onError }: AvatarImageProps) {
  const [dataURL, setDataURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!avatarPath) {
      setDataURL(null);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    // 从主进程获取 data URL
    window.avatarAPI.getDataURL(avatarPath)
      .then((url) => {
        if (url) {
          setDataURL(url);
        } else {
          setError(true);
          onError?.();
        }
      })
      .catch((err) => {
        console.error('Failed to load avatar:', err);
        setError(true);
        onError?.();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [avatarPath, onError]);

  // 如果没有头像路径，不渲染任何内容
  if (!avatarPath) {
    return null;
  }

  // 如果加载失败或错误，不渲染任何内容
  if (error || (!loading && !dataURL)) {
    return null;
  }

  // 如果还在加载中，显示占位符
  if (loading) {
    return (
      <div
        className={`bg-muted animate-pulse ${className || ''}`}
        style={{ aspectRatio: '1' }}
      />
    );
  }

  // 显示头像
  return (
    <img
      src={dataURL || ''}
      alt={alt}
      className={className}
      onError={() => {
        setError(true);
        onError?.();
      }}
    />
  );
}