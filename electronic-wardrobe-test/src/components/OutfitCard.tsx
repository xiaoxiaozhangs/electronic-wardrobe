import type { WardrobeItem, Outfit, Feedback } from "../types";
import { COLOR_MAP } from "../types";

interface OutfitCardProps {
  outfit: Outfit;
  items: WardrobeItem[];
  onToggleFavorite?: () => void;
  onFeedback?: (f: Feedback) => void;
  onDelete?: () => void;
}

export default function OutfitCard({
  outfit,
  items,
  onToggleFavorite,
  onFeedback,
  onDelete,
}: OutfitCardProps) {
  const outfitItems = outfit.itemIds
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as WardrobeItem[];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2.5 pb-2">
        <div>
          <h3 className="font-semibold text-[15px] text-gray-900 tracking-tight">{outfit.title}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-gray-500">{outfit.scenario}</span>
            <span className="text-gray-300">·</span>
            <span className="text-[11px] text-gray-500">{outfit.season}</span>
            <span className="text-gray-300">·</span>
            <span className="text-[11px] text-gray-500">{outfit.style}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="text-base hover:scale-110 transition-transform"
              title={outfit.isFavorite ? "取消收藏" : "收藏"}
            >
              {outfit.isFavorite ? "❤️" : "🤍"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="删除"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Items grid */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1.5">
          {outfitItems.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-14 text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-[#f5f5f7] overflow-hidden border border-gray-100">
                <img
                  src={item.imageBase64}
                  alt={item.subCategory}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-0.5 truncate tracking-tight">
                {item.subCategory}
              </p>
            </div>
          ))}
          {outfitItems.length === 0 && (
            <p className="text-[11px] text-gray-400 py-4">
              衣物已被删除，搭配失效
            </p>
          )}
        </div>
      </div>

      {/* Reason */}
      {outfit.reason && (
        <div className="px-4 pb-2.5">
          <p className="text-[12px] text-gray-500 leading-relaxed bg-[#f5f5f7] rounded-xl px-3 py-2">
            💡 {outfit.reason}
          </p>
        </div>
      )}

      {/* Feedback */}
      {onFeedback && outfitItems.length > 0 && (
        <div className="flex border-t border-gray-100">
          {(["喜欢", "一般", "不合适"] as Feedback[]).map((fb) => (
            <button
              key={fb}
              onClick={() => onFeedback(fb)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                outfit.feedback === fb
                  ? "bg-[#0071e3]/8 text-[#0071e3]"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {fb === "喜欢" ? "👍 " : fb === "一般" ? "👌 " : "👎 "}
              {fb}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
