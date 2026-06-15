/**
 * ============================================================
 * CloudBase 云函数: upload
 *
 * 功能: 图片上传签名/预处理
 * 触发: POST /api/v1/wardrobe/upload
 *
 * 设计原则（架构师 MUL-5 建议）：
 *   1. 上传即压缩（最大边 1024px）
 *   2. EXIF 数据剥离（含 GPS 位置等敏感信息）
 *   3. 生成三级图片：原图 / 中图(AI识别) / 缩略图(列表)
 *   4. 图片存 CloudBase 云存储，数据库只存 fileID
 *   5. 预签名 URL 访问，防图片链接外泄
 * ============================================================
 */

const cloud = require('wx-server-sdk');
const jwt = require('jsonwebtoken');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const JWT_SECRET = process.env.JWT_SECRET || 'electronic-wardrobe-jwt-secret-2026';

/**
 * 主函数
 * 注意：HTTP 访问服务路由 /api/v1/wardrobe/upload → upload
 * 此时 event.path = /（函数层去掉了前缀路径）
 */
exports.main = async (event, context) => {
  // 不走 JWT 鉴权验证时先处理 /_debug
  if (event.httpMethod === 'GET' && (event.path === '/_debug' || event.path === '/api/v1/debug')) {
    return { code: 0, message: 'success', data: { path: event.path, keys: Object.keys(event) } };
  }

  // 只要方法是 POST 就接受（因为路由已经由 HTTP 访问服务匹配到了 upload 函数）
  if (event.httpMethod === 'POST') {
    const userId = getUserId(event);
    if (!userId) return { code: 1002, message: '未登录或Token已过期', data: null };
    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    return handleUpload(userId, body);
  }

  return { code: 404, message: 'Not Found', data: null };
};

/**
 * POST /wardrobe/upload - 获取上传凭证
 */
async function handleUpload(userId, body) {
  const { fileName, ext } = body || {};

  if (!fileName) return { code: 1001, message: '缺少 fileName', data: null };

  // 校验扩展名
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const fileExt = (ext || fileName.split('.').pop() || 'jpg').toLowerCase();
  if (!allowedExts.includes(fileExt)) {
    return { code: 1001, message: `不支持的图片格式: ${fileExt}`, data: null };
  }

  // 生成云存储路径（按用户分目录，防冲突）
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const cloudPath = `wardrobe-images/user_${userId}/${timestamp}-${random}.${fileExt}`;

  return {
    code: 0,
    message: 'success',
    data: { cloudPath, fileName, ext: fileExt, note: '使用 Taro.cloud.uploadFile({ cloudPath, filePath }) 直传云存储' }
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
