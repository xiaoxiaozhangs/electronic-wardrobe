import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { hapticLight } from '../../utils/haptic';
import { useWardrobeStore } from '../../hooks/useWardrobeStore';
import BottomNav from '../../components/BottomNav';

export default function SettingsPage() {
  const { items, outfits, loading, onlineMode, resetAllData } = useWardrobeStore();
  const availableItems = items.filter((i) => i.status === '正常');

  // 品类分布统计
  const byCategory: Record<string, number> = {};
  availableItems.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
  });

  // 颜色分布统计
  const byColor: Record<string, number> = {};
  availableItems.forEach((i) => {
    byColor[i.primaryColor] = (byColor[i.primaryColor] || 0) + 1;
  });
  const topColors = Object.entries(byColor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 高频穿着
  const topWorn = [...availableItems]
    .sort((a, b) => b.wearCount - a.wearCount)
    .slice(0, 5);

  // 闲置衣物
  const idleItems = availableItems.filter((i) => i.wearCount === 0);

  const handleReset = () => {
    hapticLight();
    Taro.showModal({
      title: '重置数据',
      content: '确定要重置所有数据吗？这将删除你添加的所有衣物和搭配，恢复为示例数据。此操作不可撤销！',
      confirmText: '确定重置',
      cancelText: '取消',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          resetAllData();
          Taro.showToast({ title: '数据已重置', icon: 'success' });
        }
      },
    });
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
      <Text className="section-title">我的</Text>

      {/* Stats */}
      <View className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <Text style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '20px', display: 'block' }}>
          📊 衣橱统计
        </Text>

        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <View style={statBoxStyle}>
            <Text style={{ fontSize: '40px', fontWeight: 700, color: '#111827', display: 'block' }}>{availableItems.length}</Text>
            <Text style={{ fontSize: '22px', color: '#6b7280', display: 'block' }}>总衣物数</Text>
          </View>
          <View style={statBoxStyle}>
            <Text style={{ fontSize: '40px', fontWeight: 700, color: '#111827', display: 'block' }}>{outfits.length}</Text>
            <Text style={{ fontSize: '22px', color: '#6b7280', display: 'block' }}>搭配方案数</Text>
          </View>
          <View style={statBoxStyle}>
            <Text style={{ fontSize: '40px', fontWeight: 700, color: '#111827', display: 'block' }}>
              {availableItems.filter((i) => i.isFavorite).length}
            </Text>
            <Text style={{ fontSize: '22px', color: '#6b7280', display: 'block' }}>收藏衣物</Text>
          </View>
          <View style={statBoxStyle}>
            <Text style={{ fontSize: '40px', fontWeight: 700, color: '#111827', display: 'block' }}>
              {outfits.filter((o) => o.isFavorite).length}
            </Text>
            <Text style={{ fontSize: '22px', color: '#6b7280', display: 'block' }}>收藏搭配</Text>
          </View>
        </View>

        {/* Category distribution */}
        {Object.keys(byCategory).length > 0 && (
          <View style={{ marginBottom: '20px' }}>
            <Text style={{ fontSize: '24px', fontWeight: 500, color: '#6b7280', marginBottom: '12px', display: 'block' }}>品类分布</Text>
            {Object.entries(byCategory).map(([cat, count]) => (
              <View key={cat} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <Text style={{ fontSize: '24px', color: '#6b7280', width: '100px' }}>{cat}</Text>
                <View style={{ flex: 1, height: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
                  <View style={{
                    height: '100%', borderRadius: '6px',
                    backgroundColor: '#f97316',
                    width: `${Math.round((count / availableItems.length) * 100)}%`,
                  }} />
                </View>
                <Text style={{ fontSize: '22px', color: '#6b7280', width: '50px', textAlign: 'right' }}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Color distribution */}
        {topColors.length > 0 && (
          <View>
            <Text style={{ fontSize: '24px', fontWeight: 500, color: '#6b7280', marginBottom: '12px', display: 'block' }}>常用颜色</Text>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {topColors.map(([color, count]) => (
                <View key={color} style={{
                  padding: '6px 14px', borderRadius: '20px',
                  backgroundColor: '#f3f4f6',
                }}>
                  <Text style={{ fontSize: '22px', color: '#6b7280' }}>{color} ({count})</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Top worn */}
      {topWorn.filter((i) => i.wearCount > 0).length > 0 && (
        <View className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <Text style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '16px', display: 'block' }}>
            👑 高频穿着
          </Text>
          {topWorn.filter((i) => i.wearCount > 0).map((item) => (
            <View key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Image src={item.imageBase64} mode="aspectFit"
                style={{ width: '56px', height: '56px', borderRadius: '8px', backgroundColor: '#f9fafb' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '26px', fontWeight: 500, display: 'block' }}>{item.subCategory}</Text>
                <Text style={{ fontSize: '22px', color: '#9ca3af', display: 'block' }}>
                  {item.primaryColor} · {item.category}
                </Text>
              </View>
              <Text style={{ fontSize: '22px', color: '#6b7280' }}>穿{item.wearCount}次</Text>
            </View>
          ))}
        </View>
      )}

      {/* Idle items */}
      {idleItems.length > 0 && (
        <View style={{
          backgroundColor: '#fff7ed', borderRadius: '20px',
          padding: '24px', marginBottom: '20px',
          border: '1px solid #fed7aa',
        }}>
          <Text style={{ fontSize: '28px', fontWeight: 700, color: '#c2410c', marginBottom: '12px', display: 'block' }}>
            💤 闲置衣物（{idleItems.length}件）
          </Text>
          <Text style={{ fontSize: '24px', color: '#c2410c', marginBottom: '12px', display: 'block' }}>
            以下衣物尚未穿着过，考虑搭配使用或断舍离
          </Text>
          <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {idleItems.map((item) => (
              <View key={item.id} style={{
                padding: '6px 14px', borderRadius: '20px',
                backgroundColor: '#fff', border: '1px solid #fed7aa',
              }}>
                <Text style={{ fontSize: '22px', color: '#c2410c' }}>{item.subCategory}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* About */}
      <View className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <Text style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '16px', display: 'block' }}>
          ℹ️ 关于
        </Text>
        <Text style={{ fontSize: '26px', color: '#6b7280', lineHeight: '1.6', display: 'block', marginBottom: '8px' }}>
          智搭衣橱 · 电子衣橱 v0.1
        </Text>
        <Text style={{ fontSize: '26px', color: '#6b7280', lineHeight: '1.6', display: 'block', marginBottom: '16px' }}>
          基于 Taro 构建的微信小程序版本，使用 CloudBase 云开发提供数据存储和云函数支持。
        </Text>
        <View style={{
          backgroundColor: '#f9fafb', borderRadius: '12px',
          padding: '16px',
        }}>
          <Text style={{ fontSize: '22px', color: '#9ca3af', lineHeight: '1.6', display: 'block' }}>
            {onlineMode
              ? '☁️ 当前使用 CloudBase 云端存储模式，数据将同步到云端数据库。'
              : '💡 当前使用本地存储模式。配置 CloudBase 环境 ID 并登录后，可启用云端数据同步。'}
          </Text>
        </View>
      </View>

      {/* Danger Zone */}
      <View className="card" style={{ padding: '24px', marginBottom: '20px', border: '1px solid #fecaca' }}>
        <Text style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444', marginBottom: '12px', display: 'block' }}>
          ⚠️ 数据管理
        </Text>
        <Text style={{ fontSize: '24px', color: '#6b7280', marginBottom: '16px', display: 'block' }}>
          重置将删除所有数据并恢复示例数据
        </Text>
        <View
          onClick={handleReset}
          style={{
            padding: '18px', textAlign: 'center',
            border: '1px solid #fecaca', borderRadius: '12px',
            fontSize: '26px', fontWeight: 500, color: '#ef4444',
          }}
        >
          <Text>重置所有数据</Text>
        </View>
      </View>
      <BottomNav activeKey="settings" />
    </View>
  );
}

const statBoxStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center',
  width: '45%',
  flexGrow: 1,
};
