import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { hapticLight } from '../../utils/haptic';
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
    hapticLight();
    Taro.redirectTo({ url: `/pages/${tab}/${tab}` });
  };

  if (loading) {
    return (
      <View className="container">
        <View className="loading-spinner">
          <Text className="loading-spinner-icon">⏳</Text>
          <Text style={{ fontSize: '26px', color: '#9ca3af', marginTop: '16px' }}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="container">
      {/* Welcome section */}
      <View style={{
        background: 'linear-gradient(135deg, #f97316, #fb923c)',
        borderRadius: '24px', padding: '32px', color: '#fff',
        marginBottom: '28px',
      }}>
        <Text style={{ fontSize: '36px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>智搭衣橱</Text>
        <Text style={{ fontSize: '26px', color: 'rgba(255,255,255,0.85)', display: 'block' }}>
          {stats.total > 0
            ? `你有 ${stats.total} 件衣物，今天穿什么？`
            : '开始添加你的第一件衣物吧'}
        </Text>

        <View style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <View
            onClick={() => goToPage('outfit')}
            style={{
              flex: 1, padding: '20px', borderRadius: '16px',
              backgroundColor: 'rgba(255,255,255,0.2)', textAlign: 'center',
              fontSize: '26px', fontWeight: 500,
            }}
          >
            <Text>✨ 生成今日搭配</Text>
          </View>
          <View
            onClick={() => goToPage('wardrobe')}
            style={{
              padding: '20px', borderRadius: '16px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontSize: '26px', fontWeight: 500,
            }}
          >
            <Text>📷 添加衣物</Text>
          </View>
        </View>
      </View>

      {/* Wardrobe overview */}
      <View style={{ marginBottom: '28px' }}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Text style={{ fontSize: '30px', fontWeight: 700, color: '#111827' }}>衣橱概览</Text>
          <View onClick={() => goToPage('wardrobe')}>
            <Text style={{ fontSize: '24px', color: '#f97316', fontWeight: 500 }}>查看全部 →</Text>
          </View>
        </View>

        {stats.total > 0 ? (
          <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[
              { label: '上衣', value: stats['上衣'], icon: '👔' },
              { label: '下装', value: stats['下装'], icon: '👖' },
              { label: '连衣裙', value: stats['连衣裙'], icon: '👗' },
              { label: '外套', value: stats['外套'], icon: '🧥' },
              { label: '鞋', value: stats['鞋'], icon: '👟' },
              { label: '包/配饰', value: stats['包配饰'], icon: '💍' },
            ].map((cat) => (
              <View key={cat.label} style={{
                width: '30%', flexGrow: 1,
                backgroundColor: '#f9fafb', borderRadius: '16px',
                padding: '20px', textAlign: 'center',
              }}>
                <Text style={{ fontSize: '40px', display: 'block' }}>{cat.icon}</Text>
                <Text style={{ fontSize: '22px', color: '#6b7280', marginTop: '6px', display: 'block' }}>{cat.label}</Text>
                <Text style={{ fontSize: '30px', fontWeight: 700, color: '#111827', display: 'block' }}>{cat.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ backgroundColor: '#f9fafb', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
            <Text style={{ fontSize: '56px', display: 'block', marginBottom: '12px' }}>👗</Text>
            <Text style={{ fontSize: '26px', color: '#6b7280', display: 'block', marginBottom: '20px' }}>还没有衣物，去添加吧</Text>
            <View className="btn-primary" style={{ display: 'inline-flex' }}
              onClick={() => goToPage('wardrobe')}>
              添加第一件衣物
            </View>
          </View>
        )}
      </View>

      {/* Recent outfits */}
      {recentOutfits.length > 0 && (
        <View style={{ marginBottom: '28px' }}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Text style={{ fontSize: '30px', fontWeight: 700, color: '#111827' }}>最近搭配</Text>
            <View onClick={() => goToPage('outfit')}>
              <Text style={{ fontSize: '24px', color: '#f97316', fontWeight: 500 }}>更多搭配 →</Text>
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
        <View style={{ marginBottom: '28px' }}>
          <View style={{ marginBottom: '20px' }}>
            <Text style={{ fontSize: '30px', fontWeight: 700, color: '#111827' }}>❤️ 收藏搭配</Text>
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
        <View style={{
          backgroundColor: '#eff6ff', borderRadius: '16px',
          padding: '20px', border: '1px solid #bfdbfe',
        }}>
          <Text style={{ fontSize: '26px', color: '#1d4ed8', display: 'block' }}>
            💡 你只有 {stats.total} 件衣物，建议至少添加 10 件以获得更好的搭配推荐效果。
          </Text>
        </View>
      )}

      <BottomNav activeKey="index" />
    </View>
  );
}
