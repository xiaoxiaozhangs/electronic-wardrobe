-- ============================================================
-- 电子衣橱（智搭衣橱）- MySQL 数据库 Schema
--
-- 平台：CloudBase CDB MySQL 5.7+
-- 基于：PRD v0.1 + 架构评估 MUL-5 + 前端 types/index.ts
-- 作者：后端工程师
-- 日期：2026-06-14
-- ============================================================

CREATE DATABASE IF NOT EXISTS `electronic_wardrobe`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE `electronic_wardrobe`;

-- ============================================================
-- 1. 用户表 (users)
-- ============================================================
CREATE TABLE `users` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT  COMMENT '用户ID',
  `openid`      VARCHAR(64)     NOT NULL                 COMMENT '微信 openid',
  `unionid`     VARCHAR(64)     DEFAULT NULL             COMMENT '微信 unionid（多端统一）',
  `nickname`    VARCHAR(100)    DEFAULT NULL             COMMENT '昵称',
  `avatar_url`  VARCHAR(500)    DEFAULT NULL             COMMENT '头像URL',
  `gender`      VARCHAR(10)     DEFAULT NULL             COMMENT '性别：male/female/other',

  -- 偏好设置 (JSON)
  `style_preferences`  JSON    NOT NULL DEFAULT ('[]')  COMMENT '风格偏好，如 ["简约","通勤","韩系"]',
  `common_scenarios`   JSON    NOT NULL DEFAULT ('[]')  COMMENT '常用场景，如 ["通勤","约会","休闲"]',
  `city`               VARCHAR(50) DEFAULT NULL         COMMENT '常用城市',

  -- 状态
  `status`      TINYINT        NOT NULL DEFAULT 1       COMMENT '1=正常 0=禁用',
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';


-- ============================================================
-- 2. 品类字典表 (categories)
-- 架构师 MUL-5 要求新增，支持两级品类体系
-- ============================================================
CREATE TABLE `categories` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT  COMMENT '品类ID',
  `name`        VARCHAR(50)     NOT NULL                 COMMENT '品类名称',
  `parent_id`   BIGINT UNSIGNED DEFAULT NULL             COMMENT '父品类ID（NULL=一级品类）',
  `level`       TINYINT         NOT NULL DEFAULT 1       COMMENT '1=一级品类 2=二级品类',

  -- 适用性 (JSON)
  `season_suitability`  JSON DEFAULT NULL                COMMENT '适用季节，如 ["春","夏","秋"]',
  `weather_suitability` JSON DEFAULT NULL                COMMENT '适用天气温度，如 {"min":15,"max":35}',
  `sort_order`   INT            NOT NULL DEFAULT 0       COMMENT '排序权重',

  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name_parent` (`name`, `parent_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_level` (`level`),
  KEY `idx_sort_order` (`sort_order`),

  CONSTRAINT `fk_categories_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='品类字典表';


-- ============================================================
-- 3. 标签字典表 (tag_dictionary)
-- 架构师 MUL-5 要求新增，用于 AI 标签归一化
-- ============================================================
CREATE TABLE `tag_dictionary` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT  COMMENT '标签ID',
  `tag_type`    VARCHAR(30)     NOT NULL                 COMMENT '标签类型：color/style/season/scenario/pattern/thickness/material',
  `tag_name`    VARCHAR(50)     NOT NULL                 COMMENT '标签显示名称',
  `aliases`     JSON            NOT NULL DEFAULT ('[]')  COMMENT '别名列表，如 ["T恤","t-shirt","短袖T"]',
  `normalized_name` VARCHAR(50) NOT NULL                 COMMENT '归一化名称（用于匹配）',
  `sort_order`  INT             NOT NULL DEFAULT 0       COMMENT '排序权重',

  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_name` (`tag_type`, `tag_name`),
  KEY `idx_tag_type` (`tag_type`),
  KEY `idx_normalized` (`tag_type`, `normalized_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签字典表';


-- ============================================================
-- 4. 衣物表 (wardrobe_items)
-- 基于 PRD v0.1 WardrobeItem + 架构师建议优化
-- ============================================================
CREATE TABLE `wardrobe_items` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT  COMMENT '衣物ID',
  `user_id`     BIGINT UNSIGNED NOT NULL                 COMMENT '所属用户ID',
  `category_id` BIGINT UNSIGNED NOT NULL                 COMMENT '二级品类ID（FK → categories）',

  -- 图片
  `image_url`       VARCHAR(500)  NOT NULL               COMMENT '原图CloudBase fileID',
  `thumbnail_url`   VARCHAR(500)  DEFAULT NULL           COMMENT '缩略图CloudBase fileID',
  `compressed_url`  VARCHAR(500)  DEFAULT NULL           COMMENT '压缩图(AI识别用) fileID',

  -- 颜色
  `primary_color`    VARCHAR(20)   DEFAULT NULL           COMMENT '主色（标签字典引用）',
  `secondary_colors` JSON          DEFAULT NULL           COMMENT '辅色数组，如 ["白色","蓝色"]',
  `pattern`          VARCHAR(30)   DEFAULT NULL           COMMENT '花纹：纯色/条纹/格纹/印花/拼接/其他',

  -- 材质与厚度
  `fabric`     VARCHAR(50)   DEFAULT NULL                COMMENT '面料材质',
  `thickness`  VARCHAR(10)   DEFAULT NULL                COMMENT '薄/中/厚',

  -- 适用性 (JSON)
  `seasons`          JSON  DEFAULT NULL                   COMMENT '适用季节，如 ["春","秋"]',
  `scenarios`        JSON  DEFAULT NULL                   COMMENT '适用场景，如 ["通勤","休闲"]',
  `styles`           JSON  DEFAULT NULL                   COMMENT '风格，如 ["简约","韩系"]',
  `temperature_min`  INT   DEFAULT NULL                   COMMENT '适合最低温度',
  `temperature_max`  INT   DEFAULT NULL                   COMMENT '适合最高温度',

  -- AI 标签（与用户手动标签分离，架构师建议）
  `ai_tags`      JSON       DEFAULT NULL                 COMMENT 'AI 原始识别结果（保留原始数据）',
  `manual_edited` TINYINT   NOT NULL DEFAULT 0            COMMENT '是否经过人工编辑 0=否 1=是',

  -- 购买信息
  `brand`         VARCHAR(100) DEFAULT NULL               COMMENT '品牌',
  `purchase_date` DATE         DEFAULT NULL               COMMENT '购买日期',
  `note`          TEXT         DEFAULT NULL               COMMENT '用户备注',

  -- 状态
  `status`        VARCHAR(20)  NOT NULL DEFAULT '正常'    COMMENT '正常/洗涤中/闲置/淘汰',
  `is_favorite`   TINYINT      NOT NULL DEFAULT 0         COMMENT '是否收藏 0=否 1=是',
  `wear_count`    INT UNSIGNED NOT NULL DEFAULT 0         COMMENT '穿着次数',
  `last_worn_at`  DATETIME     DEFAULT NULL               COMMENT '最近穿着时间',

  -- 软删除
  `is_deleted`   TINYINT  NOT NULL DEFAULT 0              COMMENT '0=正常 1=已删除',
  `deleted_at`   DATETIME DEFAULT NULL                    COMMENT '删除时间',

  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  PRIMARY KEY (`id`),
  KEY `idx_user_deleted_created` (`user_id`, `is_deleted`, `created_at`),
  KEY `idx_user_category`        (`user_id`, `category_id`),
  KEY `idx_user_status`          (`user_id`, `status`),
  KEY `idx_user_color`           (`user_id`, `primary_color`),
  KEY `idx_category`             (`category_id`),
  KEY `idx_created_at`           (`created_at`),

  CONSTRAINT `fk_items_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_items_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='衣物表';


-- ============================================================
-- 5. 搭配表 (outfits)
-- 基于 PRD v0.1 Outfit + 架构师 JSON 结构化 items 调整
-- ============================================================
CREATE TABLE `outfits` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT  COMMENT '搭配ID',
  `user_id`     BIGINT UNSIGNED NOT NULL                 COMMENT '用户ID',
  `name`        VARCHAR(200)    DEFAULT NULL             COMMENT '搭配名称',

  -- 衣物关联 (JSON 结构化，架构师建议)
  `items`       JSON            NOT NULL                 COMMENT '衣物列表：[{"item_id":1,"category_id":2,"position":"上衣"},...]',

  -- 搭配属性
  `scenario`    VARCHAR(20)     DEFAULT NULL             COMMENT '场景：通勤/休闲/运动/正式/约会/聚会/旅行',
  `season`      VARCHAR(10)     DEFAULT NULL             COMMENT '季节：春/夏/秋/冬',
  `style`       VARCHAR(20)     DEFAULT NULL             COMMENT '风格：简约/通勤/韩系/日系/法式等',
  `weather_condition` JSON      DEFAULT NULL             COMMENT '天气信息：{"temperature":25,"weather":"晴"}',

  -- 推荐说明
  `llm_explanation` TEXT        DEFAULT NULL             COMMENT 'LLM/引擎生成的推荐理由',
  `cover_image_url` VARCHAR(500) DEFAULT NULL            COMMENT '搭配封面图（拼合各衣物缩略图）',
  `score`        INT            DEFAULT 0                COMMENT '推荐评分（0-100）',
  `source`       VARCHAR(20)    NOT NULL DEFAULT 'rule'  COMMENT '来源：rule/AI/user',

  -- 反馈
  `is_favorite`  TINYINT        NOT NULL DEFAULT 0       COMMENT '是否收藏 0=否 1=是',
  `feedback`     VARCHAR(20)    DEFAULT NULL             COMMENT '反馈：喜欢/一般/不合适',

  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  PRIMARY KEY (`id`),
  KEY `idx_user_created`   (`user_id`, `created_at`),
  KEY `idx_user_favorite`  (`user_id`, `is_favorite`),
  KEY `idx_scenario`       (`scenario`),
  KEY `idx_created_at`     (`created_at`),

  CONSTRAINT `fk_outfits_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搭配表';


-- ============================================================
-- 6. 推荐记录表 (recommendation_logs)
-- 基于 PRD v0.1 RecommendationLog + 架构师异步任务字段
-- ============================================================
CREATE TABLE `recommendation_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT  COMMENT '日志ID',
  `user_id`     BIGINT UNSIGNED NOT NULL                 COMMENT '用户ID',
  `task_id`     VARCHAR(64)     NOT NULL                 COMMENT '异步任务ID（UUID v4）',

  -- 请求与结果
  `request_params`    JSON        NOT NULL               COMMENT '用户输入：场景/天气/风格/指定单品等',
  `status`            VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/processing/completed/failed',
  `candidate_item_ids` JSON       DEFAULT NULL           COMMENT '候选衣物ID列表',
  `result_outfit_ids`  JSON       DEFAULT NULL           COMMENT '生成的搭配ID列表',

  -- 性能与成本追踪
  `model`      VARCHAR(50)     DEFAULT NULL              COMMENT '使用的模型/策略版本',
  `cost`       DECIMAL(10,6)   DEFAULT 0.000000          COMMENT '单次调用成本（元）',
  `latency_ms` INT UNSIGNED    DEFAULT NULL              COMMENT '处理耗时（毫秒）',
  `error_message` TEXT        DEFAULT NULL               COMMENT '失败原因',

  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_id`     (`task_id`),
  KEY `idx_user_created`      (`user_id`, `created_at`),
  KEY `idx_status`            (`status`),
  KEY `idx_created_at`        (`created_at`),

  CONSTRAINT `fk_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推荐记录表';


-- ============================================================
-- 字典初始数据
-- ============================================================

-- ---- 2.1 品类字典 (categories) ----
-- 一级品类
INSERT INTO `categories` (`id`, `name`, `parent_id`, `level`, `season_suitability`, `weather_suitability`, `sort_order`) VALUES
(1,  '上衣',     NULL, 1, '["春","夏","秋","冬"]', '{"min":0,"max":40}',  10),
(2,  '下装',     NULL, 1, '["春","夏","秋","冬"]', '{"min":0,"max":40}',  20),
(3,  '连衣裙',   NULL, 1, '["春","夏","秋"]',       '{"min":10,"max":38}', 30),
(4,  '外套',     NULL, 1, '["春","秋","冬"]',       '{"min":-10,"max":25}',40),
(5,  '鞋',       NULL, 1, '["春","夏","秋","冬"]', '{"min":0,"max":40}',  50),
(6,  '包',       NULL, 1, '["春","夏","秋","冬"]', '{"min":0,"max":40}',  60),
(7,  '配饰',     NULL, 1, '["春","夏","秋","冬"]', '{"min":0,"max":40}',  70),
(8,  '其他',     NULL, 1, '["春","夏","秋","冬"]', '{"min":0,"max":40}',  90);

-- 二级品类 - 上衣
INSERT INTO `categories` (`name`, `parent_id`, `level`, `season_suitability`, `weather_suitability`, `sort_order`) VALUES
('T恤',      1, 2, '["春","夏","秋"]', '{"min":15,"max":38}', 11),
('衬衫',     1, 2, '["春","夏","秋"]', '{"min":10,"max":35}', 12),
('卫衣',     1, 2, '["春","秋","冬"]', '{"min":0,"max":25}',  13),
('针织衫',   1, 2, '["春","秋","冬"]', '{"min":5,"max":25}',  14),
('毛衣',     1, 2, '["秋","冬"]',       '{"min":-5,"max":20}', 15),
('背心',     1, 2, '["夏"]',            '{"min":20,"max":40}', 16);

-- 二级品类 - 下装
INSERT INTO `categories` (`name`, `parent_id`, `level`, `season_suitability`, `weather_suitability`, `sort_order`) VALUES
('牛仔裤',   2, 2, '["春","秋","冬"]', '{"min":0,"max":30}',  21),
('休闲裤',   2, 2, '["春","秋"]',       '{"min":5,"max":30}',  22),
('西裤',     2, 2, '["春","秋","冬"]', '{"min":0,"max":28}',  23),
('短裤',     2, 2, '["夏"]',            '{"min":20,"max":40}', 24),
('半身裙',   2, 2, '["春","夏","秋"]', '{"min":10,"max":35}', 25),
('长裙',     2, 2, '["春","夏","秋"]', '{"min":15,"max":35}', 26),
('短裙',     2, 2, '["夏"]',            '{"min":20,"max":38}', 27);

-- 二级品类 - 连衣裙
INSERT INTO `categories` (`name`, `parent_id`, `level`, `season_suitability`, `weather_suitability`, `sort_order`) VALUES
('连衣长裙', 3, 2, '["春","夏","秋"]', '{"min":15,"max":35}', 31),
('连衣短裙', 3, 2, '["夏"]',            '{"min":20,"max":38}', 32);

-- 二级品类 - 外套
INSERT INTO `categories` (`name`, `parent_id`, `level`, `season_suitability`, `weather_suitability`, `sort_order`) VALUES
('风衣',     4, 2, '["春","秋"]',       '{"min":5,"max":25}',  41),
('夹克',     4, 2, '["春","秋"]',       '{"min":5,"max":25}',  42),
('西装',     4, 2, '["春","秋","冬"]', '{"min":0,"max":25}',  43),
('羽绒服',   4, 2, '["冬"]',            '{"min":-15,"max":10}',44),
('大衣',     4, 2, '["秋","冬"]',       '{"min":-10,"max":15}',45);

-- 二级品类 - 鞋
INSERT INTO `categories` (`name`, `parent_id`, `level`, `season_suitability`, `weather_suitability`, `sort_order`) VALUES
('运动鞋',   5, 2, '["春","夏","秋","冬"]', '{"min":0,"max":40}',  51),
('皮鞋',     5, 2, '["春","秋","冬"]',       '{"min":0,"max":30}',  52),
('靴子',     5, 2, '["秋","冬"]',            '{"min":-15,"max":15}',53),
('凉鞋',     5, 2, '["夏"]',                 '{"min":20,"max":40}', 54),
('帆布鞋',   5, 2, '["春","夏","秋"]',       '{"min":10,"max":35}', 55);

-- 二级品类 - 包
INSERT INTO `categories` (`name`, `parent_id`, `level`, `season_suitability`, `weather_suitability`, `sort_order`) VALUES
('手拎包',   6, 2, '["春","夏","秋","冬"]', '{"min":0,"max":40}', 61),
('斜挎包',   6, 2, '["春","夏","秋","冬"]', '{"min":0,"max":40}', 62),
('双肩包',   6, 2, '["春","夏","秋","冬"]', '{"min":0,"max":40}', 63);

-- 二级品类 - 配饰
INSERT INTO `categories` (`name`, `parent_id`, `level`, `season_suitability`, `weather_suitability`, `sort_order`) VALUES
('项链',     7, 2, '["春","夏","秋","冬"]', '{"min":0,"max":40}', 71),
('耳环',     7, 2, '["春","夏","秋","冬"]', '{"min":0,"max":40}', 72),
('手表',     7, 2, '["春","夏","秋","冬"]', '{"min":0,"max":40}', 73),
('帽子',     7, 2, '["春","夏","秋","冬"]', '{"min":0,"max":40}', 74),
('围巾',     7, 2, '["秋","冬"]',            '{"min":-10,"max":15}',75),
('腰带',     7, 2, '["春","夏","秋","冬"]', '{"min":0,"max":40}', 76);


-- ---- 3.1 标签字典 (tag_dictionary) ----

-- 颜色标签 (12)
INSERT INTO `tag_dictionary` (`tag_type`, `tag_name`, `aliases`, `normalized_name`, `sort_order`) VALUES
('color', '黑色', '["黑色","black","黑"]',           '黑色', 1),
('color', '白色', '["白色","white","白"]',           '白色', 2),
('color', '灰色', '["灰色","gray","灰"]',           '灰色', 3),
('color', '米色', '["米色","beige","卡其色","杏色"]','米色', 4),
('color', '棕色', '["棕色","brown","咖啡色","驼色"]','棕色', 5),
('color', '红色', '["红色","red","红"]',             '红色', 6),
('color', '粉色', '["粉色","pink","粉"]',             '粉色', 7),
('color', '橙色', '["橙色","orange","橘色"]',        '橙色', 8),
('color', '黄色', '["黄色","yellow","黄"]',           '黄色', 9),
('color', '绿色', '["绿色","green","绿"]',           '绿色', 10),
('color', '蓝色', '["蓝色","blue","蓝"]',           '蓝色', 11),
('color', '紫色', '["紫色","purple","紫"]',          '紫色', 12);

-- 季节标签 (4)
INSERT INTO `tag_dictionary` (`tag_type`, `tag_name`, `aliases`, `normalized_name`, `sort_order`) VALUES
('season', '春', '["春","春天","spring"]', '春', 1),
('season', '夏', '["夏","夏天","summer"]', '夏', 2),
('season', '秋', '["秋","秋天","autumn","fall"]', '秋', 3),
('season', '冬', '["冬","冬天","winter"]', '冬', 4);

-- 场景标签 (7)
INSERT INTO `tag_dictionary` (`tag_type`, `tag_name`, `aliases`, `normalized_name`, `sort_order`) VALUES
('scenario', '通勤', '["通勤","上班","工作","职场"]',   '通勤', 1),
('scenario', '休闲', '["休闲","日常","逛街","周末"]',   '休闲', 2),
('scenario', '运动', '["运动","健身","跑步","户外"]',   '运动', 3),
('scenario', '正式', '["正式","商务","会议","面试"]',   '正式', 4),
('scenario', '约会', '["约会","date","聚餐"]',         '约会', 5),
('scenario', '聚会', '["聚会","派对","party"]',        '聚会', 6),
('scenario', '旅行', '["旅行","旅游","出差","出行"]',   '旅行', 7);

-- 风格标签 (10)
INSERT INTO `tag_dictionary` (`tag_type`, `tag_name`, `aliases`, `normalized_name`, `sort_order`) VALUES
('style', '简约', '["简约","极简","minimalist","cleanfit"]',  '简约', 1),
('style', '通勤', '["通勤","职场","office"]',                  '通勤', 2),
('style', '休闲', '["休闲","casual","日常"]',                  '休闲', 3),
('style', '甜美', '["甜美","甜系","girly"]',                   '甜美', 4),
('style', '运动', '["运动","sporty","athleisure"]',            '运动', 5),
('style', '街头', '["街头","streetwear","潮牌"]',              '街头', 6),
('style', '复古', '["复古","vintage","retro"]',               '复古', 7),
('style', '韩系', '["韩系","韩风","korean"]',                  '韩系', 8),
('style', '日系', '["日系","日风","japanese"]',                '日系', 9),
('style', '法式', '["法式","法风","french","巴黎"]',           '法式', 10);

-- 花纹标签 (6)
INSERT INTO `tag_dictionary` (`tag_type`, `tag_name`, `aliases`, `normalized_name`, `sort_order`) VALUES
('pattern', '纯色', '["纯色","单色","净色","solid"]',     '纯色', 1),
('pattern', '条纹', '["条纹","横条","竖条","stripe"]',     '条纹', 2),
('pattern', '格纹', '["格纹","格子","方格","plaid"]',      '格纹', 3),
('pattern', '印花', '["印花","图案","碎花","print"]',      '印花', 4),
('pattern', '拼接', '["拼接","拼色","拼贴"]',              '拼接', 5),
('pattern', '其他', '["其他","other"]',                   '其他', 6);

-- 厚度标签 (3)
INSERT INTO `tag_dictionary` (`tag_type`, `tag_name`, `aliases`, `normalized_name`, `sort_order`) VALUES
('thickness', '薄', '["薄","薄款","轻薄","light"]',   '薄', 1),
('thickness', '中', '["中","中等","适中","medium"]',  '中', 2),
('thickness', '厚', '["厚","厚款","加厚","heavy"]',   '厚', 3);

-- 衣物状态标签 (4)
INSERT INTO `tag_dictionary` (`tag_type`, `tag_name`, `aliases`, `normalized_name`, `sort_order`) VALUES
('status', '正常', '["正常","在穿","active"]',     '正常', 1),
('status', '洗涤中','["洗涤中","清洗中","washing"]','洗涤中', 2),
('status', '闲置', '["闲置","不常穿","inactive"]',  '闲置', 3),
('status', '淘汰', '["淘汰","不要了","discarded"]', '淘汰', 4);
