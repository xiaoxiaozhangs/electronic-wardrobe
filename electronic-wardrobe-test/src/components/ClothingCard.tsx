import type { WardrobeItem } from "../types";
import { COLOR_MAP, CATEGORY_ICONS } from "../types";

interface ClothingCardProps {
  item: WardrobeItem;
  onClick?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export default function ClothingCard({
  item,
  onClick,
  onToggleFavorite,
  onDelete,
  compact = false,
}: ClothingCardProps) {
  return (
    <div
      className="relative bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        <img
          src={item.imageBase64}
          alt={item.subCategory}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className={`${compact ? "p-2" : "p-3"}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs">{CATEGORY_ICONS[item.category]}</span>
          <span className={`font-medium truncate ${compact ? "text-xs" : "text-sm"}`}>
            {item.subCategory}
          </span>
          {item.isFavorite && (
            <span className="text-red-400 text-xs">❤️</span>
          )}
        </div>

        {!compact && (
          <>
            <div className="flex items-center gap-1 mb-1.5">
              {/* Color dot */}
              <span
                className="inline-block w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: COLOR_MAP[item.primaryColor] }}
                title={item.primaryColor}
              />
              <span className="text-xs text-gray-500">{item.primaryColor}</span>
              {item.secondaryColors.length > 0 && (
                <>
                  <span className="text-gray-300">+</span>
                  {item.secondaryColors.map((c) => (
                    <span
                      key={c}
                      className="inline-block w-3 h-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: COLOR_MAP[c] }}
                      title={c}
                    />
                  ))}
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {item.seasons.slice(0, 2).map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded"
                >
                  {s}
                </span>
              ))}
              {item.scenarios.slice(0, 1).map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded"
                >
                  {s}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions overlay */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="w-7 h-7 flex items-center justify-center bg-white/90 rounded-full shadow text-sm hover:bg-white"
            title={item.isFavorite ? "取消收藏" : "收藏"}
          >
            {item.isFavorite ? "❤️" : "🤍"}
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("确定删除这件衣物吗？")) onDelete();
            }}
            className="w-7 h-7 flex items-center justify-center bg-white/90 rounded-full shadow text-sm hover:bg-white"
            title="删除"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Wear count badge */}
      {item.wearCount > 0 && !compact && (
        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          穿{item.wearCount}次
        </div>
      )}
    </div>
  );
}
