import { useState, useRef, useCallback } from "react";
import type {
  WardrobeItem,
  Category,
  SubCategory,
  ColorLabel,
  Pattern,
  Thickness,
  Season,
  Scenario,
  Style,
  ItemStatus,
} from "../types";
import {
  ALL_CATEGORIES,
  ALL_COLORS,
  ALL_SEASONS,
  ALL_SCENARIOS,
  ALL_STYLES,
  COLOR_MAP,
} from "../types";

// ---- 子品类映射 ----
const SUB_CATEGORY_MAP: Record<Category, SubCategory[]> = {
  "上衣": ["T恤", "衬衫", "卫衣", "针织衫", "毛衣", "背心", "其他"],
  "下装": ["牛仔裤", "休闲裤", "西裤", "短裤", "半身裙", "长裙", "短裙", "其他"],
  "连衣裙": ["连衣长裙", "连衣短裙", "其他"],
  "外套": ["风衣", "夹克", "西装", "羽绒服", "大衣", "其他"],
  "鞋": ["运动鞋", "皮鞋", "靴子", "凉鞋", "帆布鞋", "其他"],
  "包": ["手拎包", "斜挎包", "双肩包", "其他"],
  "配饰": ["项链", "耳环", "手表", "帽子", "围巾", "腰带", "其他"],
  "其他": ["其他"],
};

const PATTERNS: Pattern[] = ["纯色", "条纹", "格纹", "印花", "拼接", "其他"];
const THICKNESSES: Thickness[] = ["薄", "中", "厚"];
const STATUSES: ItemStatus[] = ["正常", "洗涤中", "闲置", "淘汰"];

interface ClothingFormProps {
  initialData?: Partial<WardrobeItem>;
  onSubmit: (
    data: Omit<WardrobeItem, "id" | "createdAt" | "updatedAt" | "wearCount" | "lastWornAt">
  ) => void;
  onCancel: () => void;
}

export default function ClothingForm({
  initialData,
  onSubmit,
  onCancel,
}: ClothingFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageBase64, setImageBase64] = useState(initialData?.imageBase64 ?? "");
  const [category, setCategory] = useState<Category>(initialData?.category ?? "上衣");
  const [subCategory, setSubCategory] = useState<SubCategory>(
    initialData?.subCategory ?? "T恤"
  );
  const [primaryColor, setPrimaryColor] = useState<ColorLabel>(
    initialData?.primaryColor ?? "黑色"
  );
  const [secondaryColors, setSecondaryColors] = useState<ColorLabel[]>(
    initialData?.secondaryColors ?? []
  );
  const [pattern, setPattern] = useState<Pattern>(initialData?.pattern ?? "纯色");
  const [thickness, setThickness] = useState<Thickness>(initialData?.thickness ?? "中");
  const [seasons, setSeasons] = useState<Season[]>(initialData?.seasons ?? ["春", "秋"]);
  const [scenarios, setScenarios] = useState<Scenario[]>(initialData?.scenarios ?? ["休闲"]);
  const [styles, setStyles] = useState<Style[]>(initialData?.styles ?? ["简约"]);
  const [temperatureMin, setTemperatureMin] = useState(initialData?.temperatureMin ?? 10);
  const [temperatureMax, setTemperatureMax] = useState(initialData?.temperatureMax ?? 28);
  const [status, setStatus] = useState<ItemStatus>(initialData?.status ?? "正常");
  const [note, setNote] = useState(initialData?.note ?? "");

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 限制 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert("图片不能超过5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const toggleArrayItem = <T,>(
    arr: T[],
    item: T,
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    if (arr.includes(item)) {
      setter(arr.filter((i) => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64) {
      alert("请上传或选择衣物图片");
      return;
    }
    onSubmit({
      imageBase64,
      category,
      subCategory,
      primaryColor,
      secondaryColors,
      pattern,
      thickness,
      seasons,
      scenarios,
      styles,
      temperatureMin,
      temperatureMax,
      status,
      note,
      isFavorite: initialData?.isFavorite ?? false,
    });
  };

  // Generate a colored SVG placeholder if no image uploaded
  const placeholderSvg = imageBase64
    ? null
    : `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="#f3f4f6" rx="8"/>
          <text x="100" y="90" text-anchor="middle" font-size="48">📷</text>
          <text x="100" y="130" text-anchor="middle" font-size="14" fill="#9ca3af">点击上传图片</text>
        </svg>`
      )}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image Upload */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          衣物图片 <span className="text-red-500">*</span>
        </label>
        <div
          className="w-full aspect-square rounded-2xl border-2 border-dashed border-gray-300 bg-[#f5f5f7] flex items-center justify-center cursor-pointer hover:border-[#0071e3]/50 transition-colors overflow-hidden"
          onClick={() => fileInputRef.current?.click()}
        >
          <img
            src={imageBase64 || placeholderSvg!}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
        />
        <p className="text-[11px] text-gray-400 mt-1">支持拍照或相册选择，最大5MB</p>
      </div>

      {/* Category & SubCategory */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">
            品类
          </label>
          <select
            value={category}
            onChange={(e) => {
              const cat = e.target.value as Category;
              setCategory(cat);
              setSubCategory(SUB_CATEGORY_MAP[cat][0]);
            }}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] bg-white focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
          >
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">
            子品类
          </label>
          <select
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value as SubCategory)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] bg-white focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
          >
            {SUB_CATEGORY_MAP[category].map((sc) => (
              <option key={sc} value={sc}>
                {sc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Color */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          主色
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPrimaryColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                primaryColor === c
                  ? "border-[#0071e3] scale-110 shadow-md"
                  : "border-gray-200 hover:border-gray-400"
              }`}
              title={c}
            >
              <span
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: COLOR_MAP[c] }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Colors */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          辅色（可选）
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_COLORS.filter((c) => c !== primaryColor).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleArrayItem(secondaryColors, c, setSecondaryColors)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                secondaryColors.includes(c)
                  ? "border-[#0071e3] scale-110"
                  : "border-gray-200 opacity-60 hover:opacity-100"
              }`}
              title={c}
            >
              <span
                className="block w-full h-full rounded-full"
                style={{ backgroundColor: COLOR_MAP[c] }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Pattern & Thickness */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">
            花纹
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PATTERNS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPattern(p)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  pattern === p
                    ? "bg-[#0071e3] text-white"
                    : "bg-[#e8e8ed] text-gray-600 hover:bg-gray-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">
            厚薄
          </label>
          <div className="flex flex-wrap gap-1.5">
            {THICKNESSES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setThickness(t)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  thickness === t
                    ? "bg-[#0071e3] text-white"
                    : "bg-[#e8e8ed] text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Seasons */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1">
          适用季节
        </label>
        <div className="flex gap-1.5">
          {ALL_SEASONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleArrayItem(seasons, s, setSeasons)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                seasons.includes(s)
                  ? "bg-[#0071e3] text-white"
                  : "bg-[#e8e8ed] text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Scenarios */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1">
          适用场景
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SCENARIOS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleArrayItem(scenarios, s, setScenarios)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                scenarios.includes(s)
                  ? "bg-green-500 text-white"
                  : "bg-[#e8e8ed] text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Styles */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1">
          风格
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleArrayItem(styles, s, setStyles)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                styles.includes(s)
                  ? "bg-[#5e5ce6] text-white"
                  : "bg-[#e8e8ed] text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Temperature Range */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1">
          适合温度区间：{temperatureMin}°C — {temperatureMax}°C
        </label>
        <div className="flex gap-2.5 items-center">
          <input
            type="range"
            min="-10"
            max="40"
            value={temperatureMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTemperatureMin(Math.min(v, temperatureMax));
            }}
            className="flex-1 accent-[#0071e3]"
          />
          <span className="text-[11px] text-gray-400 w-7">至</span>
          <input
            type="range"
            min="-10"
            max="40"
            value={temperatureMax}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTemperatureMax(Math.max(v, temperatureMin));
            }}
            className="flex-1 accent-[#0071e3]"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1">
          状态
        </label>
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                status === s
                  ? "bg-gray-800 text-white"
                  : "bg-[#e8e8ed] text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1">
          备注
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：优衣库购入、适合通勤..."
          rows={2}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2.5 pt-3.5 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-outline flex-1">
          取消
        </button>
        <button type="submit" className="btn-primary flex-1">
          保存衣物
        </button>
      </div>
    </form>
  );
}
