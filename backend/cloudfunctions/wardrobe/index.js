/**
 * ============================================================
 * CloudBase 云函数: wardrobe
 *
 * 功能: 衣物 CRUD + 品类字典 + 标签字典
 * 触发:
 *   GET    /api/v1/categories        → 品类字典
 *   GET    /api/v1/tags               → 标签字典
 *   GET    /api/v1/wardrobe           → 衣橱列表
 *   GET    /api/v1/wardrobe/:id       → 衣物详情
 *   POST   /api/v1/wardrobe           → 创建衣物
 *   PUT    /api/v1/wardrobe/:id       → 编辑衣物
 *   DELETE /api/v1/wardrobe/:id       → 删除衣物
 *   POST   /api/v1/wardrobe/batch-delete → 批量删除
 *
 * 鉴权: 通过 JWT 获取 userId，所有数据按 userId 隔离
 * ============================================================
 */

const cloud = require('wx-server-sdk');
const jwt = require('jsonwebtoken');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const JWT_SECRET = process.env.JWT_SECRET || 'electronic-wardrobe-jwt-secret-2026';

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { httpMethod, path, body, query } = parseRequest(event);
  // CloudBase HTTP Access 前缀匹配：/api/v1/wardrobe 路由匹配后，path 为剩余路径
  // GET / → 列表, GET /:id → 详情, POST / → 创建, PUT /:id → 编辑, DELETE /:id → 删除
  const cleanPath = path.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
  const segments = cleanPath.replace(/^\//, '').split('/').filter(Boolean);
  // segments: [] = 根路径, [id] = /:id, [batch-delete] = /batch-delete

  try {
    // 鉴权（所有接口需要）
    const userId = getUserId(event);
    if (!userId) return fail(1002, '未登录或Token已过期');

    // 路由分发
    const isRoot = segments.length === 0;

    // GET / → 衣橱列表
    if (httpMethod === 'GET' && isRoot) {
      return handleList(userId, query);
    }
    // POST / → 创建衣物
    if (httpMethod === 'POST' && isRoot) {
      return handleCreate(userId, body);
    }
    // POST /batch-delete → 批量删除
    if (httpMethod === 'POST' && segments[0] === 'batch-delete') {
      return handleBatchDelete(userId, body);
    }
    // GET /:id → 衣物详情
    if (httpMethod === 'GET' && segments.length === 1) {
      return handleDetail(userId, segments[0]);
    }
    // PUT /:id → 编辑衣物
    if (httpMethod === 'PUT' && segments.length === 1) {
      return handleUpdate(userId, segments[0], body);
    }
    // DELETE /:id → 删除衣物
    if (httpMethod === 'DELETE' && segments.length === 1) {
      return handleDelete(userId, segments[0]);
    }

    return fail(404, 'Not Found');
  } catch (err) {
    console.error('wardrobe error:', err);
    return fail(2001, '服务端错误');
  }
};

// ============================================================
// 品类字典
// ============================================================
async function handleCategories() {
  const { data: all } = await db.collection('categories')
    .orderBy('sort_order', 'asc')
    .get();

  // 构建树形结构
  const parents = all.filter(c => c.level === 1);
  const children = all.filter(c => c.level === 2);

  const tree = parents.map(p => ({
    id: p._id,
    name: p.name,
    level: p.level,
    seasonSuitability: p.season_suitability,
    children: children
      .filter(c => c.parent_id === p._id)
      .map(c => ({
        id: c._id,
        name: c.name,
        parentId: c.parent_id,
        level: c.level,
        seasonSuitability: c.season_suitability
      }))
  }));

  return success({ categories: tree });
}

// ============================================================
// 标签字典
// ============================================================
async function handleTags(query) {
  const types = query.type ? query.type.split(',') : null;

  let condition = {};
  if (types && types.length > 0) {
    condition.tag_type = _.in(types);
  }

  const { data: tags } = await db.collection('tag_dictionary')
    .where(condition)
    .orderBy('sort_order', 'asc')
    .get();

  // 按 tag_type 分组
  const grouped = {};
  tags.forEach(t => {
    if (!grouped[t.tag_type]) grouped[t.tag_type] = [];
    grouped[t.tag_type].push({
      id: t._id,
      name: t.tag_name,
      aliases: t.aliases || [],
      normalizedName: t.normalized_name
    });
  });

  return success(grouped);
}

// ============================================================
// 衣橱列表
// ============================================================
async function handleList(userId, query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize) || 20));
  const sortBy = query.sortBy || 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  // 构建筛选条件
  const condition = { user_id: userId, is_deleted: 0 };

  if (query.categoryId) condition.category_id = query.categoryId;
  if (query.primaryColor) condition.primary_color = query.primaryColor;
  if (query.status) condition.status = query.status;
  if (query.favoriteOnly === 'true') condition.is_favorite = 1;

  // 查询
  let queryBuilder = db.collection('wardrobe_items')
    .where(condition)
    .orderBy(sortBy, sortOrder)
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  const { data: items } = await queryBuilder.get();

  // 总数（CloudBase 限制，生产优化后可用 count 聚合）
  const { total } = await db.collection('wardrobe_items')
    .where(condition)
    .count();

  // 获取品类名称
  const categoryIds = [...new Set(items.map(i => i.category_id))];
  const { data: categories } = await db.collection('categories')
    .where({ _id: _.in(categoryIds) })
    .get();
  const catMap = {};
  categories.forEach(c => { catMap[c._id] = c; });

  // 获取图片临时链接
  const fileIDs = items
    .flatMap(i => [i.image_url, i.thumbnail_url])
    .filter(Boolean);
  const urlMap = await batchGetTempUrls(fileIDs);

  // 组装返回
  const list = items.map(item => ({
    id: item._id,
    imageUrl: urlMap[item.image_url] || item.image_url,
    thumbnailUrl: urlMap[item.thumbnail_url] || item.thumbnail_url,
    category: catMap[item.category_id] ? {
      id: catMap[item.category_id]._id,
      name: catMap[item.category_id].name
    } : null,
    primaryColor: item.primary_color,
    secondaryColors: item.secondary_colors,
    pattern: item.pattern,
    thickness: item.thickness,
    seasons: item.seasons,
    scenarios: item.scenarios,
    styles: item.styles,
    status: item.status,
    isFavorite: !!item.is_favorite,
    wearCount: item.wear_count,
    lastWornAt: item.last_worn_at,
    createdAt: item.created_at
  }));

  // 前端筛选（JSON数组字段无法走数据库索引，读取后过滤）
  let filtered = list;
  if (query.season) {
    filtered = filtered.filter(i => i.seasons && i.seasons.includes(query.season));
  }
  if (query.scenario) {
    filtered = filtered.filter(i => i.scenarios && i.scenarios.includes(query.scenario));
  }
  if (query.style) {
    filtered = filtered.filter(i => i.styles && i.styles.includes(query.style));
  }
  if (query.search) {
    const kw = query.search.toLowerCase();
    filtered = filtered.filter(i =>
      (i.category?.name && i.category.name.includes(kw)) ||
      (i.note && i.note.toLowerCase().includes(kw)) ||
      (i.brand && i.brand.toLowerCase().includes(kw))
    );
  }

  return success({
    list: filtered,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize)
  });
}

// ============================================================
// 衣物详情
// ============================================================
async function handleDetail(userId, itemId) {
  const { data } = await db.collection('wardrobe_items')
    .where({ _id: itemId, user_id: userId, is_deleted: 0 })
    .get();

  if (data.length === 0) return fail(1004, '衣物不存在');

  const item = data[0];
  const urlMap = await batchGetTempUrls(
    [item.image_url, item.thumbnail_url, item.compressed_url].filter(Boolean)
  );

  // 获取品类信息（含父分类）
  const { data: cats } = await db.collection('categories')
    .where({ _id: item.category_id })
    .get();
  const cat = cats[0] || {};
  let parentCat = null;
  if (cat.parent_id) {
    const { data: parents } = await db.collection('categories')
      .where({ _id: cat.parent_id })
      .get();
    parentCat = parents[0] || null;
  }

  return success({
    id: item._id,
    imageUrl: urlMap[item.image_url] || item.image_url,
    thumbnailUrl: urlMap[item.thumbnail_url] || item.thumbnail_url,
    compressedUrl: urlMap[item.compressed_url] || item.compressed_url,
    category: {
      id: cat._id,
      name: cat.name,
      parentId: cat.parent_id || null,
      parentName: parentCat?.name || null
    },
    primaryColor: item.primary_color,
    secondaryColors: item.secondary_colors,
    pattern: item.pattern,
    fabric: item.fabric,
    thickness: item.thickness,
    seasons: item.seasons,
    scenarios: item.scenarios,
    styles: item.styles,
    temperatureMin: item.temperature_min,
    temperatureMax: item.temperature_max,
    status: item.status,
    isFavorite: !!item.is_favorite,
    aiTags: item.ai_tags,
    manualEdited: !!item.manual_edited,
    brand: item.brand,
    purchaseDate: item.purchase_date,
    note: item.note,
    wearCount: item.wear_count,
    lastWornAt: item.last_worn_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  });
}

// ============================================================
// 创建衣物
// ============================================================
async function handleCreate(userId, body) {
  const { imageFileId, thumbnailFileId, categoryId, primaryColor } = body || {};

  // 参数校验
  if (!imageFileId) return fail(1001, '缺少 imageFileId');
  if (!categoryId) return fail(1001, '缺少 categoryId');
  if (primaryColor && !(await colorExists(primaryColor))) {
    return fail(1001, `颜色"${primaryColor}"不在标签字典中`);
  }

  // 校验品类存在
  const { data: cats } = await db.collection('categories')
    .where({ _id: categoryId, level: 2 })
    .get();
  if (cats.length === 0) return fail(1001, '无效的品类ID');

  const now = new Date();
  const itemData = {
    user_id: userId,
    category_id: categoryId,
    image_url: imageFileId,
    thumbnail_url: thumbnailFileId || null,
    compressed_url: null,
    primary_color: primaryColor || null,
    secondary_colors: body.secondaryColors || null,
    pattern: body.pattern || null,
    thickness: body.thickness || null,
    seasons: body.seasons || null,
    scenarios: body.scenarios || null,
    styles: body.styles || null,
    temperature_min: body.temperatureMin || null,
    temperature_max: body.temperatureMax || null,
    fabric: body.fabric || null,
    brand: body.brand || null,
    purchase_date: body.purchaseDate || null,
    note: body.note || null,
    ai_tags: null,
    manual_edited: 0,
    status: '正常',
    is_favorite: 0,
    wear_count: 0,
    last_worn_at: null,
    is_deleted: 0,
    created_at: now,
    updated_at: now
  };

  const { _id } = await db.collection('wardrobe_items').add({ data: itemData });

  return success({
    id: _id,
    imageFileId,
    categoryId,
    primaryColor: primaryColor || null,
    createdAt: now.toISOString()
  });
}

// ============================================================
// 编辑衣物
// ============================================================
async function handleUpdate(userId, itemId, body) {
  if (!body || Object.keys(body).length === 0) {
    return fail(1001, '请求体为空');
  }

  // 乐观锁检查
  if (body.expectedVersion) {
    const { data: current } = await db.collection('wardrobe_items')
      .where({ _id: itemId, user_id: userId, is_deleted: 0 })
      .get();
    if (current.length === 0) return fail(1004, '衣物不存在');
    if (current[0].updated_at !== body.expectedVersion) {
      return fail(1005, '数据已被其他人修改，请刷新后重试');
    }
  }

  // 构建更新字段
  const updates = { updated_at: new Date() };

  const fieldMap = {
    categoryId: 'category_id',
    primaryColor: 'primary_color',
    secondaryColors: 'secondary_colors',
    pattern: 'pattern',
    thickness: 'thickness',
    seasons: 'seasons',
    scenarios: 'scenarios',
    styles: 'styles',
    temperatureMin: 'temperature_min',
    temperatureMax: 'temperature_max',
    fabric: 'fabric',
    brand: 'brand',
    purchaseDate: 'purchase_date',
    note: 'note',
    status: 'status',
    isFavorite: 'is_favorite'
  };

  Object.entries(fieldMap).forEach(([key, dbField]) => {
    if (body[key] !== undefined) updates[dbField] = body[key];
  });

  // 标记为人工编辑
  if (Object.keys(updates).length > 1) {
    updates.manual_edited = 1;
  }

  await db.collection('wardrobe_items')
    .where({ _id: itemId, user_id: userId })
    .update({ data: updates });

  return success({
    id: itemId,
    updatedAt: updates.updated_at.toISOString()
  });
}

// ============================================================
// 删除衣物（软删除）
// ============================================================
async function handleDelete(userId, itemId) {
  const now = new Date();
  await db.collection('wardrobe_items')
    .where({ _id: itemId, user_id: userId })
    .update({
      data: {
        is_deleted: 1,
        deleted_at: now,
        updated_at: now
      }
    });

  return success({ deleted: true });
}

// ============================================================
// 批量删除
// ============================================================
async function handleBatchDelete(userId, body) {
  const { ids } = body || {};
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return fail(1001, '缺少 ids');
  }
  if (ids.length > 50) return fail(1001, '单次最多删除50件');

  const now = new Date();
  const failedIds = [];

  for (const id of ids) {
    try {
      await db.collection('wardrobe_items')
        .where({ _id: id, user_id: userId })
        .update({
          data: { is_deleted: 1, deleted_at: now, updated_at: now }
        });
    } catch (err) {
      failedIds.push(id);
    }
  }

  return success({
    deletedCount: ids.length - failedIds.length,
    failedIds
  });
}

// ============================================================
// 辅助函数
// ============================================================

/** 从请求中提取 userId（解析 JWT） */
function getUserId(event) {
  try {
    const auth = event.headers?.Authorization || event.headers?.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (err) {
    return null;
  }
}

/** 校验颜色是否在标签字典中 */
async function colorExists(color) {
  const { total } = await db.collection('tag_dictionary')
    .where({ tag_type: 'color', normalized_name: color })
    .count();
  return total > 0;
}

/** 批量获取云存储临时链接 */
async function batchGetTempUrls(fileIDs) {
  if (!fileIDs || fileIDs.length === 0) return {};
  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: fileIDs });
    const map = {};
    fileList.forEach(f => {
      map[f.fileID] = f.tempFileURL || f.fileID;
    });
    return map;
  } catch {
    return {};
  }
}

/** 解析请求 */
function parseRequest(event) {
  // CloudBase HTTP Access Service: event.path 为相对路径("/")，真实匹配路径在 requestContext.path
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
