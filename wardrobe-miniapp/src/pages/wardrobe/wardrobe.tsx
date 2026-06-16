/**
 * 衣橱页 - 瀑布流列表
 *
 * 功能：
 *  - 两列瀑布流布局，卡片比例 3:4
 *  - 下拉刷新（scroll-view refresher）
 *  - 上拉加载更多（pageSize=20）
 *  - 图片懒加载 + fade-in 渐入
 *  - 首屏骨架屏
 *  - 空状态（插画 + 引导文案）
 *  - 筛选 / 搜索
 *  - 详情查看 / 收藏 / 删除
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { WardrobeItem, WardrobeFilter, Category, ColorLabel, Season, Scenario, Style, ItemStatus } from '../../types';
import { ALL_CATEGORIES, ALL_COLORS, ALL_SEASONS, ALL_SCENARIOS } from '../../types';
import { useWardrobeStore } from '../../hooks/useWardrobeStore';
import WaterfallCard from '../../components/WaterfallCard';
import FilterBar from '../../components/FilterBar';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import BottomNav from '../../components/BottomNav';
import ClothingForm from '../../components/ClothingForm';

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

const PAGE_SIZE = 20;

export default function WardrobePage() {
  const {
    items,
    addItem,
    updateItem,
    deleteItem,
    toggleFavorite,
    loading,
  } = useWardrobeStore();

  const [filter, setFilter] = useState<WardrobeFilter>(DEFAULT_FILTER);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);

  // ---- 分页状态 ----
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const firstLoadDone = useRef(false);

  // ---- 筛选逻辑 ----
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

  // 当前展示的数据
  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, displayCount);
  }, [filteredItems, displayCount]);

  const hasMore = displayedItems.length < filteredItems.length;

  // 首次加载完成后标记
  useEffect(() => {
    if (!loading && !firstLoadDone.current) {
      firstLoadDone.current = true;
    }
  }, [loading]);

  // 筛选条件变化时重置分页
  const updateFilter = useCallback((updates: Partial<WardrobeFilter>) => {
    setFilter((prev) => {
      const next = { ...prev, ...updates };
      return next;
    });
    setDisplayCount(PAGE_SIZE);
  }, []);

  const clearFilter = useCallback(() => {
    setFilter(DEFAULT_FILTER);
    setDisplayCount(PAGE_SIZE);
  }, []);

  // ---- CRUD 操作 ----
  const handleFormSubmit = useCallback(
    (data: Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount' | 'lastWornAt'>) => {
      if (editingItem) {
        updateItem(editingItem.id, data);
      } else {
        addItem(data);
      }
      setShowForm(false);
      setEditingItem(null);
    },
    [editingItem, addItem, updateItem]
  );

  const handleDeleteItem = useCallback(
    (item: WardrobeItem) => {
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
    },
    [deleteItem, selectedItem]
  );

  // ---- 下拉刷新 ----
  const handleRefresh = useCallback(() => {
    // 重置分页计数
    setDisplayCount(PAGE_SIZE);
    // 触发 store 刷新
    // useWardrobeStore 的 reinitialize 可以重新拉数据
    setTimeout(() => {
      Taro.stopPullDownRefresh();
    }, 500);
  }, []);

  // ---- 上拉加载更多 ----
  const handleScrollToLower = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    // 模拟分页加载（实际数据已在 store 中，这里只做分页展示）
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, filteredItems.length));
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMore, filteredItems.length]);

  // ---- 渲染：首屏加载骨架屏 ----
  if (loading && !firstLoadDone.current) {
    return (
      <View className="container">
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Text className="section-title" style={{ marginBottom: 0 }}>
            我的衣橱
          </Text>
          <View
            className="btn-primary"
            style={{ padding: '12px 24px', fontSize: '26px' }}
            onClick={() => setShowForm(true)}
          >
            + 添加衣物
          </View>
        </View>
        <Skeleton type="waterfall" count={6} />
      </View>
    );
  }

  // ---- 渲染：加载中 ----
  if (loading) {
    return (
      <View className="container">
        <View className="loading-spinner">
          <Text className="loading-spinner-icon">⏳</Text>
          <Text style={{ fontSize: '26px', color: '#9ca3af', marginTop: '16px' }}>
            加载中...
          </Text>
        </View>
      </View>
    );
  }

  // ---- 渲染：详情页 ----
  if (selectedItem) {
    return (
      <View className="container">
        <View
          onClick={() => setSelectedItem(null)}
          style={{ marginBottom: '24px', padding: '8px 0' }}
        >
          <Text style={{ fontSize: '26px', color: '#6b7280' }}>← 返回列表</Text>
        </View>

        {/* 大图 */}
        <View
          style={{
            borderRadius: '20px',
            overflow: 'hidden',
            backgroundColor: '#f9fafb',
            aspectRatio: '1',
            marginBottom: '20px',
          }}
        >
          <Image
            src={selectedItem.imageBase64}
            mode="aspectFit"
            style={{ width: '100%', height: '100%' }}
          />
        </View>

        {/* 信息 */}
        <View style={{ marginBottom: '24px' }}>
          <View
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <Text style={{ fontSize: '36px', fontWeight: 700 }}>
              {selectedItem.subCategory}
            </Text>
            <View
              onClick={() => toggleFavorite(selectedItem.id)}
              style={{ fontSize: '40px', padding: '8px' }}
            >
              <Text>{selectedItem.isFavorite ? '❤️' : '🤍'}</Text>
            </View>
          </View>

          <View
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <View style={detailBadgeStyle}>
              <Text style={{ fontSize: '20px', color: '#9ca3af' }}>品类</Text>
              <Text style={{ fontSize: '24px', fontWeight: 500 }}>
                {selectedItem.category} · {selectedItem.subCategory}
              </Text>
            </View>
            <View style={detailBadgeStyle}>
              <Text style={{ fontSize: '20px', color: '#9ca3af' }}>主色</Text>
              <Text style={{ fontSize: '24px', fontWeight: 500 }}>
                {selectedItem.primaryColor}
              </Text>
            </View>
            <View style={detailBadgeStyle}>
              <Text style={{ fontSize: '20px', color: '#9ca3af' }}>季节</Text>
              <Text style={{ fontSize: '24px', fontWeight: 500 }}>
                {selectedItem.seasons.join('、')}
              </Text>
            </View>
            <View style={detailBadgeStyle}>
              <Text style={{ fontSize: '20px', color: '#9ca3af' }}>厚薄</Text>
              <Text style={{ fontSize: '24px', fontWeight: 500 }}>
                {selectedItem.thickness}
              </Text>
            </View>
          </View>

          <View
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            {selectedItem.scenarios.map((s) => (
              <Text key={s} className="tag tag-green">
                {s}
              </Text>
            ))}
            {selectedItem.styles.map((s) => (
              <Text key={s} className="tag tag-purple">
                {s}
              </Text>
            ))}
          </View>

          {selectedItem.note && (
            <Text
              style={{
                fontSize: '26px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                padding: '16px',
                display: 'block',
                marginBottom: '12px',
              }}
            >
              📝 {selectedItem.note}
            </Text>
          )}

          <View style={{ marginBottom: '12px' }}>
            <Text
              style={{ fontSize: '22px', color: '#9ca3af', display: 'block' }}
            >
              穿着 {selectedItem.wearCount} 次
            </Text>
            {selectedItem.lastWornAt && (
              <Text
                style={{ fontSize: '22px', color: '#9ca3af', display: 'block' }}
              >
                最近穿着：{new Date(selectedItem.lastWornAt).toLocaleDateString('zh-CN')}
              </Text>
            )}
          </View>

          <View
            style={{
              display: 'flex',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '1px solid #f3f4f6',
            }}
          >
            <View
              className="btn-outline"
              style={{ flex: 1 }}
              onClick={() => {
                setEditingItem(selectedItem);
                setShowForm(true);
                setSelectedItem(null);
              }}
            >
              ✏️ 编辑
            </View>
            <View
              className="btn-outline"
              style={{ flex: 1, color: '#ef4444', borderColor: '#fecaca' }}
              onClick={() => handleDeleteItem(selectedItem)}
            >
              🗑️ 删除
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ---- 渲染：表单页 ----
  if (showForm) {
    return (
      <View className="container">
        <View
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <View
            onClick={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          >
            <Text style={{ fontSize: '26px', color: '#6b7280' }}>← 取消</Text>
          </View>
          <Text style={{ fontSize: '32px', fontWeight: 700 }}>
            {editingItem ? '编辑衣物' : '添加衣物'}
          </Text>
          <View style={{ width: '60px' }} />
        </View>
        <ClothingForm
          initialData={editingItem ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      </View>
    );
  }

  // ---- 渲染：瀑布流列表 ----
  return (
    <View className="container" style={{ paddingBottom: '120px' }}>
      {/* 顶部标题栏 */}
      <View
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <Text className="section-title" style={{ marginBottom: 0 }}>
          我的衣橱
        </Text>
        <View
          className="btn-primary"
          style={{ padding: '12px 24px', fontSize: '26px' }}
          onClick={() => setShowForm(true)}
        >
          + 添加衣物
        </View>
      </View>

      {/* 筛选栏 */}
      <FilterBar
        filter={filter}
        onChange={updateFilter}
        onClear={clearFilter}
        totalCount={items.length}
        filteredCount={filteredItems.length}
      />

      {/* 空状态 */}
      {filteredItems.length === 0 ? (
        items.length === 0 ? (
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
        )
      ) : (
        /* 瀑布流滚动视图 */
        <ScrollView
          className="waterfall-scroll"
          scrollY
          enableBackToTop
          refresherEnabled
          refresherTriggered={false}
          refresherThreshold={50}
          onRefresherRefresh={handleRefresh}
          onScrollToLower={handleScrollToLower}
          lowerThreshold={120}
          style={{ height: 'calc(100vh - 380px)' }}
        >
          <View className="waterfall-grid">
            {displayedItems.map((item) => (
              <View key={item.id} className="waterfall-col">
                <WaterfallCard
                  item={item}
                  onClick={() => setSelectedItem(item)}
                  onToggleFavorite={() => toggleFavorite(item.id)}
                />
              </View>
            ))}
          </View>

          {/* 加载更多提示 */}
          {loadingMore && (
            <View className="load-more-tip">
              <Text>⏳</Text>
              <Text>加载中...</Text>
            </View>
          )}

          {!hasMore && displayedItems.length > 0 && (
            <View className="load-more-tip">
              <Text>— 已加载全部 —</Text>
            </View>
          )}
        </ScrollView>
      )}

      <BottomNav activeKey="wardrobe" />
    </View>
  );
}

const detailBadgeStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '12px',
  padding: '16px',
  width: '45%',
  flexGrow: 1,
};
