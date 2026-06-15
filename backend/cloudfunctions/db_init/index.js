/**
 * ============================================================
 * CloudBase 云函数: db_init
 *
 * 功能: 数据库初始化 —— 创建集合 & 插入种子数据
 * 触发: HTTP POST /api/v1/admin/db-init（仅运行一次）
 *
 * 幂等: 通过检查 categories 是否有数据来判断是否已初始化
 * ============================================================
 */

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { httpMethod, path } = parseRequest(event);
  // CloudBase HTTP Access 前缀匹配后 path 为 "/"，通过 method 区分操作
  if (httpMethod === 'POST') {
    return handleInit();
  }
  if (httpMethod === 'GET') {
    return handleCheck();
  }
  return fail(404, 'Not Found');
};

/**
 * POST /admin/db-init —— 执行初始化
 */
async function handleInit() {
  try {
    // 幂等检查：categories 是否已有数据
    const { total } = await db.collection('categories').count();
    if (total > 0) {
      return success({
        initialized: false,
        message: '数据库已初始化，跳过。如需重新初始化，请先清空 categories 和 tag_dictionary 集合。',
        existingCategories: total
      });
    }

    const results = {};

    // 1. 插入品类字典
    results.categories = await seedCategories();

    // 2. 插入标签字典
    results.tagDictionary = await seedTagDictionary();

    // 3. 汇总
    const { total: catTotal } = await db.collection('categories').count();
    const { total: tagTotal } = await db.collection('tag_dictionary').count();

    return success({
      initialized: true,
      message: '数据库初始化完成',
      summary: {
        categories: catTotal,
        tagDictionary: tagTotal,
        collections: [
          'categories (品类字典)',
          'tag_dictionary (标签字典)',
          'users (用户表 - 首次登录时自动创建)',
          'wardrobe_items (衣物表 - 首次上传时自动创建)',
          'outfits (搭配表 - 首次生成时自动创建)',
          'recommendation_logs (推荐日志 - 首次推荐时自动创建)'
        ]
      },
      details: results
    });
  } catch (err) {
    console.error('db_init error:', err);
    return fail(2001, '初始化失败: ' + err.message);
  }
}

/**
 * GET /admin/db-init —— 检查初始化状态
 */
async function handleCheck() {
  try {
    const { total: catTotal } = await db.collection('categories').count();
    const { total: tagTotal } = await db.collection('tag_dictionary').count();

    return success({
      initialized: catTotal > 0,
      categories: catTotal,
      tagDictionary: tagTotal
    });
  } catch (err) {
    // 集合可能还不存在
    return success({
      initialized: false,
      categories: 0,
      tagDictionary: 0
    });
  }
}

// ============================================================
// 种子数据
// ============================================================

/**
 * 品类字典种子数据
 * 7 个一级分类 + 30 个二级品类
 */
async function seedCategories() {
  const now = new Date();

  // 一级品类
  const level1 = [
    { _id: 'cat_1',  name: '上衣',   parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 10 },
    { _id: 'cat_2',  name: '下装',   parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 20 },
    { _id: 'cat_3',  name: '连衣裙', parent_id: null, level: 1, season_suitability: ['春','夏','秋'],       weather_suitability: { min: 10, max: 38 }, sort_order: 30 },
    { _id: 'cat_4',  name: '外套',   parent_id: null, level: 1, season_suitability: ['春','秋','冬'],       weather_suitability: { min: -10,max: 25 }, sort_order: 40 },
    { _id: 'cat_5',  name: '鞋',     parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 50 },
    { _id: 'cat_6',  name: '包',     parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 60 },
    { _id: 'cat_7',  name: '配饰',   parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 70 },
    { _id: 'cat_8',  name: '其他',   parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 90 }
  ];

  // 二级品类
  const level2 = [
    // 上衣 (parent: cat_1)
    { name: 'T恤',     parent_id: 'cat_1', season_suitability: ['春','夏','秋'], weather_suitability: { min: 15, max: 38 }, sort_order: 11 },
    { name: '衬衫',    parent_id: 'cat_1', season_suitability: ['春','夏','秋'], weather_suitability: { min: 10, max: 35 }, sort_order: 12 },
    { name: '卫衣',    parent_id: 'cat_1', season_suitability: ['春','秋','冬'], weather_suitability: { min: 0,  max: 25 }, sort_order: 13 },
    { name: '针织衫',  parent_id: 'cat_1', season_suitability: ['春','秋','冬'], weather_suitability: { min: 5,  max: 25 }, sort_order: 14 },
    { name: '毛衣',    parent_id: 'cat_1', season_suitability: ['秋','冬'],       weather_suitability: { min: -5, max: 20 }, sort_order: 15 },
    { name: '背心',    parent_id: 'cat_1', season_suitability: ['夏'],            weather_suitability: { min: 20, max: 40 }, sort_order: 16 },
    // 下装 (parent: cat_2)
    { name: '牛仔裤',  parent_id: 'cat_2', season_suitability: ['春','秋','冬'], weather_suitability: { min: 0,  max: 30 }, sort_order: 21 },
    { name: '休闲裤',  parent_id: 'cat_2', season_suitability: ['春','秋'],       weather_suitability: { min: 5,  max: 30 }, sort_order: 22 },
    { name: '西裤',    parent_id: 'cat_2', season_suitability: ['春','秋','冬'], weather_suitability: { min: 0,  max: 28 }, sort_order: 23 },
    { name: '短裤',    parent_id: 'cat_2', season_suitability: ['夏'],            weather_suitability: { min: 20, max: 40 }, sort_order: 24 },
    { name: '半身裙',  parent_id: 'cat_2', season_suitability: ['春','夏','秋'], weather_suitability: { min: 10, max: 35 }, sort_order: 25 },
    { name: '长裙',    parent_id: 'cat_2', season_suitability: ['春','夏','秋'], weather_suitability: { min: 15, max: 35 }, sort_order: 26 },
    { name: '短裙',    parent_id: 'cat_2', season_suitability: ['夏'],            weather_suitability: { min: 20, max: 38 }, sort_order: 27 },
    // 连衣裙 (parent: cat_3)
    { name: '连衣长裙', parent_id: 'cat_3', season_suitability: ['春','夏','秋'], weather_suitability: { min: 15, max: 35 }, sort_order: 31 },
    { name: '连衣短裙', parent_id: 'cat_3', season_suitability: ['夏'],            weather_suitability: { min: 20, max: 38 }, sort_order: 32 },
    // 外套 (parent: cat_4)
    { name: '风衣',    parent_id: 'cat_4', season_suitability: ['春','秋'],       weather_suitability: { min: 5,  max: 25 }, sort_order: 41 },
    { name: '夹克',    parent_id: 'cat_4', season_suitability: ['春','秋'],       weather_suitability: { min: 5,  max: 25 }, sort_order: 42 },
    { name: '西装',    parent_id: 'cat_4', season_suitability: ['春','秋','冬'], weather_suitability: { min: 0,  max: 25 }, sort_order: 43 },
    { name: '羽绒服',  parent_id: 'cat_4', season_suitability: ['冬'],            weather_suitability: { min: -15,max: 10 }, sort_order: 44 },
    { name: '大衣',    parent_id: 'cat_4', season_suitability: ['秋','冬'],       weather_suitability: { min: -10,max: 15 }, sort_order: 45 },
    // 鞋 (parent: cat_5)
    { name: '运动鞋',  parent_id: 'cat_5', season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 51 },
    { name: '皮鞋',    parent_id: 'cat_5', season_suitability: ['春','秋','冬'],       weather_suitability: { min: 0,  max: 30 }, sort_order: 52 },
    { name: '靴子',    parent_id: 'cat_5', season_suitability: ['秋','冬'],            weather_suitability: { min: -15,max: 15 }, sort_order: 53 },
    { name: '凉鞋',    parent_id: 'cat_5', season_suitability: ['夏'],                 weather_suitability: { min: 20, max: 40 }, sort_order: 54 },
    { name: '帆布鞋',  parent_id: 'cat_5', season_suitability: ['春','夏','秋'],       weather_suitability: { min: 10, max: 35 }, sort_order: 55 },
    // 包 (parent: cat_6)
    { name: '手拎包',  parent_id: 'cat_6', season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0, max: 40 }, sort_order: 61 },
    { name: '斜挎包',  parent_id: 'cat_6', season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0, max: 40 }, sort_order: 62 },
    { name: '双肩包',  parent_id: 'cat_6', season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0, max: 40 }, sort_order: 63 },
    // 配饰 (parent: cat_7)
    { name: '项链',    parent_id: 'cat_7', season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0, max: 40 }, sort_order: 71 },
    { name: '耳环',    parent_id: 'cat_7', season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0, max: 40 }, sort_order: 72 },
    { name: '手表',    parent_id: 'cat_7', season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0, max: 40 }, sort_order: 73 },
    { name: '帽子',    parent_id: 'cat_7', season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0, max: 40 }, sort_order: 74 },
    { name: '围巾',    parent_id: 'cat_7', season_suitability: ['秋','冬'],            weather_suitability: { min: -10,max: 15 }, sort_order: 75 },
    { name: '腰带',    parent_id: 'cat_7', season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0, max: 40 }, sort_order: 76 }
  ];

  let l1Count = 0, l2Count = 0;

  // 插入一级品类
  for (const cat of level1) {
    await db.collection('categories').add({
      data: { ...cat, level: 1, created_at: now }
    });
    l1Count++;
  }

  // 插入二级品类（CloudBase 自动生成 _id）
  for (const cat of level2) {
    await db.collection('categories').add({
      data: { ...cat, level: 2, created_at: now }
    });
    l2Count++;
  }

  return { level1: l1Count, level2: l2Count, total: l1Count + l2Count };
}

/**
 * 标签字典种子数据
 * 颜色(12) + 季节(4) + 场景(7) + 风格(10) + 花纹(6) + 厚度(3) + 状态(4) = 46
 */
async function seedTagDictionary() {
  const now = new Date();
  const tags = [
    // 颜色标签 (12)
    { tag_type: 'color', tag_name: '黑色', aliases: ['black','黑'], normalized_name: '黑色', sort_order: 1 },
    { tag_type: 'color', tag_name: '白色', aliases: ['white','白'], normalized_name: '白色', sort_order: 2 },
    { tag_type: 'color', tag_name: '灰色', aliases: ['gray','灰'], normalized_name: '灰色', sort_order: 3 },
    { tag_type: 'color', tag_name: '米色', aliases: ['beige','卡其色','杏色'], normalized_name: '米色', sort_order: 4 },
    { tag_type: 'color', tag_name: '棕色', aliases: ['brown','咖啡色','驼色'], normalized_name: '棕色', sort_order: 5 },
    { tag_type: 'color', tag_name: '红色', aliases: ['red','红'], normalized_name: '红色', sort_order: 6 },
    { tag_type: 'color', tag_name: '粉色', aliases: ['pink','粉'], normalized_name: '粉色', sort_order: 7 },
    { tag_type: 'color', tag_name: '橙色', aliases: ['orange','橘色'], normalized_name: '橙色', sort_order: 8 },
    { tag_type: 'color', tag_name: '黄色', aliases: ['yellow','黄'], normalized_name: '黄色', sort_order: 9 },
    { tag_type: 'color', tag_name: '绿色', aliases: ['green','绿'], normalized_name: '绿色', sort_order: 10 },
    { tag_type: 'color', tag_name: '蓝色', aliases: ['blue','蓝'], normalized_name: '蓝色', sort_order: 11 },
    { tag_type: 'color', tag_name: '紫色', aliases: ['purple','紫'], normalized_name: '紫色', sort_order: 12 },

    // 季节标签 (4)
    { tag_type: 'season', tag_name: '春', aliases: ['春天','spring'], normalized_name: '春', sort_order: 1 },
    { tag_type: 'season', tag_name: '夏', aliases: ['夏天','summer'], normalized_name: '夏', sort_order: 2 },
    { tag_type: 'season', tag_name: '秋', aliases: ['秋天','autumn','fall'], normalized_name: '秋', sort_order: 3 },
    { tag_type: 'season', tag_name: '冬', aliases: ['冬天','winter'], normalized_name: '冬', sort_order: 4 },

    // 场景标签 (7)
    { tag_type: 'scenario', tag_name: '通勤', aliases: ['上班','工作','职场'], normalized_name: '通勤', sort_order: 1 },
    { tag_type: 'scenario', tag_name: '休闲', aliases: ['日常','逛街','周末'], normalized_name: '休闲', sort_order: 2 },
    { tag_type: 'scenario', tag_name: '运动', aliases: ['健身','跑步','户外'], normalized_name: '运动', sort_order: 3 },
    { tag_type: 'scenario', tag_name: '正式', aliases: ['商务','会议','面试'], normalized_name: '正式', sort_order: 4 },
    { tag_type: 'scenario', tag_name: '约会', aliases: ['date','聚餐'], normalized_name: '约会', sort_order: 5 },
    { tag_type: 'scenario', tag_name: '聚会', aliases: ['派对','party'], normalized_name: '聚会', sort_order: 6 },
    { tag_type: 'scenario', tag_name: '旅行', aliases: ['旅游','出差','出行'], normalized_name: '旅行', sort_order: 7 },

    // 风格标签 (10)
    { tag_type: 'style', tag_name: '简约', aliases: ['极简','minimalist','cleanfit'], normalized_name: '简约', sort_order: 1 },
    { tag_type: 'style', tag_name: '通勤', aliases: ['职场','office'], normalized_name: '通勤', sort_order: 2 },
    { tag_type: 'style', tag_name: '休闲', aliases: ['casual','日常'], normalized_name: '休闲', sort_order: 3 },
    { tag_type: 'style', tag_name: '甜美', aliases: ['甜系','girly'], normalized_name: '甜美', sort_order: 4 },
    { tag_type: 'style', tag_name: '运动', aliases: ['sporty','athleisure'], normalized_name: '运动', sort_order: 5 },
    { tag_type: 'style', tag_name: '街头', aliases: ['streetwear','潮牌'], normalized_name: '街头', sort_order: 6 },
    { tag_type: 'style', tag_name: '复古', aliases: ['vintage','retro'], normalized_name: '复古', sort_order: 7 },
    { tag_type: 'style', tag_name: '韩系', aliases: ['韩风','korean'], normalized_name: '韩系', sort_order: 8 },
    { tag_type: 'style', tag_name: '日系', aliases: ['日风','japanese'], normalized_name: '日系', sort_order: 9 },
    { tag_type: 'style', tag_name: '法式', aliases: ['法风','french','巴黎'], normalized_name: '法式', sort_order: 10 },

    // 花纹标签 (6)
    { tag_type: 'pattern', tag_name: '纯色', aliases: ['单色','净色','solid'], normalized_name: '纯色', sort_order: 1 },
    { tag_type: 'pattern', tag_name: '条纹', aliases: ['横条','竖条','stripe'], normalized_name: '条纹', sort_order: 2 },
    { tag_type: 'pattern', tag_name: '格纹', aliases: ['格子','方格','plaid'], normalized_name: '格纹', sort_order: 3 },
    { tag_type: 'pattern', tag_name: '印花', aliases: ['图案','碎花','print'], normalized_name: '印花', sort_order: 4 },
    { tag_type: 'pattern', tag_name: '拼接', aliases: ['拼色','拼贴'], normalized_name: '拼接', sort_order: 5 },
    { tag_type: 'pattern', tag_name: '其他', aliases: ['other'], normalized_name: '其他', sort_order: 6 },

    // 厚度标签 (3)
    { tag_type: 'thickness', tag_name: '薄', aliases: ['薄款','轻薄','light'], normalized_name: '薄', sort_order: 1 },
    { tag_type: 'thickness', tag_name: '中', aliases: ['中等','适中','medium'], normalized_name: '中', sort_order: 2 },
    { tag_type: 'thickness', tag_name: '厚', aliases: ['厚款','加厚','heavy'], normalized_name: '厚', sort_order: 3 },

    // 衣物状态标签 (4)
    { tag_type: 'status', tag_name: '正常', aliases: ['在穿','active'], normalized_name: '正常', sort_order: 1 },
    { tag_type: 'status', tag_name: '洗涤中', aliases: ['清洗中','washing'], normalized_name: '洗涤中', sort_order: 2 },
    { tag_type: 'status', tag_name: '闲置', aliases: ['不常穿','inactive'], normalized_name: '闲置', sort_order: 3 },
    { tag_type: 'status', tag_name: '淘汰', aliases: ['不要了','discarded'], normalized_name: '淘汰', sort_order: 4 }
  ];

  let count = 0;
  // CloudBase 批量插入（每批最多 100 条）
  for (const tag of tags) {
    await db.collection('tag_dictionary').add({
      data: { ...tag, created_at: now }
    });
    count++;
  }

  return { total: count };
}

// ============================================================
// 辅助函数
// ============================================================

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
