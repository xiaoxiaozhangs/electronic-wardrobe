/**
 * ============================================================
 * CloudBase 云函数: outfit
 *
 * 功能: 智能搭配生成 + 搭配列表/详情 + 反馈
 * 触发:
 *   POST   /api/v1/outfits/generate       → 生成搭配（异步）
 *   GET    /api/v1/outfits/generate/:task  → 轮询搭配结果
 *   GET    /api/v1/outfits                 → 搭配列表
 *   GET    /api/v1/outfits/:id             → 搭配详情
 *   POST   /api/v1/outfits/:id/feedback    → 搭配反馈
 *
 * 搭配策略: 规则引擎（三层：硬规则→品类组合→颜色评分）
 *          后续可升级为 LLM 辅助排序和解释
 * ============================================================
 */

const cloud = require('wx-server-sdk');
const jwt = require('jsonwebtoken');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const JWT_SECRET = process.env.JWT_SECRET || 'electronic-wardrobe-jwt-secret-2026';

// 每日搭配生成次数限制
const DAILY_GENERATE_LIMIT = 30;

/* ============================================================
 * 品类组合模板
 * ============================================================ */
const COMBINATION_TEMPLATES = [
  {
    name: '上衣+下装+鞋',
    required: ['上衣', '下装', '鞋'],
    optional: ['外套', '包', '配饰']
  },
  {
    name: '连衣裙+外套+鞋',
    required: ['连衣裙', '鞋'],
    optional: ['外套', '包', '配饰']
  },
  {
    name: '外套+上衣+下装+鞋',
    required: ['外套', '上衣', '下装', '鞋'],
    optional: ['包', '配饰']
  },
  {
    name: '上衣+下装',
    required: ['上衣', '下装'],
    optional: ['鞋', '外套', '包', '配饰']
  }
];

/* ============================================================
 * 颜色规则
 * ============================================================ */
const COLOR_WHEEL = [
  '红色', '橙色', '黄色', '绿色', '蓝色', '紫色',
  '粉色', '棕色', '米色', '灰色', '白色', '黑色'
];

const NEUTRAL_COLORS = new Set(['黑色', '白色', '灰色', '米色']);

function colorHarmonyScore(items) {
  const primaryColors = items.map(i => i.primary_color);
  const uniqueColors = new Set(primaryColors);
  let score = 0;

  // 主色数量 ≤3
  if (uniqueColors.size <= 3) score += 30;
  else if (uniqueColors.size <= 4) score += 15;

  // 中性色比例
  const neutralCount = primaryColors.filter(c => NEUTRAL_COLORS.has(c)).length;
  if (primaryColors.length > 0) {
    score += Math.min(20, (neutralCount / primaryColors.length) * 20);
  }

  // 同色系检查
  let harmonyPairs = 0, totalPairs = 0;
  for (let i = 0; i < primaryColors.length; i++) {
    for (let j = i + 1; j < primaryColors.length; j++) {
      totalPairs++;
      if (isSameColorFamily(primaryColors[i], primaryColors[j])) harmonyPairs++;
    }
  }
  if (totalPairs > 0) score += (harmonyPairs / totalPairs) * 30;

  // 冲突色
  const hasRed = uniqueColors.has('红色');
  const hasGreen = uniqueColors.has('绿色');
  const hasBlue = uniqueColors.has('蓝色');
  const hasOrange = uniqueColors.has('橙色');
  if (hasRed && hasGreen) score -= 20;
  if (hasBlue && hasOrange) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function isSameColorFamily(c1, c2) {
  if (c1 === c2) return true;
  if (NEUTRAL_COLORS.has(c1) || NEUTRAL_COLORS.has(c2)) return true;
  const idx1 = COLOR_WHEEL.indexOf(c1);
  const idx2 = COLOR_WHEEL.indexOf(c2);
  if (idx1 === -1 || idx2 === -1) return false;
  return Math.abs(idx1 - idx2) <= 2;
}

/* ============================================================
 * 主函数
 * ============================================================ */
exports.main = async (event, context) => {
  const { httpMethod, path, body, query } = parseRequest(event);
  const segments = path.replace(/^\/api\/v1\//, '').replace(/^\//, '').split('/');
  // 兼容：HTTP服务路由前缀 /api/v1/outfits 时 path 为相对路径(如 /generate)
  // 也兼容完整路径 /api/v1/outfits/generate
  const hasOutfitsPrefix = segments[0] === 'outfits';
  const s0 = hasOutfitsPrefix ? segments[1] : segments[0];
  const s1 = hasOutfitsPrefix ? segments[2] : segments[1];
  const s2 = hasOutfitsPrefix ? segments[3] : segments[2];

  const userId = getUserId(event);
  if (!userId) return fail(1002, '未登录或Token已过期');

  try {
    switch (true) {
      // POST /outfits/generate → 生成搭配（异步）
      case httpMethod === 'POST' && s0 === 'generate' && !s1:
        return handleGenerate(userId, body);

      // GET /outfits/generate/{taskId} → 轮询结果
      case httpMethod === 'GET' && s0 === 'generate' && s1:
        return handlePollResult(userId, s1);

      // POST /outfits/{id}/feedback → 反馈
      case httpMethod === 'POST' && s1 === 'feedback':
        return handleFeedback(userId, s0, body);

      // GET /outfits/{id} → 搭配详情
      case httpMethod === 'GET' && s0 && !s1 && s0 !== 'generate':
        return handleDetail(userId, s0);

      // GET /outfits → 搭配列表
      case httpMethod === 'GET' && !s0:
        return handleList(userId, query);

      default:
        return fail(404, 'Not Found');
    }
  } catch (err) {
    console.error('outfit error:', err);
    return fail(2001, '服务端错误');
  }
};

// ============================================================
// 搭配生成（异步）
// ============================================================
async function handleGenerate(userId, body) {
  const { scenario, season, style, temperature, weather, mustIncludeItemId, excludeItemIds, count } = body || {};

  // 参数校验
  if (!scenario) return fail(1001, '缺少 scenario');

  // 日限额检查
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { total: todayCount } = await db.collection('recommendation_logs')
    .where({
      user_id: userId,
      created_at: _.gte(today)
    })
    .count();
  if (todayCount >= DAILY_GENERATE_LIMIT) {
    return fail(1006, `每日搭配生成次数已达上限（${DAILY_GENERATE_LIMIT}次）`);
  }

  // 生成 task_id
  const taskId = generateUUID();

  // 写入日志
  const logData = {
    user_id: userId,
    task_id: taskId,
    request_params: { scenario, season, style, temperature, weather, mustIncludeItemId, excludeItemIds, count },
    status: 'pending',
    created_at: new Date()
  };
  await db.collection('recommendation_logs').add({ data: logData });

  // 异步执行搭配生成（CloudBase 云函数内不支持真正的异步，此处同步执行但记录耗时）
  const startTime = Date.now();
  try {
    await db.collection('recommendation_logs')
      .where({ task_id: taskId })
      .update({ data: { status: 'processing' } });

    const outfits = await generateOutfits(userId, {
      scenario, season, style, mustIncludeItemId,
      excludeItemIds: excludeItemIds || [],
      count: Math.min(count || 4, 5)
    });

    const latencyMs = Date.now() - startTime;

    // 更新日志
    await db.collection('recommendation_logs')
      .where({ task_id: taskId })
      .update({
        data: {
          status: 'completed',
          result_outfit_ids: outfits.map(o => o.id),
          latency_ms: latencyMs,
          model: 'rule-engine-v1',
          cost: 0
        }
      });
  } catch (err) {
    await db.collection('recommendation_logs')
      .where({ task_id: taskId })
      .update({
        data: {
          status: 'failed',
          error_message: err.message,
          latency_ms: Date.now() - startTime
        }
      });
  }

  return success({
    taskId,
    status: 'pending',
    estimatedSeconds: 5
  });
}

/**
 * 核心搭配生成逻辑
 */
async function generateOutfits(userId, params) {
  const { scenario, season, style, mustIncludeItemId, excludeItemIds, count } = params;
  const excludeSet = new Set(excludeItemIds);

  // 1. 获取用户所有可用衣物
  const { data: allItems } = await db.collection('wardrobe_items')
    .where({ user_id: userId, is_deleted: 0, status: '正常' })
    .get();

  // 2. 硬规则过滤
  let candidates = allItems.filter(item => {
    if (excludeSet.has(item._id)) return false;
    if (season && item.seasons && !item.seasons.includes(season)) return false;
    if (scenario && item.scenarios && !item.scenarios.includes(scenario)) return false;
    return true;
  });

  // 指定单品强制包含
  if (mustIncludeItemId) {
    const mustItem = allItems.find(i => i._id === mustIncludeItemId);
    if (mustItem && !candidates.find(c => c._id === mustIncludeItemId)) {
      candidates = [mustItem, ...candidates];
    }
  }

  // 按品类分组
  const byCategory = {};
  const { data: categories } = await db.collection('categories').get();
  const catMap = {};
  categories.forEach(c => { catMap[c._id] = c.name; });

  candidates.forEach(item => {
    const catName = catMap[item.category_id] || '其他';
    if (!byCategory[catName]) byCategory[catName] = [];
    byCategory[catName].push(item);
  });

  // 3. 品类组合生成
  const results = [];

  for (const template of COMBINATION_TEMPLATES) {
    // 检查必须品类
    const missingRequired = template.required.some(cat => !byCategory[cat] || byCategory[cat].length === 0);
    if (missingRequired) continue;

    // 生成组合
    const combos = cartesianProduct(
      template.required.map(cat => byCategory[cat]),
      20
    );

    for (const combo of combos) {
      if (mustIncludeItemId && !combo.some(item => item._id === mustIncludeItemId)) continue;

      const seenCategories = new Set();
      const finalItems = [];

      for (const item of combo) {
        const catName = catMap[item.category_id];
        if (!seenCategories.has(catName)) {
          seenCategories.add(catName);
          finalItems.push(item);
        }
      }

      // 添加可选品类
      for (const optCat of template.optional) {
        if (byCategory[optCat] && !seenCategories.has(optCat)) {
          const styleMatch = style
            ? byCategory[optCat].filter(i => i.styles && i.styles.includes(style))
            : [byCategory[optCat][0]];
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

  // 4. 评分排序 + 去重
  const scored = results.map(r => {
    let bonus = 0;
    if (style) bonus += r.items.filter(i => i.styles && i.styles.includes(style)).length * 5;
    bonus += r.items.filter(i => i.is_favorite).length * 3;
    return { ...r, score: r.score + bonus };
  });

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set();
  const unique = [];
  for (const r of scored) {
    const key = r.items.map(i => `${catMap[i.category_id]}:${i.primary_color}`).sort().join('|');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
      if (unique.length >= count) break;
    }
  }

  // 5. 写入 outfits 表
  const savedOutfits = [];
  const now = new Date();
  for (const r of unique) {
    const outData = {
      user_id: userId,
      name: `${getTitlePrefix(scenario, style || '')}搭配${savedOutfits.length + 1}`,
      items: r.items.map(item => ({
        item_id: item._id,
        category_id: item.category_id,
        category_name: catMap[item.category_id],
        position: catMap[item.category_id],
        primary_color: item.primary_color,
        thumbnail_url: item.thumbnail_url
      })),
      scenario: scenario,
      season: season || null,
      style: style || null,
      weather_condition: params.temperature ? { temperature: params.temperature, weather: params.weather } : null,
      llm_explanation: generateReason(r.template, r.items, r.score, catMap, scenario),
      score: r.score,
      source: 'rule',
      is_favorite: 0,
      feedback: null,
      created_at: now
    };

    const { _id } = await db.collection('outfits').add({ data: outData });
    outData.id = _id;
    savedOutfits.push(outData);
  }

  return savedOutfits;
}

// ============================================================
// 轮询搭配结果
// ============================================================
async function handlePollResult(userId, taskId) {
  const { data: logs } = await db.collection('recommendation_logs')
    .where({ task_id: taskId, user_id: userId })
    .get();

  if (logs.length === 0) return fail(1004, '任务不存在');

  const log = logs[0];

  if (log.status === 'pending' || log.status === 'processing') {
    return success({ taskId, status: log.status });
  }

  if (log.status === 'failed') {
    return success({
      taskId,
      status: 'failed',
      errorMessage: log.error_message || '搭配生成失败'
    });
  }

  // 已完成 → 加载搭配结果
  const outfitIds = log.result_outfit_ids || [];
  const { data: outfits } = await db.collection('outfits')
    .where({ _id: _.in(outfitIds), user_id: userId })
    .get();

  const resultOutfits = outfits.map(o => ({
    id: o._id,
    name: o.name,
    items: o.items,
    score: o.score,
    reason: o.llm_explanation,
    scenario: o.scenario,
    season: o.season,
    style: o.style
  }));

  return success({
    taskId,
    status: 'completed',
    outfits: resultOutfits,
    processingTimeMs: log.latency_ms
  });
}

// ============================================================
// 搭配列表
// ============================================================
async function handleList(userId, query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(20, Math.max(1, parseInt(query.pageSize) || 20));

  const condition = { user_id: userId };
  if (query.favoriteOnly === 'true') condition.is_favorite = 1;
  if (query.scenario) condition.scenario = query.scenario;

  const { data: outfits } = await db.collection('outfits')
    .where(condition)
    .orderBy('created_at', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  const { total } = await db.collection('outfits')
    .where(condition)
    .count();

  const list = outfits.map(o => ({
    id: o._id,
    name: o.name,
    itemCount: (o.items || []).length,
    coverImageUrl: o.items?.[0]?.thumbnail_url || null,
    scenario: o.scenario,
    season: o.season,
    style: o.style,
    isFavorite: !!o.is_favorite,
    feedback: o.feedback,
    source: o.source,
    score: o.score,
    createdAt: o.created_at
  }));

  return success({
    list,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize)
  });
}

// ============================================================
// 搭配详情
// ============================================================
async function handleDetail(userId, outfitId) {
  const { data } = await db.collection('outfits')
    .where({ _id: outfitId, user_id: userId })
    .get();

  if (data.length === 0) return fail(1004, '搭配不存在');

  const o = data[0];

  // 组装衣物缩略图 url
  let items = o.items || [];
  if (items.length > 0) {
    const fileIDs = items.map(i => i.thumbnail_url).filter(Boolean);
    const urlMap = await batchGetTempUrls(fileIDs);
    items = items.map(i => ({
      ...i,
      thumbnailUrl: urlMap[i.thumbnail_url] || i.thumbnail_url
    }));
  }

  return success({
    id: o._id,
    name: o.name,
    items,
    scenario: o.scenario,
    season: o.season,
    style: o.style,
    score: o.score,
    reason: o.llm_explanation,
    weatherCondition: o.weather_condition,
    source: o.source,
    isFavorite: !!o.is_favorite,
    feedback: o.feedback,
    createdAt: o.created_at
  });
}

// ============================================================
// 搭配反馈
// ============================================================
async function handleFeedback(userId, outfitId, body) {
  const { feedback, isFavorite } = body || {};

  if (!feedback && isFavorite === undefined) {
    return fail(1001, '缺少 feedback 或 isFavorite');
  }

  const updates = {};

  if (feedback && !['喜欢', '一般', '不合适'].includes(feedback)) {
    return fail(1001, 'feedback 必须为 喜欢/一般/不合适');
  }
  if (feedback) updates.feedback = feedback;
  if (isFavorite !== undefined) updates.is_favorite = isFavorite ? 1 : 0;

  const updateResult = await db.collection('outfits')
    .where({ _id: outfitId, user_id: userId })
    .update({ data: updates });

  if (updateResult.stats.updated === 0) {
    return fail(1004, '搭配不存在');
  }

  return success({ updated: true });
}

// ============================================================
// 辅助函数
// ============================================================

/** 生成搭配理由 */
function generateReason(template, items, score, catMap) {
  const categoryNames = items.map(i => catMap[i.category_id] || '').filter(Boolean).join('+');
  const colors = [...new Set(items.map(i => i.primary_color).filter(Boolean))];
  const parts = [`${template.name}组合（${categoryNames}）`];

  if (colors.length <= 2) {
    parts.push(`色调统一为${colors.join('与')}`);
  } else if (colors.filter(c => NEUTRAL_COLORS.has(c)).length >= 2) {
    parts.push('以中性色为主调，搭配协调');
  } else {
    parts.push(`${colors.join('、')}多色搭配`);
  }

  if (score >= 70) parts.push('颜色搭配和谐度较高');
  return parts.join('。');
}

function getTitlePrefix(scenario, style) {
  const map = {
    通勤: '职场', 休闲: '日常', 运动: '活力',
    正式: '正式', 约会: '浪漫', 聚会: '吸睛', 旅行: '舒适'
  };
  return `${map[scenario] || ''}${style}`;
}

function cartesianProduct(arrays, maxResults) {
  if (arrays.length === 0) return [[]];
  let results = [[]];
  for (const arr of arrays) {
    const next = [];
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

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getUserId(event) {
  try {
    const auth = event.headers?.Authorization || event.headers?.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET).userId;
  } catch { return null; }
}

async function batchGetTempUrls(fileIDs) {
  if (!fileIDs || fileIDs.length === 0) return {};
  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: fileIDs });
    const map = {};
    fileList.forEach(f => { map[f.fileID] = f.tempFileURL || f.fileID; });
    return map;
  } catch { return {}; }
}

function parseRequest(event) {
  const realPath = event.requestContext?.path || event.path || '/';
  return {
    httpMethod: (event.httpMethod || 'GET').toUpperCase(),
    path: realPath,
    body: typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {}),
    query: event.queryStringParameters || {}
  };
}

function success(data) {
  return { code: 0, message: 'success', data };
}

function fail(code, message) {
  return { code, message, data: null };
}
