import { View, Text } from '@tarojs/components';
import { ReactNode, useEffect, useState } from 'react';
import { hapticLight } from '../utils/haptic';
import styles from './ECModal.module.scss';

export interface ECModalProps {
  visible: boolean;
  title?: string;
  content?: ReactNode;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  showConfirm?: boolean;
  maskClosable?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  zIndex?: number;
}

export default function ECModal({
  visible,
  title,
  content,
  children,
  confirmText = '确定',
  cancelText = '取消',
  showCancel = true,
  showConfirm = true,
  maskClosable = true,
  onConfirm,
  onCancel,
  onClose,
  zIndex = 1000,
}: ECModalProps) {
  const [mounted, setMounted] = useState(visible);
  const [animatingIn, setAnimatingIn] = useState(visible);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (visible) {
      setMounted(true);
      timer = setTimeout(() => setAnimatingIn(true), 10);
    } else {
      setAnimatingIn(false);
      timer = setTimeout(() => setMounted(false), 220);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible]);

  if (!mounted) return null;

  const handleMaskTap = () => {
    if (!maskClosable) return;
    onCancel?.();
    onClose?.();
  };

  return (
    <View
      className={`${styles.root} ${animatingIn ? styles.in : styles.out}`}
      style={{ zIndex }}
      catchMove
    >
      <View className={styles.mask} onClick={handleMaskTap} />
      <View className={styles.dialog} catchMove>
        {title && (
          <View className={styles.header}>
            <Text className={styles.title}>{title}</Text>
          </View>
        )}
        <View className={styles.body}>
          {content}
          {children}
        </View>
        {(showCancel || showConfirm) && (
          <View className={styles.footer}>
            {showCancel && (
              <View
                className={`${styles.btn} ${styles.btnCancel}`}
                onClick={() => {
                  hapticLight();
                  onCancel?.();
                  onClose?.();
                }}
              >
                <Text>{cancelText}</Text>
              </View>
            )}
            {showConfirm && (
              <View
                className={`${styles.btn} ${styles.btnConfirm}`}
                onClick={() => {
                  hapticLight();
                  onConfirm?.();
                  onClose?.();
                }}
              >
                <Text>{confirmText}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
