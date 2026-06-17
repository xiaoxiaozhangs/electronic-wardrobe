import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  pagePath: string;
}

const navItems: NavItem[] = [
  { key: 'index', label: '首页', icon: '🏠', pagePath: '/pages/index/index' },
  { key: 'wardrobe', label: '衣橱', icon: '👗', pagePath: '/pages/wardrobe/wardrobe' },
  { key: 'outfit', label: '搭配', icon: '✨', pagePath: '/pages/outfit/outfit' },
  { key: 'settings', label: '我的', icon: '👤', pagePath: '/pages/settings/settings' },
];

interface BottomNavProps {
  activeKey: string;
}

export default function BottomNav({ activeKey }: BottomNavProps) {
  const navigate = (item: NavItem) => {
    Taro.redirectTo({ url: item.pagePath });
  };

  return (
    <View style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(245, 245, 247, 0.9)',
      borderTop: '1px solid rgba(0,0,0,0.06)',
      display: 'flex', justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {navItems.map((item) => {
        const isActive = activeKey === item.key;
        return (
          <View
            key={item.key}
            onClick={() => navigate(item)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              width: '25%', padding: '10px 0',
              color: isActive ? '#0071e3' : '#9ca3af',
            }}
          >
            <Text style={{
              fontSize: '28px', lineHeight: 1,
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
            }}>{item.icon}</Text>
            <Text style={{
              fontSize: '18px', fontWeight: isActive ? 600 : 400,
              marginTop: '2px',
            }}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
