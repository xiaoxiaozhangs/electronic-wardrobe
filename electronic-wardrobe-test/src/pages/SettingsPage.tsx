import type { WardrobeItem, Outfit } from "../types";

interface SettingsPageProps {
  items: WardrobeItem[];
  outfits: Outfit[];
  onReset: () => void;
}

export default function SettingsPage({
  items,
  outfits,
  onReset,
}: SettingsPageProps) {
  const availableItems = items.filter((i) => i.status === "正常");

  // 品类分布统计
  const byCategory: Record<string, number> = {};
  availableItems.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
  });

  // 颜色分布统计
  const byColor: Record<string, number> = {};
  availableItems.forEach((i) => {
    byColor[i.primaryColor] = (byColor[i.primaryColor] || 0) + 1;
  });

  const topColors = Object.entries(byColor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 穿着频次排名
  const topWorn = [...availableItems]
    .sort((a, b) => b.wearCount - a.wearCount)
    .slice(0, 5);

  // 闲置衣物（穿着次数为0）
  const idleItems = availableItems.filter((i) => i.wearCount === 0);

  return (
    <div className="space-y-4">
      <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">我的</h2>

      {/* 衣橱统计 */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-2.5 tracking-tight">
          📊 衣橱统计
        </h3>

        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div className="bg-[#f5f5f7] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {availableItems.length}
            </p>
            <p className="text-[11px] text-gray-500">总衣物数</p>
          </div>
          <div className="bg-[#f5f5f7] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {outfits.length}
            </p>
            <p className="text-[11px] text-gray-500">搭配方案数</p>
          </div>
          <div className="bg-[#f5f5f7] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {availableItems.filter((i) => i.isFavorite).length}
            </p>
            <p className="text-[11px] text-gray-500">收藏衣物</p>
          </div>
          <div className="bg-[#f5f5f7] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {outfits.filter((o) => o.isFavorite).length}
            </p>
            <p className="text-[11px] text-gray-500">收藏搭配</p>
          </div>
        </div>

        {/* 品类分布 */}
        <div className="mb-3">
          <h4 className="text-[11px] font-medium text-gray-500 mb-2">品类分布</h4>
          <div className="space-y-1.5">
            {Object.entries(byCategory).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-[11px] text-gray-600 w-14">{cat}</span>
                <div className="flex-1 h-1.5 bg-[#e8e8ed] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0071e3] rounded-full transition-all"
                    style={{
                      width: `${Math.round((count / availableItems.length) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] text-gray-500 w-5 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 颜色分布 */}
        {topColors.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium text-gray-500 mb-2">常用颜色</h4>
            <div className="flex flex-wrap gap-1.5">
              {topColors.map(([color, count]) => (
                <span
                  key={color}
                  className="text-[11px] px-2 py-0.5 bg-[#e8e8ed] text-gray-600 rounded-full"
                >
                  {color} ({count})
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 高频穿着 */}
      {topWorn.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2.5 tracking-tight">
            👑 高频穿着
          </h3>
          <div className="space-y-2">
            {topWorn.filter((i) => i.wearCount > 0).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5"
              >
                <img
                  src={item.imageBase64}
                  alt={item.subCategory}
                  className="w-7 h-7 rounded-lg object-contain bg-[#f5f5f7]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">
                    {item.subCategory}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {item.primaryColor} · {item.category}
                  </p>
                </div>
                <span className="text-[11px] text-gray-500">
                  穿{item.wearCount}次
                </span>
              </div>
            ))}
            {topWorn.filter((i) => i.wearCount > 0).length === 0 && (
              <p className="text-[11px] text-gray-400">暂无穿着记录</p>
            )}
          </div>
        </section>
      )}

      {/* 闲置提醒 */}
      {idleItems.length > 0 && (
        <section className="bg-orange-50 rounded-2xl border border-orange-100 p-4">
          <h3 className="text-sm font-semibold text-orange-700 mb-1.5 tracking-tight">
            💤 闲置衣物（{idleItems.length}件）
          </h3>
          <p className="text-[11px] text-orange-600 mb-2">
            以下衣物尚未穿着过，考虑搭配使用或断舍离
          </p>
          <div className="flex flex-wrap gap-1">
            {idleItems.map((item) => (
              <span
                key={item.id}
                className="text-[11px] px-2 py-1 bg-white text-orange-700 rounded-full border border-orange-200"
              >
                {item.subCategory}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 关于 */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-2.5 tracking-tight">
          ℹ️ 关于
        </h3>
        <div className="space-y-1.5 text-[13px] text-gray-500">
          <p>智搭衣橱 · 电子衣橱测试版 v0.1</p>
          <p>
            这是一个零成本的本地测试版本，所有数据存储在浏览器
            localStorage 中，不会上传到任何服务器。
          </p>
          <div className="bg-[#f5f5f7] rounded-xl p-2.5 mt-2.5">
            <p className="text-[11px] text-gray-400">
              💡 提示：清除浏览器缓存或使用隐私模式会导致数据丢失。
              后续升级到 MVP 版本将支持云端同步。
            </p>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white rounded-2xl border border-red-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-red-600 mb-2.5 tracking-tight">
          ⚠️ 数据管理
        </h3>
        <p className="text-[11px] text-gray-500 mb-2.5">
          重置将删除所有数据并恢复示例数据
        </p>
        <button
          onClick={() => {
            if (
              window.confirm(
                "确定要重置所有数据吗？这将删除你添加的所有衣物和搭配，恢复为示例数据。此操作不可撤销！"
              )
            ) {
              onReset();
              alert("数据已重置");
              window.location.reload();
            }
          }}
          className="w-full py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
        >
          重置所有数据
        </button>
      </section>
    </div>
  );
}
