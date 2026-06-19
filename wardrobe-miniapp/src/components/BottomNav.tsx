/* 底部导航 - 样式重构版 */
import styles from './BottomNav.module.scss';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  pagePath: string;
}

const navItems: NavItem[] = [
  { key: 'index', label: '首页', icon: '⌂', pagePath: '/pages/index/index' },
  { key: 'wardrobe', label: '衣橱', icon: '☐', pagePath: '/pages/wardrobe/wardrobe' },
  { key: 'outfit', label: '搭配', icon: '✦', pagePath: '/pages/outfit/outfit' },
  { key: 'settings', label: '我的', icon: '○', pagePath: '/pages/settings/settings' },
];

interface BottomNavProps {
  activeKey: string;
}

export default function BottomNav({ activeKey }: BottomNavProps) {
  const navigate = (item: NavItem) => {
    Taro.redirectTo({ url: item.pagePath });
  };

  return (
    <View className={styles.nav}>
      {navItems.map((item) => {
        const isActive = activeKey === item.key;
        return (
          <View
            key={item.key}
            onClick={() => navigate(item)}
            className={styles.navItem}
            style={{
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
            }}
          >
            <Text className={styles.navIcon}>{item.icon}</Text>
            <Text
              className={styles.navLabel}
              style={{ fontWeight: isActive ? 600 : 400 }}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
