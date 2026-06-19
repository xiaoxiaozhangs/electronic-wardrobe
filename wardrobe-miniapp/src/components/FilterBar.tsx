/* 筛选栏 - 样式重构版 */
import styles from './FilterBar.module.scss';
import { View, Text, Input, Picker } from '@tarojs/components';
import type { WardrobeFilter, Category, ColorLabel, Season, Scenario, Style } from '../types';
import { ALL_CATEGORIES, ALL_COLORS, ALL_SEASONS, ALL_SCENARIOS } from '../types';

interface FilterBarProps {
  filter: WardrobeFilter;
  onChange: (updates: Partial<WardrobeFilter>) => void;
  onClear: () => void;
  totalCount: number;
  filteredCount: number;
}

const CATEGORY_OPTIONS = ['全部', ...ALL_CATEGORIES];
const COLOR_OPTIONS = ['全部', ...ALL_COLORS];
const SEASON_OPTIONS = ['全部', ...ALL_SEASONS];
const SCENARIO_OPTIONS = ['全部', ...ALL_SCENARIOS];

export default function FilterBar({ filter, onChange, onClear, totalCount, filteredCount }: FilterBarProps) {
  const hasActiveFilters =
    filter.category !== '全部' ||
    filter.primaryColor !== '全部' ||
    filter.season !== '全部' ||
    filter.scenario !== '全部' ||
    filter.style !== '全部' ||
    filter.status !== '全部' ||
    filter.search !== '' ||
    filter.favoriteOnly;

  return (
    <View className={styles.container}>
      {/* Search */}
      <View className={styles.searchBox}>
        <Text className={styles.searchIcon}>🔍</Text>
        <Input
          className={styles.searchInput}
          value={filter.search}
          onInput={(e) => onChange({ search: e.detail.value })}
          placeholder="搜索衣物名称、品类..."
          placeholderStyle="color: #94A3B8; font-size: 26px"
        />
        {filter.search && (
          <View onClick={() => onChange({ search: '' })} className={styles.searchClear}>
            <Text className={styles.searchClearIcon}>✕</Text>
          </View>
        )}
      </View>

      {/* Quick filters */}
      <View className={styles.chipRow}>
        <Picker
          mode="selector"
          range={CATEGORY_OPTIONS}
          value={CATEGORY_OPTIONS.indexOf(filter.category === '全部' ? '全部' : filter.category)}
          onChange={(e) => {
            const val = CATEGORY_OPTIONS[Number(e.detail.value)];
            onChange({ category: (val === '全部' ? '全部' : val) as Category | '全部' });
          }}
        >
          <View className={styles.chip}>
            <Text>📂 {filter.category === '全部' ? '全部品类' : filter.category}</Text>
          </View>
        </Picker>

        <Picker
          mode="selector"
          range={COLOR_OPTIONS}
          value={COLOR_OPTIONS.indexOf(filter.primaryColor === '全部' ? '全部' : filter.primaryColor)}
          onChange={(e) => {
            const val = COLOR_OPTIONS[Number(e.detail.value)];
            onChange({ primaryColor: (val === '全部' ? '全部' : val) as ColorLabel | '全部' });
          }}
        >
          <View className={styles.chip}>
            <Text>🎨 {filter.primaryColor === '全部' ? '全部颜色' : filter.primaryColor}</Text>
          </View>
        </Picker>

        <Picker
          mode="selector"
          range={SEASON_OPTIONS}
          value={SEASON_OPTIONS.indexOf(filter.season === '全部' ? '全部' : filter.season)}
          onChange={(e) => {
            const val = SEASON_OPTIONS[Number(e.detail.value)];
            onChange({ season: (val === '全部' ? '全部' : val) as Season | '全部' });
          }}
        >
          <View className={styles.chip}>
            <Text>📅 {filter.season === '全部' ? '全部季节' : filter.season}</Text>
          </View>
        </Picker>

        <Picker
          mode="selector"
          range={SCENARIO_OPTIONS}
          value={SCENARIO_OPTIONS.indexOf(filter.scenario === '全部' ? '全部' : filter.scenario)}
          onChange={(e) => {
            const val = SCENARIO_OPTIONS[Number(e.detail.value)];
            onChange({ scenario: (val === '全部' ? '全部' : val) as Scenario | '全部' });
          }}
        >
          <View className={styles.chip}>
            <Text>🏷️ {filter.scenario === '全部' ? '全部场景' : filter.scenario}</Text>
          </View>
        </Picker>

        {/* Favorite toggle */}
        <View
          onClick={() => onChange({ favoriteOnly: !filter.favoriteOnly })}
          className={`${styles.chip} ${styles.chipFav} ${filter.favoriteOnly ? styles.chipFavActive : ''}`}
        >
          <Text>{filter.favoriteOnly ? '❤️ 仅收藏' : '🤍 收藏'}</Text>
        </View>
      </View>

      {/* Count & Clear */}
      <View className={styles.countBar}>
        <Text className={styles.count}>
          {filteredCount === totalCount
            ? `共 ${totalCount} 件衣物`
            : `${filteredCount} / ${totalCount} 件衣物`}
        </Text>
        {hasActiveFilters && (
          <View onClick={onClear} className={styles.clearBtn}>
            <Text className={styles.clearBtnText}>清除筛选</Text>
          </View>
        )}
      </View>
    </View>
  );
}
