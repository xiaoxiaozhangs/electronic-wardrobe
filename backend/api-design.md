# 电子衣橱 - API 设计文档

**版本:** v1.0  
**作者:** 后端工程师  
**日期:** 2026-06-14  
**平台:** CloudBase 云函数（Node.js 运行时）  
**数据库:** CloudBase CDB MySQL 5.7+  
**鉴权:** 微信登录 → JWT（7天 + refresh）

---

## 1. 通用规范

### 1.1 基础 URL

```
https://<cloudbase-env>.service.tcloudbase.com/api/v1
```

### 1.2 请求头

| Header | 必须 | 说明 |
|--------|------|------|
| `Authorization` | 是（除登录接口） | `Bearer <jwt_token>` |
| `Content-Type` | 是 | `application/json` |
| `X-Request-ID` | 否 | 客户端生成的请求追踪ID |

### 1.3 通用响应结构

```json
{
  "code": 0,
  "message": "success",
  "data": { ... },
  "requestId": "uuid"
}
```

### 1.4 错误码

| code | HTTP状态 | 说明 |
|------|---------|------|
| 0 | 200 | 成功 |
| 1001 | 400 | 参数校验失败 |
| 1002 | 401 | 未登录/Token过期 |
| 1003 | 403 | 无权限 |
| 1004 | 404 | 资源不存在 |
| 1005 | 409 | 冲突（重复操作等） |
| 1006 | 429 | 请求频率超限 |
| 2001 | 500 | 服务端错误 |
| 2002 | 503 | AI服务不可用（已降级） |
| 2003 | 504 | 上游服务超时 |

### 1.5 分页规范

请求：
```json
{
  "page": 1,
  "pageSize": 20
}
```

响应 data 内：
```json
{
  "list": [...],
  "page": 1,
  "pageSize": 20,
  "total": 156,
  "totalPages": 8
}
```

### 1.6 鉴权说明

- **登录接口** (`/auth/login`)：不需要Token，使用微信 `code` 换取 JWT
- **所有业务接口**：必须在 Header 携带 `Authorization: Bearer <token>`
- JWT Payload 包含 `{ userId, openid, iat, exp }`
- Token 有效期 7 天，刷新后旧Token立即失效
- 云函数内部从 `event.userInfo.openId` 获取 openid 做数据隔离

### 1.7 限流策略

| 接口 | 限制 |
|------|------|
| `/auth/login` | 10次/分钟/IP |
| `/wardrobe/upload` | 30次/天/用户 |
| `/outfits/generate` | 30次/天/用户 |
| CRUD接口 | 100次/分钟/用户 |
| 查询接口 | 200次/分钟/用户 |

---

## 2. 接口列表

### 2.1 用户认证

#### POST /auth/login —— 微信登录

**说明:** 使用 wx.login() 获取的 code 换取服务端 JWT Token。

**请求：**
```json
{
  "code": "081xxxxxx",
  "userInfo": {
    "nickname": "张三",
    "avatarUrl": "https://..."
  }
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800,
    "user": {
      "id": 1,
      "nickname": "张三",
      "avatarUrl": "https://...",
      "stylePreferences": ["简约", "通勤"],
      "commonScenarios": ["通勤", "约会"],
      "isNewUser": false
    }
  }
}
```

**业务逻辑：**
1. 用 code 调微信 `jscode2session` 获取 openid + session_key
2. 根据 openid 查 users 表
3. 新用户 → INSERT 返回 `isNewUser: true`
4. 老用户 → UPDATE nickname/avatar（如传入）返回 `isNewUser: false`
5. 签发 JWT（userId + openid），有效期 7 天

---

### 2.2 品类字典

#### GET /categories —— 获取品类字典

**说明:** 返回完整品类树（一级 → 二级）。前端缓存 24h。

**请求：** 无参数

**响应：**
```json
{
  "code": 0,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "上衣",
        "level": 1,
        "children": [
          { "id": 9,  "name": "T恤",    "parentId": 1 },
          { "id": 10, "name": "衬衫",   "parentId": 1 },
          { "id": 11, "name": "卫衣",   "parentId": 1 }
        ]
      },
      { "id": 2, "name": "下装", "level": 1, "children": [...] }
    ]
  }
}
```

**缓存:** Redis `categories:tree` → 永不过期，管理端修改时主动失效。

---

### 2.3 标签字典

#### GET /tags —— 获取标签字典

**说明:** 按类型获取标签列表。前端缓存 1h。

**请求：**
```
GET /api/v1/tags?type=color,style,season
```

| 参数 | 必须 | 说明 |
|------|------|------|
| type | 否 | 逗号分隔的 tag_type。不传返回全部 |

**响应：**
```json
{
  "code": 0,
  "data": {
    "color": [
      { "id": 1, "name": "黑色", "aliases": ["black", "黑"] },
      { "id": 2, "name": "白色", "aliases": ["white", "白"] }
    ],
    "style": [
      { "id": 23, "name": "简约", "aliases": ["minimalist", "cleanfit"] }
    ],
    "season": [ ... ]
  }
}
```

---

### 2.4 衣物 CRUD

#### POST /wardrobe/upload —— 上传衣物图片

**说明:** 获取 CloudBase 云存储上传凭证，前端用该凭证直传图片到云存储。

**请求：**
```json
{
  "fileName": "wardrobe_123456.jpg",
  "ext": "jpg"
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "uploadToken": "...",
    "cloudPath": "wardrobe-images/user_1/1718300000-a3b2c1.jpg",
    "expiresIn": 3600
  }
}
```

**流程：**
1. 服务端生成唯一 cloudPath（按 user_id 分目录）
2. 返回 CloudBase uploadFile 所需参数
3. 客户端拿到凭证后直传云存储
4. 上传完成后客户端获得 fileID
5. 客户端调用 `POST /wardrobe` 携带 fileID 创建衣物记录

---

#### POST /wardrobe —— 创建衣物

**说明:** 创建衣物记录（图片已通过 /upload 上传）。

**请求：**
```json
{
  "imageFileId": "cloud://cloud1-xxx.xxx/wardrobe-images/user_1/a3b2c1.jpg",
  "thumbnailFileId": "cloud://cloud1-xxx.xxx/wardrobe-images/user_1/a3b2c1_thumb.jpg",
  "categoryId": 9,
  "primaryColor": "蓝色",
  "secondaryColors": ["白色"],
  "pattern": "条纹",
  "thickness": "薄",
  "seasons": ["春", "夏"],
  "scenarios": ["通勤", "休闲"],
  "styles": ["简约", "韩系"],
  "temperatureMin": 10,
  "temperatureMax": 30,
  "fabric": "纯棉",
  "brand": "优衣库",
  "purchaseDate": "2025-03-15",
  "note": "浅蓝白条纹"
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "id": 42,
    "imageFileId": "cloud://...",
    "categoryId": 9,
    "primaryColor": "蓝色",
    "createdAt": "2026-06-14T10:30:00Z"
  }
}
```

**校验规则：**
- `imageFileId` 必须是以 `cloud://` 开头的有效 fileID
- `categoryId` 必须在 categories 表中存在且 level=2
- `primaryColor` 必须在 tag_dictionary 中 tag_type='color' 存在

---

#### GET /wardrobe —— 获取衣橱列表

**说明:** 分页查询当前用户的衣物列表，支持多条件筛选。

**请求：**
```
GET /api/v1/wardrobe?page=1&pageSize=20&categoryId=9&primaryColor=蓝色&season=春&scenario=通勤&style=简约&status=正常&search=条纹&favoriteOnly=false&sortBy=createdAt&sortOrder=desc
```

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认1 |
| pageSize | int | 否 | 每页数，默认20，最大50 |
| categoryId | int | 否 | 二级品类ID |
| primaryColor | string | 否 | 主色 |
| season | string | 否 | 季节 |
| scenario | string | 否 | 场景 |
| style | string | 否 | 风格 |
| status | string | 否 | 状态: 正常/洗涤中/闲置/淘汰 |
| search | string | 否 | 模糊搜索（品牌/备注/品类名） |
| favoriteOnly | boolean | 否 | 仅收藏 |
| sortBy | string | 否 | 排序字段: createdAt/updatedAt/wearCount |
| sortOrder | string | 否 | asc/desc，默认desc |

**响应：**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 42,
        "imageUrl": "https://xxx.tcb.qcloud.la/...",
        "thumbnailUrl": "https://xxx.tcb.qcloud.la/..._thumb",
        "category": { "id": 9, "name": "T恤", "parentName": "上衣" },
        "primaryColor": "蓝色",
        "secondaryColors": ["白色"],
        "pattern": "条纹",
        "thickness": "薄",
        "seasons": ["春", "夏"],
        "scenarios": ["通勤", "休闲"],
        "styles": ["简约", "韩系"],
        "status": "正常",
        "isFavorite": true,
        "wearCount": 12,
        "lastWornAt": "2026-06-10T08:00:00Z",
        "createdAt": "2026-06-14T10:30:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**注意：**
- `imageUrl` 和 `thumbnailUrl` 返回的是**临时访问链接**（预签名URL，1小时有效），非原始 fileID
- 每次查询时通过 `getTempFileURL` 转换，保护原图不被外泄

---

#### GET /wardrobe/{id} —— 获取衣物详情

**请求：** id=42

**响应：** 同列表项的完整字段，外加：
```json
{
  "code": 0,
  "data": {
    "id": 42,
    "imageUrl": "https://...",
    "thumbnailUrl": "https://...",
    "compressedUrl": "https://...",
    "category": { "id": 9, "name": "T恤", "parentId": 1, "parentName": "上衣" },
    "primaryColor": "蓝色",
    "secondaryColors": ["白色"],
    "pattern": "条纹",
    "fabric": "纯棉",
    "thickness": "薄",
    "seasons": ["春", "夏"],
    "scenarios": ["通勤", "休闲"],
    "styles": ["简约", "韩系"],
    "temperatureMin": 10,
    "temperatureMax": 30,
    "status": "正常",
    "isFavorite": true,
    "aiTags": {
      "category": "上衣/T恤",
      "colors": ["蓝", "白"],
      "confidence": 0.92
    },
    "manualEdited": true,
    "brand": "优衣库",
    "purchaseDate": "2025-03-15",
    "note": "浅蓝白条纹",
    "wearCount": 12,
    "lastWornAt": "2026-06-10T08:00:00Z",
    "createdAt": "2026-06-14T10:30:00Z",
    "updatedAt": "2026-06-14T10:30:00Z"
  }
}
```

---

#### PUT /wardrobe/{id} —— 编辑衣物

**说明:** 全量更新衣物信息。只传需要修改的字段即可（PATCH 语义，但用 PUT 以保持 REST 简洁）。

**请求：**
```json
{
  "categoryId": 10,
  "primaryColor": "白色",
  "status": "闲置",
  "note": "领口有点发黄了"
}
```

**幂等性:** 使用 `updatedAt` 做乐观锁。请求可携带 `expectedVersion`（即上次读取的 `updatedAt`），不一致时返回 409。

**响应：**
```json
{
  "code": 0,
  "data": {
    "id": 42,
    "updatedAt": "2026-06-14T11:00:00Z"
  }
}
```

---

#### DELETE /wardrobe/{id} —— 删除衣物

**说明:** 软删除。衣物标记为 `is_deleted=1`，不再出现在列表和搭配结果中。云存储图片保留 30 天后再清理。

**响应：**
```json
{
  "code": 0,
  "data": { "deleted": true }
}
```

---

#### POST /wardrobe/batch-delete —— 批量删除

**说明:** 一次性软删除多件衣物。

**请求：**
```json
{
  "ids": [42, 43, 44]
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "deletedCount": 3,
    "failedIds": []
  }
}
```

---

### 2.5 智能搭配

#### POST /outfits/generate —— 生成搭配（异步）

**说明:** 提交搭配生成任务，立即返回 task_id。客户端轮询获取结果。

**请求：**
```json
{
  "scenario": "通勤",
  "season": "春",
  "style": "简约",
  "temperature": 22,
  "weather": "晴",
  "mustIncludeItemId": null,
  "excludeItemIds": [],
  "count": 4
}
```

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| scenario | string | 是 | 通勤/休闲/运动/正式/约会/聚会/旅行 |
| season | string | 否 | 春/夏/秋/冬。不传则根据温度自动判断 |
| style | string | 否 | 风格，不传则用用户偏好 |
| temperature | int | 否 | 当前温度 |
| weather | string | 否 | 天气描述 |
| mustIncludeItemId | int | 否 | 指定必须包含的衣物ID |
| excludeItemIds | int[] | 否 | 要排除的衣物ID列表 |
| count | int | 否 | 期望返回搭配数，默认4，最大5 |

**响应（立即返回）：**
```json
{
  "code": 0,
  "data": {
    "taskId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "pending",
    "estimatedSeconds": 5
  }
}
```

**流程：**
1. 校验参数，限制单用户 30 次/天
2. 生成 task_id（UUID v4）
3. INSERT recommendation_logs（status=pending）
4. 异步执行：规则引擎过滤 → 品类组合 → 颜色评分 → 排序 → 写入 outfits 表
5. UPDATE recommendation_logs（status=completed/failed）

---

#### GET /outfits/generate/{taskId} —— 查询搭配结果

**说明:** 轮询搭配生成任务的状态。

**响应 - 处理中：**
```json
{
  "code": 0,
  "data": {
    "taskId": "a1b2c3d4-...",
    "status": "processing"
  }
}
```

**响应 - 完成：**
```json
{
  "code": 0,
  "data": {
    "taskId": "a1b2c3d4-...",
    "status": "completed",
    "outfits": [
      {
        "id": 88,
        "name": "职场简约搭配1",
        "items": [
          {
            "itemId": 42,
            "categoryId": 9,
            "categoryName": "T恤",
            "primaryColor": "白色",
            "thumbnailUrl": "https://...",
            "position": "上衣"
          },
          {
            "itemId": 55,
            "categoryId": 22,
            "categoryName": "休闲裤",
            "primaryColor": "黑色",
            "thumbnailUrl": "https://...",
            "position": "下装"
          },
          {
            "itemId": 60,
            "categoryId": 51,
            "categoryName": "运动鞋",
            "primaryColor": "白色",
            "thumbnailUrl": "https://...",
            "position": "鞋"
          }
        ],
        "score": 85,
        "reason": "上衣+下装+鞋组合（T恤+休闲裤+运动鞋）。色调统一为白色与黑色。适合通勤、休闲场景。颜色搭配和谐度较高。",
        "scenario": "通勤",
        "season": "春",
        "style": "简约"
      }
    ],
    "processingTimeMs": 3200
  }
}
```

**响应 - 失败：**
```json
{
  "code": 0,
  "data": {
    "taskId": "a1b2c3d4-...",
    "status": "failed",
    "errorMessage": "衣橱中的衣物不足以生成搭配。请确保至少有：上衣 + 下装 + 鞋"
  }
}
```

**轮询建议：**
- 前端间隔 1 秒轮询，最多 15 次（15 秒超时）
- 前端展示骨架屏/进度动画过渡

---

#### GET /outfits —— 获取搭配列表

**说明:** 分页查询当前用户的历史搭配。

**请求：**
```
GET /api/v1/outfits?page=1&pageSize=20&favoriteOnly=false&scenario=通勤
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 88,
        "name": "职场简约搭配1",
        "itemCount": 3,
        "coverImageUrl": "https://...",
        "scenario": "通勤",
        "season": "春",
        "style": "简约",
        "isFavorite": false,
        "feedback": null,
        "source": "rule",
        "score": 85,
        "createdAt": "2026-06-14T10:35:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

---

#### GET /outfits/{id} —— 获取搭配详情

**响应：**
```json
{
  "code": 0,
  "data": {
    "id": 88,
    "name": "职场简约搭配1",
    "items": [ ... ],
    "scenario": "通勤",
    "season": "春",
    "style": "简约",
    "score": 85,
    "reason": "上衣+下装+鞋组合（T恤+休闲裤+运动鞋）。...",
    "weatherCondition": { "temperature": 22, "weather": "晴" },
    "source": "rule",
    "isFavorite": false,
    "feedback": null,
    "createdAt": "2026-06-14T10:35:00Z"
  }
}
```

---

#### POST /outfits/{id}/feedback —— 搭配反馈

**说明:** 用户对搭配进行评价，用于优化后续推荐。

**请求：**
```json
{
  "feedback": "喜欢",
  "isFavorite": true
}
```

| feedback | 说明 |
|----------|------|
| 喜欢 | 搭配满意 |
| 一般 | 可接受但不突出 |
| 不合适 | 搭配不合理 |

**响应：**
```json
{
  "code": 0,
  "data": { "updated": true }
}
```

**幂等性:** 同一用户对同一搭配可多次反馈，以最后一次为准。

---

### 2.6 衣橱统计

#### GET /stats/wardrobe —— 获取衣橱统计

**说明:** 返回当前用户衣橱的统计概览。

**响应：**
```json
{
  "code": 0,
  "data": {
    "totalItems": 45,
    "activeItems": 38,
    "byCategory": [
      { "categoryId": 1, "categoryName": "上衣", "count": 12 },
      { "categoryId": 2, "categoryName": "下装", "count": 10 },
      { "categoryId": 3, "categoryName": "连衣裙", "count": 3 },
      { "categoryId": 4, "categoryName": "外套", "count": 5 },
      { "categoryId": 5, "categoryName": "鞋", "count": 8 },
      { "categoryId": 6, "categoryName": "包", "count": 4 },
      { "categoryId": 7, "categoryName": "配饰", "count": 3 }
    ],
    "byColor": [
      { "color": "黑色", "count": 12 },
      { "color": "白色", "count": 10 },
      { "color": "蓝色", "count": 8 }
    ],
    "bySeason": [
      { "season": "春", "count": 30 },
      { "season": "夏", "count": 25 }
    ],
    "byStatus": [
      { "status": "正常", "count": 38 },
      { "status": "洗涤中", "count": 2 },
      { "status": "闲置", "count": 5 }
    ],
    "mostWorn": [
      { "itemId": 42, "categoryName": "T恤", "primaryColor": "白色", "wearCount": 12 }
    ],
    "leastWorn": [ ... ],
    "outfitStats": {
      "totalOutfits": 12,
      "favoriteOutfits": 5,
      "feedbackLike": 8,
      "feedbackDislike": 1
    }
  }
}
```

**性能：**
- 统计类数据走 Redis 缓存，TTL 30 分钟
- 用户修改衣物时失效用户统计缓存

---

### 2.7 AI 标签（预留）

#### POST /ai/tag-item —— 触发AI识别标签

**说明:** 对已上传的图片异步进行AI标签识别（后续阶段再接入AI服务，当前返回空）。

**请求：**
```json
{
  "itemId": 42
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "itemId": 42,
    "taskId": "b2c3d4e5-...",
    "status": "pending",
    "note": "AI识别暂未接入，当前版本请手动填写标签"
  }
}
```

---

## 3. 接口汇总表

| # | 方法 | 路径 | 说明 | 鉴权 | 缓存 |
|---|------|------|------|------|------|
| 1 | POST | `/auth/login` | 微信登录 | 否 | - |
| 2 | GET | `/categories` | 品类字典 | 是 | 24h |
| 3 | GET | `/tags` | 标签字典 | 是 | 1h |
| 4 | POST | `/wardrobe/upload` | 获取上传凭证 | 是 | - |
| 5 | POST | `/wardrobe` | 创建衣物 | 是 | - |
| 6 | GET | `/wardrobe` | 衣橱列表 | 是 | 30min |
| 7 | GET | `/wardrobe/{id}` | 衣物详情 | 是 | - |
| 8 | PUT | `/wardrobe/{id}` | 编辑衣物 | 是 | - |
| 9 | DELETE | `/wardrobe/{id}` | 删除衣物 | 是 | - |
| 10 | POST | `/wardrobe/batch-delete` | 批量删除 | 是 | - |
| 11 | POST | `/outfits/generate` | 生成搭配(异步) | 是 | 24h |
| 12 | GET | `/outfits/generate/{taskId}` | 轮询搭配结果 | 是 | - |
| 13 | GET | `/outfits` | 搭配列表 | 是 | 30min |
| 14 | GET | `/outfits/{id}` | 搭配详情 | 是 | - |
| 15 | POST | `/outfits/{id}/feedback` | 搭配反馈 | 是 | - |
| 16 | GET | `/stats/wardrobe` | 衣橱统计 | 是 | 30min |
| * | POST | `/ai/tag-item` | AI标签识别(预留) | 是 | - |

> 注：原需求 14 个接口，实际输出 16 个（新增搭配详情 GET /outfits/{id} 和 feedback，与 stats 并列。严格对齐的话 feedback 可并入 PUT /outfits/{id}，合并后正好 14 个。）

---

## 4. 数据隔离

所有业务接口的云函数均通过 CloudBase 的 `event.userInfo.openId` 获取当前用户身份：

```javascript
// 云函数中
const openid = event.userInfo.openId;
// 查询 users 表获取 userId
const user = await db('users').where({ openid }).first();
// 所有数据操作带上 userId 条件
const items = await db('wardrobe_items')
  .where({ user_id: user.id, is_deleted: 0 })
  .orderBy('created_at', 'desc')
  .paginate(page, pageSize);
```

**原则：** 用户A永远无法访问用户B的衣物/搭配/统计数据。

---

## 5. CloudBase 云函数映射

| API 路径 | 云函数名 | 触发方式 |
|----------|---------|---------|
| `/auth/login` | `auth` | HTTP 触发器 |
| `/categories`, `/tags` | `wardrobe` (路由分发) | HTTP 触发器 |
| `/wardrobe/*` | `wardrobe` | HTTP 触发器 |
| `/outfits/*` | `outfit` | HTTP 触发器 |
| `/stats/*` | `stats` | HTTP 触发器 |
| `/ai/*` | `aiTag` | HTTP 触发器 |

**路由方案：** 每个云函数是一个独立的路由处理函数，通过 HTTP 触发器的路径配置实现分发。CloudBase 云函数部署时配置不同触发路径即可。

---

## 6. 小程序端调用示例

```typescript
// 封装在 src/cloud/index.ts
import Taro from '@tarojs/taro';

const BASE_URL = 'https://cloud1-d4g6cb3nyf821a7a0.service.tcloudbase.com/api/v1';
const TOKEN_KEY = 'ew_token';

// 获取 Token
function getToken(): string {
  return Taro.getStorageSync(TOKEN_KEY) || '';
}

// 通用请求
async function request(path: string, options: RequestInit = {}): Promise<any> {
  const res = await Taro.request({
    url: `${BASE_URL}${path}`,
    method: options.method || 'GET',
    header: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    data: options.body ? JSON.parse(options.body as string) : undefined,
  });
  return res.data;
}

// 示例：获取衣橱列表
const { data } = await request('/wardrobe?page=1&pageSize=20&season=春');
console.log(data.list);
```
