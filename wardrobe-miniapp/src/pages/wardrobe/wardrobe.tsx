/* 衣橱页面 - 样式重构版 */
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
import styles from './wardrobe.module.scss';

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
          <Text className={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  // Detail view
  if (selectedItem) {
    return (
      <View className="container">
        <View onClick={() => setSelectedItem(null)} className={styles.backBtn}>
          <Text className={styles.backBtnText}>← 返回列表</Text>
        </View>

        <View className={styles.detailImageWrap}>
          <Image
            src={selectedItem.imageBase64}
            mode="aspectFit"
            className={styles.detailImage}
          />
        </View>

        <View className={styles.detailInfo}>
          <View className={styles.detailHeader}>
            <Text className={styles.detailName}>{selectedItem.subCategory}</Text>
            <View onClick={() => toggleFavorite(selectedItem.id)} className={styles.detailFav}>
              <Text>{selectedItem.isFavorite ? '❤️' : '🤍'}</Text>
            </View>
          </View>

          <View className={styles.detailBadges}>
            <View className={styles.detailBadge}>
              <Text className={styles.detailBadgeLabel}>品类</Text>
              <Text className={styles.detailBadgeValue}>{selectedItem.category} · {selectedItem.subCategory}</Text>
            </View>
            <View className={styles.detailBadge}>
              <Text className={styles.detailBadgeLabel}>主色</Text>
              <Text className={styles.detailBadgeValue}>{selectedItem.primaryColor}</Text>
            </View>
            <View className={styles.detailBadge}>
              <Text className={styles.detailBadgeLabel}>季节</Text>
              <Text className={styles.detailBadgeValue}>{selectedItem.seasons.join('、')}</Text>
            </View>
            <View className={styles.detailBadge}>
              <Text className={styles.detailBadgeLabel}>厚薄</Text>
              <Text className={styles.detailBadgeValue}>{selectedItem.thickness}</Text>
            </View>
          </View>

          <View className={styles.detailTags}>
            {selectedItem.scenarios.map((s) => (
              <Text key={s} className="tag tag-green">{s}</Text>
            ))}
            {selectedItem.styles.map((s) => (
              <Text key={s} className="tag tag-purple">{s}</Text>
            ))}
          </View>

          {selectedItem.note && (
            <Text className={styles.detailNote}>📝 {selectedItem.note}</Text>
          )}

          <View className={styles.detailMeta}>
            <Text className={styles.detailMetaText}>穿着 {selectedItem.wearCount} 次</Text>
            {selectedItem.lastWornAt && (
              <Text className={styles.detailMetaText}>
                最近穿着：{new Date(selectedItem.lastWornAt).toLocaleDateString('zh-CN')}
              </Text>
            )}
          </View>

          <View className={styles.detailActions}>
            <View className="btn-outline" style={{ flex: 1 }}
              onClick={() => {
                setEditingItem(selectedItem);
                setShowForm(true);
                setSelectedItem(null);
              }}>
              ✏️ 编辑
            </View>
            <View className={`btn-outline ${styles.detailDeleteBtn}`}
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
        <View className={styles.formHeader}>
          <View onClick={() => { setShowForm(false); setEditingItem(null); }}>
            <Text className={styles.formCancel}>← 取消</Text>
          </View>
          <Text className={styles.formTitle}>
            {editingItem ? '编辑衣物' : '添加衣物'}
          </Text>
          <View className={styles.formSpacer} />
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
      <View className={styles.listHeader}>
        <Text className={`section-title ${styles.listTitle}`}>我的衣橱</Text>
        <View className={`btn-primary ${styles.addBtn}`} onClick={() => setShowForm(true)}>
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
        <View className={styles.itemGrid}>
          {filteredItems.map((item) => (
            <View key={item.id} className={styles.itemGridCell}>
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
