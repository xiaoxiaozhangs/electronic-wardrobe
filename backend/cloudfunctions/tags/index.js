/**
 * CloudBase 云函数: tags
 * 功能: 标签字典（无需鉴权）
 * 触发: GET /api/v1/tags?type=color,style,season
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    const query = event.queryStringParameters || {};
    const types = query.type ? query.type.split(',') : null;

    let condition = {};
    if (types && types.length > 0) {
      condition.tag_type = _.in(types);
    }

    const { data: tags } = await db.collection('tag_dictionary')
      .where(condition)
      .orderBy('sort_order', 'asc')
      .get();

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

    return { code: 0, message: 'success', data: grouped };
  } catch (err) {
    console.error('tags error:', err);
    return { code: 2001, message: '服务端错误', data: null };
  }
};
