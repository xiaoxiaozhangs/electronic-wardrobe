/**
 * 智搭衣橱 - 搭配规则引擎 (Wardrobe Matching Engine)
 *
 * 用途：零成本测试版的核心搭配逻辑，纯前端运行，零后端依赖。
 *
 * 设计依据：PRD v0.1 第9.1节 "智能搭配策略"
 *
 * 三层架构（简化自原MVP方案）：
 *   第一层：硬规则过滤 — 排除不可用衣物
 *   第二层：搭配规则生成候选 — 品类组合 + 颜色搭配 + 风格一致性
 *   第三层：评分排序 — 规则评分代替LLM排序
 *
 * 使用方式：
 *   import { OutfitEngine } from './wardrobe-engine.js';
 *   const engine = new OutfitEngine();
 *   const results = engine.recommend(wardrobeItems, request);
 *
 * @author 后端工程师
 * @version 1.0.0
 */

// ============================================================
// 一、数据常量定义
// ============================================================

/**
 * 一级品类
 */
const CATEGORY = {
  TOP: '上衣',
  BOTTOM: '下装',
  DRESS: '连衣裙',
  OUTERWEAR: '外套',
  SHOES: '鞋',
  BAG: '包',
  ACCESSORY: '配饰',
};

/**
 * 搭配模板 — 定义有效的品类组合
 *
 * 每个模板是一个数组，描述了完整搭配所需的品类组合。
 * "可选"品类不强制要求，但存在时会加分。
 */
const OUTFIT_TEMPLATES = [
  {
    name: '日常基础搭配',
    required: [CATEGORY.TOP, CATEGORY.BOTTOM, CATEGORY.SHOES],
    optional: [CATEGORY.OUTERWEAR, CATEGORY.BAG, CATEGORY.ACCESSORY],
    weight: 1.0,
  },
  {
    name: '连衣裙搭配',
    required: [CATEGORY.DRESS, CATEGORY.SHOES],
    optional: [CATEGORY.OUTERWEAR, CATEGORY.BAG, CATEGORY.ACCESSORY],
    weight: 1.0,
  },
  {
    name: '外套叠穿搭配',
    required: [CATEGORY.OUTERWEAR, CATEGORY.TOP, CATEGORY.BOTTOM, CATEGORY.SHOES],
    optional: [CATEGORY.BAG, CATEGORY.ACCESSORY],
    weight: 1.2, // 更完整的搭配，权重稍高
  },
  {
    name: '完整搭配',
    required: [CATEGORY.TOP, CATEGORY.BOTTOM, CATEGORY.OUTERWEAR, CATEGORY.SHOES],
    optional: [CATEGORY.BAG, CATEGORY.ACCESSORY],
    weight: 1.1,
  },
  {
    name: '轻便搭配',
    required: [CATEGORY.DRESS, CATEGORY.SHOES, CATEGORY.BAG],
    optional: [CATEGORY.ACCESSORY],
    weight: 0.9,
  },
];

// ============================================================
// 二、颜色规则
// ============================================================

/**
 * 颜色分类体系
 *
 * 基础色：百搭，可与任何颜色搭配
 * 暖色：视觉上偏暖的颜色
 * 冷色：视觉上偏冷的颜色
 * 中性色：介于冷暖之间
 */
const COLOR_FAMILIES = {
  basic: new Set(['黑色', '白色', '灰色', '米色', '卡其色', '藏青色', '深蓝', '浅灰', '银灰']),
  warm: new Set(['红色', '橙色', '黄色', '粉色', '玫红', '酒红', '砖红', '桃红', '珊瑚色']),
  cool: new Set(['蓝色', '绿色', '紫色', '青色', '湖蓝', '墨绿', '浅蓝', '天蓝']),
  neutral: new Set(['棕色', '咖啡色', '驼色', '杏色', '燕麦色']),
};

/**
 * 颜色冲突对 — 这些颜色组合会降分
 * [colorA, colorB, penalty]
 */
const COLOR_CLASHES = [
  { a: '红色', b: '绿色', penalty: 0.3 },
  { a: '蓝色', b: '橙色', penalty: 0.2 },
  { a: '紫色', b: '黄色', penalty: 0.2 },
  { a: '粉色', b: '红色', penalty: 0.1 }, // 邻近但容易显杂乱
  { a: '玫红', b: '橙色', penalty: 0.15 },
];

/**
 * 同色系搭配奖励
 */
const TONAL_BONUS = 0.3;

/**
 * 邻近色搭配奖励（同暖色或同冷色）
 */
const ADJACENT_COLOR_BONUS = 0.15;

/**
 * 基础色平衡奖励 — 搭配中至少有一个基础色
 */
const BASIC_COLOR_BONUS = 0.2;

/**
 * 主色数量上限（超过此数量会扣分）
 */
const MAX_PRIMARY_COLORS = 3;

// ============================================================
// 三、风格与场景规则
// ============================================================

/**
 * 风格标签
 */
const STYLES = {
  MINIMAL: '简约',
  COMMUTE: '通勤',
  CASUAL: '休闲',
  SWEET: '甜美',
  SPORTY: '运动',
  STREET: '街头',
  FORMAL: '正式',
  VINTAGE: '复古',
  KOREAN: '韩系',
  FRENCH: '法式',
};

/**
 * 风格冲突对 — 这些风格混搭会扣分
 * {styleA, styleB, penalty}
 */
const STYLE_CLASHES = [
  { a: STYLES.SPORTY, b: STYLES.FORMAL, penalty: 0.5 },
  { a: STYLES.STREET, b: STYLES.FORMAL, penalty: 0.4 },
  { a: STYLES.SWEET, b: STYLES.STREET, penalty: 0.15 },
  { a: STYLES.SPORTY, b: STYLES.FRENCH, penalty: 0.3 },
  { a: STYLES.STREET, b: STYLES.FRENCH, penalty: 0.25 },
];

/**
 * 场景 → 推荐风格映射
 * 场景匹配时给予风格一致性加分
 */
const SCENARIO_STYLE_MAP = {
  '通勤': [STYLES.COMMUTE, STYLES.MINIMAL, STYLES.KOREAN, STYLES.FRENCH],
  '约会': [STYLES.SWEET, STYLES.KOREAN, STYLES.FRENCH, STYLES.VINTAGE],
  '运动': [STYLES.SPORTY, STYLES.CASUAL],
  '正式': [STYLES.FORMAL, STYLES.MINIMAL, STYLES.COMMUTE],
  '休闲': [STYLES.CASUAL, STYLES.STREET, STYLES.KOREAN, STYLES.MINIMAL],
  '聚会': [STYLES.STREET, STYLES.KOREAN, STYLES.FRENCH, STYLES.VINTAGE],
  '旅行': [STYLES.CASUAL, STYLES.SPORTY, STYLES.STREET],
};

/**
 * 风格相似度加分（同风格 = 高分）
 */
const STYLE_MATCH_BONUS = 0.25;

// ============================================================
// 四、场景/季节匹配规则
// ============================================================

/**
 * 季节 → 适配品类映射
 * 某些品类在特定季节权重更高
 */
const SEASON_CATEGORY_BONUS = {
  '春': { [CATEGORY.OUTERWEAR]: 0.1, [CATEGORY.DRESS]: 0.1 },
  '夏': { [CATEGORY.DRESS]: 0.15, [CATEGORY.TOP]: 0.05 },
  '秋': { [CATEGORY.OUTERWEAR]: 0.15, [CATEGORY.TOP]: 0.05 },
  '冬': { [CATEGORY.OUTERWEAR]: 0.2 },
};

/**
 * 场景 → 适配品类映射
 * 特定场景下某些品类更合适
 */
const SCENARIO_CATEGORY_BONUS = {
  '通勤': { [CATEGORY.BAG]: 0.1, [CATEGORY.OUTERWEAR]: 0.05 },
  '运动': { [CATEGORY.SHOES]: 0.15 },
  '正式': { [CATEGORY.BAG]: 0.1, [CATEGORY.ACCESSORY]: 0.1 },
  '约会': { [CATEGORY.DRESS]: 0.15, [CATEGORY.ACCESSORY]: 0.1 },
};

// ============================================================
// 五、核心引擎类
// ============================================================

export class OutfitEngine {
  /**
   * 构造函数
   * @param {Object} options - 可选配置，覆盖默认规则参数
   */
  constructor(options = {}) {
    this.config = {
      maxOutfits: options.maxOutfits ?? 5,
      minOutfits: options.minOutfits ?? 3,
      templates: options.templates ?? OUTFIT_TEMPLATES,
      colorFamilies: options.colorFamilies ?? COLOR_FAMILIES,
      colorClashes: options.colorClashes ?? COLOR_CLASHES,
      styleClashes: options.styleClashes ?? STYLE_CLASHES,
      scenarioStyleMap: options.scenarioStyleMap ?? SCENARIO_STYLE_MAP,
      tonalBonus: options.tonalBonus ?? TONAL_BONUS,
      adjacentColorBonus: options.adjacentColorBonus ?? ADJACENT_COLOR_BONUS,
      basicColorBonus: options.basicColorBonus ?? BASIC_COLOR_BONUS,
      maxPrimaryColors: options.maxPrimaryColors ?? MAX_PRIMARY_COLORS,
      styleMatchBonus: options.styleMatchBonus ?? STYLE_MATCH_BONUS,
      randomSeed: options.randomSeed ?? null,
    };
  }

  /**
   * 主入口：根据衣橱和请求生成搭配推荐
   *
   * @param {Array} wardrobe - 用户衣橱中所有衣物
   * @param {Object} request - 搭配请求
   * @param {string} request.scenario - 场景，如 '通勤'/'约会'/'运动'/'正式'/'休闲'
   * @param {string} [request.season] - 季节，如 '春'/'夏'/'秋'/'冬'
   * @param {string} [request.style] - 偏好风格
   * @param {string} [request.mustIncludeId] - 必须包含的衣物ID
   * @param {string[]} [request.excludeIds] - 排除的衣物ID列表
   * @returns {Object} 推荐结果
   *   - outfits: Array<{items, score, reasons}> 搭配列表（按分数降序）
   *   - totalCandidates: number 生成的候选总数
   *   - filteredCount: number 硬过滤后可用衣物数
   */
  recommend(wardrobe, request) {
    // ---- 第一层：硬规则过滤 ----
    const filtered = this._hardFilter(wardrobe, request);

    if (filtered.length === 0) {
      return { outfits: [], totalCandidates: 0, filteredCount: 0, message: '没有满足条件的可搭配衣物' };
    }

    // 按品类分组（加速后续查找）
    const byCategory = this._groupByCategory(filtered);

    // ---- 第二层：搭配模板生成候选 ----
    const candidates = this._generateCandidates(byCategory, request);

    if (candidates.length === 0) {
      return { outfits: [], totalCandidates: 0, filteredCount: filtered.length, message: '当前衣物无法组成完整搭配，请补充衣橱' };
    }

    // ---- 第三层：规则评分与排序 ----
    const scored = candidates.map(outfit => this._scoreOutfit(outfit, request));
    scored.sort((a, b) => b.score - a.score);

    // 相似度去重：如果两套搭配重合度超过70%，只保留分数高的
    const deduped = this._dedupOutfits(scored);

    // 取前N套
    const top = deduped.slice(0, this.config.maxOutfits);

    return {
      outfits: top,
      totalCandidates: candidates.length,
      filteredCount: filtered.length,
    };
  }

  // ============================================================
  // 第一层：硬规则过滤
  // ============================================================

  /**
   * 硬规则过滤
   * - 排除状态非正常的衣物
   * - 排除季节不匹配的
   * - 排除场景不匹配的
   * - 处理必须包含 / 排除指定
   */
  _hardFilter(wardrobe, request) {
    let items = [...wardrobe];

    // 1. 状态过滤：只保留状态正常的衣物
    items = items.filter(item => item.status === 'normal');

    // 2. 季节过滤
    if (request.season) {
      items = items.filter(item => {
        if (!item.seasons || item.seasons.length === 0) return true; // 未标注则保留
        return item.seasons.includes(request.season);
      });
    }

    // 3. 场景过滤
    if (request.scenario) {
      items = items.filter(item => {
        if (!item.scenarios || item.scenarios.length === 0) return true;
        return item.scenarios.includes(request.scenario);
      });
    }

    // 4. 排除指定ID
    if (request.excludeIds && request.excludeIds.length > 0) {
      const excludeSet = new Set(request.excludeIds);
      items = items.filter(item => !excludeSet.has(item.id));
    }

    return items;
  }

  // ============================================================
  // 第二层：搭配候选生成
  // ============================================================

  /**
   * 按品类分组
   */
  _groupByCategory(items) {
    const groups = {};
    for (const item of items) {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }

  /**
   * 基于搭配模板生成候选组合
   *
   * 策略：对每个模板，枚举所有可能的品类组合。
   * 如果必要品类（required）缺货，跳过该模板。
   * 可选品类（optional）有则加，没有则不加。
   *
   * 结果限制：最多生成200个候选，避免枚举爆炸。
   */
  _generateCandidates(byCategory, request) {
    const candidates = [];
    const MAX_CANDIDATES = 200;

    for (const template of this.config.templates) {
      // 检查必要品类是否都存在
      const requiredAvailable = template.required.every(cat =>
        byCategory[cat] && byCategory[cat].length > 0
      );
      if (!requiredAvailable) continue;

      // 笛卡尔积生成候选
      // 每个 required 品类任选1件；每个 optional 品类可选0或1件
      const combos = this._cartesianProduct(
        template.required.map(cat => byCategory[cat]),
        template.optional.map(cat => byCategory[cat] || [null]) // null 表示不选
      );

      for (const combo of combos) {
        const items = combo.filter(Boolean); // 去掉null
        if (items.length < 2) continue;

        // 如果指定了mustIncludeId，检查是否包含该衣物
        if (request.mustIncludeId) {
          if (!items.some(item => item.id === request.mustIncludeId)) continue;
        }

        candidates.push({
          items,
          template: template.name,
        });

        if (candidates.length >= MAX_CANDIDATES) break;
      }

      if (candidates.length >= MAX_CANDIDATES) break;
    }

    return candidates;
  }

  /**
   * 计算笛卡尔积
   * @param {Array[]} required - 必要品类的衣物数组列表
   * @param {Array[]} optional - 可选品类的衣物数组列表（每组包含 null）
   * @returns {Array[]}
   */
  _cartesianProduct(required, optional) {
    const all = [...required, ...optional];
    // 过滤掉空optional组（该品类无衣物）

    const results = [];
    const groups = all.filter(g => g && g.length > 0);

    if (groups.length === 0) return results;

    // 递归生成笛卡尔积
    const combine = (index, current) => {
      if (index >= groups.length) {
        results.push([...current]);
        return;
      }
      for (const item of groups[index]) {
        // 检查是否已经在current中（避免重复选同一件）
        if (item && current.some(c => c && c.id === item.id)) continue;
        current.push(item);
        combine(index + 1, current);
        current.pop();
      }
    };

    combine(0, []);
    return results;
  }

  // ============================================================
  // 第三层：评分
  // ============================================================

  /**
   * 对一套搭配进行全面评分
   *
   * 评分维度（满分1.0）：
   * 1. 品类完整性 (0-0.3) — 是否匹配模板要求
   * 2. 颜色协调度 (0-0.3) — 颜色搭配是否和谐
   * 3. 风格一致性 (0-0.2) — 风格是否统一
   * 4. 场景适配度 (0-0.2) — 是否适合目标场景
   */
  _scoreOutfit(outfit, request) {
    const scores = {
      completeness: this._scoreCompleteness(outfit),
      colorHarmony: this._scoreColorHarmony(outfit),
      styleConsistency: this._scoreStyleConsistency(outfit, request),
      scenarioFit: this._scoreScenarioFit(outfit, request),
    };

    // 加权总分
    const total =
      scores.completeness * 0.3 +
      scores.colorHarmony * 0.3 +
      scores.styleConsistency * 0.2 +
      scores.scenarioFit * 0.2;

    // 生成评分原因
    const reasons = this._buildReasons(outfit, scores, request);

    return {
      ...outfit,
      score: Math.round(total * 100) / 100,
      scoreDetail: scores,
      reasons,
    };
  }

  /**
   * 品类完整性评分
   */
  _scoreCompleteness(outfit) {
    const categories = new Set(outfit.items.map(item => item.category));
    let score = 0.5; // 基础分

    // 检查是否有上衣/连衣裙（上身必需）
    if (categories.has(CATEGORY.TOP) || categories.has(CATEGORY.DRESS) || categories.has(CATEGORY.OUTERWEAR)) {
      score += 0.15;
    }
    // 检查是否有下装或连衣裙（下身必需）
    if (categories.has(CATEGORY.BOTTOM) || categories.has(CATEGORY.DRESS)) {
      score += 0.15;
    }
    // 检查是否有鞋
    if (categories.has(CATEGORY.SHOES)) {
      score += 0.1;
    }
    // 有配饰加分
    if (categories.has(CATEGORY.BAG) || categories.has(CATEGORY.ACCESSORY)) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 颜色协调度评分
   */
  _scoreColorHarmony(outfit) {
    const items = outfit.items;
    let score = 0.5; // 基础分

    // 收集所有颜色
    const allColors = [];
    const colorCategories = []; // 每个颜色所属的色系

    for (const item of items) {
      if (!item.colors || item.colors.length === 0) continue;
      for (const color of item.colors) {
        allColors.push(color);
        colorCategories.push(this._getColorFamily(color));
      }
    }

    if (allColors.length <= 1) {
      score += 0.3; // 单色搭配通常是安全的
      return Math.min(score, 1.0);
    }

    // 规则1：主色数量检查（超过上限扣分）
    const uniqueMainColors = new Set(items.flatMap(item => item.colors?.slice(0, 1) || []));
    if (uniqueMainColors.size > this.config.maxPrimaryColors) {
      score -= 0.05 * (uniqueMainColors.size - this.config.maxPrimaryColors);
    }

    // 规则2：检查基础色平衡 — 搭配中是否有基础色
    const hasBasicColor = allColors.some(c =>
      this.config.colorFamilies.basic.has(c)
    );
    if (hasBasicColor) {
      score += this.config.basicColorBonus;
    }

    // 规则3：同色系检查 — 两个以上同色系加分
    const familyCounts = {};
    for (const family of colorCategories) {
      if (family === 'basic') continue; // 基础色不计入
      familyCounts[family] = (familyCounts[family] || 0) + 1;
    }
    for (const [family, count] of Object.entries(familyCounts)) {
      if (count >= 2) {
        score += this.config.tonalBonus;
      }
    }

    // 规则4：邻近色检查 — 暖色+暖色 / 冷色+冷色 加分
    const hasWarm = colorCategories.includes('warm');
    const hasCool = colorCategories.includes('cool');
    if (hasWarm && !hasCool) {
      // 全暖色搭配
      const warmCount = colorCategories.filter(f => f === 'warm').length;
      if (warmCount >= 2) score += this.config.adjacentColorBonus;
    }
    if (hasCool && !hasWarm) {
      // 全冷色搭配
      const coolCount = colorCategories.filter(f => f === 'cool').length;
      if (coolCount >= 2) score += this.config.adjacentColorBonus;
    }
    // 冷暖混搭不给加分

    // 规则5：颜色冲突检查 — 冲突色组合扣分
    for (const clash of this.config.colorClashes) {
      const hasA = allColors.some(c => c === clash.a);
      const hasB = allColors.some(c => c === clash.b);
      if (hasA && hasB) {
        score -= clash.penalty;
      }
    }

    // 规则6：花纹检查 — 多件花纹/印花扣分
    const patternedItems = items.filter(item =>
      item.pattern && !['纯色', '素色'].includes(item.pattern)
    );
    if (patternedItems.length > 1) {
      score -= 0.1 * (patternedItems.length - 1);
    }

    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * 获取颜色所属的色系
   */
  _getColorFamily(color) {
    for (const [family, colors] of Object.entries(this.config.colorFamilies)) {
      if (colors.has(color)) return family;
    }
    return 'unknown';
  }

  /**
   * 风格一致性评分
   */
  _scoreStyleConsistency(outfit, request) {
    let score = 0.5;
    const items = outfit.items.filter(item => item.styles && item.styles.length > 0);

    if (items.length <= 1) return 0.5;

    // 收集所有风格标签并计数
    const styleCounts = {};
    for (const item of items) {
      for (const style of item.styles) {
        styleCounts[style] = (styleCounts[style] || 0) + 1;
      }
    }

    // 规则1：同风格加分 — 多件衣物共享同一风格
    const totalItems = items.length;
    const entries = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]);
    for (const [style, count] of entries) {
      if (count >= 2) {
        // 共享该风格的衣物比例越高，加分越多
        score += this.config.styleMatchBonus * (count / totalItems);
      }
    }

    // 规则2：风格冲突扣分
    for (const clash of this.config.styleClashes) {
      let hasA = false, hasB = false;
      for (const item of items) {
        if (item.styles.includes(clash.a)) hasA = true;
        if (item.styles.includes(clash.b)) hasB = true;
      }
      if (hasA && hasB) {
        score -= clash.penalty;
      }
    }

    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * 场景适配度评分
   */
  _scoreScenarioFit(outfit, request) {
    if (!request.scenario) return 0.5;

    let score = 0.5;
    const recommendStyles = this.config.scenarioStyleMap[request.scenario] || [];

    // 规则1：衣物风格与场景推荐风格匹配度
    for (const item of outfit.items) {
      if (!item.styles) continue;
      const matchCount = item.styles.filter(s => recommendStyles.includes(s)).length;
      if (matchCount > 0) {
        score += 0.05 * matchCount;
      }
    }

    // 规则2：场景品类加分（特定场景下某些品类更合适）
    const scenarioBonus = SEASON_CATEGORY_BONUS[request.season] || {};
    for (const item of outfit.items) {
      if (scenarioBonus[item.category]) {
        score += scenarioBonus[item.category];
      }
    }

    // 规则3：季节品类加分
    const seasonBonus = SEASON_CATEGORY_BONUS[request.season] || {};
    for (const item of outfit.items) {
      if (seasonBonus[item.category]) {
        score += seasonBonus[item.category];
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * 生成评分原因说明
   */
  _buildReasons(outfit, scores, request) {
    const reasons = [];
    const items = outfit.items;

    // 品类完整度说明
    const categories = items.map(i => i.category).join('+');
    reasons.push(`品类组合：${categories}`);

    // 颜色说明
    const colors = [...new Set(items.flatMap(i => i.colors || []))];
    if (colors.length > 0) {
      reasons.push(`配色：${colors.join('、')}`);
    }
    if (scores.colorHarmony >= 0.8) {
      reasons.push('颜色搭配协调');
    }

    // 风格说明
    if (scores.styleConsistency >= 0.75) {
      reasons.push('风格统一');
    }

    // 场景适配说明
    if (request.scenario && scores.scenarioFit >= 0.7) {
      reasons.push(`适合${request.scenario}场景`);
    }

    return reasons;
  }

  // ============================================================
  // 去重
  // ============================================================

  /**
   * 搭配去重
   * 如果两套搭配物品重合度超过70%，只保留分数高的
   */
  _dedupOutfits(outfits) {
    if (outfits.length <= 1) return outfits;

    const result = [];
    for (const outfit of outfits) {
      const itemIds = new Set(outfit.items.map(i => i.id));
      let isDuplicate = false;

      for (const existing of result) {
        const existingIds = new Set(existing.items.map(i => i.id));

        // 计算交集
        let intersection = 0;
        for (const id of itemIds) {
          if (existingIds.has(id)) intersection++;
        }

        const smaller = Math.min(itemIds.size, existingIds.size);
        const overlapRatio = intersection / smaller;

        if (overlapRatio >= 0.7) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        result.push(outfit);
      }
    }

    return result;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 根据指定单品生成搭配（"用它搭"功能）
   * @param {Array} wardrobe - 完整衣橱
   * @param {Object} targetItem - 必须使用的单品
   * @param {Object} request - 搭配请求（可选scenario/season等）
   */
  recommendWithItem(wardrobe, targetItem, request = {}) {
    return this.recommend(wardrobe, {
      ...request,
      mustIncludeId: targetItem.id,
      excludeIds: [],
    });
  }

  /**
   * 获取衣橱统计信息
   * @param {Array} wardrobe - 完整衣橱
   * @returns {Object} 统计数据
   */
  getStats(wardrobe) {
    const byCategory = this._groupByCategory(wardrobe);
    const bySeason = {};
    const byColor = {};
    const byScenario = {};

    for (const item of wardrobe) {
      if (item.seasons) {
        for (const s of item.seasons) {
          bySeason[s] = (bySeason[s] || 0) + 1;
        }
      }
      if (item.colors) {
        for (const c of item.colors) {
          byColor[c] = (byColor[c] || 0) + 1;
        }
      }
      if (item.scenarios) {
        for (const s of item.scenarios) {
          byScenario[s] = (byScenario[s] || 0) + 1;
        }
      }
    }

    return {
      totalItems: wardrobe.length,
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, v.length])
      ),
      bySeason,
      byColor,
      byScenario,
      availableItems: wardrobe.filter(item => item.status === 'normal').length,
    };
  }

  /**
   * 检查衣橱是否满足基本搭配需求
   * @param {Array} wardrobe
   * @returns {Object} {canRecommend, missingCategories, suggestions}
   */
  checkWardrobeHealth(wardrobe) {
    const available = wardrobe.filter(item => item.status === 'normal');
    const byCategory = this._groupByCategory(available);

    const missingCategories = [];

    // 基本需求：至少能组成一套基础搭配
    // 1. 上衣+下装+鞋 或 2. 连衣裙+鞋
    const hasTop = (byCategory[CATEGORY.TOP]?.length || 0) > 0;
    const hasBottom = (byCategory[CATEGORY.BOTTOM]?.length || 0) > 0;
    const hasDress = (byCategory[CATEGORY.DRESS]?.length || 0) > 0;
    const hasShoes = (byCategory[CATEGORY.SHOES]?.length || 0) > 0;

    const canDoBasic = (hasTop && hasBottom && hasShoes) || (hasDress && hasShoes);

    if (!hasTop && !hasDress) missingCategories.push(CATEGORY.TOP);
    if (!hasBottom && !hasDress) missingCategories.push(CATEGORY.BOTTOM);
    if (!hasShoes) missingCategories.push(CATEGORY.SHOES);

    // 建议
    const suggestions = [];
    if (!canDoBasic) {
      if (missingCategories.length > 0) {
        suggestions.push(`建议添加：${missingCategories.join('、')}（至少一件）`);
      }
      suggestions.push('当前衣橱无法组成完整搭配，请至少添加2件上衣+1件下装+1双鞋');
    } else {
      const total = available.length;
      if (total < 5) {
        suggestions.push('衣橱衣物较少（少于5件），搭配选择有限');
      }
      if (total < 10) {
        suggestions.push('建议继续添加衣物以获得更丰富的搭配推荐');
      }
    }

    // 品类丰富度检查
    const categoryRichness = Object.keys(byCategory).length;
    if (categoryRichness < 3 && canDoBasic) {
      suggestions.push('品类较单一，搭配多样性受限');
    }

    return {
      canRecommend: canDoBasic,
      totalAvailable: available.length,
      categoryCount: categoryRichness,
      missingCategories,
      suggestions,
    };
  }
}

// ============================================================
// 六、导出辅助函数（方便测试和调试）
// ============================================================

/**
 * 创建一个示例衣物对象（用于测试）
 */
export function createSampleItem(overrides = {}) {
  return {
    id: overrides.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category: overrides.category || CATEGORY.TOP,
    subCategory: overrides.subCategory || '',
    colors: overrides.colors || ['黑色'],
    pattern: overrides.pattern || '纯色',
    seasons: overrides.seasons || ['春', '秋'],
    scenarios: overrides.scenarios || ['通勤', '休闲'],
    styles: overrides.styles || ['简约'],
    status: overrides.status || 'normal',
    isFavorite: overrides.isFavorite || false,
    imageUrl: overrides.imageUrl || '',
    name: overrides.name || '',
  };
}

/**
 * 导出色系查询函数
 */
export function getColorFamily(color) {
  for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
    if (colors.has(color)) return family;
  }
  return 'unknown';
}

export { CATEGORY, OUTFIT_TEMPLATES, COLOR_FAMILIES, SCENARIO_STYLE_MAP, STYLES };
