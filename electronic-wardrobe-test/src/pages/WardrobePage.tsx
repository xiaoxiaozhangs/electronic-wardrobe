import { useState, useMemo } from "react";
import type { WardrobeItem, WardrobeFilter, Category, ColorLabel, Season, Scenario, Style, ItemStatus } from "../types";
import { ALL_CATEGORIES, ALL_COLORS, ALL_SEASONS, ALL_SCENARIOS } from "../types";
import ClothingCard from "../components/ClothingCard";
import ClothingForm from "../components/ClothingForm";
import FilterBar from "../components/FilterBar";
import EmptyState from "../components/EmptyState";

interface WardrobePageProps {
  items: WardrobeItem[];
  onAddItem: (
    data: Omit<WardrobeItem, "id" | "createdAt" | "updatedAt" | "wearCount" | "lastWornAt">
  ) => void;
  onUpdateItem: (id: string, updates: Partial<WardrobeItem>) => void;
  onDeleteItem: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const DEFAULT_FILTER: WardrobeFilter = {
  category: "全部",
  primaryColor: "全部",
  season: "全部",
  scenario: "全部",
  style: "全部",
  status: "全部",
  search: "",
  favoriteOnly: false,
};

export default function WardrobePage({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onToggleFavorite,
}: WardrobePageProps) {
  const [filter, setFilter] = useState<WardrobeFilter>(DEFAULT_FILTER);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);

  // Filter logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter.category !== "全部" && item.category !== filter.category) return false;
      if (filter.primaryColor !== "全部" && item.primaryColor !== filter.primaryColor) return false;
      if (filter.season !== "全部" && !item.seasons.includes(filter.season as Season)) return false;
      if (filter.scenario !== "全部" && !item.scenarios.includes(filter.scenario as Scenario)) return false;
      if (filter.style !== "全部" && !item.styles.includes(filter.style as Style)) return false;
      if (filter.status !== "全部" && item.status !== filter.status) return false;
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
    data: Omit<WardrobeItem, "id" | "createdAt" | "updatedAt" | "wearCount" | "lastWornAt">
  ) => {
    if (editingItem) {
      onUpdateItem(editingItem.id, data);
    } else {
      onAddItem(data);
    }
    setShowForm(false);
    setEditingItem(null);
  };

  // Detail modal for selected item
  if (selectedItem) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSelectedItem(null)}
          className="text-[13px] text-[#0071e3] font-medium hover:text-[#0077ed]"
        >
          ← 返回列表
        </button>

        {/* Large image */}
        <div className="rounded-2xl overflow-hidden bg-[#f5f5f7] aspect-square">
          <img
            src={selectedItem.imageBase64}
            alt={selectedItem.subCategory}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Info */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">{selectedItem.subCategory}</h2>
            <button
              onClick={() => onToggleFavorite(selectedItem.id)}
              className="text-xl"
            >
              {selectedItem.isFavorite ? "❤️" : "🤍"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-[#f5f5f7] rounded-xl p-2.5">
              <span className="text-gray-400 text-[11px]">品类</span>
              <p className="font-medium text-[13px]">{selectedItem.category} · {selectedItem.subCategory}</p>
            </div>
            <div className="bg-[#f5f5f7] rounded-xl p-2.5">
              <span className="text-gray-400 text-[11px]">主色</span>
              <p className="font-medium text-[13px]">{selectedItem.primaryColor}</p>
            </div>
            <div className="bg-[#f5f5f7] rounded-xl p-2.5">
              <span className="text-gray-400 text-[11px]">季节</span>
              <p className="font-medium text-[13px]">{selectedItem.seasons.join("、")}</p>
            </div>
            <div className="bg-[#f5f5f7] rounded-xl p-2.5">
              <span className="text-gray-400 text-[11px]">厚薄</span>
              <p className="font-medium text-[13px]">{selectedItem.thickness}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {selectedItem.scenarios.map((s) => (
              <span key={s} className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[11px]">{s}</span>
            ))}
            {selectedItem.styles.map((s) => (
              <span key={s} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[11px]">{s}</span>
            ))}
          </div>

          {selectedItem.note && (
            <p className="text-[13px] text-gray-500 bg-[#f5f5f7] rounded-xl p-3">
              📝 {selectedItem.note}
            </p>
          )}

          <div className="text-[11px] text-gray-400">
            <p>穿着 {selectedItem.wearCount} 次</p>
            {selectedItem.lastWornAt && (
              <p>最近穿着：{new Date(selectedItem.lastWornAt).toLocaleDateString("zh-CN")}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2.5 border-t border-gray-100">
            <button
              onClick={() => {
                setEditingItem(selectedItem);
                setShowForm(true);
                setSelectedItem(null);
              }}
              className="btn-outline flex-1 text-xs"
            >
              ✏️ 编辑
            </button>
            <button
              onClick={() => {
                if (window.confirm("确定删除这件衣物吗？")) {
                  onDeleteItem(selectedItem.id);
                  setSelectedItem(null);
                }
              }}
              className="btn-outline flex-1 text-xs text-red-500 border-red-200 hover:bg-red-50"
            >
              🗑️ 删除
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form view
  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
            className="text-[13px] text-[#0071e3] font-medium hover:text-[#0077ed]"
          >
            ← 取消
          </button>
          <h2 className="text-base font-bold tracking-tight">
            {editingItem ? "编辑衣物" : "添加衣物"}
          </h2>
          <div className="w-10" />
        </div>
        <ClothingForm
          initialData={editingItem ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-3">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">我的衣橱</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary text-xs"
        >
          + 添加衣物
        </button>
      </div>

      {/* Filter bar */}
      <FilterBar
        filter={filter}
        onChange={updateFilter}
        onClear={clearFilter}
        totalCount={items.length}
        filteredCount={filteredItems.length}
      />

      {/* Items grid or empty state */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {filteredItems.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="👗"
          title="衣橱是空的"
          description="点击上方按钮添加你的第一件衣物，开始建立电子衣橱"
          action={{
            label: "添加第一件衣物",
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <EmptyState
          icon="🔍"
          title="没有找到匹配的衣物"
          description="尝试调整筛选条件"
          action={{ label: "清除筛选", onClick: clearFilter }}
        />
      )}
    </div>
  );
}
