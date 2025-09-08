import React, { useEffect, useState, useMemo } from 'react';

// 添加 CSS 动画样式
const initStyles = (() => {
  let initialized = false;
  return () => {
    if (initialized) return;
    initialized = true;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes odometerSlideUp {
        0% {
          transform: translate3d(0, 100%, 0);
          opacity: 0;
        }
        50% {
          opacity: 0.7;
        }
        100% {
          transform: translate3d(0, 0, 0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  };
})();

interface SingleDigitProps {
  digit: string;
  previousDigit?: string;
  shouldAnimate: boolean;
}

const SingleDigit: React.FC<SingleDigitProps> = ({ 
  digit, 
  previousDigit, 
  shouldAnimate 
}) => {
  const [currentDigit, setCurrentDigit] = useState(previousDigit || digit);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (digit !== currentDigit) {
      if (shouldAnimate) {
        setIsFlipping(true);
        
        const timer = setTimeout(() => {
          setCurrentDigit(digit);
          setIsFlipping(false);
        }, 400);
        
        return () => clearTimeout(timer);
      } else {
        setCurrentDigit(digit);
      }
    }
  }, [digit, currentDigit, shouldAnimate]);

  return (
    <div className="relative inline-block w-4 h-8 overflow-hidden transform-gpu">
      {/* 当前数字 */}
      <div
        className={`absolute inset-0 flex items-center justify-center font-mono font-bold will-change-transform ${
          isFlipping 
            ? 'transition-all duration-[400ms] ease-in-out -translate-y-full opacity-0' 
            : 'translate-y-0 opacity-100'
        }`}
        style={{ 
          backfaceVisibility: 'hidden',
          transform: !isFlipping ? 'translate3d(0, 0, 0)' : undefined
        }}
      >
        {currentDigit}
      </div>
      
      {/* 滑入的新数字 */}
      {isFlipping && (
        <div
          className="absolute inset-0 flex items-center justify-center font-mono font-bold will-change-transform"
          style={{ 
            backfaceVisibility: 'hidden',
            animation: 'odometerSlideUp 400ms ease-in-out forwards'
          }}
        >
          {digit}
        </div>
      )}
    </div>
  );
};

interface OdometerProps {
  value: number;
  className?: string;
}

export const Odometer: React.FC<OdometerProps> = ({ value, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [hasAnimated, setHasAnimated] = useState(false);

  // 创建数字位置映射（个位=0，十位=1...）
  const createDigitPositions = (formattedNumber: string) => {
    const chars = formattedNumber.split('');
    const positions = new Map<number, string>();
    let digitIndex = 0;
    
    for (let i = chars.length - 1; i >= 0; i--) {
      const char = chars[i];
      if (char !== ',') {
        positions.set(digitIndex, char);
        digitIndex++;
      }
    }
    return positions;
  };

  // 格式化数字并创建显示项
  const displayItems = useMemo(() => {
    const formatted = displayValue.toLocaleString();
    const items: Array<{
      type: 'digit' | 'comma';
      position?: number;
      char: string;
      key: string;
    }> = [];
    
    let digitIndex = 0;
    for (let i = formatted.length - 1; i >= 0; i--) {
      const char = formatted[i];
      if (char === ',') {
        items.unshift({
          type: 'comma',
          char,
          key: `comma-${i}`
        });
      } else {
        items.unshift({
          type: 'digit',
          position: digitIndex,
          char,
          key: `digit-${digitIndex}`
        });
        digitIndex++;
      }
    }
    
    return items;
  }, [displayValue]);

  // 获取之前的数字位置映射
  const previousDigits = useMemo(() => {
    return createDigitPositions(previousValue.toLocaleString());
  }, [previousValue]);

  // 处理数值变化
  useEffect(() => {
    if (value !== displayValue) {
      if (!hasAnimated) {
        // 首次加载：直接设置，无动画
        setDisplayValue(value);
        setHasAnimated(true);
      } else {
        // 后续更新：保存旧值并延迟更新以触发动画
        setPreviousValue(displayValue);
        
        const timer = setTimeout(() => {
          setDisplayValue(value);
        }, 50);
        
        return () => clearTimeout(timer);
      }
    }
  }, [value, displayValue, hasAnimated]);

  // 初始化样式
  useEffect(() => {
    initStyles();
  }, []);

  return (
    <div className={`inline-flex items-center -space-x-px ${className}`}>
      {displayItems.map((item) => {
        if (item.type === 'comma') {
          return (
            <span key={item.key} className="mx-0.5 font-mono font-bold">
              ,
            </span>
          );
        }

        const previousDigit = previousDigits.get(item.position!);
        
        return (
          <SingleDigit
            key={item.key}
            digit={item.char}
            previousDigit={previousDigit || '0'}
            shouldAnimate={hasAnimated}
          />
        );
      })}
    </div>
  );
};