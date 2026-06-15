/**
 * ============================================================
 * CloudBase 云函数: seed
 *
 * 功能: 数据库初始化 + 种子数据导入
 * 触发: 手动调用（一次性执行），执行完毕后建议删除
 *
 * 运行方式：
 *   1. 部署此云函数
 *   2. 在 CloudBase 控制台 → 云函数 → seed → 测试/手动调用
 *   3. 确认种子数据插入成功后，删除此云函数
 *
 * 包含数据：
 *   - 品类字典（categories）：7个一级 + 29个二级品类
 *   - 标签字典（tag_dictionary）：颜色/风格/季节/场景/花纹/厚度/状态
 * ============================================================
 */

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 品类字典种子数据
 * 格式适配 CloudBase 文档数据库（_id 自动生成）
 */
const CATEGORIES = [
  // ===== 一级品类 =====
  { name: '上衣',     parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 10 },
  { name: '下装',     parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 20 },
  { name: '连衣裙',   parent_id: null, level: 1, season_suitability: ['春','夏','秋'],      weather_suitability: { min: 10, max: 38 }, sort_order: 30 },
  { name: '外套',     parent_id: null, level: 1, season_suitability: ['春','秋','冬'],      weather_suitability: { min: -10,max: 25 }, sort_order: 40 },
  { name: '鞋',       parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 50 },
  { name: '包',       parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 60 },
  { name: '配饰',     parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 70 },
  { name: '其他',     parent_id: null, level: 1, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 90 },
];

// 二级品类（parent_id 在运行时关联一级品类 _id）
const CATEGORIES_L2 = [
  // 上衣
  { name: 'T恤',      parent_name: '上衣', level: 2, season_suitability: ['春','夏','秋'],      weather_suitability: { min: 15, max: 38 }, sort_order: 11 },
  { name: '衬衫',     parent_name: '上衣', level: 2, season_suitability: ['春','夏','秋'],      weather_suitability: { min: 10, max: 35 }, sort_order: 12 },
  { name: '卫衣',     parent_name: '上衣', level: 2, season_suitability: ['春','秋','冬'],      weather_suitability: { min: 0,  max: 25 }, sort_order: 13 },
  { name: '针织衫',   parent_name: '上衣', level: 2, season_suitability: ['春','秋','冬'],      weather_suitability: { min: 5,  max: 25 }, sort_order: 14 },
  { name: '毛衣',     parent_name: '上衣', level: 2, season_suitability: ['秋','冬'],           weather_suitability: { min: -5, max: 20 }, sort_order: 15 },
  { name: '背心',     parent_name: '上衣', level: 2, season_suitability: ['夏'],                weather_suitability: { min: 20, max: 40 }, sort_order: 16 },
  // 下装
  { name: '牛仔裤',   parent_name: '下装', level: 2, season_suitability: ['春','秋','冬'],      weather_suitability: { min: 0,  max: 30 }, sort_order: 21 },
  { name: '休闲裤',   parent_name: '下装', level: 2, season_suitability: ['春','秋'],           weather_suitability: { min: 5,  max: 30 }, sort_order: 22 },
  { name: '西裤',     parent_name: '下装', level: 2, season_suitability: ['春','秋','冬'],      weather_suitability: { min: 0,  max: 28 }, sort_order: 23 },
  { name: '短裤',     parent_name: '下装', level: 2, season_suitability: ['夏'],                weather_suitability: { min: 20, max: 40 }, sort_order: 24 },
  { name: '半身裙',   parent_name: '下装', level: 2, season_suitability: ['春','夏','秋'],      weather_suitability: { min: 10, max: 35 }, sort_order: 25 },
  { name: '长裙',     parent_name: '下装', level: 2, season_suitability: ['春','夏','秋'],      weather_suitability: { min: 15, max: 35 }, sort_order: 26 },
  { name: '短裙',     parent_name: '下装', level: 2, season_suitability: ['夏'],                weather_suitability: { min: 20, max: 38 }, sort_order: 27 },
  // 连衣裙
  { name: '连衣长裙', parent_name: '连衣裙', level: 2, season_suitability: ['春','夏','秋'],    weather_suitability: { min: 15, max: 35 }, sort_order: 31 },
  { name: '连衣短裙', parent_name: '连衣裙', level: 2, season_suitability: ['夏'],              weather_suitability: { min: 20, max: 38 }, sort_order: 32 },
  // 外套
  { name: '风衣',     parent_name: '外套', level: 2, season_suitability: ['春','秋'],           weather_suitability: { min: 5,  max: 25 }, sort_order: 41 },
  { name: '夹克',     parent_name: '外套', level: 2, season_suitability: ['春','秋'],           weather_suitability: { min: 5,  max: 25 }, sort_order: 42 },
  { name: '西装',     parent_name: '外套', level: 2, season_suitability: ['春','秋','冬'],      weather_suitability: { min: 0,  max: 25 }, sort_order: 43 },
  { name: '羽绒服',   parent_name: '外套', level: 2, season_suitability: ['冬'],                weather_suitability: { min: -15,max: 10 }, sort_order: 44 },
  { name: '大衣',     parent_name: '外套', level: 2, season_suitability: ['秋','冬'],           weather_suitability: { min: -10,max: 15 }, sort_order: 45 },
  // 鞋
  { name: '运动鞋',   parent_name: '鞋',   level: 2, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 51 },
  { name: '皮鞋',     parent_name: '鞋',   level: 2, season_suitability: ['春','秋','冬'],      weather_suitability: { min: 0,  max: 30 }, sort_order: 52 },
  { name: '靴子',     parent_name: '鞋',   level: 2, season_suitability: ['秋','冬'],           weather_suitability: { min: -15,max: 15 }, sort_order: 53 },
  { name: '凉鞋',     parent_name: '鞋',   level: 2, season_suitability: ['夏'],                weather_suitability: { min: 20, max: 40 }, sort_order: 54 },
  { name: '帆布鞋',   parent_name: '鞋',   level: 2, season_suitability: ['春','夏','秋'],      weather_suitability: { min: 10, max: 35 }, sort_order: 55 },
  // 包
  { name: '手拎包',   parent_name: '包',   level: 2, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 61 },
  { name: '斜挎包',   parent_name: '包',   level: 2, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 62 },
  { name: '双肩包',   parent_name: '包',   level: 2, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 63 },
  // 配饰
  { name: '项链',     parent_name: '配饰', level: 2, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 71 },
  { name: '耳环',     parent_name: '配饰', level: 2, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 72 },
  { name: '手表',     parent_name: '配饰', level: 2, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 73 },
  { name: '帽子',     parent_name: '配饰', level: 2, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 74 },
  { name: '围巾',     parent_name: '配饰', level: 2, season_suitability: ['秋','冬'],           weather_suitability: { min: -10,max: 15 }, sort_order: 75 },
  { name: '腰带',     parent_name: '配饰', level: 2, season_suitability: ['春','夏','秋','冬'], weather_suitability: { min: 0,  max: 40 }, sort_order: 76 },
];

/**
 * 标签字典种子数据
 */
const TAG_DICTIONARY = [
  // 颜色 (12)
  { tag_type: 'color', tag_name: '黑色', aliases: ['黑色','black','黑'],           normalized_name: '黑色', sort_order: 1 },
  { tag_type: 'color', tag_name: '白色', aliases: ['白色','white','白'],           normalized_name: '白色', sort_order: 2 },
  { tag_type: 'color', tag_name: '灰色', aliases: ['灰色','gray','灰'],           normalized_name: '灰色', sort_order: 3 },
  { tag_type: 'color', tag_name: '米色', aliases: ['米色','beige','卡其色','杏色'],normalized_name: '米色', sort_order: 4 },
  { tag_type: 'color', tag_name: '棕色', aliases: ['棕色','brown','咖啡色','驼色'],normalized_name: '棕色', sort_order: 5 },
  { tag_type: 'color', tag_name: '红色', aliases: ['红色','red','红'],             normalized_name: '红色', sort_order: 6 },
  { tag_type: 'color', tag_name: '粉色', aliases: ['粉色','pink','粉'],             normalized_name: '粉色', sort_order: 7 },
  { tag_type: 'color', tag_name: '橙色', aliases: ['橙色','orange','橘色'],        normalized_name: '橙色', sort_order: 8 },
  { tag_type: 'color', tag_name: '黄色', aliases: ['黄色','yellow','黄'],           normalized_name: '黄色', sort_order: 9 },
  { tag_type: 'color', tag_name: '绿色', aliases: ['绿色','green','绿'],           normalized_name: '绿色', sort_order: 10 },
  { tag_type: 'color', tag_name: '蓝色', aliases: ['蓝色','blue','蓝'],           normalized_name: '蓝色', sort_order: 11 },
  { tag_type: 'color', tag_name: '紫色', aliases: ['紫色','purple','紫'],          normalized_name: '紫色', sort_order: 12 },
  // 季节 (4)
  { tag_type: 'season', tag_name: '春', aliases: ['春','春天','spring'], normalized_name: '春', sort_order: 1 },
  { tag_type: 'season', tag_name: '夏', aliases: ['夏','夏天','summer'], normalized_name: '夏', sort_order: 2 },
  { tag_type: 'season', tag_name: '秋', aliases: ['秋','秋天','autumn','fall'], normalized_name: '秋', sort_order: 3 },
  { tag_type: 'season', tag_name: '冬', aliases: ['冬','冬天','winter'], normalized_name: '冬', sort_order: 4 },
  // 场景 (7)
  { tag_type: 'scenario', tag_name: '通勤', aliases: ['通勤','上班','工作','职场'],   normalized_name: '通勤', sort_order: 1 },
  { tag_type: 'scenario', tag_name: '休闲', aliases: ['休闲','日常','逛街','周末'],   normalized_name: '休闲', sort_order: 2 },
  { tag_type: 'scenario', tag_name: '运动', aliases: ['运动','健身','跑步','户外'],   normalized_name: '运动', sort_order: 3 },
  { tag_type: 'scenario', tag_name: '正式', aliases: ['正式','商务','会议','面试'],   normalized_name: '正式', sort_order: 4 },
  { tag_type: 'scenario', tag_name: '约会', aliases: ['约会','date','聚餐'],         normalized_name: '约会', sort_order: 5 },
  { tag_type: 'scenario', tag_name: '聚会', aliases: ['聚会','派对','party'],        normalized_name: '聚会', sort_order: 6 },
  { tag_type: 'scenario', tag_name: '旅行', aliases: ['旅行','旅游','出差','出行'],   normalized_name: '旅行', sort_order: 7 },
  // 风格 (10)
  { tag_type: 'style', tag_name: '简约', aliases: ['简约','极简','minimalist','cleanfit'],  normalized_name: '简约', sort_order: 1 },
  { tag_type: 'style', tag_name: '通勤', aliases: ['通勤','职场','office'],                  normalized_name: '通勤', sort_order: 2 },
  { tag_type: 'style', tag_name: '休闲', aliases: ['休闲','casual','日常'],                  normalized_name: '休闲', sort_order: 3 },
  { tag_type: 'style', tag_name: '甜美', aliases: ['甜美','甜系','girly'],                   normalized_name: '甜美', sort_order: 4 },
  { tag_type: 'style', tag_name: '运动', aliases: ['运动','sporty','athleisure'],            normalized_name: '运动', sort_order: 5 },
  { tag_type: 'style', tag_name: '街头', aliases: ['街头','streetwear','潮牌'],              normalized_name: '街头', sort_order: 6 },
  { tag_type: 'style', tag_name: '复古', aliases: ['复古','vintage','retro'],               normalized_name: '复古', sort_order: 7 },
  { tag_type: 'style', tag_name: '韩系', aliases: ['韩系','韩风','korean'],                  normalized_name: '韩系', sort_order: 8 },
  { tag_type: 'style', tag_name: '日系', aliases: ['日系','日风','japanese'],                normalized_name: '日系', sort_order: 9 },
  { tag_type: 'style', tag_name: '法式', aliases: ['法式','法风','french','巴黎'],           normalized_name: '法式', sort_order: 10 },
  // 花纹 (6)
  { tag_type: 'pattern', tag_name: '纯色', aliases: ['纯色','单色','净色','solid'],     normalized_name: '纯色', sort_order: 1 },
  { tag_type: 'pattern', tag_name: '条纹', aliases: ['条纹','横条','竖条','stripe'],     normalized_name: '条纹', sort_order: 2 },
  { tag_type: 'pattern', tag_name: '格纹', aliases: ['格纹','格子','方格','plaid'],      normalized_name: '格纹', sort_order: 3 },
  { tag_type: 'pattern', tag_name: '印花', aliases: ['印花','图案','碎花','print'],      normalized_name: '印花', sort_order: 4 },
  { tag_type: 'pattern', tag_name: '拼接', aliases: ['拼接','拼色','拼贴'],              normalized_name: '拼接', sort_order: 5 },
  { tag_type: 'pattern', tag_name: '其他', aliases: ['其他','other'],                   normalized_name: '其他', sort_order: 6 },
  // 厚度 (3)
  { tag_type: 'thickness', tag_name: '薄', aliases: ['薄','薄款','轻薄','light'],   normalized_name: '薄', sort_order: 1 },
  { tag_type: 'thickness', tag_name: '中', aliases: ['中','中等','适中','medium'],  normalized_name: '中', sort_order: 2 },
  { tag_type: 'thickness', tag_name: '厚', aliases: ['厚','厚款','加厚','heavy'],   normalized_name: '厚', sort_order: 3 },
  // 衣物状态 (4)
  { tag_type: 'status', tag_name: '正常', aliases: ['正常','在穿','active'],       normalized_name: '正常', sort_order: 1 },
  { tag_type: 'status', tag_name: '洗涤中', aliases: ['洗涤中','清洗中','washing'], normalized_name: '洗涤中', sort_order: 2 },
  { tag_type: 'status', tag_name: '闲置', aliases: ['闲置','不常穿','inactive'],    normalized_name: '闲置', sort_order: 3 },
  { tag_type: 'status', tag_name: '淘汰', aliases: ['淘汰','不要了','discarded'],   normalized_name: '淘汰', sort_order: 4 },
];

/**
 * 主函数 - 执行种子数据导入
 */
exports.main = async (event, context) => {
  const mode = event.mode || 'insert'; // insert | reset | check
  const results = {};

  try {
    // 1. 品类字典
    console.log('[seed] === 品类字典 ===');
    results.categories = await seedCategories(mode);

    // 2. 标签字典
    console.log('[seed] === 标签字典 ===');
    results.tagDictionary = await seedTagDictionary(mode);

    // 3. 统计
    const { total: catCount } = await db.collection('categories').count();
    const { total: tagCount } = await db.collection('tag_dictionary').count();
    results.summary = {
      categoriesCount: catCount,
      tagDictionaryCount: tagCount,
      mode: mode
    };

    console.log('[seed] === 种子数据导入完成 ===');
    console.log(JSON.stringify(results.summary));

    return {
      code: 0,
      message: '种子数据导入完成',
      data: results
    };

  } catch (err) {
    console.error('[seed] 错误:', err);
    return {
      code: 2001,
      message: `种子数据导入失败: ${err.message}`,
      data: null
    };
  }
};

/**
 * 插入品类字典种子数据
 */
async function seedCategories(mode) {
  const collection = db.collection('categories');

  // 检查现有数据
  const { total } = await collection.count();
  if (total > 0 && mode === 'insert') {
    return { skipped: true, message: `品类字典已存在 ${total} 条记录，跳过插入（使用 mode=reset 重置）` };
  }

  if (mode === 'reset') {
    console.log('[seed] 清理现有品类数据...');
    const existing = await collection.get();
    for (const doc of existing.data) {
      await collection.doc(doc._id).remove();
    }
  }

  // 第一步：插入一级品类
  console.log('[seed] 插入一级品类...');
  const l1Ids = {};
  for (const cat of CATEGORIES) {
    const { _id } = await collection.add({ data: cat });
    l1Ids[cat.name] = _id;
    console.log(`  ✓ 一级品类: ${cat.name} (${_id})`);
  }

  // 第二步：插入二级品类（关联 parent_id）
  console.log('[seed] 插入二级品类...');
  let l2Count = 0;
  for (const cat of CATEGORIES_L2) {
    const parentId = l1Ids[cat.parent_name];
    if (!parentId) {
      console.warn(`  ⚠ 找不到父品类 "${cat.parent_name}"，跳过 ${cat.name}`);
      continue;
    }
    const { _id } = await collection.add({
      data: {
        name: cat.name,
        parent_id: parentId,
        level: cat.level,
        season_suitability: cat.season_suitability,
        weather_suitability: cat.weather_suitability,
        sort_order: cat.sort_order
      }
    });
    l2Count++;
    console.log(`  ✓ 二级品类: ${cat.parent_name} > ${cat.name} (${_id})`);
  }

  return {
    inserted: true,
    l1Count: Object.keys(l1Ids).length,
    l2Count: l2Count
  };
}

/**
 * 插入标签字典种子数据
 */
async function seedTagDictionary(mode) {
  const collection = db.collection('tag_dictionary');

  // 检查现有数据
  const { total } = await collection.count();
  if (total > 0 && mode === 'insert') {
    return { skipped: true, message: `标签字典已存在 ${total} 条记录，跳过插入（使用 mode=reset 重置）` };
  }

  if (mode === 'reset') {
    console.log('[seed] 清理现有标签数据...');
    const existing = await collection.get();
    for (const doc of existing.data) {
      await collection.doc(doc._id).remove();
    }
  }

  console.log(`[seed] 插入 ${TAG_DICTIONARY.length} 条标签...`);
  let count = 0;
  // 批量插入（CloudBase 每次 add 一条，顺序执行）
  for (const tag of TAG_DICTIONARY) {
    await collection.add({ data: tag });
    count++;
  }
  console.log(`  ✓ 已插入 ${count} 条标签`);

  return { inserted: true, count };
}
