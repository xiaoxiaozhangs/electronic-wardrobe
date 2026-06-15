/**
 * CloudBase 云函数: categories
 * 功能: 品类字典（无需鉴权）
 * 触发: GET /api/v1/categories
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const { data: all } = await db.collection('categories')
      .orderBy('sort_order', 'asc')
      .get();

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

    return { code: 0, message: 'success', data: { categories: tree } };
  } catch (err) {
    console.error('categories error:', err);
    return { code: 2001, message: '服务端错误', data: null };
  }
};
