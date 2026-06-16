/**
 * 图片懒加载 Hook（Taro 版本）
 *
 * 使用 wx.createIntersectionObserver 检测图片是否进入视口，
 * 仅在图片接近视口时才触发加载，减少首屏请求数。
 *
 * 用法：
 *   const { observerRef, isVisible } = useImageLazyLoad({ threshold: 0.1 });
 *   // 将 observerRef 绑定到图片容器，isVisible 为 true 时渲染 <Image>
 *
 * 注意：每个 Hook 实例独立管理触发状态，多个卡片同时使用时互不干扰。
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Taro from '@tarojs/taro';

export interface LazyLoadOptions {
  /** 提前多少比例触发加载（0-1），默认 0.1 表示元素进入视口 10% 时触发 */
  threshold?: number;
  /** 初始是否可见（用于首屏优先加载），默认 false */
  initialVisible?: boolean;
  /** 提前加载的像素距离（向下扩展视口），默认 100px */
  margins?: { bottom?: number; top?: number };
}

export interface LazyLoadResult {
  /** 绑定到目标元素的 ref 回调 */
  observerRef: (node: any) => void;
  /** 当前元素是否应加载图片 */
  isVisible: boolean;
}

export function useImageLazyLoad(options: LazyLoadOptions = {}): LazyLoadResult {
  const { threshold = 0.1, initialVisible = false, margins } = options;
  const [isVisible, setIsVisible] = useState(initialVisible);
  const observerRef = useRef<Taro.IntersectionObserver | null>(null);
  // 每个 hook 实例用自己的局部变量管理触发状态，通过闭包隔离
  const localTriggered = useRef(false);

  const setNodeRef = useCallback(
    (node: any) => {
      // 如果当前实例已触发，不再重复创建观察器
      if (localTriggered.current) return;

      // 断开旧的观察器
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node) return;

      // 小程序环境使用 createIntersectionObserver
      if (process.env.TARO_ENV === 'weapp') {
        try {
          observerRef.current = Taro.createIntersectionObserver(node, {
            thresholds: [threshold],
            initialRatio: 0,
            observeAll: false,
          });

          observerRef.current
            .relativeToViewport({
              bottom: margins?.bottom ?? 100,
              top: margins?.top ?? 0,
            })
            .observe('.lazy-img-target', (res) => {
              // 使用闭包中的 localTriggered，而非外部共享状态
              // 每个 hook 实例的回调只影响自己的 isVisible
              if (res.intersectionRatio > 0 && !localTriggered.current) {
                localTriggered.current = true;
                setIsVisible(true);
                // 触发后立即断开，释放资源
                if (observerRef.current) {
                  observerRef.current.disconnect();
                  observerRef.current = null;
                }
              }
            });
        } catch (err) {
          // 降级：直接标记为可见
          console.warn('[LazyLoad] IntersectionObserver 创建失败，降级为立即加载:', err);
          localTriggered.current = true;
          setIsVisible(true);
        }
      } else {
        // H5 环境降级：直接加载
        localTriggered.current = true;
        setIsVisible(true);
      }
    },
    [threshold, margins]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  return { observerRef: setNodeRef, isVisible };
}
