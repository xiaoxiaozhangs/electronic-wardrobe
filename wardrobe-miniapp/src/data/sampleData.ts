import type { WardrobeItem, Outfit } from "../types";

/**
 * 小程序兼容的 Base64 编码
 * 替换 React 版本中的 btoa(unescape(encodeURIComponent(...)))
 */
function encodeBase64(str: string): string {
  // 使用小程序可用的方式编码 UTF-8 字符串为 Base64
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b1 >> 2];
    result += chars[((b1 & 0x03) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? chars[((b2 & 0x0f) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < bytes.length ? chars[b3 & 0x3f] : '=';
  }
  return result;
}

/**
 * 生成纯色衣物占位 SVG (Base64)
 */
function generateItemSVG(
  category: string,
  primaryColor: string,
  label: string
): string {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f9fafb" rx="8"/>
  ${
    category === "上衣"
      ? `<rect x="50" y="30" width="100" height="120" rx="8" fill="${primaryColor}" opacity="0.9"/>
         <rect x="30" y="30" width="20" height="40" rx="6" fill="${primaryColor}" opacity="0.8"/>
         <rect x="150" y="30" width="20" height="40" rx="6" fill="${primaryColor}" opacity="0.8"/>`
      : category === "下装"
        ? `<path d="M55 30 L45 160 L85 170 L115 170 L155 160 L145 30 Z" fill="${primaryColor}" opacity="0.9"/>
           <line x1="100" y1="30" x2="100" y2="170" stroke="${primaryColor}" stroke-width="2" opacity="0.5"/>`
        : category === "连衣裙"
          ? `<path d="M70 20 Q100 10 130 20 L135 160 Q100 180 65 160 Z" fill="${primaryColor}" opacity="0.9"/>
             <rect x="55" y="20" width="90" height="30" rx="8" fill="${primaryColor}" opacity="0.7"/>`
          : category === "外套"
            ? `<rect x="35" y="20" width="130" height="140" rx="6" fill="${primaryColor}" opacity="0.9"/>
               <rect x="35" y="100" width="50" height="70" rx="4" fill="${primaryColor}" opacity="0.7"/>
               <rect x="115" y="100" width="50" height="70" rx="4" fill="${primaryColor}" opacity="0.7"/>
               <rect x="70" y="20" width="60" height="20" rx="4" fill="${primaryColor}" opacity="0.6"/>`
          : category === "鞋"
            ? `<ellipse cx="100" cy="140" rx="70" ry="30" fill="${primaryColor}" opacity="0.9"/>
               <path d="M40 140 Q30 60 70 50 L130 50 Q170 60 160 140" fill="${primaryColor}" opacity="0.8"/>`
            : category === "包"
              ? `<rect x="45" y="40" width="110" height="110" rx="16" fill="${primaryColor}" opacity="0.9"/>
                 <path d="M70 40 Q100 10 130 40" fill="none" stroke="${primaryColor}" stroke-width="8" opacity="0.8"/>
                 <rect x="80" y="60" width="40" height="20" rx="4" fill="${primaryColor}" opacity="0.6"/>`
              : `<circle cx="100" cy="100" r="60" fill="${primaryColor}" opacity="0.9"/>
                 <circle cx="100" cy="100" r="30" fill="#f9fafb" opacity="0.5"/>`
  }
  <text x="100" y="190" text-anchor="middle" font-size="12" fill="#6b7280" font-family="sans-serif">${label}</text>
</svg>`;

  return "data:image/svg+xml;base64," + encodeBase64(svgContent);
}

/**
 * 15 件示例衣物数据
 */
export const SAMPLE_ITEMS: Omit<WardrobeItem, "id" | "createdAt" | "updatedAt">[] = [
  {
    imageBase64: generateItemSVG("上衣", "#ffffff", "白衬衫"),
    category: "上衣",
    subCategory: "衬衫",
    primaryColor: "白色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "薄",
    seasons: ["春", "夏", "秋"],
    scenarios: ["通勤", "正式", "约会"],
    styles: ["简约", "通勤"],
    temperatureMin: 15,
    temperatureMax: 30,
    status: "正常",
    note: "修身款白衬衫，百搭基础款",
    isFavorite: true,
    wearCount: 12,
    lastWornAt: "2026-06-10T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("上衣", "#3b82f6", "蓝T恤"),
    category: "上衣",
    subCategory: "T恤",
    primaryColor: "蓝色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "薄",
    seasons: ["夏"],
    scenarios: ["休闲", "运动"],
    styles: ["休闲", "简约"],
    temperatureMin: 22,
    temperatureMax: 35,
    status: "正常",
    note: "纯棉圆领T恤",
    isFavorite: false,
    wearCount: 8,
    lastWornAt: "2026-06-08T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("上衣", "#1a1a1a", "黑卫衣"),
    category: "上衣",
    subCategory: "卫衣",
    primaryColor: "黑色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "中",
    seasons: ["春", "秋", "冬"],
    scenarios: ["休闲", "运动", "旅行"],
    styles: ["休闲", "街头"],
    temperatureMin: 5,
    temperatureMax: 20,
    status: "正常",
    note: "宽松款连帽卫衣",
    isFavorite: true,
    wearCount: 15,
    lastWornAt: "2026-06-05T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("上衣", "#f97316", "橙色条纹衫"),
    category: "上衣",
    subCategory: "针织衫",
    primaryColor: "橙色",
    secondaryColors: ["白色"],
    pattern: "条纹",
    thickness: "中",
    seasons: ["春", "秋"],
    scenarios: ["休闲", "约会"],
    styles: ["休闲", "韩系"],
    temperatureMin: 12,
    temperatureMax: 25,
    status: "正常",
    note: "条纹针织衫，法式休闲风",
    isFavorite: false,
    wearCount: 5,
    lastWornAt: "2026-05-28T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("下装", "#1a1a1a", "黑西裤"),
    category: "下装",
    subCategory: "西裤",
    primaryColor: "黑色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "中",
    seasons: ["春", "秋", "冬"],
    scenarios: ["通勤", "正式"],
    styles: ["简约", "通勤"],
    temperatureMin: 5,
    temperatureMax: 28,
    status: "正常",
    note: "直筒西裤，通勤必备",
    isFavorite: true,
    wearCount: 20,
    lastWornAt: "2026-06-11T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("下装", "#3b82f6", "牛仔裤"),
    category: "下装",
    subCategory: "牛仔裤",
    primaryColor: "蓝色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "中",
    seasons: ["春", "秋", "冬"],
    scenarios: ["休闲", "通勤", "旅行"],
    styles: ["休闲", "街头", "简约"],
    temperatureMin: 5,
    temperatureMax: 28,
    status: "正常",
    note: "直筒牛仔裤，百搭款",
    isFavorite: true,
    wearCount: 18,
    lastWornAt: "2026-06-12T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("下装", "#8b5e3c", "卡其裤"),
    category: "下装",
    subCategory: "休闲裤",
    primaryColor: "棕色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "中",
    seasons: ["春", "秋"],
    scenarios: ["休闲", "通勤"],
    styles: ["休闲", "简约", "韩系"],
    temperatureMin: 12,
    temperatureMax: 28,
    status: "正常",
    note: "卡其色斜纹裤，休闲通勤两用",
    isFavorite: false,
    wearCount: 7,
    lastWornAt: "2026-06-01T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("连衣裙", "#dc2626", "红连衣裙"),
    category: "连衣裙",
    subCategory: "连衣短裙",
    primaryColor: "红色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "薄",
    seasons: ["夏"],
    scenarios: ["约会", "聚会"],
    styles: ["甜美", "韩系"],
    temperatureMin: 22,
    temperatureMax: 35,
    status: "正常",
    note: "A字短裙，约会必备",
    isFavorite: true,
    wearCount: 3,
    lastWornAt: "2026-05-20T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("外套", "#f5f0e6", "米色风衣"),
    category: "外套",
    subCategory: "风衣",
    primaryColor: "米色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "中",
    seasons: ["春", "秋"],
    scenarios: ["通勤", "约会", "旅行"],
    styles: ["简约", "通勤", "韩系", "法式"],
    temperatureMin: 10,
    temperatureMax: 22,
    status: "正常",
    note: "经典双排扣风衣，春秋必备",
    isFavorite: true,
    wearCount: 10,
    lastWornAt: "2026-06-03T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("外套", "#1a1a1a", "黑西装"),
    category: "外套",
    subCategory: "西装",
    primaryColor: "黑色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "中",
    seasons: ["春", "秋", "冬"],
    scenarios: ["通勤", "正式"],
    styles: ["简约", "通勤"],
    temperatureMin: 8,
    temperatureMax: 22,
    status: "正常",
    note: "修身西装外套，正式场合必备",
    isFavorite: false,
    wearCount: 6,
    lastWornAt: "2026-05-30T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("鞋", "#ffffff", "白色运动鞋"),
    category: "鞋",
    subCategory: "运动鞋",
    primaryColor: "白色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "中",
    seasons: ["春", "夏", "秋"],
    scenarios: ["休闲", "运动", "旅行"],
    styles: ["休闲", "运动", "街头"],
    temperatureMin: 5,
    temperatureMax: 35,
    status: "正常",
    note: "经典小白鞋，百搭之王",
    isFavorite: true,
    wearCount: 25,
    lastWornAt: "2026-06-12T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("鞋", "#1a1a1a", "黑色皮鞋"),
    category: "鞋",
    subCategory: "皮鞋",
    primaryColor: "黑色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "中",
    seasons: ["春", "秋", "冬"],
    scenarios: ["通勤", "正式"],
    styles: ["简约", "通勤"],
    temperatureMin: 5,
    temperatureMax: 30,
    status: "正常",
    note: "牛津鞋，正式通勤首选",
    isFavorite: false,
    wearCount: 10,
    lastWornAt: "2026-06-11T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("包", "#8b5e3c", "棕色手提包"),
    category: "包",
    subCategory: "手拎包",
    primaryColor: "棕色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "中",
    seasons: ["春", "秋", "冬"],
    scenarios: ["通勤", "正式", "约会"],
    styles: ["简约", "通勤", "法式"],
    temperatureMin: 5,
    temperatureMax: 35,
    status: "正常",
    note: "真皮手提通勤包",
    isFavorite: true,
    wearCount: 15,
    lastWornAt: "2026-06-11T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("下装", "#1a1a1a", "黑色短裤"),
    category: "下装",
    subCategory: "短裤",
    primaryColor: "黑色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "薄",
    seasons: ["夏"],
    scenarios: ["休闲", "运动", "旅行"],
    styles: ["休闲", "运动"],
    temperatureMin: 25,
    temperatureMax: 38,
    status: "正常",
    note: "棉质休闲短裤",
    isFavorite: false,
    wearCount: 4,
    lastWornAt: "2026-06-09T00:00:00Z",
  },
  {
    imageBase64: generateItemSVG("上衣", "#22c55e", "绿色针织衫"),
    category: "上衣",
    subCategory: "针织衫",
    primaryColor: "绿色",
    secondaryColors: [],
    pattern: "纯色",
    thickness: "中",
    seasons: ["春", "秋"],
    scenarios: ["休闲", "约会", "通勤"],
    styles: ["简约", "韩系", "复古"],
    temperatureMin: 12,
    temperatureMax: 24,
    status: "正常",
    note: "莫兰迪绿针织衫，温柔气质",
    isFavorite: false,
    wearCount: 3,
    lastWornAt: "2026-05-25T00:00:00Z",
  },
];

/** 生成示例搭配数据 */
export function generateSampleOutfits(items: WardrobeItem[]): Omit<Outfit, "id" | "createdAt">[] {
  const findItem = (cat: string, color: string) =>
    items.find((i) => i.category === cat && i.primaryColor === color)?.id ?? "";

  return [
    {
      itemIds: [
        findItem("上衣", "白色"),
        findItem("下装", "蓝色"),
        findItem("鞋", "白色"),
      ].filter(Boolean),
      scenario: "通勤",
      style: "简约",
      season: "春",
      title: "清爽通勤风",
      reason: "白衬衫搭配牛仔裤，经典不出错。白色运动鞋增加舒适感，适合日常通勤。",
      isFavorite: true,
      feedback: "喜欢",
    },
    {
      itemIds: [
        findItem("上衣", "白色"),
        findItem("下装", "黑色"),
        findItem("鞋", "黑色"),
        findItem("外套", "黑色"),
      ].filter(Boolean),
      scenario: "正式",
      style: "通勤",
      season: "秋",
      title: "职场正式风",
      reason: "白衬衫+黑西裤+黑西装，经典正式搭配。黑色皮鞋统一色调，干练专业。",
      isFavorite: false,
      feedback: null,
    },
    {
      itemIds: [
        findItem("连衣裙", "红色"),
        findItem("鞋", "白色"),
      ].filter(Boolean),
      scenario: "约会",
      style: "甜美",
      season: "夏",
      title: "甜美约会风",
      reason: "红色连衣裙亮眼吸睛，搭配白色运动鞋平衡正式感，约会氛围满分。",
      isFavorite: true,
      feedback: null,
    },
    {
      itemIds: [
        findItem("上衣", "黑色"),
        findItem("下装", "蓝色"),
        findItem("鞋", "白色"),
      ].filter(Boolean),
      scenario: "休闲",
      style: "街头",
      season: "秋",
      title: "街头休闲风",
      reason: "黑色卫衣搭配牛仔裤，经典街头组合。小白鞋点亮整体造型。",
      isFavorite: false,
      feedback: "一般",
    },
  ];
}
