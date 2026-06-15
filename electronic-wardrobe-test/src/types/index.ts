// ============================================================
// 电子衣橱 - 类型定义
// 基于 PRD v0.1 数据模型简化（零后端，纯前端存储）
// ============================================================

/** 一级品类 */
export type Category =
  | "上衣"
  | "下装"
  | "连衣裙"
  | "外套"
  | "鞋"
  | "包"
  | "配饰"
  | "其他";

/** 二级品类 */
export type SubCategory =
  | "T恤"
  | "衬衫"
  | "卫衣"
  | "针织衫"
  | "毛衣"
  | "背心"
  | "牛仔裤"
  | "休闲裤"
  | "西裤"
  | "短裤"
  | "半身裙"
  | "长裙"
  | "短裙"
  | "连衣长裙"
  | "连衣短裙"
  | "风衣"
  | "夹克"
  | "西装"
  | "羽绒服"
  | "大衣"
  | "运动鞋"
  | "皮鞋"
  | "靴子"
  | "凉鞋"
  | "帆布鞋"
  | "手拎包"
  | "斜挎包"
  | "双肩包"
  | "项链"
  | "耳环"
  | "手表"
  | "帽子"
  | "围巾"
  | "腰带"
  | "其他";

/** 颜色标签 */
export type ColorLabel =
  | "黑色"
  | "白色"
  | "灰色"
  | "米色"
  | "棕色"
  | "红色"
  | "粉色"
  | "橙色"
  | "黄色"
  | "绿色"
  | "蓝色"
  | "紫色";

/** 花纹 */
export type Pattern = "纯色" | "条纹" | "格纹" | "印花" | "拼接" | "其他";

/** 厚薄 */
export type Thickness = "薄" | "中" | "厚";

/** 季节 */
export type Season = "春" | "夏" | "秋" | "冬";

/** 场景 */
export type Scenario = "通勤" | "休闲" | "运动" | "正式" | "约会" | "聚会" | "旅行";

/** 风格 */
export type Style = "简约" | "通勤" | "休闲" | "甜美" | "运动" | "街头" | "复古" | "韩系" | "日系" | "法式";

/** 衣物状态 */
export type ItemStatus = "正常" | "洗涤中" | "闲置" | "淘汰";

/** 搭配反馈 */
export type Feedback = "喜欢" | "一般" | "不合适";

// ---- 衣物数据模型 ----
export interface WardrobeItem {
  id: string;
  /** Base64 图片 */
  imageBase64: string;
  /** 一级品类 */
  category: Category;
  /** 二级品类 */
  subCategory: SubCategory;
  /** 主色 */
  primaryColor: ColorLabel;
  /** 辅色 */
  secondaryColors: ColorLabel[];
  /** 花纹 */
  pattern: Pattern;
  /** 厚薄 */
  thickness: Thickness;
  /** 适用季节 */
  seasons: Season[];
  /** 适用场景 */
  scenarios: Scenario[];
  /** 风格 */
  styles: Style[];
  /** 适合温度区间 */
  temperatureMin: number;
  temperatureMax: number;
  /** 衣物状态 */
  status: ItemStatus;
  /** 备注 */
  note: string;
  /** 是否收藏 */
  isFavorite: boolean;
  /** 穿着次数 */
  wearCount: number;
  /** 最近穿着时间 */
  lastWornAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- 搭配数据模型 ----
export interface Outfit {
  id: string;
  /** 包含的衣物 ID 列表 */
  itemIds: string[];
  /** 场景 */
  scenario: Scenario;
  /** 风格 */
  style: Style;
  /** 搭配标题 */
  title: string;
  /** 推荐理由 */
  reason: string;
  /** 季节 */
  season: Season;
  /** 是否收藏 */
  isFavorite: boolean;
  /** 用户反馈 */
  feedback: Feedback | null;
  createdAt: string;
}

// ---- 筛选条件 ----
export interface WardrobeFilter {
  category: Category | "全部";
  primaryColor: ColorLabel | "全部";
  season: Season | "全部";
  scenario: Scenario | "全部";
  style: Style | "全部";
  status: ItemStatus | "全部";
  search: string;
  favoriteOnly: boolean;
}

// ---- 搭配生成参数 ----
export interface OutfitGenerateParams {
  scenario: Scenario;
  season: Season;
  style: Style;
  /** 指定必须包含的衣物 ID，可选 */
  mustIncludeItemId: string | null;
  /** 要避开的衣物 ID */
  excludeItemIds: string[];
}

// ---- 页面 ----
export type TabKey = "home" | "wardrobe" | "outfit" | "settings";

// ---- 颜色映射（用于UI展示） ----
export const COLOR_MAP: Record<ColorLabel, string> = {
  "黑色": "#1a1a1a",
  "白色": "#f5f5f5",
  "灰色": "#9ca3af",
  "米色": "#f5f0e6",
  "棕色": "#8b5e3c",
  "红色": "#dc2626",
  "粉色": "#f472b6",
  "橙色": "#f97316",
  "黄色": "#eab308",
  "绿色": "#22c55e",
  "蓝色": "#3b82f6",
  "紫色": "#8b5cf6",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  "上衣": "👔",
  "下装": "👖",
  "连衣裙": "👗",
  "外套": "🧥",
  "鞋": "👟",
  "包": "👜",
  "配饰": "💍",
  "其他": "📦",
};

export const SCENARIO_LABELS: Record<Scenario, string> = {
  "通勤": "💼 通勤",
  "休闲": "☕ 休闲",
  "运动": "🏃 运动",
  "正式": "👔 正式",
  "约会": "💕 约会",
  "聚会": "🎉 聚会",
  "旅行": "✈️ 旅行",
};

export const SEASON_LABELS: Record<Season, string> = {
  "春": "🌸 春",
  "夏": "☀️ 夏",
  "秋": "🍂 秋",
  "冬": "❄️ 冬",
};

export const STYLE_LABELS: Record<Style, string> = {
  "简约": "简约",
  "通勤": "通勤",
  "休闲": "休闲",
  "甜美": "甜美",
  "运动": "运动",
  "街头": "街头",
  "复古": "复古",
  "韩系": "韩系",
  "日系": "日系",
  "法式": "法式",
};

/** 所有品类列表（用于筛选） */
export const ALL_CATEGORIES: Category[] = [
  "上衣", "下装", "连衣裙", "外套", "鞋", "包", "配饰", "其他",
];

/** 所有颜色列表（用于筛选） */
export const ALL_COLORS: ColorLabel[] = [
  "黑色", "白色", "灰色", "米色", "棕色", "红色",
  "粉色", "橙色", "黄色", "绿色", "蓝色", "紫色",
];

/** 所有季节列表 */
export const ALL_SEASONS: Season[] = ["春", "夏", "秋", "冬"];

/** 所有场景列表 */
export const ALL_SCENARIOS: Scenario[] = [
  "通勤", "休闲", "运动", "正式", "约会", "聚会", "旅行",
];

/** 所有风格列表 */
export const ALL_STYLES: Style[] = [
  "简约", "通勤", "休闲", "甜美", "运动",
  "街头", "复古", "韩系", "日系", "法式",
];
