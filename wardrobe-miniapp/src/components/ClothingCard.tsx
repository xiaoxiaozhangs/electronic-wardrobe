/* 衣物卡片 - 样式重构版 */
import styles from './ClothingCard.module.scss';
import { View, Text, Image } from '@tarojs/components';
import type { WardrobeItem } from '../types';
import { COLOR_MAP, CATEGORY_ICONS } from '../types';

interface ClothingCardProps {
  item: WardrobeItem;
  onClick?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export default function ClothingCard({
  item,
  onClick,
  onToggleFavorite,
  onDelete,
  compact = false,
}: ClothingCardProps) {
  return (
    <View className={styles.card} onClick={onClick}>
      {/* Image */}
      <View className={styles.imageWrap}>
        <Image
          src={item.imageBase64}
          mode="aspectFit"
          className={styles.image}
          lazyLoad
        />
      </View>

      {/* Info */}
      <View className={compact ? styles.bodyCompact : styles.body}>
        <View className={styles.header}>
          <Text className={styles.categoryIcon}>{CATEGORY_ICONS[item.category]}</Text>
          <Text className={`${styles.name} ${compact ? styles.nameCompact : ''}`}>
            {item.subCategory}
          </Text>
          {item.isFavorite && (
            <Text className={styles.favIcon}>❤️</Text>
          )}
        </View>

        {!compact && (
          <>
            {/* Color */}
            <View className={styles.colorRow}>
              <View className={styles.colorDot}
                style={{ backgroundColor: COLOR_MAP[item.primaryColor] }} />
              <Text className={styles.colorLabel}>{item.primaryColor}</Text>
              {item.secondaryColors.length > 0 && (
                <>
                  <Text className={styles.colorPlus}>+</Text>
                  {item.secondaryColors.map((c) => (
                    <View key={c} className={styles.colorDotSm}
                      style={{ backgroundColor: COLOR_MAP[c] }} />
                  ))}
                </>
              )}
            </View>

            {/* Tags */}
            <View className={styles.tags}>
              {item.seasons.slice(0, 2).map((s) => (
                <Text key={s} className="tag tag-blue">{s}</Text>
              ))}
              {item.scenarios.slice(0, 1).map((s) => (
                <Text key={s} className="tag tag-green">{s}</Text>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Wear count badge */}
      {item.wearCount > 0 && !compact && (
        <View className={styles.wearBadge}>
          <Text>穿{item.wearCount}次</Text>
        </View>
      )}

      {/* Action buttons */}
      {!compact && (
        <View className={styles.actions}>
          {onToggleFavorite && (
            <View className={styles.actionBtn}
              onClick={(e) => {
                e.stopPropagation?.();
                onToggleFavorite();
              }}>
              <Text className={styles.actionBtnIcon}>{item.isFavorite ? '❤️' : '🤍'}</Text>
            </View>
          )}
          {onDelete && (
            <View className={styles.actionBtn}
              onClick={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}>
              <Text className={styles.actionBtnIcon}>🗑️</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
