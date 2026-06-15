# 微信小程序登录授权接口文档

> 模块：`auth`
> 路径前缀：`/api/v1/auth`
> 基础响应：`ApiResponse<T> { code, message, data, timestamp }`，成功 `code = 0`。
> 鉴权：除 `POST /api/v1/auth/login` 外，所有接口需要请求头
> `Authorization: Bearer <token>`，由 `JwtInterceptor` 校验。

---

## 1. POST `/api/v1/auth/login`  微信 code 换取 token

### 描述
小程序端使用 `wx.login` 拿到 `code` 后调用此接口，后端调用微信
`jscode2session` 换取 `openid`，查找或创建用户并签发 JWT。**幂等**：
同一 `openid` 重复登录只会复用既有用户记录，不会创建重复用户。

### 请求
```
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "code": "0a3T4w0w3xxxxxxx",
  "userInfo": {
    "nickname": "小明",
    "avatarUrl": "https://thirdwx.qlogo.cn/xxx.png"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | `wx.login()` 返回的 code，5 分钟有效 |
| userInfo.nickname | string | 否 | 用户昵称（小程序授权获取） |
| userInfo.avatarUrl | string | 否 | 头像 URL |

### 响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "expiresIn": 604800,
    "user": {
      "id": 123,
      "nickname": "小明",
      "avatarUrl": "https://thirdwx.qlogo.cn/xxx.png",
      "phone": null,
      "hasPhone": false,
      "stylePreferences": "[]",
      "commonScenarios": "[]",
      "city": null,
      "isNewUser": true
    }
  },
  "timestamp": 1717920000000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | 访问令牌，有效期 7 天 |
| refreshToken | string | 刷新令牌，有效期 30 天 |
| expiresIn | int | token 有效秒数 |
| user.id | long | 系统内部用户 ID |
| user.hasPhone | bool | 是否已绑定手机号 |
| user.phone | string | 已脱敏的手机号（`138****1234`），未绑定时为 null |
| user.isNewUser | bool | 是否首次登录创建 |

### 错误码
| code | message | 说明 |
|------|---------|------|
| 1001 | 缺少微信登录code | 请求参数校验失败 |
| 2003 | 微信登录失败：xxx | jscode2session 失败、code 已用 / 过期 |

---

## 2. POST `/api/v1/auth/phone`  手机号授权绑定

### 描述
小程序前端通过 `<button open-type="getPhoneNumber">` 拿到 `code` 后调用，
后端使用 `access_token` 调用 `wxa/business/getuserphonenumber` 接口换取
手机号并绑定到当前用户。**需登录**（JWT 校验）。

`access_token` 通过 Redis 缓存（key: `wechat:access_token`，TTL 7000s），
失效（errcode 40001/42001/40014）时自动清理重拉。

### 请求
```
POST /api/v1/auth/phone
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "code": "e4c6e84xxxxxx"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | `getPhoneNumber` 回调中的 dynamic code，5 分钟有效，仅可消费一次 |

### 响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "phone": "13812345678",
    "countryCode": "+86",
    "user": {
      "id": 123,
      "nickname": "小明",
      "avatarUrl": "...",
      "phone": "138****5678",
      "hasPhone": true,
      "stylePreferences": "[]",
      "commonScenarios": "[]",
      "city": null,
      "isNewUser": false
    }
  },
  "timestamp": 1717920000000
}
```

> 注意：返回顶层 `phone` 为完整手机号（前端可即时回填表单），
> `user.phone` 为已脱敏版本，便于持久化展示。

### 错误码
| code | message | 说明 |
|------|---------|------|
| 1001 | 缺少手机号授权code | 请求参数校验失败 |
| 1002 | 未登录或Token已过期 | 未携带 / 校验失败的 JWT |
| 1002 | 用户不存在或已禁用 | userId 对应用户已被禁用 |
| 2003 | 手机号获取失败：xxx | 微信接口返回错误 |
| 2003 | 微信服务暂不可用 | access_token 拉取失败 |

---

## 3. GET `/api/v1/auth/profile`  获取当前用户信息

### 描述
返回当前 JWT 对应用户的完整 Profile（已脱敏手机号）。需登录。

### 请求
```
GET /api/v1/auth/profile
Authorization: Bearer <token>
```

### 响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 123,
    "nickname": "小明",
    "avatarUrl": "https://thirdwx.qlogo.cn/xxx.png",
    "phone": "138****5678",
    "hasPhone": true,
    "stylePreferences": "[]",
    "commonScenarios": "[]",
    "city": null,
    "isNewUser": false
  },
  "timestamp": 1717920000000
}
```

### 错误码
| code | message | 说明 |
|------|---------|------|
| 1002 | 未登录或Token已过期 | 未携带 / 校验失败的 JWT |
| 1002 | 用户不存在或已禁用 | 当前 userId 不存在或被禁用 |

---

## 4. JWT 拦截器 & 白名单

`JwtInterceptor` 注册到 `/api/v1/**`，白名单：
- `/api/v1/auth/login`
- `/api/v1/categories`
- `/api/v1/tags`

其他接口要求请求头：
```
Authorization: Bearer <access_token>
```

非法 / 缺失 / 过期均返回：
```json
{ "code": 1002, "message": "未登录或Token已过期" }
```

JWT 由 `JwtUtils` 签发（HMAC-SHA256），claims：`userId`, `openid`，
通过 `WechatConfig` / `jwt.*` 配置注入。

---

## 5. 配置项

`application.yml`：
```yaml
jwt:
  secret: ${JWT_SECRET:electronic-wardrobe-jwt-secret-2026-min-len-32!!}
  expiration: 604800           # access token 7 天
  refresh-expiration: 2592000  # refresh token 30 天

wechat:
  miniapp:
    app-id: ${WECHAT_APP_ID:wx13f5887a942ac750}
    app-secret: ${WECHAT_APP_SECRET:}    # 强制走环境变量，禁止硬编码
```

> **AppSecret 不允许在代码中出现明文**，所有环境（dev / test / prod）都通过
> 环境变量或外部 secret manager 注入。

---

## 6. 数据库迁移

| 版本 | 文件 | 说明 |
|------|------|------|
| V1 | `V1__init_schema.sql` | `users` 表初始化（含 `openid` 唯一索引） |
| V3 | `V3__add_user_phone.sql` | 新增 `phone`/`country_code`/`phone_bind_at` 字段，加 `idx_phone` 索引 |

`users.openid` 是 `UNIQUE KEY`，保证登录幂等。

---

## 7. 验收对照

| 验收点 | 落地 |
|--------|------|
| jscode2session 调用正确 | `AuthService.login` 走 `https://api.weixin.qq.com/sns/jscode2session`，errcode != 0 抛 2003 |
| openid 唯一索引 | `V1__init_schema.sql` `UNIQUE KEY uk_openid` |
| JWT 签发 / 验证 / 刷新链路 | `JwtUtils.generateToken` / `generateRefreshToken` / `validateToken`，由 `JwtInterceptor` 统一校验 |
| 未授权请求返回 401 语义 | `BusinessException.unauthorized` → `code=1002` |
| 手机号接口需先登录 | `JwtInterceptor` 默认拦截 `/api/v1/**`，仅白名单豁免 |
| AppSecret 不暴露 | `WechatConfig` 走 `@ConfigurationProperties`，敏感值由环境变量注入 |
| 接口幂等 | `users.openid` 唯一 + `selectByOpenid` 已存在分支只 update，不重复 insert |
