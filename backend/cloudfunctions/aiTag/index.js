/**
 * ============================================================
 * CloudBase 云函数: aiTag
 *
 * 功能: AI 标签识别（预留接口）
 * 触发: POST /api/v1/ai/tag-item
 *
 * MVP 阶段不做 AI 集成，返回空结果。
 * 后期接入：
 *   1. 图像识别 API（腾讯云图像分析 / 百度AI服装识别）
 *   2. 标签归一化（映射到 tag_dictionary）
 *   3. 结果写入 wardrobe_items.ai_tags + 提示用户确认
 *
 * 集成要点（架构师 MUL-5 建议）：
 *   - AI 调用仅使用压缩图（最大边1024px），不传原图
 *   - 结果含 confidence（置信度），方便前端展示
 *   - AI 调用失败不阻塞用户流程："待补充标签"状态
 *   - 设置日调用量告警和自动降级
 * ============================================================
 */

const cloud = require('wx-server-sdk');
const jwt = require('jsonwebtoken');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const JWT_SECRET = process.env.JWT_SECRET || 'electronic-wardrobe-jwt-secret-2026';

/**
 * 主函数
 * 注意：HTTP 访问服务路由 /api/v1/ai/tag-item → aiTag
 * 此时 event.path = /（函数层去掉了前缀路径）
 */
exports.main = async (event, context) => {
  // 只要方法是 POST 就接受（路由已由 HTTP 访问服务匹配）
  if (event.httpMethod === 'POST') {
    const userId = getUserId(event);
    if (!userId) return { code: 1002, message: '未登录或Token已过期', data: null };
    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    return handleTagItem(userId, body);
  }

  return { code: 404, message: 'Not Found', data: null };
};

/**
 * POST /ai/tag-item - 触发AI识别标签
 */
async function handleTagItem(userId, body) {
  const { itemId } = body || {};

  if (!itemId) return { code: 1001, message: '缺少 itemId', data: null };

  // 校验衣物存在
  const { data: items } = await db.collection('wardrobe_items')
    .where({ _id: itemId, user_id: userId, is_deleted: 0 })
    .get();

  if (items.length === 0) return { code: 1004, message: '衣物不存在', data: null };

  const item = items[0];

  // 检查是否有压缩图（AI 识别用）
  const imageUrl = item.compressed_url || item.image_url;
  if (!imageUrl) return { code: 1001, message: '衣物没有关联图片', data: null };

  // ============================================================
  // TODO: 接入 AI 图像识别
  // ============================================================

  return {
    code: 0,
    message: 'success',
    data: {
      itemId,
      taskId: generateUUID(),
      status: 'pending',
      note: 'AI 识别暂未接入，当前版本请手动填写标签。以下是基于品类字典的建议标签：',
      suggestions: {
        category: item.category_id,
        colors: ['黑色', '白色'],
        scenarios: ['通勤', '休闲'],
        styles: ['简约']
      }
    }
  };
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
