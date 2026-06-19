import { View, Text, Image } from '@tarojs/components';
import { ReactNode } from 'react';
import styles from './ECCard.module.scss';

export interface ECCardProps {
  imageSrc?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  ratio?: '3:4' | '1:1' | '4:3' | '16:9';
  rounded?: boolean;
  shadow?: boolean;
  glass?: boolean;
  radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function ECCard({
  imageSrc,
  title,
  subtitle,
  badge,
  ratio = '3:4',
  rounded = true,
  shadow = true,
  glass = false,
  radius,
  children,
  footer,
  onClick,
  className = '',
  style,
}: ECCardProps) {
  const radiusClsMap: Record<string, string> = {
    sm: styles.radiusSm,
    md: styles.radiusMd,
    lg: styles.radiusLg,
    xl: styles.radiusXl,
    '2xl': styles.radius2xl,
  };

  const cls = [
    styles.card,
    rounded && !radius ? styles.rounded : '',
    shadow ? styles.shadow : '',
    glass ? styles.glass : '',
    radius ? radiusClsMap[radius] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const ratioCls = {
    '3:4': styles.ratio34,
    '1:1': styles.ratio11,
    '4:3': styles.ratio43,
    '16:9': styles.ratio169,
  }[ratio];

  return (
    <View className={cls} style={style} onClick={onClick} hoverClass={styles.active}>
      {imageSrc !== undefined && (
        <View className={`${styles.imageWrap} ${ratioCls}`}>
          {imageSrc ? (
            <Image
              src={imageSrc}
              mode="aspectFill"
              lazyLoad
              className={styles.image}
            />
          ) : (
            <View className={styles.placeholder}>
              <Text className={styles.placeholderIcon}>👗</Text>
            </View>
          )}
          {badge && (
            <View className={styles.badge}>
              <Text className={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
      )}
      {(title || subtitle || children) && (
        <View className={styles.body}>
          {title && <Text className={styles.title}>{title}</Text>}
          {subtitle && <Text className={styles.subtitle}>{subtitle}</Text>}
          {children}
        </View>
      )}
      {footer && <View className={styles.footer}>{footer}</View>}
    </View>
  );
}
