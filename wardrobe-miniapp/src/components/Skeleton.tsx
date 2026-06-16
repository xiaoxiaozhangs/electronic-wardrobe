/**
 * 骨架屏组件
 *
 * 在列表数据加载前展示灰色占位块，提升加载感知体验。
 * 支持两种模式：
 *  - waterfall: 两列瀑布流骨架（默认 6 个卡片）
 *  - card: 单个卡片骨架
 */

import { View } from '@tarojs/components';

interface SkeletonProps {
  /** 骨架屏类型 */
  type?: 'waterfall' | 'card';
  /** 瀑布流模式下显示的骨架卡片数量，默认 6 */
  count?: number;
}

/** 单个骨架卡片 */
function SkeletonCard() {
  return (
    <View
      className="skeleton-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* 图片占位（3:4 比例） */}
      <View
        className="skeleton-block"
        style={{
          width: '100%',
          aspectRatio: '3 / 4',
          backgroundColor: '#e5e7eb',
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }}
      />
      {/* 文字占位 */}
      <View style={{ padding: '12px' }}>
        <View
          className="skeleton-block"
          style={{
            width: '70%',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: '#e5e7eb',
            marginBottom: '8px',
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
          }}
        />
        <View
          className="skeleton-block"
          style={{
            width: '50%',
            height: '20px',
            borderRadius: '6px',
            backgroundColor: '#e5e7eb',
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
          }}
        />
      </View>
    </View>
  );
}

export default function Skeleton({ type = 'waterfall', count = 6 }: SkeletonProps) {
  if (type === 'card') {
    return <SkeletonCard />;
  }

  // 瀑布流：两列布局
  const cards = Array.from({ length: count }, (_, i) => i);

  return (
    <View className="waterfall-grid">
      {cards.map((i) => (
        <View key={i} className="waterfall-col">
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}
