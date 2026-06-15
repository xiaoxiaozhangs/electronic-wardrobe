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
    <View
      style={{
        position: 'relative',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #f3f4f6',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onClick={onClick}
    >
      {/* Image */}
      <View style={{
        width: '100%',
        aspectRatio: '1',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <Image
          src={item.imageBase64}
          mode="aspectFit"
          style={{ width: '100%', height: '100%' }}
          lazyLoad
        />
      </View>

      {/* Info */}
      <View style={{ padding: compact ? '12px' : '16px' }}>
        <View style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
          <Text style={{ fontSize: '22px' }}>{CATEGORY_ICONS[item.category]}</Text>
          <Text style={{
            fontSize: compact ? '24px' : '26px',
            fontWeight: 500,
            marginLeft: '6px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {item.subCategory}
          </Text>
          {item.isFavorite && (
            <Text style={{ color: '#f87171', fontSize: '22px' }}>❤️</Text>
          )}
        </View>

        {!compact && (
          <>
            {/* Color */}
            <View style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <View style={{
                width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: COLOR_MAP[item.primaryColor],
                border: '1px solid #d1d5db',
                display: 'inline-block',
              }} />
              <Text style={{ fontSize: '22px', color: '#6b7280', marginLeft: '6px' }}>{item.primaryColor}</Text>
              {item.secondaryColors.length > 0 && (
                <>
                  <Text style={{ fontSize: '20px', color: '#d1d5db', marginLeft: '4px' }}>+</Text>
                  {item.secondaryColors.map((c) => (
                    <View key={c} style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: COLOR_MAP[c],
                      border: '1px solid #d1d5db',
                      marginLeft: '4px',
                      display: 'inline-block',
                    }} />
                  ))}
                </>
              )}
            </View>

            {/* Tags */}
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
        <View style={{
          position: 'absolute', top: '12px', left: '12px',
          backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
          fontSize: '20px', padding: '4px 10px', borderRadius: '20px',
        }}>
          <Text>穿{item.wearCount}次</Text>
        </View>
      )}

      {/* Action buttons */}
      {!compact && (
        <View style={{
          position: 'absolute', top: '12px', right: '12px',
          display: 'flex', gap: '6px', opacity: 0.9,
        }}>
          {onToggleFavorite && (
            <View
              onClick={(e) => {
                e.stopPropagation?.();
                onToggleFavorite();
              }}
              style={{
                width: '44px', height: '44px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <Text style={{ fontSize: '24px' }}>{item.isFavorite ? '❤️' : '🤍'}</Text>
            </View>
          )}
          {onDelete && (
            <View
              onClick={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}
              style={{
                width: '44px', height: '44px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <Text style={{ fontSize: '24px' }}>🗑️</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
