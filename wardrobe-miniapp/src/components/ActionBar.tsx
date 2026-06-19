/* 衣橱页顶部功能按钮行 */
import { View, Text } from '@tarojs/components';
import styles from './ActionBar.module.scss';

interface ActionBarProps {
  onFilter: () => void;
  onAdd: () => void;
  onOutfit: () => void;
}

export default function ActionBar({ onFilter, onAdd, onOutfit }: ActionBarProps) {
  return (
    <View className={styles.bar}>
      <View className={styles.btn} onClick={onFilter}>
        <Text className={styles.btnIcon}>🔍</Text>
        <Text className={styles.btnLabel}>筛选</Text>
      </View>
      <View className={styles.btn} onClick={onAdd}>
        <Text className={styles.btnIcon}>+</Text>
        <Text className={styles.btnLabel}>添加衣物</Text>
      </View>
      <View className={styles.btn} onClick={onOutfit}>
        <Text className={styles.btnIcon}>✨</Text>
        <Text className={styles.btnLabel}>搭配</Text>
      </View>
    </View>
  );
}
