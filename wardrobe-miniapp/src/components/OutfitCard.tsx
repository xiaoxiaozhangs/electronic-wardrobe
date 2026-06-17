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
    <View className="card" style={{ marginBottom: '16px' }}>
      {/* Header */}
      <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 10px' }}>
        <View>
          <Text style={{ fontSize: '28px', fontWeight: 600, color: '#111827' }}>{outfit.title}</Text>
          <View style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <Text style={{ fontSize: '20px', color: '#9ca3af' }}>{outfit.scenario}</Text>
            <Text style={{ fontSize: '20px', color: '#d1d5db' }}>·</Text>
            <Text style={{ fontSize: '20px', color: '#9ca3af' }}>{outfit.season}</Text>
            <Text style={{ fontSize: '20px', color: '#d1d5db' }}>·</Text>
            <Text style={{ fontSize: '20px', color: '#9ca3af' }}>{outfit.style}</Text>
          </View>
        </View>
        <View style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onToggleFavorite && (
            <View
              onClick={onToggleFavorite}
              style={{ fontSize: '28px', padding: '4px' }}
            >
              <Text>{outfit.isFavorite ? '❤️' : '🤍'}</Text>
            </View>
          )}
          {onDelete && (
            <View
              onClick={onDelete}
              style={{ fontSize: '24px', color: '#9ca3af', padding: '4px' }}
            >
              <Text>🗑️</Text>
            </View>
          )}
        </View>
      </View>

      {/* Items grid */}
      <View style={{ padding: '0 20px 10px' }}>
        <View style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
          {outfitItems.map((item) => (
            <View key={item.id} style={{ flexShrink: 0, width: '110px', textAlign: 'center' }}>
              <View style={{
                width: '110px', height: '110px', borderRadius: '16px',
                backgroundColor: '#f5f5f7', overflow: 'hidden', border: '1px solid #f3f4f6',
              }}>
                <Image
                  src={item.imageBase64}
                  mode="aspectFit"
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
              <Text style={{ fontSize: '18px', color: '#6b7280', marginTop: '2px', display: 'block' }}
                className="text-ellipsis"
              >
                {item.subCategory}
              </Text>
            </View>
          ))}
          {outfitItems.length === 0 && (
            <Text style={{ fontSize: '22px', color: '#9ca3af', padding: '20px 0' }}>
              衣物已被删除，搭配失效
            </Text>
          )}
        </View>
      </View>

      {/* Reason */}
      {outfit.reason && (
        <View style={{ padding: '0 20px 14px' }}>
          <Text style={{
            fontSize: '22px', color: '#6b7280', lineHeight: '1.6',
            backgroundColor: '#f5f5f7', borderRadius: '12px', padding: '10px 14px',
            display: 'block',
          }}>
            💡 {outfit.reason}
          </Text>
        </View>
      )}

      {/* Feedback */}
      {onFeedback && outfitItems.length > 0 && (
        <View style={{ display: 'flex', borderTop: '1px solid #f3f4f6' }}>
          {(['喜欢', '一般', '不合适'] as Feedback[]).map((fb) => (
            <View
              key={fb}
              onClick={() => onFeedback(fb)}
              style={{
                flex: 1, padding: '14px 0', textAlign: 'center',
                fontSize: '22px', fontWeight: 500,
                backgroundColor: outfit.feedback === fb ? 'rgba(0,113,227,0.06)' : 'transparent',
                color: outfit.feedback === fb ? '#0071e3' : '#6b7280',
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
