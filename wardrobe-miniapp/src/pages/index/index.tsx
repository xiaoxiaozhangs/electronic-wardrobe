/* 首页 */
import styles from './index.module.scss';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useWardrobeStore } from '../../hooks/useWardrobeStore';
import OutfitCard from '../../components/OutfitCard';
import EmptyState from '../../components/EmptyState';
import BottomNav from '../../components/BottomNav';

export default function HomePage() {
  const {
    items, outfits, loading,
    toggleOutfitFavorite, setOutfitFeedback,
  } = useWardrobeStore();

  const availableItems = items.filter((i) => i.status === '正常');
  const favoriteOutfits = outfits.filter((o) => o.isFavorite);
  const recentOutfits = outfits.slice(0, 3);

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
          <Text className="loading-spinner-icon">⏳</Text>
          <Text className="loading-text">加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="container">
      {/* Welcome */}
      <View className={styles.welcomeBanner}>
        <Text className={styles.welcomeTitle}>智搭衣橱</Text>
        <Text className={styles.welcomeSubtitle}>
          {stats.total > 0
            ? `你有 ${stats.total} 件衣物，今天穿什么？`
            : '开始添加你的第一件衣物吧'}
        </Text>
        <View className={styles.welcomeActions}>
          <View className={styles.welcomeActionBtn} onClick={() => goToPage('outfit')}>
            <Text>✨ 生成今日搭配</Text>
          </View>
          <View className={styles.welcomeActionBtnSmall} onClick={() => goToPage('wardrobe')}>
            <Text>📷 添加衣物</Text>
          </View>
        </View>
      </View>

      {/* Wardrobe overview */}
      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>衣橱概览</Text>
          <View onClick={() => goToPage('wardrobe')}>
            <Text className={styles.sectionLink}>查看全部 →</Text>
          </View>
        </View>

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

      {/* Recent outfits */}
      {recentOutfits.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>最近搭配</Text>
            <View onClick={() => goToPage('outfit')}>
              <Text className={styles.sectionLink}>更多搭配 →</Text>
            </View>
          </View>
          {recentOutfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              items={items}
              onToggleFavorite={() => toggleOutfitFavorite(outfit.id)}
              onFeedback={(fb) => setOutfitFeedback(outfit.id, fb)}
            />
          ))}
        </View>
      )}

      {/* Favorite outfits */}
      {favoriteOutfits.length > 0 && (
        <View className={styles.section}>
          <View style={{ marginBottom: '20px' }}>
            <Text className={styles.sectionTitle}>❤️ 收藏搭配</Text>
          </View>
          {favoriteOutfits.slice(0, 2).map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              items={items}
              onToggleFavorite={() => toggleOutfitFavorite(outfit.id)}
            />
          ))}
        </View>
      )}

      {/* Tip */}
      {stats.total > 0 && stats.total < 10 && (
        <View className="tip-card tip-info">
          <Text>
            💡 你只有 {stats.total} 件衣物，建议至少添加 10 件以获得更好的搭配推荐效果。
          </Text>
        </View>
      )}

      <BottomNav activeKey="index" />
    </View>
  );
}
