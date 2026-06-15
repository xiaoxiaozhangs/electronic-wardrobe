-- ============================================================
-- 电子衣橱（智搭衣橱）- MySQL 数据库 Schema
-- 版本: V1 — 基础表结构
-- 平台: MySQL 8.0
-- 日期: 2026-06-14
-- ============================================================

CREATE TABLE IF NOT EXISTS `users` (
    `id`          BIGINT AUTO_INCREMENT PRIMARY KEY,
    `openid`      VARCHAR(64)  NOT NULL,
    `unionid`     VARCHAR(64)  DEFAULT NULL,
    `nickname`    VARCHAR(100) DEFAULT NULL,
    `avatar_url`  VARCHAR(500) DEFAULT NULL,
    `style_preferences` JSON NOT NULL DEFAULT ('[]'),
    `common_scenarios`  JSON NOT NULL DEFAULT ('[]'),
    `city`        VARCHAR(50)  DEFAULT NULL,
    `status`      TINYINT      NOT NULL DEFAULT 1,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_openid` (`openid`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

CREATE TABLE IF NOT EXISTS `categories` (
    `id`          BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name`        VARCHAR(50)  NOT NULL,
    `parent_id`   BIGINT       DEFAULT NULL,
    `level`       TINYINT      NOT NULL DEFAULT 1,
    `season_suitability` JSON DEFAULT NULL,
    `weather_suitability` JSON DEFAULT NULL,
    `sort_order`  INT          NOT NULL DEFAULT 0,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_name_parent` (`name`, `parent_id`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品类字典表';

CREATE TABLE IF NOT EXISTS `tag_dictionary` (
    `id`              BIGINT AUTO_INCREMENT PRIMARY KEY,
    `tag_type`        VARCHAR(30)  NOT NULL,
    `tag_name`        VARCHAR(50)  NOT NULL,
    `aliases`         JSON NOT NULL DEFAULT ('[]'),
    `normalized_name` VARCHAR(50)  NOT NULL,
    `sort_order`      INT NOT NULL DEFAULT 0,
    `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_type_name` (`tag_type`, `tag_name`),
    KEY `idx_tag_type` (`tag_type`),
    KEY `idx_normalized` (`tag_type`, `normalized_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签字典表';

CREATE TABLE IF NOT EXISTS `wardrobe_items` (
    `id`              BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id`         BIGINT       NOT NULL,
    `category_id`     BIGINT       NOT NULL,
    `image_url`       VARCHAR(500) NOT NULL,
    `thumbnail_url`   VARCHAR(500) DEFAULT NULL,
    `compressed_url`  VARCHAR(500) DEFAULT NULL,
    `primary_color`   VARCHAR(20)  DEFAULT NULL,
    `secondary_colors` JSON        DEFAULT NULL,
    `pattern`         VARCHAR(30)  DEFAULT NULL,
    `fabric`          VARCHAR(50)  DEFAULT NULL,
    `thickness`       VARCHAR(10)  DEFAULT NULL,
    `seasons`         JSON         DEFAULT NULL,
    `scenarios`       JSON         DEFAULT NULL,
    `styles`          JSON         DEFAULT NULL,
    `temperature_min` INT          DEFAULT NULL,
    `temperature_max` INT          DEFAULT NULL,
    `ai_tags`         JSON         DEFAULT NULL,
    `manual_edited`   TINYINT      NOT NULL DEFAULT 0,
    `brand`           VARCHAR(100) DEFAULT NULL,
    `purchase_date`   DATE         DEFAULT NULL,
    `note`            TEXT         DEFAULT NULL,
    `status`          VARCHAR(20)  NOT NULL DEFAULT '正常',
    `is_favorite`     TINYINT      NOT NULL DEFAULT 0,
    `wear_count`      INT UNSIGNED NOT NULL DEFAULT 0,
    `last_worn_at`    DATETIME     DEFAULT NULL,
    `is_deleted`      TINYINT      NOT NULL DEFAULT 0,
    `deleted_at`      DATETIME     DEFAULT NULL,
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_user_deleted` (`user_id`, `is_deleted`),
    KEY `idx_user_category` (`user_id`, `category_id`),
    KEY `idx_user_status` (`user_id`, `status`),
    CONSTRAINT `fk_items_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='衣物表';

CREATE TABLE IF NOT EXISTS `outfits` (
    `id`               BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id`          BIGINT       NOT NULL,
    `name`             VARCHAR(200) DEFAULT NULL,
    `items`            JSON         NOT NULL,
    `scenario`         VARCHAR(20)  DEFAULT NULL,
    `season`           VARCHAR(10)  DEFAULT NULL,
    `style`            VARCHAR(20)  DEFAULT NULL,
    `weather_condition` JSON        DEFAULT NULL,
    `llm_explanation`  TEXT         DEFAULT NULL,
    `cover_image_url`  VARCHAR(500) DEFAULT NULL,
    `score`            INT          DEFAULT 0,
    `source`           VARCHAR(20)  NOT NULL DEFAULT 'rule',
    `is_favorite`      TINYINT      NOT NULL DEFAULT 0,
    `feedback`         VARCHAR(20)  DEFAULT NULL,
    `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_user_created` (`user_id`, `created_at`),
    KEY `idx_user_favorite` (`user_id`, `is_favorite`),
    CONSTRAINT `fk_outfits_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='搭配表';

CREATE TABLE IF NOT EXISTS `recommendation_logs` (
    `id`               BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id`          BIGINT       NOT NULL,
    `task_id`          VARCHAR(64)  NOT NULL,
    `request_params`   JSON         NOT NULL,
    `status`           VARCHAR(20)  NOT NULL DEFAULT 'pending',
    `candidate_item_ids` JSON       DEFAULT NULL,
    `result_outfit_ids`  JSON       DEFAULT NULL,
    `model`            VARCHAR(50)  DEFAULT NULL,
    `cost`             DECIMAL(10,6) DEFAULT 0.000000,
    `latency_ms`       INT UNSIGNED DEFAULT NULL,
    `error_message`    TEXT         DEFAULT NULL,
    `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_task_id` (`task_id`),
    KEY `idx_user_created` (`user_id`, `created_at`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推荐记录表';
