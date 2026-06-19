/* 首页 - iOS 极简风格 */
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useWardrobeStore } from '../../hooks/useWardrobeStore';
import BottomNav from '../../components/BottomNav';
import styles from './index.module.scss';

export default function HomePage() {
  const { loading } = useWardrobeStore();

  // 天气状态（当前使用默认值，后续接入 API）
  const cityName = '北京';
  const weatherIcon = '☀️';
  const temperature = '5℃';
  const weatherError = false;
  const userName = '用户';
  const userAvatar = ''; // 空字符串表示使用默认头像

  const goToWardrobe = () => {
    Taro.redirectTo({ url: '/pages/wardrobe/wardrobe' });
  };

  if (loading) {
    return (
      <View className={styles.loadingWrap}>
        <Text className={styles.loadingIcon}>⏳</Text>
        <Text className={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      {/* 背景层 */}
      <View className={styles.skyBg}>
        <View className={styles.skyGradient} />
        {/* 云朵装饰 */}
        <View className={`${styles.cloud} ${styles.cloud1}`} />
        <View className={`${styles.cloud} ${styles.cloud2}`} />
        {/* 底部城市线描剪影 */}
        <View className={styles.cityLine}>
          <svg viewBox="0 0 375 100" className={styles.cityLineSvg}>
            <polyline points="0,85 20,78 40,82 60,65 80,70 100,55 120,60 140,48 160,52 180,40 200,45 220,35 240,42 260,38 280,50 300,44 320,55 340,48 360,58 375,50" />
            <polyline points="0,95 30,90 60,92 90,85 120,88 150,80 180,83 210,78 240,82 270,76 300,80 330,74 360,78 375,75" />
          </svg>
        </View>
      </View>

      {/* 顶部导航 */}
      <View className={styles.topNav}>
        <View className={styles.backBtn}>
          <Text>←</Text>
        </View>
        <Text className={styles.cityName}>{cityName}</Text>
        <View className={styles.weatherCard}>
          <Text className={styles.weatherIcon}>
            {weatherError ? '🌤️' : weatherIcon}
          </Text>
          <Text className={styles.weatherText}>
            {weatherError ? '--℃' : temperature}
          </Text>
        </View>
      </View>

      {/* 垂直居中：用户头像 + 昵称 */}
      <View className={styles.userArea}>
        <View className={styles.avatarWrap}>
          {userAvatar ? (
            <View style={{ width: '100%', height: '100%', background: '#E5E7EB' }} />
          ) : (
            <Text className={styles.avatarDefault}>👩</Text>
          )}
        </View>
        <Text className={styles.userName}>{userName}</Text>
      </View>

      {/* 底部上传按钮 */}
      <View className={styles.uploadArea}>
        <View className={styles.uploadBtn} onClick={goToWardrobe}>
          <Text>上传服饰</Text>
        </View>
      </View>

      <BottomNav activeKey="index" />
    </View>
  );
}
