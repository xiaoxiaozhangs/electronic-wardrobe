/* 衣橱页面 - 左右分栏重构版 */
import { useState, useMemo } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { WardrobeItem, WardrobeFilter, Category, SubCategory, ColorLabel, Season, Scenario, Style } from '../../types';
import { ALL_CATEGORIES, CATEGORY_ICONS } from '../../types';
import { useWardrobeStore } from '../../hooks/useWardrobeStore';
import ClothingCard from '../../components/ClothingCard';
import ClothingForm from '../../components/ClothingForm';
import FilterBar from '../../components/FilterBar';
import EmptyState from '../../components/EmptyState';
import BottomNav from '../../components/BottomNav';
import CategorySidebar from '../../components/CategorySidebar';
import ActionBar from '../../components/ActionBar';
import styles from './wardrobe.module.scss';

// 品类 → 子品类列表映射
const CATEGORY_SUB_MAP: Record<Category, SubCategory[]> = {
  '上衣': ['T恤', '衬衫', '卫衣', '针织衫', '毛衣', '背心'],
  '下装': ['牛仔裤', '休闲裤', '西裤', '短裤', '半身裙', '长裙', '短裙'],
  '外套': ['风衣', '夹克', '西装', '羽绒服', '大衣'],
  '连衣裙': ['连衣长裙', '连衣短裙'],
  '鞋': ['运动鞋', '皮鞋', '靴子', '凉鞋', '帆布鞋'],
  '包': ['手拎包', '斜挎包', '双肩包'],
  '配饰': ['项链', '耳环', '手表', '帽子', '围巾', '腰带'],
  '其他': ['其他'],
};

// 子品类图标映射
const SUB_CATEGORY_ICONS: Record<string, string> = {
  'T恤': '👕', '衬衫': '👔', '卫衣': '🧥', '针织衫': '🧶', '毛衣': '🧣', '背心': '🎽',
  '牛仔裤': '👖', '休闲裤': '👖', '西裤': '👔', '短裤': '🩳', '半身裙': '👗', '长裙': '👗', '短裙': '👗',
  '风衣': '🧥', '夹克': '🧥', '西装': '🤵', '羽绒服': '🧣', '大衣': '🧥',
  '连衣长裙': '👗', '连衣短裙': '👗',
  '运动鞋': '👟', '皮鞋': '👞', '靴子': '👢', '凉鞋': '👡', '帆布鞋': '👟',
  '手拎包': '👜', '斜挎包': '🎒', '双肩包': '🎒',
  '项链': '📿', '耳环': '💎', '手表': '⌚', '帽子': '🧢', '围巾': '🧣', '腰带': '🪢',
  '其他': '📦',
};

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

type ViewMode = 'subcategory' | 'list';

export default function WardrobePage() {
  const { items, addItem, updateItem, deleteItem, toggleFavorite, loading } = useWardrobeStore();

  const [selectedCategory, setSelectedCategory] = useState<Category>('上衣');
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('subcategory');
  const [filter, setFilter] = useState<WardrobeFilter>(DEFAULT_FILTER);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);

  // 子品类视图：获取当前品类下的子品类列表
  const subCategories = useMemo(() => {
    return CATEGORY_SUB_MAP[selectedCategory] || [];
  }, [selectedCategory]);

  // 获取各子品类下的衣物数量
  const subCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    subCategories.forEach((sub) => {
      counts[sub] = items.filter(
        (item) => item.category === selectedCategory && item.subCategory === sub
      ).length;
    });
    return counts;
  }, [items, selectedCategory, subCategories]);

  // 衣物列表：按选中子品类筛选
  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedSubCategory) {
      list = list.filter((item) => item.subCategory === selectedSubCategory);
    }
    // 额外的筛选条件
    if (filter.category !== '全部' && list.length === items.length) {
      list = list.filter((item) => item.category === filter.category);
    }
    if (filter.primaryColor !== '全部') {
      list = list.filter((item) => item.primaryColor === filter.primaryColor);
    }
    if (filter.season !== '全部') {
      list = list.filter((item) => item.seasons.includes(filter.season as Season));
    }
    if (filter.scenario !== '全部') {
      list = list.filter((item) => item.scenarios.includes(filter.scenario as Scenario));
    }
    if (filter.style !== '全部') {
      list = list.filter((item) => item.styles.includes(filter.style as Style));
    }
    if (filter.favoriteOnly) {
      list = list.filter((item) => item.isFavorite);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (item) =>
          item.subCategory.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.note.toLowerCase().includes(q) ||
          item.primaryColor.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, selectedSubCategory, filter]);

  const updateFilter = (updates: Partial<WardrobeFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
  };
  const clearFilter = () => setFilter(DEFAULT_FILTER);

  const handleCategoryChange = (cat: Category) => {
    setSelectedCategory(cat);
    setSelectedSubCategory(null);
    setViewMode('subcategory');
    setFilter((prev) => ({ ...prev, category: '全部' }));
  };

  const handleSubCategoryClick = (sub: SubCategory) => {
    setSelectedSubCategory(sub);
    setViewMode('list');
  };

  const handleBackToSubCategory = () => {
    setSelectedSubCategory(null);
    setViewMode('subcategory');
    clearFilter();
  };

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

  const handleAdd = () => {
    setShowForm(true);
  };

  const handleOutfit = () => {
    Taro.redirectTo({ url: '/pages/outfit/outfit' });
  };

  const handleClose = () => {
    Taro.redirectTo({ url: '/pages/index/index' });
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
      <View className={styles.pageWrap}>
        <View className="container" style={{ flex: 1, overflow: 'auto' }}>
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
        <BottomNav activeKey="wardrobe" />
      </View>
    );
  }

  // Main view: side-by-side layout
  return (
    <View className={styles.pageWrap}>
      {/* 左右分栏主体 */}
      <View className={styles.mainArea}>
        {/* 左侧品类侧边栏 */}
        <CategorySidebar
          selected={selectedCategory}
          onSelect={handleCategoryChange}
        />

        {/* 右侧内容区 */}
        <View className={styles.contentArea}>
          {/* 右上角导航图标 */}
          <View className={styles.topIcons}>
            <View className={styles.iconBtn} onClick={handleClose}>
              <Text>✕</Text>
            </View>
          </View>

          {/* 功能按钮行 */}
          <ActionBar
            onFilter={() => {
              // 筛选逻辑：弹窗或展开筛选面板，当前简化处理
              Taro.showToast({ title: '筛选功能开发中', icon: 'none' });
            }}
            onAdd={handleAdd}
            onOutfit={handleOutfit}
          />

          {/* 内容区 */}
          <ScrollView className={styles.contentScroll} scrollY>
            {viewMode === 'subcategory' ? (
              /* 子品类网格视图 */
              <>
                {subCategories.length > 0 ? (
                  <View className={styles.subCategoryGrid}>
                    {subCategories.map((sub) => (
                      <View
                        key={sub}
                        className={styles.subCategoryCard}
                        onClick={() => handleSubCategoryClick(sub)}
                      >
                        <Text className={styles.subCategoryIcon}>
                          {SUB_CATEGORY_ICONS[sub] || '📦'}
                        </Text>
                        <Text className={styles.subCategoryLabel}>{sub}</Text>
                        <Text className={styles.subCategoryCount}>
                          {subCategoryCounts[sub] || 0} 件
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className={styles.emptyArea}>
                    <Text className={styles.emptyIcon}>📦</Text>
                    <Text className={styles.emptyText}>暂无子品类</Text>
                    <Text className={styles.emptySubText}>该品类暂未配置子品类</Text>
                  </View>
                )}
              </>
            ) : (
              /* 衣物列表视图 */
              <>
                {/* 面包屑导航 */}
                <View className={styles.breadcrumb}>
                  <View onClick={handleBackToSubCategory}>
                    <Text className={styles.breadcrumbBack}>← {selectedCategory}</Text>
                  </View>
                  <Text className={styles.breadcrumbSep}>/</Text>
                  <Text className={styles.breadcrumbCurrent}>{selectedSubCategory}</Text>
                </View>

                {/* 筛选栏 */}
                <FilterBar
                  filter={filter}
                  onChange={updateFilter}
                  onClear={clearFilter}
                  totalCount={items.filter((i) => i.subCategory === selectedSubCategory).length}
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
                ) : (
                  <EmptyState
                    icon="🔍"
                    title="没有找到匹配的衣物"
                    description="尝试调整筛选条件或添加新衣物"
                    action={{ label: '清除筛选', onClick: clearFilter }}
                  />
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>

      <BottomNav activeKey="wardrobe" />
    </View>
  );
}
