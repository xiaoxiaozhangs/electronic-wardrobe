/**
 * ============================================================
 * CloudBase 云函数: auth
 *
 * 功能: 微信登录，换取 JWT Token
 * 触发: HTTP POST /api/v1/auth/login
 * 鉴权: 无（开放接口，通过微信 code 换取身份）
 * ============================================================
 */

const cloud = require('wx-server-sdk');
const jwt = require('jsonwebtoken');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// JWT 密钥（生产环境用环境变量或 CloudBase 密钥管理）
const JWT_SECRET = process.env.JWT_SECRET || 'electronic-wardrobe-jwt-secret-2026';
const JWT_EXPIRES = 7 * 24 * 60 * 60; // 7 天
const WX_APPID = 'wx13f5887a942ac750';
const WX_SECRET = process.env.WX_APP_SECRET || 'your-app-secret-here';

/**
 * 限流检查（简单内存计数器，生产换 Redis）
 */
const rateLimit = (() => {
  const store = new Map();
  const WINDOW = 60_000; // 1分钟窗口
  const MAX = 10;        // 最大10次

  return {
    check(ip) {
      const now = Date.now();
      const entry = store.get(ip);
      if (!entry || now - entry.start > WINDOW) {
        store.set(ip, { start: now, count: 1 });
        return true;
      }
      entry.count++;
      return entry.count <= MAX;
    }
  };
})();

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { httpMethod, path, body } = parseRequest(event);

  // 路由（兼容带/不带api/v1前缀，兼容HTTP Access Service事件格式）
  const normalizedPath = path.replace(/^\/api\/v1/, '').replace(/^\/+/, '/') || '/';

  // Debug: return event info to understand the format
  if (httpMethod === 'GET' && normalizedPath === '/debug') {
    return success({ httpMethod, path, normalizedPath, keys: Object.keys(event) });
  }

  if (httpMethod === 'POST' && (normalizedPath === '/auth/login' || normalizedPath === '/')) {
    return handleLogin(event, body);
  }

  return fail(404, `Not Found: ${httpMethod} ${path} (normalized: ${normalizedPath})`);
};

/**
 * POST /auth/login - 微信登录
 */
async function handleLogin(event, body) {
  // 参数校验
  const { code, userInfo } = body || {};
  if (!code) {
    return fail(1001, '缺少微信登录 code');
  }

  // 限流
  const clientIP = event.userInfo?.clientIP || 'unknown';
  if (!rateLimit.check(clientIP)) {
    return fail(1006, '登录请求过于频繁，请稍后再试');
  }

  try {
    // 1. 调用微信接口换取 openid
    const wxRes = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: WX_APPID,
        secret: WX_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    const { openid, session_key, unionid, errcode, errmsg } = wxRes.data;
    if (errcode) {
      console.error('微信登录失败:', errcode, errmsg);
      return fail(2003, `微信登录失败: ${errmsg}`);
    }

    // 2. 查用户表
    const users = db.collection('users');
    const { data: existingUsers } = await users.where({ openid }).get();
    let userId, isNewUser = false;

    if (existingUsers.length === 0) {
      // 新用户 → 创建
      const { _id } = await users.add({
        data: {
          openid,
          unionid: unionid || null,
          nickname: userInfo?.nickname || null,
          avatar_url: userInfo?.avatarUrl || null,
          style_preferences: [],
          common_scenarios: [],
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      userId = _id;
      isNewUser = true;
    } else {
      // 老用户 → 更新资料
      userId = existingUsers[0]._id;
      const updates = { updated_at: new Date() };
      if (userInfo?.nickname) updates.nickname = userInfo.nickname;
      if (userInfo?.avatarUrl) updates.avatar_url = userInfo.avatarUrl;
      await users.doc(userId).update({ data: updates });
    }

    // 3. 签发 JWT
    const token = jwt.sign(
      { userId, openid },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    const refreshToken = jwt.sign(
      { userId, openid, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: 30 * 24 * 60 * 60 } // 30天
    );

    // 4. 返回
    const user = existingUsers[0] || { _id: userId, openid };
    return success({
      token,
      refreshToken,
      expiresIn: JWT_EXPIRES,
      user: {
        id: userId,
        nickname: user.nickname || userInfo?.nickname || null,
        avatarUrl: user.avatar_url || userInfo?.avatarUrl || null,
        stylePreferences: user.style_preferences || [],
        commonScenarios: user.common_scenarios || [],
        isNewUser
      }
    });

  } catch (err) {
    console.error('auth/login error:', err);
    return fail(2001, '服务端错误');
  }
}

// ========== 工具函数 ==========

function parseRequest(event) {
  const realPath = event.requestContext?.path || event.path || '/';
  return {
    httpMethod: event.httpMethod || 'GET',
    path: realPath,
    body: typeof event.body === 'string' ? JSON.parse(event.body) : event.body,
    query: event.queryStringParameters || {}
  };
}

function success(data) {
  return { code: 0, message: 'success', data };
}

function fail(code, message) {
  return { code, message, data: null };
}
