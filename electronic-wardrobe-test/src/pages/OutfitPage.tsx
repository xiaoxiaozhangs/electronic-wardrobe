import { useState } from "react";
import type {
  WardrobeItem,
  Outfit,
  OutfitGenerateParams,
  Scenario,
  Season,
  Style,
  Feedback,
} from "../types";
import {
  ALL_SCENARIOS,
  ALL_SEASONS,
  ALL_STYLES,
  SCENARIO_LABELS,
  SEASON_LABELS,
  STYLE_LABELS,
} from "../types";
import OutfitCard from "../components/OutfitCard";
import EmptyState from "../components/EmptyState";

interface OutfitPageProps {
  items: WardrobeItem[];
  outfits: Outfit[];
  onGenerate: (params: OutfitGenerateParams) => Outfit[];
  onToggleFavorite: (id: string) => void;
  onFeedback: (id: string, fb: Feedback) => void;
  onDelete: (id: string) => void;
}

export default function OutfitPage({
  items,
  outfits,
  onGenerate,
  onToggleFavorite,
  onFeedback,
  onDelete,
}: OutfitPageProps) {
  const availableItems = items.filter((i) => i.status === "正常");

  // 生成表单状态
  const [scenario, setScenario] = useState<Scenario>("通勤");
  const [season, setSeason] = useState<Season>(getCurrentSeason());
  const [style, setStyle] = useState<Style>("简约");
  const [mustIncludeItemId, setMustIncludeItemId] = useState<string | null>(null);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentResults, setCurrentResults] = useState<Outfit[]>([]);

  // Tab: generate vs history
  const [tab, setTab] = useState<"generate" | "history">(
    outfits.length > 0 ? "history" : "generate"
  );

  const handleGenerate = () => {
    setGenerating(true);
    // Simulate async for UX
    setTimeout(() => {
      const results = onGenerate({
        scenario,
        season,
        style,
        mustIncludeItemId,
        excludeItemIds: [],
      });
      setCurrentResults(results);
      setGenerating(false);
    }, 600);
  };

  const mustIncludeItem = mustIncludeItemId
    ? items.find((i) => i.id === mustIncludeItemId)
    : null;

  return (
    <div className="space-y-3">
      <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">智能搭配</h2>

      {/* Tab switcher */}
      <div className="flex bg-[#e8e8ed] rounded-xl p-1">
        <button
          onClick={() => setTab("generate")}
          className={`flex-1 py-2 text-[13px] font-medium rounded-[10px] transition-colors ${
            tab === "generate"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          ✨ 生成搭配
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 py-2 text-[13px] font-medium rounded-[10px] transition-colors ${
            tab === "history"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          📋 搭配记录
          {outfits.length > 0 && (
            <span className="ml-1 text-xs text-gray-400">({outfits.length})</span>
          )}
        </button>
      </div>

      {/* Generate tab */}
      {tab === "generate" && (
        <div className="space-y-3">
          {/* Params form */}
          <div className="bg-[#f5f5f7] rounded-2xl p-4 space-y-2.5">
            {/* Scenario */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1.5 block">场景</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_SCENARIOS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setScenario(s)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                      scenario === s
                        ? "bg-[#0071e3] text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-[#0071e3]/40"
                    }`}
                  >
                    {SCENARIO_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Season */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1.5 block">季节</label>
              <div className="flex gap-2">
                {ALL_SEASONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeason(s)}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                      season === s
                        ? "bg-[#0071e3] text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-[#0071e3]/40"
                    }`}
                  >
                    {SEASON_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1.5 block">风格</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      style === s
                        ? "bg-[#5e5ce6] text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-[#5e5ce6]/40"
                    }`}
                  >
                    {STYLE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Specify item (optional) */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1.5 block">
                指定单品（可选）
              </label>
              {mustIncludeItem ? (
                <div className="flex items-center gap-2 bg-white rounded-xl p-2 border border-gray-200">
                  <img
                    src={mustIncludeItem.imageBase64}
                    alt={mustIncludeItem.subCategory}
                    className="w-9 h-9 rounded-lg object-contain bg-[#f5f5f7]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">
                      {mustIncludeItem.subCategory}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {mustIncludeItem.category} · {mustIncludeItem.primaryColor}
                    </p>
                  </div>
                  <button
                    onClick={() => setMustIncludeItemId(null)}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowItemPicker(!showItemPicker)}
                  className="w-full bg-white border border-dashed border-gray-300 rounded-xl py-2.5 text-[13px] text-gray-400 hover:border-[#0071e3]/40 hover:text-[#0071e3] transition-colors"
                >
                  + 选择一件单品
                </button>
              )}

              {/* Item picker */}
              {showItemPicker && (
                <div className="mt-2 grid grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                  {availableItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setMustIncludeItemId(item.id);
                        setShowItemPicker(false);
                      }}
                      className="bg-white rounded-xl border border-gray-200 p-2 text-center hover:border-[#0071e3]/40 transition-colors"
                    >
                      <img
                        src={item.imageBase64}
                        alt={item.subCategory}
                        className="w-full aspect-square object-contain rounded-lg mb-1"
                      />
                      <p className="text-[10px] text-gray-600 truncate">
                        {item.subCategory}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating || availableItems.length < 3}
              className="btn-primary w-full py-2.5 text-[15px]"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> 正在生成搭配...
                </span>
              ) : availableItems.length < 3 ? (
                "至少需要3件可用衣物才能生成搭配"
              ) : (
                "✨ 生成搭配方案"
              )}
            </button>
          </div>

          {/* Results */}
          {generating && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin text-3xl mb-2">⏳</div>
                <p className="text-[13px] text-gray-500">正在分析你的衣橱...</p>
                <p className="text-xs text-gray-400 mt-0.5">根据场景、季节和风格匹配合适组合</p>
              </div>
            </div>
          )}

          {!generating && currentResults.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2.5 tracking-tight">
                为你生成 {currentResults.length} 套搭配
              </h3>
              <div className="space-y-2.5">
                {currentResults.map((outfit) => (
                  <OutfitCard
                    key={outfit.id}
                    outfit={outfit}
                    items={items}
                    onToggleFavorite={() => onToggleFavorite(outfit.id)}
                    onFeedback={(fb) => onFeedback(outfit.id, fb)}
                  />
                ))}
              </div>
            </div>
          )}

          {!generating && currentResults.length === 0 && (
            <div className="bg-yellow-50 rounded-2xl p-3.5 border border-yellow-100">
              <p className="text-[13px] text-yellow-700">
                💡 还没有生成搭配。选择场景、季节和风格，点击"生成搭配方案"开始。
              </p>
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div>
          {outfits.length > 0 ? (
            <div className="space-y-2.5">
              {outfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  items={items}
                  onToggleFavorite={() => onToggleFavorite(outfit.id)}
                  onFeedback={(fb) => onFeedback(outfit.id, fb)}
                  onDelete={() => onDelete(outfit.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="✨"
              title="还没有搭配记录"
              description="切换到「生成搭配」标签开始创建你的第一套搭配"
              action={{
                label: "去生成搭配",
                onClick: () => setTab("generate"),
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** 根据当前月份推断季节 */
function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "春";
  if (month >= 5 && month <= 7) return "夏";
  if (month >= 8 && month <= 10) return "秋";
  return "冬";
}
