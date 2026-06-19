/* 搭配页面 - 样式重构版 */
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
import BottomNav from '../../components/BottomNav';
import styles from './outfit.module.scss';

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
          <Text className="loading-text">加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="container">
      <Text className={styles.pageTitle}>智能搭配</Text>

      {/* Tab switcher */}
      <View className={styles.tabSwitcher}>
        <View
          onClick={() => setTab('generate')}
          className={`${styles.tabItem} ${tab === 'generate' ? styles.tabItemActive : ''}`}
        >
          <Text>✨ 生成搭配</Text>
        </View>
        <View
          onClick={() => setTab('history')}
          className={`${styles.tabItem} ${tab === 'history' ? styles.tabItemActive : ''}`}
        >
          <Text>📋 搭配记录 {outfits.length > 0 ? `(${outfits.length})` : ''}</Text>
        </View>
      </View>

      {/* Generate tab */}
      {tab === 'generate' && (
        <View>
          {/* Params form */}
          <View className={styles.paramCard}>
            {/* Scenario */}
            <View className={styles.paramGroup}>
              <Text className={styles.paramLabel}>场景</Text>
              <View className={styles.chipRow}>
                {ALL_SCENARIOS.map((s) => (
                  <View key={s} onClick={() => setScenario(s)}
                    className={`${styles.chip} ${scenario === s ? styles.chipActive : ''}`}>
                    <Text>{SCENARIO_LABELS[s]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Season */}
            <View className={styles.paramGroup}>
              <Text className={styles.paramLabel}>季节</Text>
              <View className={styles.seasonRow}>
                {ALL_SEASONS.map((s) => (
                  <View key={s} onClick={() => setSeason(s)}
                    className={`${styles.chip} ${styles.seasonChip} ${season === s ? styles.chipActive : ''}`}>
                    <Text>{SEASON_LABELS[s]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Style */}
            <View className={styles.paramGroup}>
              <Text className={styles.paramLabel}>风格</Text>
              <View className={styles.chipRow}>
                {ALL_STYLES.map((s) => (
                  <View key={s} onClick={() => setStyle(s)}
                    className={`${styles.chip} ${style === s ? styles.chipActive : ''}`}>
                    <Text>{STYLE_LABELS[s]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Specify item */}
            <View className={styles.paramGroup}>
              <Text className={styles.paramLabel}>指定单品（可选）</Text>
              {mustIncludeItem ? (
                <View className={styles.itemPickerSelected}>
                  <Image src={mustIncludeItem.imageBase64} mode="aspectFit"
                    className={styles.itemPickerThumb} />
                  <View className={styles.itemPickerInfo}>
                    <Text className={styles.itemPickerName}>{mustIncludeItem.subCategory}</Text>
                    <Text className={styles.itemPickerMeta}>
                      {mustIncludeItem.category} · {mustIncludeItem.primaryColor}
                    </Text>
                  </View>
                  <View onClick={() => setMustIncludeItemId(null)} className={styles.itemPickerRemove}>
                    <Text>✕</Text>
                  </View>
                </View>
              ) : (
                <View onClick={() => setShowItemPicker(!showItemPicker)} className={styles.itemPickerPlaceholder}>
                  <Text>+ 选择一件单品</Text>
                </View>
              )}

              {showItemPicker && (
                <View className={styles.itemPickerGrid}>
                  {availableItems.map((item) => (
                    <View key={item.id}
                      onClick={() => { setMustIncludeItemId(item.id); setShowItemPicker(false); }}
                      className={styles.itemPickerItem}>
                      <Image src={item.imageBase64} mode="aspectFit" className={styles.itemPickerImg} />
                      <Text className={styles.itemPickerLabel}>{item.subCategory}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Generate button */}
            <View className={`btn-primary ${styles.generateBtn}`} onClick={handleGenerate}>
              {generating ? (
                <Text>⏳ 正在生成搭配...</Text>
              ) : availableItems.length < 3 ? (
                <Text>至少需要3件可用衣物才能生成搭配</Text>
              ) : (
                <Text>✨ 生成搭配方案</Text>
              )}
            </View>
          </View>

          {/* Loading */}
          {generating && (
            <View className="loading-spinner">
              <Text className="loading-spinner-icon">⏳</Text>
              <Text className={styles.loadingTitle}>正在分析你的衣橱...</Text>
              <Text className={styles.loadingDesc}>
                根据场景、季节和风格匹配合适组合
              </Text>
            </View>
          )}

          {/* Results */}
          {!generating && currentResults.length > 0 && (
            <View>
              <Text className={styles.resultTitle}>
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

          {/* Empty tip */}
          {!generating && currentResults.length === 0 && (
            <Text className={styles.emptyTip}>
              💡 还没有生成搭配。选择场景、季节和风格，点击"生成搭配方案"开始。
            </Text>
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
