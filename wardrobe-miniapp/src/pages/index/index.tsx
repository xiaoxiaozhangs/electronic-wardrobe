/* 首页 - iOS 风格版 */
import styles from './index.module.scss';
import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useWardrobeStore } from '../../hooks/useWardrobeStore';
import OutfitCard from '../../components/OutfitCard';
import EmptyState from '../../components/EmptyState';
import BottomNav from '../../components/BottomNav';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

export default function HomePage() {
  const {
    items, outfits, loading,
    toggleOutfitFavorite, setOutfitFeedback,
  } = useWardrobeStore();

  const availableItems = items.filter((i) => i.status === '正常');
  const favoriteOutfits = outfits.filter((o) => o.isFavorite);
  const recentOutfits = outfits.slice(0, 3);
  const [outfitTab, setOutfitTab] = useState<'recent' | 'favorite'>('recent');

  const stats = {
    total: availableItems.length,
    上衣: availableItems.filter((i) => i.category === '上衣').length,
    下装: availableItems.filter((i) => i.category === '下装').length,
    连衣裙: availableItems.filter((i) => i.category === '连衣裙').length,
    外套: availableItems.filter((i) => i.category === '外套').length,
    鞋: availableItems.filter((i) => i.category === '鞋').length,
    包配饰: availableItems.filter((i) => i.category === '包' || i.category === '配饰').length,
  };

  const goToPage = (tab: string) => {
    Taro.redirectTo({ url: `/pages/${tab}/${tab}` });
  };

  if (loading) {
    return (
      <View className="container">
        <View className="loading-spinner">
          <View className="loading-spinner-icon" />
          <Text className="loading-text">加载中...</Text>
        </View>
      </View>
    );
  }

  const displayOutfits = outfitTab === 'recent' ? recentOutfits : favoriteOutfits;

  return (
    <View className="container">
      {/* Welcome Banner — iOS 浅蓝渐变 */}
      <View className={styles.welcomeBanner}>
        <Text className={styles.welcomeGreeting}>☀️ {getGreeting()}</Text>
        <Text className={styles.welcomeSubtitle}>
          {stats.total > 0
            ? `你有 ${stats.total} 件衣物，今天穿什么？`
            : '开始添加你的第一件衣物吧'}
        </Text>
        <View className={styles.welcomeActions}>
          <View className={styles.welcomeActionBtn} onClick={() => goToPage('outfit')}>
            <Text>✨ 生成今日搭配</Text>
          </View>
          <View className={styles.welcomeActionBtn} onClick={() => goToPage('wardrobe')}>
            <Text>📷 添加衣物</Text>
          </View>
        </View>
      </View>

      {/* Wardrobe overview — 白色卡片 3×2 网格 */}
      <View className={styles.section}>
        <Text className={`section-title ${styles.sectionTitle}`}>衣橱概览</Text>

        {stats.total > 0 ? (
          <View className={styles.categoryGrid}>
            {[
              { label: '上衣', value: stats['上衣'], icon: '👔' },
              { label: '下装', value: stats['下装'], icon: '👖' },
              { label: '连衣裙', value: stats['连衣裙'], icon: '👗' },
              { label: '外套', value: stats['外套'], icon: '🧥' },
              { label: '鞋', value: stats['鞋'], icon: '👟' },
              { label: '包/配饰', value: stats['包配饰'], icon: '💍' },
            ].map((cat) => (
              <View key={cat.label} className={styles.categoryItem}>
                <Text className={styles.categoryIcon}>{cat.icon}</Text>
                <Text className={styles.categoryLabel}>{cat.label}</Text>
                <Text className={styles.categoryCount}>{cat.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View className={styles.emptyWardrobe}>
            <Text className={styles.emptyIcon}>👗</Text>
            <Text className={styles.emptyText}>还没有衣物，去添加吧</Text>
            <View className="btn-primary" style={{ display: 'inline-flex' }}
              onClick={() => goToPage('wardrobe')}>
              添加第一件衣物
            </View>
          </View>
        )}
      </View>

      {/* 搭配区域 — 分段控制器 + 毛玻璃卡片 */}
      {(recentOutfits.length > 0 || favoriteOutfits.length > 0) && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>搭配</Text>
            <View className="segment-control" style={{ marginBottom: 0 }}>
              <View
                onClick={() => setOutfitTab('recent')}
                className={`segment-item ${outfitTab === 'recent' ? 'segment-item-active' : ''}`}
              >
                <Text>最近</Text>
              </View>
              <View
                onClick={() => setOutfitTab('favorite')}
                className={`segment-item ${outfitTab === 'favorite' ? 'segment-item-active' : ''}`}
              >
                <Text>收藏</Text>
              </View>
            </View>
          </View>
          {displayOutfits.length > 0 ? (
            displayOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                items={items}
                onToggleFavorite={() => toggleOutfitFavorite(outfit.id)}
                onFeedback={(fb) => setOutfitFeedback(outfit.id, fb)}
              />
            ))
          ) : (
            <Text className={styles.emptyTab}>暂无搭配</Text>
          )}
        </View>
      )}

      {/* Tip — 轻量 banner 条 */}
      {stats.total > 0 && stats.total < 10 && (
        <View className={`tip-card tip-info ${styles.tipBanner}`}>
          <Text>💡 建议至少添加 10 件衣物以获得更好的搭配推荐效果</Text>
        </View>
      )}

      <BottomNav activeKey="index" />
    </View>
  );
}
