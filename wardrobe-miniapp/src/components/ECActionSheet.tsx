import { View, Text } from '@tarojs/components';
import { useEffect, useState } from 'react';
import styles from './ECActionSheet.module.scss';

export interface ECActionSheetItem {
  key: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export interface ECActionSheetProps {
  visible: boolean;
  items: ECActionSheetItem[];
  cancelText?: string;
  showCancel?: boolean;
  zIndex?: number;
  onSelect: (key: string) => void;
  onCancel: () => void;
}

export default function ECActionSheet({
  visible,
  items,
  cancelText = '取消',
  showCancel = true,
  zIndex = 1000,
  onSelect,
  onCancel,
}: ECActionSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const [animatingIn, setAnimatingIn] = useState(visible);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (visible) {
      setMounted(true);
      timer = setTimeout(() => setAnimatingIn(true), 10);
    } else {
      setAnimatingIn(false);
      timer = setTimeout(() => setMounted(false), 280);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible]);

  if (!mounted) return null;

  const rootCls = `${styles.actionSheet} ${animatingIn ? styles.in : ''}`.trim();

  return (
    <View className={rootCls} style={{ zIndex }}>
      <View className={styles.mask} catchMove onClick={onCancel} />

      <View className={styles.container}>
        <View className={styles.menu}>
          {items.map((item, idx) =>
            item.divider ? (
              <View key={`divider-${idx}`} className={styles.divider} />
            ) : (
              <View
                key={item.key}
                className={`${styles.item} ${item.disabled ? styles.itemDisabled : ''}`}
                hoverClass={item.disabled ? '' : styles.itemHover}
                hoverStayTime={100}
                onClick={() => {
                  if (item.disabled) return;
                  onSelect(item.key);
                }}
              >
                <Text className={`${styles.itemText} ${item.danger ? styles.itemTextDanger : ''}`}>
                  {item.label}
                </Text>
              </View>
            ),
          )}
        </View>

        {showCancel && (
          <View
            className={styles.cancel}
            hoverClass={styles.cancelHover}
            hoverStayTime={100}
            onClick={onCancel}
          >
            <Text className={styles.cancelText}>{cancelText}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
