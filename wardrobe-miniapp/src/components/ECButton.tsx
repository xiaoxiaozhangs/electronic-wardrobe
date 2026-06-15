import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { ReactNode } from 'react';
import styles from './ECButton.module.scss';

export type ECButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ECButtonSize = 'large' | 'medium' | 'small';

export interface ECButtonProps {
  children?: ReactNode;
  variant?: ECButtonVariant;
  size?: ECButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  block?: boolean;
  haptic?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function ECButton({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  block = false,
  haptic = true,
  onClick,
  className = '',
  style,
}: ECButtonProps) {
  const handleClick = () => {
    if (disabled || loading) return;
    if (haptic) {
      Taro.vibrateShort({ type: 'light' }).catch(() => {});
    }
    onClick?.();
  };

  const cls = [
    styles.button,
    styles[variant],
    styles[size],
    disabled || loading ? styles.disabled : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const wrapStyle: React.CSSProperties = {
    width: block ? '100%' : undefined,
    ...style,
  };

  return (
    <View
      className={cls}
      hoverClass={disabled || loading ? '' : styles.active}
      hoverStayTime={100}
      onClick={handleClick}
      style={wrapStyle}
    >
      {loading && (
        <View
          className={`${styles.spinner} ${variant !== 'primary' ? styles.spinnerDark : ''}`}
        />
      )}
      {!loading && icon && <Text className={styles.icon}>{icon}</Text>}
      {children && <Text className={styles.label}>{children}</Text>}
    </View>
  );
}
