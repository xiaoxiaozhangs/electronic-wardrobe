/* 我的 - iOS 风格版 */
import styles from './settings.module.scss';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useWardrobeStore } from '../../hooks/useWardrobeStore';
import BottomNav from '../../components/BottomNav';

export default function SettingsPage() {
  const { items, outfits, loading, onlineMode, resetAllData } = useWardrobeStore();
  const availableItems = items.filter((i) => i.status === '正常');

  const byCategory: Record<string, number> = {};
  availableItems.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
  });

  const byColor: Record<string, number> = {};
  availableItems.forEach((i) => {
    byColor[i.primaryColor] = (byColor[i.primaryColor] || 0) + 1;
  });
  const topColors = Object.entries(byColor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topWorn = [...availableItems]
    .sort((a, b) => b.wearCount - a.wearCount)
    .slice(0, 5);

  const idleItems = availableItems.filter((i) => i.wearCount === 0);

  const handleReset = () => {
    Taro.showModal({
      title: '重置数据',
      content: '确定要重置所有数据吗？这将删除你添加的所有衣物和搭配，恢复为示例数据。此操作不可撤销！',
      confirmText: '确定重置',
      cancelText: '取消',
      confirmColor: '#ff3b30',
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
          <View className="loading-spinner-icon" />
          <Text className={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="container">
      {/* Profile Header — 毛玻璃头像区 */}
      <View className={styles.profileHeader}>
        <View className={styles.profileAvatar}>
          <Text className={styles.profileAvatarIcon}>○</Text>
        </View>
        <Text className={styles.profileName}>我的衣橱</Text>
        <Text className={styles.profileDesc}>已管理 {availableItems.length} 件衣物</Text>
      </View>

      {/* Stats — 2×2 白色毛玻璃卡片网格 */}
      <View className={styles.statGrid}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{availableItems.length}</Text>
          <Text className={styles.statLabel}>总衣物数</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{outfits.length}</Text>
          <Text className={styles.statLabel}>搭配方案</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>
            {availableItems.filter((i) => i.isFavorite).length}
          </Text>
          <Text className={styles.statLabel}>收藏衣物</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>
            {outfits.filter((o) => o.isFavorite).length}
          </Text>
          <Text className={styles.statLabel}>收藏搭配</Text>
        </View>
      </View>

      {/* Category distribution — 毛玻璃卡片 + iOS 蓝紫渐变进度条 */}
      {Object.keys(byCategory).length > 0 && (
        <View className={styles.distributionCard}>
          <Text className={styles.distributionTitle}>品类分布</Text>
          {Object.entries(byCategory).map(([cat, count]) => (
            <View key={cat} className={styles.distributionRow}>
              <Text className={styles.distributionLabel}>{cat}</Text>
              <View className={styles.progressBarBg}>
                <View className={styles.progressBarFill}
                  style={{ width: `${Math.round((count / availableItems.length) * 100)}%` }} />
              </View>
              <Text className={styles.distributionCount}>{count}</Text>
            </View>
          ))}
          {topColors.length > 0 && (
            <View className={styles.colorSection}>
              <Text className={styles.distributionSubtitle}>常用颜色</Text>
              <View className={styles.colorTags}>
                {topColors.map(([color, count]) => (
                  <View key={color} className={styles.colorTag}>
                    <Text>{color} ({count})</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Top worn — 横向滚动卡片 */}
      {topWorn.filter((i) => i.wearCount > 0).length > 0 && (
        <View className={styles.topWornCard}>
          <Text className={styles.topWornTitle}>👑 高频穿着</Text>
          <ScrollView scrollX className={styles.topWornScroll}>
            {topWorn.filter((i) => i.wearCount > 0).map((item) => (
              <View key={item.id} className={styles.topWornItem}>
                <Image src={item.imageBase64} mode="aspectFit" className={styles.topWornThumb} />
                <Text className={styles.topWornName}>{item.subCategory}</Text>
                <Text className={styles.topWornCount}>穿{item.wearCount}次</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Idle items — 浅灰淡色提示卡片 */}
      {idleItems.length > 0 && (
        <View className={styles.idleCard}>
          <Text className={styles.idleTitle}>
            💤 闲置衣物（{idleItems.length}件）
          </Text>
          <Text className={styles.idleDesc}>
            以下衣物尚未穿着过，考虑搭配使用或断舍离
          </Text>
          <View className={styles.idleTags}>
            {idleItems.map((item) => (
              <View key={item.id} className={styles.idleTag}>
                <Text>{item.subCategory}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* About — iOS List 风格行 */}
      <View className={styles.aboutCard}>
        <Text className={styles.aboutTitle}>关于</Text>
        <View className="detail-row">
          <Text className="detail-row-label">版本</Text>
          <Text className="detail-row-value">智搭衣橱 v0.1</Text>
        </View>
        <View className="detail-row">
          <Text className="detail-row-label">存储模式</Text>
          <Text className="detail-row-value">
            {onlineMode ? 'CloudBase 云端' : '本地存储'}
          </Text>
        </View>
        <View className="detail-row">
          <Text className="detail-row-label">隐私政策</Text>
          <Text className="detail-row-value" style={{ color: 'var(--color-primary)' }}>查看 &gt;</Text>
        </View>
        <View className="detail-row">
          <Text className="detail-row-label">用户协议</Text>
          <Text className="detail-row-value" style={{ color: 'var(--color-primary)' }}>查看 &gt;</Text>
        </View>
      </View>

      {/* Danger Zone — iOS 风格浅红底 */}
      <View className={styles.dangerCard}>
        <Text className={styles.dangerTitle}>数据管理</Text>
        <Text className={styles.dangerDesc}>
          重置将删除所有数据并恢复示例数据
        </Text>
        <View onClick={handleReset} className={styles.dangerBtn}>
          <Text>重置所有数据</Text>
        </View>
      </View>
      <BottomNav activeKey="settings" />
    </View>
  );
}
