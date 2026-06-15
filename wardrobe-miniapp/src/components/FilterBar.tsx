import { View, Text, Input, Picker } from '@tarojs/components';
import { useState } from 'react';
import type { WardrobeFilter, Category, ColorLabel, Season, Scenario, Style } from '../types';
import { ALL_CATEGORIES, ALL_COLORS, ALL_SEASONS, ALL_SCENARIOS } from '../types';

interface FilterBarProps {
  filter: WardrobeFilter;
  onChange: (updates: Partial<WardrobeFilter>) => void;
  onClear: () => void;
  totalCount: number;
  filteredCount: number;
}

// Picker 选项格式化
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
    <View style={{ marginBottom: '20px' }}>
      {/* Search */}
      <View style={{
        position: 'relative',
        backgroundColor: '#f3f4f6',
        borderRadius: '12px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <Text style={{ fontSize: '28px', color: '#9ca3af', marginRight: '8px' }}>🔍</Text>
        <Input
          style={{
            flex: 1, height: '72px', fontSize: '28px',
            backgroundColor: 'transparent',
          }}
          value={filter.search}
          onInput={(e) => onChange({ search: e.detail.value })}
          placeholder="搜索衣物名称、品类..."
          placeholderStyle="color: #9ca3af; font-size: 26px"
        />
        {filter.search && (
          <View onClick={() => onChange({ search: '' })}
            style={{ padding: '8px' }}>
            <Text style={{ fontSize: '24px', color: '#9ca3af' }}>✕</Text>
          </View>
        )}
      </View>

      {/* Quick filters */}
      <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
        {/* Category */}
        <Picker
          mode="selector"
          range={CATEGORY_OPTIONS}
          value={CATEGORY_OPTIONS.indexOf(filter.category === '全部' ? '全部' : filter.category)}
          onChange={(e) => {
            const val = CATEGORY_OPTIONS[Number(e.detail.value)];
            onChange({ category: (val === '全部' ? '全部' : val) as Category | '全部' });
          }}
        >
          <View style={{
            padding: '10px 20px', borderRadius: '20px',
            border: '1px solid #e5e7eb', backgroundColor: '#fff',
            fontSize: '24px', color: '#6b7280',
          }}>
            <Text>📂 {filter.category === '全部' ? '全部品类' : filter.category}</Text>
          </View>
        </Picker>

        {/* Color */}
        <Picker
          mode="selector"
          range={COLOR_OPTIONS}
          value={COLOR_OPTIONS.indexOf(filter.primaryColor === '全部' ? '全部' : filter.primaryColor)}
          onChange={(e) => {
            const val = COLOR_OPTIONS[Number(e.detail.value)];
            onChange({ primaryColor: (val === '全部' ? '全部' : val) as ColorLabel | '全部' });
          }}
        >
          <View style={{
            padding: '10px 20px', borderRadius: '20px',
            border: '1px solid #e5e7eb', backgroundColor: '#fff',
            fontSize: '24px', color: '#6b7280',
          }}>
            <Text>🎨 {filter.primaryColor === '全部' ? '全部颜色' : filter.primaryColor}</Text>
          </View>
        </Picker>

        {/* Season */}
        <Picker
          mode="selector"
          range={SEASON_OPTIONS}
          value={SEASON_OPTIONS.indexOf(filter.season === '全部' ? '全部' : filter.season)}
          onChange={(e) => {
            const val = SEASON_OPTIONS[Number(e.detail.value)];
            onChange({ season: (val === '全部' ? '全部' : val) as Season | '全部' });
          }}
        >
          <View style={{
            padding: '10px 20px', borderRadius: '20px',
            border: '1px solid #e5e7eb', backgroundColor: '#fff',
            fontSize: '24px', color: '#6b7280',
          }}>
            <Text>📅 {filter.season === '全部' ? '全部季节' : filter.season}</Text>
          </View>
        </Picker>

        {/* Scenario */}
        <Picker
          mode="selector"
          range={SCENARIO_OPTIONS}
          value={SCENARIO_OPTIONS.indexOf(filter.scenario === '全部' ? '全部' : filter.scenario)}
          onChange={(e) => {
            const val = SCENARIO_OPTIONS[Number(e.detail.value)];
            onChange({ scenario: (val === '全部' ? '全部' : val) as Scenario | '全部' });
          }}
        >
          <View style={{
            padding: '10px 20px', borderRadius: '20px',
            border: '1px solid #e5e7eb', backgroundColor: '#fff',
            fontSize: '24px', color: '#6b7280',
          }}>
            <Text>🏷️ {filter.scenario === '全部' ? '全部场景' : filter.scenario}</Text>
          </View>
        </Picker>

        {/* Favorite toggle */}
        <View
          onClick={() => onChange({ favoriteOnly: !filter.favoriteOnly })}
          style={{
            padding: '10px 20px', borderRadius: '20px',
            border: filter.favoriteOnly ? '1px solid #fca5a5' : '1px solid #e5e7eb',
            backgroundColor: filter.favoriteOnly ? '#fef2f2' : '#fff',
            fontSize: '24px', fontWeight: 500,
            color: filter.favoriteOnly ? '#ef4444' : '#6b7280',
          }}
        >
          <Text>{filter.favoriteOnly ? '❤️ 仅收藏' : '🤍 收藏'}</Text>
        </View>
      </View>

      {/* Count & Clear */}
      <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: '22px', color: '#9ca3af' }}>
          {filteredCount === totalCount
            ? `共 ${totalCount} 件衣物`
            : `${filteredCount} / ${totalCount} 件衣物`}
        </Text>
        {hasActiveFilters && (
          <View onClick={onClear}
            style={{ padding: '8px 12px' }}>
            <Text style={{ fontSize: '24px', color: '#f97316', fontWeight: 500 }}>清除筛选</Text>
          </View>
        )}
      </View>
    </View>
  );
}
