import { useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import type { Outfit, Scenario, Season, Style, Feedback } from '../../types';
import {
  ALL_SCENARIOS, ALL_SEASONS, ALL_STYLES,
  SCENARIO_LABELS, SEASON_LABELS, STYLE_LABELS,
} from '../../types';
import { useWardrobeStore } from '../../hooks/useWardrobeStore';
import OutfitCard from '../../components/OutfitCard';
import EmptyState from '../../components/EmptyState';
import ECButton from '../../components/ECButton';
import BottomNav from '../../components/BottomNav';

/** 根据当前月份推断季节 */
function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return '春';
  if (month >= 5 && month <= 7) return '夏';
  if (month >= 8 && month <= 10) return '秋';
  return '冬';
}

export default function OutfitPage() {
  const {
    items, outfits, loading,
    generateAndSaveOutfits, toggleOutfitFavorite, setOutfitFeedback, deleteOutfit,
  } = useWardrobeStore();

  const availableItems = items.filter((i) => i.status === '正常');

  const [scenario, setScenario] = useState<Scenario>('通勤');
  const [season, setSeason] = useState<Season>(getCurrentSeason());
  const [style, setStyle] = useState<Style>('简约');
  const [mustIncludeItemId, setMustIncludeItemId] = useState<string | null>(null);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentResults, setCurrentResults] = useState<Outfit[]>([]);

  const [tab, setTab] = useState<'generate' | 'history'>(
    outfits.length > 0 ? 'history' : 'generate'
  );

  const handleGenerate = async () => {
    setGenerating(true);
    // 延迟600ms让用户感知加载状态
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      const results = await generateAndSaveOutfits({
        scenario, season, style,
        mustIncludeItemId,
        excludeItemIds: [],
      });
      setCurrentResults(results);
    } catch (err) {
      console.error('搭配生成失败:', err);
    } finally {
      setGenerating(false);
    }
  };

  const mustIncludeItem = mustIncludeItemId
    ? items.find((i) => i.id === mustIncludeItemId)
    : null;

  if (loading) {
    return (
      <View className="container">
        <View className="loading-spinner">
          <Text className="loading-spinner-icon">⏳</Text>
          <Text style={{ fontSize: '26px', color: '#9ca3af', marginTop: '16px' }}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="container">
      <Text className="section-title">智能搭配</Text>

      {/* Tab switcher */}
      <View style={{
        display: 'flex', backgroundColor: '#f3f4f6',
        borderRadius: '12px', padding: '4px', marginBottom: '24px',
      }}>
        <View
          onClick={() => setTab('generate')}
          style={{
            flex: 1, padding: '14px', textAlign: 'center', borderRadius: '10px',
            backgroundColor: tab === 'generate' ? '#fff' : 'transparent',
            boxShadow: tab === 'generate' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            fontSize: '26px', fontWeight: 500,
            color: tab === 'generate' ? '#111827' : '#9ca3af',
          }}
        >
          <Text>✨ 生成搭配</Text>
        </View>
        <View
          onClick={() => setTab('history')}
          style={{
            flex: 1, padding: '14px', textAlign: 'center', borderRadius: '10px',
            backgroundColor: tab === 'history' ? '#fff' : 'transparent',
            boxShadow: tab === 'history' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            fontSize: '26px', fontWeight: 500,
            color: tab === 'history' ? '#111827' : '#9ca3af',
          }}
        >
          <Text>📋 搭配记录 {outfits.length > 0 ? `(${outfits.length})` : ''}</Text>
        </View>
      </View>

      {/* Generate tab */}
      {tab === 'generate' && (
        <View>
          {/* Params form */}
          <View style={{
            backgroundColor: '#f9fafb', borderRadius: '20px',
            padding: '24px', marginBottom: '24px',
          }}>
            {/* Scenario */}
            <View style={{ marginBottom: '20px' }}>
              <Text style={{ fontSize: '24px', color: '#6b7280', marginBottom: '10px', display: 'block' }}>场景</Text>
              <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ALL_SCENARIOS.map((s) => (
                  <View key={s} onClick={() => setScenario(s)}
                    style={optionChipStyle(scenario === s, '#f97316')}>
                    <Text style={{ fontSize: '22px' }}>{SCENARIO_LABELS[s]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Season */}
            <View style={{ marginBottom: '20px' }}>
              <Text style={{ fontSize: '24px', color: '#6b7280', marginBottom: '10px', display: 'block' }}>季节</Text>
              <View style={{ display: 'flex', gap: '12px' }}>
                {ALL_SEASONS.map((s) => (
                  <View key={s} onClick={() => setSeason(s)}
                    style={optionChipStyle(season === s, '#3b82f6')}>
                    <Text style={{ fontSize: '26px' }}>{SEASON_LABELS[s]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Style */}
            <View style={{ marginBottom: '20px' }}>
              <Text style={{ fontSize: '24px', color: '#6b7280', marginBottom: '10px', display: 'block' }}>风格</Text>
              <View style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ALL_STYLES.map((s) => (
                  <View key={s} onClick={() => setStyle(s)}
                    style={optionChipStyle(style === s, '#8b5cf6')}>
                    <Text style={{ fontSize: '22px' }}>{STYLE_LABELS[s]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Specify item */}
            <View style={{ marginBottom: '20px' }}>
              <Text style={{ fontSize: '24px', color: '#6b7280', marginBottom: '10px', display: 'block' }}>
                指定单品（可选）
              </Text>
              {mustIncludeItem ? (
                <View style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  backgroundColor: '#fff', borderRadius: '12px',
                  padding: '12px', border: '1px solid #e5e7eb',
                }}>
                  <Image src={mustIncludeItem.imageBase64} mode="aspectFit"
                    style={{ width: '64px', height: '64px', borderRadius: '8px', backgroundColor: '#f9fafb' }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '26px', fontWeight: 500, display: 'block' }}>{mustIncludeItem.subCategory}</Text>
                    <Text style={{ fontSize: '22px', color: '#9ca3af', display: 'block' }}>
                      {mustIncludeItem.category} · {mustIncludeItem.primaryColor}
                    </Text>
                  </View>
                  <View onClick={() => setMustIncludeItemId(null)}
                    style={{ padding: '8px', color: '#9ca3af', fontSize: '28px' }}>
                    <Text>✕</Text>
                  </View>
                </View>
              ) : (
                <View
                  onClick={() => setShowItemPicker(!showItemPicker)}
                  style={{
                    width: '100%', padding: '24px', textAlign: 'center',
                    border: '2px dashed #d1d5db', borderRadius: '12px',
                    backgroundColor: '#fff', fontSize: '26px', color: '#9ca3af',
                  }}
                >
                  <Text>+ 选择一件单品</Text>
                </View>
              )}

              {showItemPicker && (
                <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                  {availableItems.map((item) => (
                    <View key={item.id}
                      onClick={() => { setMustIncludeItemId(item.id); setShowItemPicker(false); }}
                      style={{
                        width: '30%', flexGrow: 1, textAlign: 'center',
                        backgroundColor: '#fff', borderRadius: '12px',
                        border: '1px solid #e5e7eb', padding: '12px',
                      }}>
                      <Image src={item.imageBase64} mode="aspectFit"
                        style={{ width: '100%', aspectRatio: '1', borderRadius: '8px' }} />
                      <Text style={{ fontSize: '22px', color: '#6b7280', marginTop: '6px', display: 'block' }}>{item.subCategory}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Generate button */}
            <ECButton
              variant="primary"
              size="large"
              block
              loading={generating}
              disabled={availableItems.length < 3}
              onClick={handleGenerate}
            >
              {generating
                ? '正在生成搭配...'
                : availableItems.length < 3
                  ? '至少需要3件可用衣物才能生成搭配'
                  : '✨ 生成搭配方案'}
            </ECButton>
          </View>

          {/* Results */}
          {generating && (
            <View className="loading-spinner">
              <Text className="loading-spinner-icon">⏳</Text>
              <Text style={{ fontSize: '26px', color: '#9ca3af', marginTop: '16px', display: 'block' }}>正在分析你的衣橱...</Text>
              <Text style={{ fontSize: '22px', color: '#d1d5db', marginTop: '8px', display: 'block' }}>
                根据场景、季节和风格匹配合适组合
              </Text>
            </View>
          )}

          {!generating && currentResults.length > 0 && (
            <View>
              <Text style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '20px', display: 'block' }}>
                为你生成 {currentResults.length} 套搭配
              </Text>
              {currentResults.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  items={items}
                  onToggleFavorite={() => toggleOutfitFavorite(outfit.id)}
                  onFeedback={(fb) => setOutfitFeedback(outfit.id, fb)}
                />
              ))}
            </View>
          )}

          {!generating && currentResults.length === 0 && (
            <View style={{
              backgroundColor: '#fef9c3', borderRadius: '16px',
              padding: '20px', border: '1px solid #fde68a',
            }}>
              <Text style={{ fontSize: '26px', color: '#a16207', display: 'block' }}>
                💡 还没有生成搭配。选择场景、季节和风格，点击"生成搭配方案"开始。
              </Text>
            </View>
          )}
        </View>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <View>
          {outfits.length > 0 ? (
            outfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                items={items}
                onToggleFavorite={() => toggleOutfitFavorite(outfit.id)}
                onFeedback={(fb) => setOutfitFeedback(outfit.id, fb)}
                onDelete={() => deleteOutfit(outfit.id)}
              />
            ))
          ) : (
            <EmptyState
              icon="✨"
              title="还没有搭配记录"
              description="切换到「生成搭配」标签开始创建你的第一套搭配"
              action={{ label: '去生成搭配', onClick: () => setTab('generate') }}
            />
          )}
        </View>
      )}
      <BottomNav activeKey="outfit" />
    </View>
  );
}

// -- 样式辅助 --
const optionChipStyle = (active: boolean, activeColor: string): React.CSSProperties => ({
  padding: '10px 20px', borderRadius: '20px',
  backgroundColor: active ? activeColor : '#fff',
  color: active ? '#fff' : '#6b7280',
  border: active ? 'none' : '1px solid #e5e7eb',
  fontWeight: 500,
});
