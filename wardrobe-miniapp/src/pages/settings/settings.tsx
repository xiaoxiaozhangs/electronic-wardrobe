/* 我的 - 样式重构版 */
import styles from './settings.module.scss';
import { View, Text, Image } from '@tarojs/components';
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
          <Text className={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="container">
      <Text className={styles.pageTitle}>我的</Text>

      {/* Stats */}
      <View className={styles.statCard}>
        <Text className={styles.statCardTitle}>📊 衣橱统计</Text>

        <View className={styles.statGrid}>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>{availableItems.length}</Text>
            <Text className={styles.statLabel}>总衣物数</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>{outfits.length}</Text>
            <Text className={styles.statLabel}>搭配方案数</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>
              {availableItems.filter((i) => i.isFavorite).length}
            </Text>
            <Text className={styles.statLabel}>收藏衣物</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>
              {outfits.filter((o) => o.isFavorite).length}
            </Text>
            <Text className={styles.statLabel}>收藏搭配</Text>
          </View>
        </View>

        {/* Category distribution */}
        {Object.keys(byCategory).length > 0 && (
          <View className={styles.distributionSection}>
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
          </View>
        )}

        {/* Color distribution */}
        {topColors.length > 0 && (
          <View>
            <Text className={styles.distributionTitle}>常用颜色</Text>
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

      {/* Top worn */}
      {topWorn.filter((i) => i.wearCount > 0).length > 0 && (
        <View className={styles.topWornCard}>
          <Text className={styles.topWornTitle}>👑 高频穿着</Text>
          {topWorn.filter((i) => i.wearCount > 0).map((item) => (
            <View key={item.id} className={styles.topWornItem}>
              <Image src={item.imageBase64} mode="aspectFit" className={styles.topWornThumb} />
              <View className={styles.topWornInfo}>
                <Text className={styles.topWornName}>{item.subCategory}</Text>
                <Text className={styles.topWornMeta}>
                  {item.primaryColor} · {item.category}
                </Text>
              </View>
              <Text className={styles.topWornCount}>穿{item.wearCount}次</Text>
            </View>
          ))}
        </View>
      )}

      {/* Idle items */}
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

      {/* About */}
      <View className={styles.aboutCard}>
        <Text className={styles.aboutTitle}>ℹ️ 关于</Text>
        <Text className={styles.aboutText}>
          智搭衣橱 · 电子衣橱 v0.1
        </Text>
        <Text className={styles.aboutText}>
          基于 Taro 构建的微信小程序版本，使用 CloudBase 云开发提供数据存储和云函数支持。
        </Text>
        <View className={styles.aboutInfoBox}>
          <Text className={styles.aboutInfoText}>
            {onlineMode
              ? '☁️ 当前使用 CloudBase 云端存储模式，数据将同步到云端数据库。'
              : '💡 当前使用本地存储模式。配置 CloudBase 环境 ID 并登录后，可启用云端数据同步。'}
          </Text>
        </View>
      </View>

      {/* Danger Zone */}
      <View className={styles.dangerCard}>
        <Text className={styles.dangerTitle}>⚠️ 数据管理</Text>
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
