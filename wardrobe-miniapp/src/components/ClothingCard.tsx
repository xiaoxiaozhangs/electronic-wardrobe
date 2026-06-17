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
        borderRadius: '24px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
      onClick={onClick}
    >
      {/* Image */}
      <View style={{
        width: '100%',
        aspectRatio: '1',
        backgroundColor: '#f5f5f7',
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
      <View style={{ padding: compact ? '10px' : '14px' }}>
        <View style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <Text style={{ fontSize: '20px' }}>{CATEGORY_ICONS[item.category]}</Text>
          <Text style={{
            fontSize: compact ? '22px' : '24px',
            fontWeight: 500,
            marginLeft: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {item.subCategory}
          </Text>
          {item.isFavorite && (
            <Text style={{ color: '#f87171', fontSize: '20px' }}>❤️</Text>
          )}
        </View>

        {!compact && (
          <>
            {/* Color */}
            <View style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <View style={{
                width: '18px', height: '18px', borderRadius: '50%',
                backgroundColor: COLOR_MAP[item.primaryColor],
                border: '1px solid rgba(209,213,219,0.7)',
                display: 'inline-block',
              }} />
              <Text style={{ fontSize: '20px', color: '#6b7280', marginLeft: '4px' }}>{item.primaryColor}</Text>
              {item.secondaryColors.length > 0 && (
                <>
                  <Text style={{ fontSize: '18px', color: '#d1d5db', marginLeft: '2px' }}>+</Text>
                  {item.secondaryColors.map((c) => (
                    <View key={c} style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      backgroundColor: COLOR_MAP[c],
                      border: '1px solid rgba(209,213,219,0.7)',
                      marginLeft: '2px',
                      display: 'inline-block',
                    }} />
                  ))}
                </>
              )}
            </View>

            {/* Tags */}
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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
          position: 'absolute', top: '10px', left: '10px',
          backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
          fontSize: '18px', padding: '2px 8px', borderRadius: '20px',
        }}>
          <Text>穿{item.wearCount}次</Text>
        </View>
      )}

      {/* Action buttons */}
      {!compact && (
        <View style={{
          position: 'absolute', top: '10px', right: '10px',
          display: 'flex', gap: '4px', opacity: 0.9,
        }}>
          {onToggleFavorite && (
            <View
              onClick={(e) => {
                e.stopPropagation?.();
                onToggleFavorite();
              }}
              style={{
                width: '40px', height: '40px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <Text style={{ fontSize: '22px' }}>{item.isFavorite ? '❤️' : '🤍'}</Text>
            </View>
          )}
          {onDelete && (
            <View
              onClick={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}
              style={{
                width: '40px', height: '40px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <Text style={{ fontSize: '22px' }}>🗑️</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
