# 电子衣橱 - Java/Spring Boot 后端

## 技术栈

| 层次 | 技术 | 版本 |
|------|------|------|
| 后端框架 | Spring Boot | 3.2.5 |
| JDK | Java | 17+ |
| ORM | MyBatis-Plus | 3.5.7 |
| 数据库 | MySQL | 8.0 |
| 缓存 | Redis | 7.x |
| 消息队列 | RabbitMQ | 3.12 |
| 鉴权 | JWT (jjwt) | 0.12.5 |
| 微信SDK | weixin-java-miniapp | 4.6.0 |
| 工具库 | Hutool | 5.8.28 |

## 快速开始

### 1. 环境准备

- JDK 17+
- Maven 3.8+
- Docker Desktop (或本地 MySQL + Redis)

### 2. 启动依赖服务

```bash
docker-compose up -d
```

### 3. 初始化数据库

```bash
# 方式1: 使用 Flyway (推荐)
# 在 application.yml 中设置 spring.flyway.enabled=true

# 方式2: 手动执行
mysql -h localhost -u root -proot electronic_wardrobe < src/main/resources/db/migration/V1__init_schema.sql
mysql -h localhost -u root -proot electronic_wardrobe < src/main/resources/db/migration/V2__seed_data.sql
```

### 4. 启动应用

```bash
./mvnw spring-boot:run
```

### 5. 验证

```bash
curl http://localhost:8080/actuator/health
```

## 项目结构

```
src/main/java/com/wardrobe/
├── SmartWardrobeApplication.java    # 主入口
├── common/                          # 公共模块
│   ├── config/                      # 配置 (MyBatis/Redis/WebMvc/Wechat)
│   ├── dto/                         # 通用DTO (ApiResponse/PageResult)
│   ├── exception/                   # 异常 (BusinessException/GlobalHandler)
│   ├── utils/                       # 工具 (JwtUtils)
│   └── constant/                    # 常量
├── auth/                            # 认证模块
│   ├── controller/AuthController    # POST /auth/login
│   ├── service/AuthService          # 微信登录+JWT
│   └── interceptor/JwtInterceptor   # JWT鉴权拦截器
├── wardrobe/                        # 衣橱模块
│   ├── controller/                  # CRUD + 品类/标签字典
│   ├── service/                     # 业务逻辑
│   ├── entity/                      # 实体类
│   └── mapper/                      # MyBatis Mapper
├── outfit/                          # 搭配模块
│   ├── controller/OutfitController  # 搭配生成/列表/反馈
│   └── service/
│       ├── OutfitService            # 搭配业务
│       └── OutfitEngine             # 搭配规则引擎(核心)
├── stats/                           # 统计模块
│   └── StatsController              # GET /stats/wardrobe
├── ai/                              # AI模块
│   └── AiTagController              # POST /ai/tag-item (预留)
└── upload/                          # 上传模块 (同WardrobeController)
```

## API接口

| # | 方法 | 路径 | 说明 |
|---|------|------|------|
| 1 | POST | `/api/v1/auth/login` | 微信登录 |
| 2 | GET | `/api/v1/categories` | 品类字典 |
| 3 | GET | `/api/v1/tags` | 标签字典 |
| 4 | POST | `/api/v1/wardrobe/upload` | 上传图片 |
| 5 | POST | `/api/v1/wardrobe` | 创建衣物 |
| 6 | GET | `/api/v1/wardrobe` | 衣橱列表 |
| 7 | GET | `/api/v1/wardrobe/{id}` | 衣物详情 |
| 8 | PUT | `/api/v1/wardrobe/{id}` | 编辑衣物 |
| 9 | DELETE | `/api/v1/wardrobe/{id}` | 删除衣物 |
| 10 | POST | `/api/v1/wardrobe/batch-delete` | 批量删除 |
| 11 | POST | `/api/v1/outfits/generate` | 生成搭配 |
| 12 | GET | `/api/v1/outfits/generate/{taskId}` | 轮询结果 |
| 13 | GET | `/api/v1/outfits` | 搭配列表 |
| 14 | GET | `/api/v1/outfits/{id}` | 搭配详情 |
| 15 | POST | `/api/v1/outfits/{id}/feedback` | 搭配反馈 |
| 16 | GET | `/api/v1/stats/wardrobe` | 衣橱统计 |

## 从 Node.js 迁移说明

原 CloudBase 云函数 (`backend/cloudfunctions/`) 的 Node.js 代码已全部用 Java 重写：

| Node.js 云函数 | Java 对应 | 状态 |
|---------------|----------|------|
| `auth/index.js` | `AuthController + AuthService` | ✅ |
| `wardrobe/index.js` | `WardrobeController + WardrobeService` | ✅ |
| `outfit/index.js` | `OutfitController + OutfitService + OutfitEngine` | ✅ |
| `stats/index.js` | `StatsController` | ✅ |
| `aiTag/index.js` | `AiTagController` | ✅ |
| `upload/index.js` | `WardrobeController.upload()` | ✅ |

## 部署

```bash
# 打包
./mvnw clean package -DskipTests

# Docker 部署
docker build -t smart-wardrobe:latest .
docker run -d -p 8080:8080 \
  -e DB_HOST=your-mysql-host \
  -e DB_PASSWORD=your-password \
  -e REDIS_HOST=your-redis-host \
  smart-wardrobe:latest
```
