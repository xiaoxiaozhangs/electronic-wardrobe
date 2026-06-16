/**
 * 瀑布流卡片组件
 *
 * 功能：
 *  - 3:4 比例卡片
 *  - 图片懒加载（IntersectionObserver）
 *  - 图片加载完成 fade-in 渐入动效（200ms opacity 0→1）
 *  - 加载中骨架屏占位
 *  - 加载失败占位图
 */

import { View, Text, Image } from '@tarojs/components';
import { useState, useCallback } from 'react';
import type { WardrobeItem } from '../types';
import { COLOR_MAP, CATEGORY_ICONS } from '../types';
import { useImageLazyLoad } from '../hooks/useImageLazyLoad';

interface WaterfallCardProps {
  item: WardrobeItem;
  onClick?: () => void;
  onToggleFavorite?: () => void;
}

export default function WaterfallCard({ item, onClick, onToggleFavorite }: WaterfallCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { observerRef, isVisible } = useImageLazyLoad({
    threshold: 0.05,
    margins: { bottom: 150 },
  });

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true); // 也标记为完成以显示占位
  }, []);

  return (
    <View
      className="waterfall-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
      }}
      onClick={onClick}
    >
      {/* 图片区域（3:4 比例） */}
      <View
        ref={observerRef}
        className="waterfall-card-img lazy-img-target"
        style={{
          width: '100%',
          aspectRatio: '3 / 4',
          backgroundColor: '#f3f4f6',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 骨架屏占位（图片未加载时显示） */}
        {!imageLoaded && (
          <View
            className="skeleton-block"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#e5e7eb',
              animation: 'skeleton-pulse 1.5s ease-in-out infinite',
            }}
          />
        )}

        {/* 实际图片（可见时才加载） */}
        {isVisible && !imageError && (
          <Image
            src={item.imageBase64}
            mode="aspectFill"
            className={imageLoaded ? 'fade-in' : ''}
            style={{
              width: '100%',
              height: '100%',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 200ms ease-in-out',
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}

        {/* 图片加载失败占位 */}
        {imageError && (
          <View
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f9fafb',
            }}
          >
            <Text style={{ fontSize: '48px', display: 'block' }}>🖼️</Text>
            <Text style={{ fontSize: '20px', color: '#9ca3af', marginTop: '8px' }}>图片加载失败</Text>
          </View>
        )}

        {/* 穿着次数角标 */}
        {item.wearCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: '12px',
              padding: '2px 10px',
            }}
          >
            <Text style={{ color: '#fff', fontSize: '20px' }}>
              穿{item.wearCount}次
            </Text>
          </View>
        )}

        {/* 收藏按钮 */}
        {onToggleFavorite && (
          <View
            onClick={(e: any) => {
              e.stopPropagation?.();
              onToggleFavorite();
            }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <Text style={{ fontSize: '20px' }}>
              {item.isFavorite ? '❤️' : '🤍'}
            </Text>
          </View>
        )}
      </View>

      {/* 信息区域 */}
      <View style={{ padding: '12px' }}>
        {/* 品类名称 */}
        <View style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
          <Text style={{ fontSize: '20px', marginRight: '4px' }}>
            {CATEGORY_ICONS[item.category]}
          </Text>
          <Text
            style={{
              fontSize: '24px',
              fontWeight: 500,
              color: '#111827',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.subCategory}
          </Text>
        </View>

        {/* 颜色 + 标签 */}
        <View style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', gap: '4px' }}>
          <View
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: COLOR_MAP[item.primaryColor],
              border: '1px solid #d1d5db',
            }}
          />
          <Text style={{ fontSize: '20px', color: '#6b7280' }}>
            {item.primaryColor}
          </Text>
        </View>

        {/* 标签 */}
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {item.seasons.slice(0, 2).map((s) => (
            <Text
              key={s}
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                fontSize: '18px',
                fontWeight: 500,
              }}
            >
              {s}
            </Text>
          ))}
          {item.scenarios.slice(0, 1).map((s) => (
            <Text
              key={s}
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#f0fdf4',
                color: '#22c55e',
                fontSize: '18px',
                fontWeight: 500,
              }}
            >
              {s}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}
