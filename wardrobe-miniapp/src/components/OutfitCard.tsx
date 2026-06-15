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
    <View className="card" style={{ marginBottom: '20px' }}>
      {/* Header */}
      <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 12px' }}>
        <View>
          <Text style={{ fontSize: '30px', fontWeight: 700, color: '#111827' }}>{outfit.title}</Text>
          <View style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <Text style={{ fontSize: '22px', color: '#9ca3af' }}>{outfit.scenario}</Text>
            <Text style={{ fontSize: '22px', color: '#d1d5db' }}>·</Text>
            <Text style={{ fontSize: '22px', color: '#9ca3af' }}>{outfit.season}</Text>
            <Text style={{ fontSize: '22px', color: '#d1d5db' }}>·</Text>
            <Text style={{ fontSize: '22px', color: '#9ca3af' }}>{outfit.style}</Text>
          </View>
        </View>
        <View style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onToggleFavorite && (
            <View
              onClick={onToggleFavorite}
              style={{ fontSize: '32px', padding: '4px' }}
            >
              <Text>{outfit.isFavorite ? '❤️' : '🤍'}</Text>
            </View>
          )}
          {onDelete && (
            <View
              onClick={onDelete}
              style={{ fontSize: '28px', color: '#9ca3af', padding: '4px' }}
            >
              <Text>🗑️</Text>
            </View>
          )}
        </View>
      </View>

      {/* Items grid */}
      <View style={{ padding: '0 24px 12px' }}>
        <View style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px' }}>
          {outfitItems.map((item) => (
            <View key={item.id} style={{ flexShrink: 0, width: '120px', textAlign: 'center' }}>
              <View style={{
                width: '120px', height: '120px', borderRadius: '12px',
                backgroundColor: '#f9fafb', overflow: 'hidden', border: '1px solid #f3f4f6',
              }}>
                <Image
                  src={item.imageBase64}
                  mode="aspectFit"
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
              <Text style={{ fontSize: '20px', color: '#6b7280', marginTop: '4px', display: 'block' }}
                className="text-ellipsis"
              >
                {item.subCategory}
              </Text>
            </View>
          ))}
          {outfitItems.length === 0 && (
            <Text style={{ fontSize: '24px', color: '#9ca3af', padding: '24px 0' }}>
              衣物已被删除，搭配失效
            </Text>
          )}
        </View>
      </View>

      {/* Reason */}
      {outfit.reason && (
        <View style={{ padding: '0 24px 16px' }}>
          <Text style={{
            fontSize: '24px', color: '#6b7280', lineHeight: '1.6',
            backgroundColor: '#f9fafb', borderRadius: '12px', padding: '12px 16px',
            display: 'block',
          }}>
            💡 {outfit.reason}
          </Text>
        </View>
      )}

      {/* Feedback */}
      {onFeedback && outfitItems.length > 0 && (
        <View style={{ display: 'flex', borderTop: '1px solid #f9fafb' }}>
          {(['喜欢', '一般', '不合适'] as Feedback[]).map((fb) => (
            <View
              key={fb}
              onClick={() => onFeedback(fb)}
              style={{
                flex: 1, padding: '16px 0', textAlign: 'center',
                fontSize: '24px', fontWeight: 500,
                backgroundColor: outfit.feedback === fb ? '#fff7ed' : 'transparent',
                color: outfit.feedback === fb ? '#f97316' : '#6b7280',
              }}
            >
              <Text>{fb === '喜欢' ? '👍 ' : fb === '一般' ? '👌 ' : '👎 '}{fb}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
