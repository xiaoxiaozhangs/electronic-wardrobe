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
    <div className="space-y-4">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-br from-[#0071e3] to-[#5e5ce6] rounded-2xl p-4 text-white shadow-sm">
        <h2 className="text-lg font-bold mb-0.5 tracking-tight">智搭衣橱</h2>
        <p className="text-[13px] text-white/80">
          {stats.total > 0
            ? `你有 ${stats.total} 件衣物，今天穿什么？`
            : "开始添加你的第一件衣物吧"}
        </p>

        {/* 快捷入口 */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onTabChange("outfit")}
            className="flex-1 bg-white/15 backdrop-blur rounded-xl py-2.5 px-3 text-[13px] font-medium hover:bg-white/25 transition-colors text-center"
          >
            ✨ 生成今日搭配
          </button>
          <button
            onClick={() => onTabChange("wardrobe")}
            className="bg-white/15 backdrop-blur rounded-xl py-2.5 px-3 text-[13px] font-medium hover:bg-white/25 transition-colors"
          >
            📷 添加衣物
          </button>
        </div>
      </div>

      {/* 衣橱概览 */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">衣橱概览</h3>
          <button
            onClick={() => onTabChange("wardrobe")}
            className="text-xs text-[#0071e3] font-medium"
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
                className="bg-white rounded-xl p-2.5 text-center border border-gray-100"
              >
                <span className="text-lg">{cat.icon}</span>
                <p className="text-[10px] text-gray-500 mt-0.5 tracking-tight">{cat.label}</p>
                <p className="text-sm font-semibold text-gray-900">{cat.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-5 text-center border border-gray-100">
            <p className="text-2xl mb-1.5">👗</p>
            <p className="text-[13px] text-gray-500">还没有衣物，去添加吧</p>
            <button
              onClick={() => onTabChange("wardrobe")}
              className="btn-primary mt-2.5 text-xs"
            >
              添加第一件衣物
            </button>
          </div>
        )}
      </div>

      {/* 最近搭配 */}
      {recentOutfits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">
              最近搭配
            </h3>
            <button
              onClick={() => onTabChange("outfit")}
              className="text-xs text-[#0071e3] font-medium"
            >
              更多搭配 →
            </button>
          </div>
          <div className="space-y-2.5">
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
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[15px] font-semibold text-gray-900">
              ❤️ 收藏搭配
            </h3>
          </div>
          <div className="space-y-2.5">
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
        <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
          <p className="text-[13px] text-blue-700">
            💡 你只有 {stats.total} 件衣物，建议至少添加 10 件以获得更好的搭配推荐效果。
          </p>
        </div>
      )}
    </div>
  );
}
