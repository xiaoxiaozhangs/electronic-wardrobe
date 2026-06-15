import type { WardrobeFilter, Category, ColorLabel, Season, Scenario, Style } from "../types";
import { ALL_CATEGORIES, ALL_COLORS, ALL_SEASONS, ALL_SCENARIOS, ALL_STYLES, COLOR_MAP } from "../types";

interface FilterBarProps {
  filter: WardrobeFilter;
  onChange: (updates: Partial<WardrobeFilter>) => void;
  onClear: () => void;
  totalCount: number;
  filteredCount: number;
}

export default function FilterBar({ filter, onChange, onClear, totalCount, filteredCount }: FilterBarProps) {
  const hasActiveFilters =
    filter.category !== "全部" ||
    filter.primaryColor !== "全部" ||
    filter.season !== "全部" ||
    filter.scenario !== "全部" ||
    filter.style !== "全部" ||
    filter.status !== "全部" ||
    filter.search !== "" ||
    filter.favoriteOnly;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={filter.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="搜索衣物名称、品类..."
          className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          🔍
        </span>
        {filter.search && (
          <button
            onClick={() => onChange({ search: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick filters row */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* Category filter */}
        <select
          value={filter.category}
          onChange={(e) =>
            onChange({ category: e.target.value as Category | "全部" })
          }
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white appearance-none cursor-pointer hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="全部">📂 全部品类</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Color filter */}
        <select
          value={filter.primaryColor}
          onChange={(e) =>
            onChange({ primaryColor: e.target.value as ColorLabel | "全部" })
          }
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white appearance-none cursor-pointer hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="全部">🎨 全部颜色</option>
          {ALL_COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Season filter */}
        <select
          value={filter.season}
          onChange={(e) =>
            onChange({ season: e.target.value as Season | "全部" })
          }
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white appearance-none cursor-pointer hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="全部">📅 全部季节</option>
          {ALL_SEASONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Scenario filter */}
        <select
          value={filter.scenario}
          onChange={(e) =>
            onChange({ scenario: e.target.value as Scenario | "全部" })
          }
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white appearance-none cursor-pointer hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="全部">🏷️ 全部场景</option>
          {ALL_SCENARIOS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Favorite toggle */}
        <button
          onClick={() => onChange({ favoriteOnly: !filter.favoriteOnly })}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            filter.favoriteOnly
              ? "bg-red-50 border-red-300 text-red-600"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
          }`}
        >
          {filter.favoriteOnly ? "❤️ 仅收藏" : "🤍 收藏"}
        </button>
      </div>

      {/* Count & Clear */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {filteredCount === totalCount
            ? `共 ${totalCount} 件衣物`
            : `${filteredCount} / ${totalCount} 件衣物`}
        </span>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-xs text-primary-500 hover:text-primary-600 font-medium"
          >
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}
