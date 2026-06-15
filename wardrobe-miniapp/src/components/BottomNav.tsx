import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useSafeArea } from '../hooks/useDeviceAdapter';

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
  const insets = useSafeArea();

  const navigate = (item: NavItem) => {
    Taro.redirectTo({ url: item.pagePath });
  };

  // 优先用真实 inset 像素值；env() 仍保留作为 H5 / 浏览器降级
  const bottomInset = insets.bottom > 0 ? `${insets.bottom}px` : 'env(safe-area-inset-bottom)';

  return (
    <View style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb',
      display: 'flex', justifyContent: 'space-around',
      paddingBottom: bottomInset,
      zIndex: 100,
    }}>
      {navItems.map((item) => (
        <View
          key={item.key}
          onClick={() => navigate(item)}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            width: '25%', padding: '12px 0',
            color: activeKey === item.key ? '#f97316' : '#9ca3af',
          }}
        >
          <Text style={{ fontSize: '36px', lineHeight: 1 }}>{item.icon}</Text>
          <Text style={{
            fontSize: '20px', fontWeight: activeKey === item.key ? 600 : 400,
            marginTop: '4px',
          }}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
