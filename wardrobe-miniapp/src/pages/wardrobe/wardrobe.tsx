import { useState, useMemo } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { WardrobeItem, WardrobeFilter, Category, ColorLabel, Season, Scenario, Style, ItemStatus } from '../../types';
import { ALL_CATEGORIES, ALL_COLORS, ALL_SEASONS, ALL_SCENARIOS } from '../../types';
import { useWardrobeStore } from '../../hooks/useWardrobeStore';
import ClothingCard from '../../components/ClothingCard';
import ClothingForm from '../../components/ClothingForm';
import FilterBar from '../../components/FilterBar';
import EmptyState from '../../components/EmptyState';
import BottomNav from '../../components/BottomNav';

const DEFAULT_FILTER: WardrobeFilter = {
  category: '全部',
  primaryColor: '全部',
  season: '全部',
  scenario: '全部',
  style: '全部',
  status: '全部',
  search: '',
  favoriteOnly: false,
};

export default function WardrobePage() {
  const { items, addItem, updateItem, deleteItem, toggleFavorite, loading } = useWardrobeStore();

  const [filter, setFilter] = useState<WardrobeFilter>(DEFAULT_FILTER);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);

  // Filter logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter.category !== '全部' && item.category !== filter.category) return false;
      if (filter.primaryColor !== '全部' && item.primaryColor !== filter.primaryColor) return false;
      if (filter.season !== '全部' && !item.seasons.includes(filter.season as Season)) return false;
      if (filter.scenario !== '全部' && !item.scenarios.includes(filter.scenario as Scenario)) return false;
      if (filter.style !== '全部' && !item.styles.includes(filter.style as Style)) return false;
      if (filter.status !== '全部' && item.status !== filter.status) return false;
      if (filter.favoriteOnly && !item.isFavorite) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (
          !item.subCategory.toLowerCase().includes(q) &&
          !item.category.toLowerCase().includes(q) &&
          !item.note.toLowerCase().includes(q) &&
          !item.primaryColor.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, filter]);

  const updateFilter = (updates: Partial<WardrobeFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
  };
  const clearFilter = () => setFilter(DEFAULT_FILTER);

  const handleFormSubmit = (
    data: Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount' | 'lastWornAt'>
  ) => {
    if (editingItem) {
      updateItem(editingItem.id, data);
    } else {
      addItem(data);
    }
    setShowForm(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (item: WardrobeItem) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定删除这件衣物吗？',
      success: (res) => {
        if (res.confirm) {
          deleteItem(item.id);
          if (selectedItem?.id === item.id) setSelectedItem(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <View className="container">
        <View className="loading-spinner">
          <Text className="loading-spinner-icon">⏳</Text>
          <Text style={{ fontSize: '24px', color: '#9ca3af', marginTop: '12px' }}>加载中...</Text>
        </View>
      </View>
    );
  }

  // Detail view
  if (selectedItem) {
    return (
      <View className="container">
        <View onClick={() => setSelectedItem(null)}
          style={{ marginBottom: '20px', padding: '6px 0' }}>
          <Text style={{ fontSize: '24px', color: '#6b7280' }}>← 返回列表</Text>
        </View>

        {/* Large image */}
        <View style={{
          borderRadius: '24px', overflow: 'hidden', backgroundColor: '#f5f5f7',
          aspectRatio: '1', marginBottom: '16px',
        }}>
          <Image
            src={selectedItem.imageBase64}
            mode="aspectFit"
            style={{ width: '100%', height: '100%' }}
          />
        </View>

        {/* Info */}
        <View style={{ marginBottom: '20px' }}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Text style={{ fontSize: '32px', fontWeight: 700 }}>{selectedItem.subCategory}</Text>
            <View onClick={() => toggleFavorite(selectedItem.id)} style={{ fontSize: '36px', padding: '6px' }}>
              <Text>{selectedItem.isFavorite ? '❤️' : '🤍'}</Text>
            </View>
          </View>

          <View style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <View style={detailBadgeStyle}>
              <Text style={{ fontSize: '18px', color: '#9ca3af' }}>品类</Text>
              <Text style={{ fontSize: '22px', fontWeight: 500 }}>{selectedItem.category} · {selectedItem.subCategory}</Text>
            </View>
            <View style={detailBadgeStyle}>
              <Text style={{ fontSize: '18px', color: '#9ca3af' }}>主色</Text>
              <Text style={{ fontSize: '22px', fontWeight: 500 }}>{selectedItem.primaryColor}</Text>
            </View>
            <View style={detailBadgeStyle}>
              <Text style={{ fontSize: '18px', color: '#9ca3af' }}>季节</Text>
              <Text style={{ fontSize: '22px', fontWeight: 500 }}>{selectedItem.seasons.join('、')}</Text>
            </View>
            <View style={detailBadgeStyle}>
              <Text style={{ fontSize: '18px', color: '#9ca3af' }}>厚薄</Text>
              <Text style={{ fontSize: '22px', fontWeight: 500 }}>{selectedItem.thickness}</Text>
            </View>
          </View>

          <View style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {selectedItem.scenarios.map((s) => (
              <Text key={s} className="tag tag-green">{s}</Text>
            ))}
            {selectedItem.styles.map((s) => (
              <Text key={s} className="tag tag-purple">{s}</Text>
            ))}
          </View>

          {selectedItem.note && (
            <Text style={{
              fontSize: '24px', color: '#6b7280',
              backgroundColor: '#f5f5f7', borderRadius: '12px', padding: '14px',
              display: 'block', marginBottom: '10px',
            }}>
              📝 {selectedItem.note}
            </Text>
          )}

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ fontSize: '20px', color: '#9ca3af', display: 'block' }}>
              穿着 {selectedItem.wearCount} 次
            </Text>
            {selectedItem.lastWornAt && (
              <Text style={{ fontSize: '20px', color: '#9ca3af', display: 'block' }}>
                最近穿着：{new Date(selectedItem.lastWornAt).toLocaleDateString('zh-CN')}
              </Text>
            )}
          </View>

          <View style={{ display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e8e8ed' }}>
            <View className="btn-outline" style={{ flex: 1 }}
              onClick={() => {
                setEditingItem(selectedItem);
                setShowForm(true);
                setSelectedItem(null);
              }}>
              ✏️ 编辑
            </View>
            <View className="btn-outline" style={{ flex: 1, color: '#ef4444', borderColor: '#fecaca' }}
              onClick={() => handleDeleteItem(selectedItem)}>
              🗑️ 删除
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Form view
  if (showForm) {
    return (
      <View className="container">
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <View onClick={() => { setShowForm(false); setEditingItem(null); }}>
            <Text style={{ fontSize: '24px', color: '#6b7280' }}>← 取消</Text>
          </View>
          <Text style={{ fontSize: '30px', fontWeight: 700 }}>
            {editingItem ? '编辑衣物' : '添加衣物'}
          </Text>
          <View style={{ width: '60px' }} />
        </View>
        <ClothingForm
          initialData={editingItem ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingItem(null); }}
        />
      </View>
    );
  }

  // List view
  return (
    <View className="container">
      <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Text className="section-title" style={{ marginBottom: 0 }}>我的衣橱</Text>
        <View className="btn-primary" style={{ padding: '10px 20px', fontSize: '24px' }}
          onClick={() => setShowForm(true)}>
          + 添加衣物
        </View>
      </View>

      <FilterBar
        filter={filter}
        onChange={updateFilter}
        onClear={clearFilter}
        totalCount={items.length}
        filteredCount={filteredItems.length}
      />

      {filteredItems.length > 0 ? (
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
          {filteredItems.map((item) => (
            <View key={item.id} style={{ width: '47%', flexGrow: 1 }}>
              <ClothingCard
                item={item}
                onClick={() => setSelectedItem(item)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onDelete={() => handleDeleteItem(item)}
              />
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="👗"
          title="衣橱是空的"
          description="点击上方按钮添加你的第一件衣物，开始建立电子衣橱"
          action={{ label: '添加第一件衣物', onClick: () => setShowForm(true) }}
        />
      ) : (
        <EmptyState
          icon="🔍"
          title="没有找到匹配的衣物"
          description="尝试调整筛选条件"
          action={{ label: '清除筛选', onClick: clearFilter }}
        />
      )}
      <BottomNav activeKey="wardrobe" />
    </View>
  );
}

const detailBadgeStyle: React.CSSProperties = {
  backgroundColor: '#f5f5f7', borderRadius: '12px',
  padding: '14px', width: '45%', flexGrow: 1,
};
