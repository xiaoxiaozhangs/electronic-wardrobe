/**
 * ============================================================
 * 纯前端搭配规则引擎
 * 基于 PRD 第9节 - 智能搭配策略
 *
 * 三层策略：
 *   1. 硬规则过滤（季节/温度/场景/状态）
 *   2. 品类组合规则生成候选
 *   3. 颜色搭配规则评分排序
 * ============================================================
 */

import type {
  WardrobeItem,
  Outfit,
  OutfitGenerateParams,
  Category,
  ColorLabel,
} from "../types";

// ---- 品类组合模板 ----
interface CombinationTemplate {
  name: string;
  required: Category[];
  optional: Category[];
}

const COMBINATION_TEMPLATES: CombinationTemplate[] = [
  {
    name: "上衣+下装+鞋",
    required: ["上衣", "下装", "鞋"],
    optional: ["外套", "包", "配饰"],
  },
  {
    name: "连衣裙+外套+鞋",
    required: ["连衣裙", "鞋"],
    optional: ["外套", "包", "配饰"],
  },
  {
    name: "外套+上衣+下装+鞋",
    required: ["外套", "上衣", "下装", "鞋"],
    optional: ["包", "配饰"],
  },
  {
    name: "上衣+下装",
    required: ["上衣", "下装"],
    optional: ["鞋", "外套", "包", "配饰"],
  },
];

// ---- 颜色和谐规则 ----

/** 色轮顺序（12色） */
const COLOR_WHEEL: ColorLabel[] = [
  "红色",
  "橙色",
  "黄色",
  "绿色",
  "蓝色",
  "紫色",
  "粉色",
  "棕色",
  "米色",
  "灰色",
  "白色",
  "黑色",
];

/** 中性色（百搭色） */
const NEUTRAL_COLORS: Set<ColorLabel> = new Set([
  "黑色",
  "白色",
  "灰色",
  "米色",
]);

/**
 * 判断两个颜色是否属于同色系（色轮上相邻 ≤1 步）
 */
function isSameColorFamily(c1: ColorLabel, c2: ColorLabel): boolean {
  if (c1 === c2) return true;
  // 任一为中性色 → 可搭配
  if (NEUTRAL_COLORS.has(c1) || NEUTRAL_COLORS.has(c2)) return true;

  const idx1 = COLOR_WHEEL.indexOf(c1);
  const idx2 = COLOR_WHEEL.indexOf(c2);
  if (idx1 === -1 || idx2 === -1) return false;

  const dist = Math.abs(idx1 - idx2);
  return dist <= 2; // 相邻 ≤2 步视为近似色
}

/**
 * 计算一组衣物的颜色和谐度得分 (0-100)
 * 规则：
 *   - 同色系 +30
 *   - 中性色为主 +20
 *   - 主色数量 ≤3 +30
 *   - 无冲突色 (红绿搭配等) +20
 */
function colorHarmonyScore(items: WardrobeItem[]): number {
  const primaryColors = items.map((i) => i.primaryColor);
  const uniqueColors = new Set(primaryColors);

  let score = 0;

  // 主色数量 ≤3
  if (uniqueColors.size <= 3) {
    score += 30;
  } else if (uniqueColors.size <= 4) {
    score += 15;
  }

  // 中性色比例
  const neutralCount = primaryColors.filter((c) => NEUTRAL_COLORS.has(c)).length;
  score += Math.min(20, (neutralCount / primaryColors.length) * 20);

  // 同色系检查：两两之间如果是同色系给分
  let harmonyPairs = 0;
  let totalPairs = 0;
  for (let i = 0; i < primaryColors.length; i++) {
    for (let j = i + 1; j < primaryColors.length; j++) {
      totalPairs++;
      if (isSameColorFamily(primaryColors[i], primaryColors[j])) {
        harmonyPairs++;
      }
    }
  }
  if (totalPairs > 0) {
    score += (harmonyPairs / totalPairs) * 30;
  }

  // 冲突色检测：红-绿、蓝-橙
  const hasRed = uniqueColors.has("红色");
  const hasGreen = uniqueColors.has("绿色");
  const hasBlue = uniqueColors.has("蓝色");
  const hasOrange = uniqueColors.has("橙色");
  if (hasRed && hasGreen) score -= 20;
  if (hasBlue && hasOrange) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 生成搭配理由
 */
function generateReason(
  template: CombinationTemplate,
  items: WardrobeItem[],
  score: number
): string {
  const parts: string[] = [];

  // 品类描述
  const categoryNames = items.map((i) => i.subCategory).join("+");
  parts.push(`${template.name}组合（${categoryNames}）`);

  // 颜色描述
  const colors = [...new Set(items.map((i) => i.primaryColor))];
  if (colors.length <= 2) {
    parts.push(`色调统一为${colors.join("与")}`);
  } else if (colors.filter((c) => NEUTRAL_COLORS.has(c)).length >= 2) {
    parts.push("以中性色为主调，搭配协调");
  } else {
    parts.push(`${colors.join("、")}多色搭配`);
  }

  // 场景适配
  const scenarios = items.map((i) => i.scenarios).flat();
  const commonScenarios = [...new Set(scenarios)];
  if (commonScenarios.length <= 3) {
    parts.push(`适合${commonScenarios.join("、")}场景`);
  }

  if (score >= 70) {
    parts.push("颜色搭配和谐度较高");
  }

  return parts.join("。");
}

// ============================================================
// 主入口
// ============================================================

export function generateOutfits(
  allItems: WardrobeItem[],
  params: OutfitGenerateParams
): Omit<Outfit, "id" | "isFavorite" | "feedback" | "createdAt">[] {
  const { scenario, season, style, mustIncludeItemId, excludeItemIds } = params;
  const excludeSet = new Set(excludeItemIds);

  // ---- 第一层：硬规则过滤 ----
  let candidates = allItems.filter((item) => {
    // 状态过滤
    if (item.status !== "正常") return false;
    // 排除列表
    if (excludeSet.has(item.id)) return false;
    // 季节匹配
    if (!item.seasons.includes(season)) return false;
    // 场景匹配
    if (!item.scenarios.includes(scenario)) return false;
    return true;
  });

  // 如果指定了单品，确保其在列表中
  if (mustIncludeItemId) {
    const mustItem = allItems.find((i) => i.id === mustIncludeItemId);
    if (mustItem && !candidates.find((c) => c.id === mustIncludeItemId)) {
      candidates = [mustItem, ...candidates];
    }
  }

  // 按品类分组
  const byCategory: Record<string, WardrobeItem[]> = {};
  candidates.forEach((item) => {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  });

  // ---- 第二层：品类组合生成候选 ----
  const results: { items: WardrobeItem[]; score: number; template: CombinationTemplate }[] = [];

  for (const template of COMBINATION_TEMPLATES) {
    // 检查是否所有必须品类都有可选衣物
    const missingRequired = template.required.some(
      (cat) => !byCategory[cat] || byCategory[cat].length === 0
    );
    if (missingRequired) continue;

    // 生成笛卡尔积组合（限制数量避免爆炸）
    const requiredLists = template.required.map((cat) => byCategory[cat]);
    const combinations = cartesianProduct(requiredLists, 20);

    for (const combo of combinations) {
      // 如果指定了单品，确保它在组合中
      if (mustIncludeItemId && !combo.some((item) => item.id === mustIncludeItemId)) {
        continue;
      }

      // 去重（同一品类不重复出现）
      const seenCategories = new Set<string>();
      const finalItems: WardrobeItem[] = [];
      for (const item of combo) {
        if (!seenCategories.has(item.category)) {
          seenCategories.add(item.category);
          finalItems.push(item);
        }
      }

      // 添加可选品类（如果存在且匹配风格）
      for (const optCat of template.optional) {
        if (byCategory[optCat] && !seenCategories.has(optCat)) {
          const styleMatch = byCategory[optCat].filter((i) =>
            i.styles.includes(style)
          );
          if (styleMatch.length > 0) {
            finalItems.push(styleMatch[0]);
            seenCategories.add(optCat);
          }
        }
      }

      if (finalItems.length >= template.required.length) {
        const score = colorHarmonyScore(finalItems);
        results.push({ items: finalItems, score, template });
      }
    }
  }

  // ---- 第三层：评分排序 ----
  // 风格匹配加分
  const scored = results.map((r) => {
    const styleBonus = r.items.filter((i) => i.styles.includes(style)).length * 5;
    // 收藏物品加分
    const favoriteBonus = r.items.filter((i) => i.isFavorite).length * 3;
    const totalScore = r.score + styleBonus + favoriteBonus;
    return { ...r, score: totalScore };
  });

  // 按得分降序，取 Top 5
  scored.sort((a, b) => b.score - a.score);

  // 去重：避免过于相似的搭配（相同品类+主色组合）
  const seen = new Set<string>();
  const unique: typeof scored = [];
  for (const r of scored) {
    const key = r.items
      .map((i) => `${i.category}:${i.primaryColor}`)
      .sort()
      .join("|");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
      if (unique.length >= 5) break;
    }
  }

  // 转换为 Outfit 格式
  return unique.map((r, idx) => ({
    itemIds: r.items.map((i) => i.id),
    scenario,
    season,
    style,
    title: `${getTitlePrefix(scenario, style)}搭配${idx + 1}`,
    reason: generateReason(r.template, r.items, r.score),
  }));
}

/** 生成搭配标题前缀 */
function getTitlePrefix(scenario: string, style: string): string {
  const map: Record<string, string> = {
    通勤: "职场",
    休闲: "日常",
    运动: "活力",
    正式: "正式",
    约会: "浪漫",
    聚会: "吸睛",
    旅行: "舒适",
  };
  return `${map[scenario] || ""}${style}`;
}

/** 笛卡尔积（限制最大组合数） */
function cartesianProduct<T>(arrays: T[][], maxResults: number): T[][] {
  if (arrays.length === 0) return [[]];

  let results: T[][] = [[]];
  for (const arr of arrays) {
    const next: T[][] = [];
    for (const r of results) {
      for (const item of arr) {
        next.push([...r, item]);
        if (next.length >= maxResults) return next;
      }
    }
    results = next;
    if (results.length >= maxResults) break;
  }
  return results.slice(0, maxResults);
}
