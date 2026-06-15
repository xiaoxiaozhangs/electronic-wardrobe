/**
 * ============================================================
 * CloudBase 云函数: stats
 *
 * 功能: 衣橱统计概览
 * 触发: GET /api/v1/stats/wardrobe
 *
 * 统计维度：
 *   - 总衣物数 / 活跃衣物数
 *   - 按品类分布
 *   - 按颜色分布
 *   - 按季节分布
 *   - 按状态分布
 *   - 最常穿 / 最少穿
 *   - 搭配统计
 * ============================================================
 */

const cloud = require('wx-server-sdk');
const jwt = require('jsonwebtoken');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const JWT_SECRET = process.env.JWT_SECRET || 'electronic-wardrobe-jwt-secret-2026';

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { httpMethod, path } = parseRequest(event);

  const userId = getUserId(event);
  if (!userId) return fail(1002, '未登录或Token已过期');

  const normalizedPath = path.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
  // 兼容：HTTP 服务路由 /api/v1/stats/wardrobe 时 path 为 /（精确匹配）
  if (httpMethod === 'GET' && (normalizedPath === '/stats/wardrobe' || normalizedPath === '/' || normalizedPath === '')) {
    return handleStats(userId);
  }

  return fail(404, 'Not Found');
};

/**
 * GET /stats/wardrobe
 */
async function handleStats(userId) {
  // 并行查询各项统计
  const [
    totalItems,
    activeItems,
    byCategory,
    byColor,
    bySeason,
    byStatus,
    mostWorn,
    leastWorn,
    outfitStats
  ] = await Promise.all([
    countItems(userId, {}),
    countItems(userId, { status: '正常' }),
    aggregateBy(userId, 'category_id', true),
    aggregateBy(userId, 'primary_color'),
    aggregateBySeason(userId),
    aggregateBy(userId, 'status'),
    topWorn(userId, 'desc', 5),
    topWorn(userId, 'asc', 5),
    outfitStatistics(userId)
  ]);

  return success({
    totalItems,
    activeItems,
    byCategory,
    byColor,
    bySeason,
    byStatus,
    mostWorn,
    leastWorn,
    outfitStats
  });
}

// ============================================================
// 统计子查询
// ============================================================

/** 衣物计数 */
async function countItems(userId, extra) {
  const condition = { user_id: userId, is_deleted: 0, ...extra };
  const { total } = await db.collection('wardrobe_items').where(condition).count();
  return total;
}

/** 按某字段聚合计数（简单维度） */
async function aggregateBy(userId, field, withCategoryName = false) {
  // CloudBase 文档 DB 的 aggregate 有限制，这里手动分组
  const { data: items } = await db.collection('wardrobe_items')
    .where({ user_id: userId, is_deleted: 0 })
    .field({ [field]: true })
    .get();

  const counts = {};
  items.forEach(item => {
    const val = item[field];
    if (val) {
      // 处理 JSON 数组字段
      if (Array.isArray(val)) {
        val.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      } else {
        counts[val] = (counts[val] || 0) + 1;
      }
    }
  });

  let result = Object.entries(counts).map(([key, count]) => ({ key, count }));

  // 如果需要品类名称
  if (withCategoryName && field === 'category_id') {
    const { data: cats } = await db.collection('categories')
      .where({ _id: db.command.in(Object.keys(counts)) })
      .get();
    const catMap = {};
    cats.forEach(c => { catMap[c._id] = c; });

    result = result.map(r => {
      const cat = catMap[r.key] || {};
      return {
        categoryId: r.key,
        categoryName: cat.name || r.key,
        count: r.count
      };
    });
  } else {
    result = result.map(r => ({
      [field === 'primary_color' ? 'color' : field === 'status' ? 'status' : 'key']: r.key,
      count: r.count
    }));
  }

  return result.sort((a, b) => b.count - a.count);
}

/** 按季节聚合（JSON 数组字段需要特殊处理） */
async function aggregateBySeason(userId) {
  const { data: items } = await db.collection('wardrobe_items')
    .where({ user_id: userId, is_deleted: 0 })
    .field({ seasons: true })
    .get();

  const counts = {};
  items.forEach(item => {
    const seasons = item.seasons;
    if (Array.isArray(seasons)) {
      seasons.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    }
  });

  return Object.entries(counts)
    .map(([season, count]) => ({ season, count }))
    .sort((a, b) => ['春', '夏', '秋', '冬'].indexOf(a.season) - ['春', '夏', '秋', '冬'].indexOf(b.season));
}

/** 最常穿 / 最少穿 */
async function topWorn(userId, order, limit) {
  const { data: items } = await db.collection('wardrobe_items')
    .where({ user_id: userId, is_deleted: 0, status: '正常' })
    .orderBy('wear_count', order)
    .limit(limit)
    .get();

  const { data: cats } = await db.collection('categories')
    .where({ _id: db.command.in(items.map(i => i.category_id)) })
    .get();
  const catMap = {};
  cats.forEach(c => { catMap[c._id] = c; });

  return items.map(item => ({
    itemId: item._id,
    categoryName: (catMap[item.category_id] || {}).name || '未知',
    primaryColor: item.primary_color,
    wearCount: item.wear_count,
    lastWornAt: item.last_worn_at
  }));
}

/** 搭配统计 */
async function outfitStatistics(userId) {
  const { total: totalOutfits } = await db.collection('outfits')
    .where({ user_id: userId })
    .count();

  const { total: favoriteOutfits } = await db.collection('outfits')
    .where({ user_id: userId, is_favorite: 1 })
    .count();

  const { total: feedbackLike } = await db.collection('outfits')
    .where({ user_id: userId, feedback: '喜欢' })
    .count();

  const { total: feedbackDislike } = await db.collection('outfits')
    .where({ user_id: userId, feedback: '不合适' })
    .count();

  return {
    totalOutfits,
    favoriteOutfits,
    feedbackLike,
    feedbackDislike
  };
}

// ============================================================
// 辅助函数
// ============================================================

function getUserId(event) {
  try {
    const auth = event.headers?.Authorization || event.headers?.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET).userId;
  } catch { return null; }
}

function parseRequest(event) {
  const realPath = event.requestContext?.path || event.path || '/';
  return {
    httpMethod: (event.httpMethod || 'GET').toUpperCase(),
    path: realPath
  };
}

function success(data) {
  return { code: 0, message: 'success', data };
}

function fail(code, message) {
  return { code, message, data: null };
}
