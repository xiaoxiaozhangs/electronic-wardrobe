/* 衣橱品类侧边栏 */
import { View, Text, ScrollView } from '@tarojs/components';
import styles from './CategorySidebar.module.scss';
import type { Category } from '../types';
import { CATEGORY_ICONS } from '../types';

export interface SidebarCategory {
  key: Category;
  label: string;
  icon: string;
}

// 衣橱页品类侧边栏列表
const WARDROBE_CATEGORIES: SidebarCategory[] = [
  { key: '上衣', label: '上衣', icon: '👔' },
  { key: '下装', label: '下装', icon: '👖' },
  { key: '外套', label: '外套', icon: '🧥' },
  { key: '配饰', label: '配饰', icon: '💍' },
];

interface CategorySidebarProps {
  selected: Category;
  onSelect: (category: Category) => void;
}

export default function CategorySidebar({ selected, onSelect }: CategorySidebarProps) {
  return (
    <View className={styles.sidebar}>
      <ScrollView className={styles.scrollArea} scrollY>
        {WARDROBE_CATEGORIES.map((cat) => {
          const isActive = cat.key === selected;
          return (
            <View
              key={cat.key}
              className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
              onClick={() => onSelect(cat.key)}
            >
              {isActive && <View className={styles.activeLine} />}
              <Text className={`${styles.itemIcon} ${isActive ? styles.itemIconActive : ''}`}>
                {cat.icon}
              </Text>
              <Text className={`${styles.itemLabel} ${isActive ? styles.itemLabelActive : ''}`}>
                {cat.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
