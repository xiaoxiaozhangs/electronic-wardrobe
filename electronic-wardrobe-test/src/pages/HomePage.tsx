import { useState, useEffect } from "react";
import type { WardrobeItem, Outfit, TabKey } from "../types";
import OutfitCard from "../components/OutfitCard";
import EmptyState from "../components/EmptyState";

interface HomePageProps {
  items: WardrobeItem[];
  outfits: Outfit[];
  onTabChange: (tab: TabKey) => void;
  onToggleOutfitFavorite: (id: string) => void;
  onSetOutfitFeedback: (id: string, feedback: "喜欢" | "一般" | "不合适") => void;
}

export default function HomePage({
  items,
  outfits,
  onTabChange,
  onToggleOutfitFavorite,
  onSetOutfitFeedback,
}: HomePageProps) {
  const availableItems = items.filter((i) => i.status === "正常");
  const favoriteOutfits = outfits.filter((o) => o.isFavorite);
  const recentOutfits = outfits.slice(0, 3);

  // 衣橱统计
  const stats = {
    total: availableItems.length,
    上衣: availableItems.filter((i) => i.category === "上衣").length,
    下装: availableItems.filter((i) => i.category === "下装").length,
    鞋: availableItems.filter((i) => i.category === "鞋").length,
    配饰: availableItems.filter((i) => i.category === "配饰" || i.category === "包").length,
  };

  return (
    <div className="space-y-5">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-400 rounded-2xl p-5 text-white shadow-lg">
        <h2 className="text-xl font-bold mb-1">智搭衣橱</h2>
        <p className="text-sm text-white/80">
          {stats.total > 0
            ? `你有 ${stats.total} 件衣物，今天穿什么？`
            : "开始添加你的第一件衣物吧"}
        </p>

        {/* 快捷入口 */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onTabChange("outfit")}
            className="flex-1 bg-white/20 backdrop-blur rounded-xl py-3 px-4 text-sm font-medium hover:bg-white/30 transition-colors text-center"
          >
            ✨ 生成今日搭配
          </button>
          <button
            onClick={() => onTabChange("wardrobe")}
            className="bg-white/20 backdrop-blur rounded-xl py-3 px-4 text-sm font-medium hover:bg-white/30 transition-colors"
          >
            📷 添加衣物
          </button>
        </div>
      </div>

      {/* 衣橱概览 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">衣橱概览</h3>
          <button
            onClick={() => onTabChange("wardrobe")}
            className="text-xs text-primary-500 font-medium"
          >
            查看全部 →
          </button>
        </div>

        {stats.total > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "上衣", value: stats["上衣"], icon: "👔" },
              { label: "下装", value: stats["下装"], icon: "👖" },
              { label: "连衣裙", value: availableItems.filter((i) => i.category === "连衣裙").length, icon: "👗" },
              { label: "外套", value: availableItems.filter((i) => i.category === "外套").length, icon: "🧥" },
              { label: "鞋", value: stats["鞋"], icon: "👟" },
              { label: "包/配饰", value: stats["配饰"], icon: "💍" },
            ].map((cat) => (
              <div
                key={cat.label}
                className="bg-gray-50 rounded-xl p-3 text-center"
              >
                <span className="text-2xl">{cat.icon}</span>
                <p className="text-xs text-gray-500 mt-1">{cat.label}</p>
                <p className="text-sm font-semibold text-gray-900">{cat.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <p className="text-3xl mb-2">👗</p>
            <p className="text-sm text-gray-500">还没有衣物，去添加吧</p>
            <button
              onClick={() => onTabChange("wardrobe")}
              className="btn-primary mt-3 text-sm"
            >
              添加第一件衣物
            </button>
          </div>
        )}
      </div>

      {/* 最近搭配 */}
      {recentOutfits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">
              最近搭配
            </h3>
            <button
              onClick={() => onTabChange("outfit")}
              className="text-xs text-primary-500 font-medium"
            >
              更多搭配 →
            </button>
          </div>
          <div className="space-y-3">
            {recentOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                items={items}
                onToggleFavorite={() => onToggleOutfitFavorite(outfit.id)}
                onFeedback={(fb) => onSetOutfitFeedback(outfit.id, fb)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 收藏搭配 */}
      {favoriteOutfits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">
              ❤️ 收藏搭配
            </h3>
          </div>
          <div className="space-y-3">
            {favoriteOutfits.slice(0, 2).map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                items={items}
                onToggleFavorite={() => onToggleOutfitFavorite(outfit.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 上传引导 */}
      {stats.total > 0 && stats.total < 10 && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-sm text-blue-700">
            💡 你只有 {stats.total} 件衣物，建议至少添加 10 件以获得更好的搭配推荐效果。
          </p>
        </div>
      )}
    </div>
  );
}
