/* 搭配卡片 - 样式重构版 */
import styles from './OutfitCard.module.scss';
import { View, Text, Image } from '@tarojs/components';
import type { Outfit, WardrobeItem, Feedback } from '../types';

interface OutfitCardProps {
  outfit: Outfit;
  items: WardrobeItem[];
  onToggleFavorite?: () => void;
  onFeedback?: (f: Feedback) => void;
  onDelete?: () => void;
}

export default function OutfitCard({
  outfit,
  items,
  onToggleFavorite,
  onFeedback,
  onDelete,
}: OutfitCardProps) {
  const outfitItems = outfit.itemIds
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as WardrobeItem[];

  return (
    <View className={styles.card}>
      {/* Header */}
      <View className={styles.header}>
        <View className={styles.headerInfo}>
          <Text className={styles.title}>{outfit.title}</Text>
          <View className={styles.meta}>
            <Text className={styles.metaText}>{outfit.scenario}</Text>
            <Text className={styles.metaDot}>·</Text>
            <Text className={styles.metaText}>{outfit.season}</Text>
            <Text className={styles.metaDot}>·</Text>
            <Text className={styles.metaText}>{outfit.style}</Text>
          </View>
        </View>
        <View className={styles.headerActions}>
          {onToggleFavorite && (
            <View onClick={onToggleFavorite} className={styles.favBtn}>
              <Text>{outfit.isFavorite ? '❤️' : '🤍'}</Text>
            </View>
          )}
          {onDelete && (
            <View onClick={onDelete} className={styles.deleteBtn}>
              <Text>🗑️</Text>
            </View>
          )}
        </View>
      </View>

      {/* Items grid */}
      <View className={styles.itemsScroll}>
        {outfitItems.map((item) => (
          <View key={item.id} className={styles.itemThumb}>
            <View className={styles.itemImgWrap}>
              <Image
                src={item.imageBase64}
                mode="aspectFit"
                className={styles.itemImg}
              />
            </View>
            <Text className={`${styles.itemLabel} text-ellipsis`}>
              {item.subCategory}
            </Text>
          </View>
        ))}
        {outfitItems.length === 0 && (
          <Text className={styles.emptyItems}>
            衣物已被删除，搭配失效
          </Text>
        )}
      </View>

      {/* Reason */}
      {outfit.reason && (
        <Text className={styles.reason}>
          💡 {outfit.reason}
        </Text>
      )}

      {/* Feedback */}
      {onFeedback && outfitItems.length > 0 && (
        <View className={styles.feedbackBar}>
          {(['喜欢', '一般', '不合适'] as Feedback[]).map((fb) => (
            <View
              key={fb}
              onClick={() => onFeedback(fb)}
              className={`${styles.feedbackBtn} ${outfit.feedback === fb ? styles.feedbackBtnActive : ''}`}
            >
              <Text>{fb === '喜欢' ? '👍 ' : fb === '一般' ? '👌 ' : '👎 '}{fb}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
