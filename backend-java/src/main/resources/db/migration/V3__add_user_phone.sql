-- ============================================================
-- V3: 用户手机号字段
-- 用于微信小程序 getPhoneNumber 授权后绑定到用户
-- ============================================================

ALTER TABLE `users`
    ADD COLUMN `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号(微信授权获取)' AFTER `avatar_url`,
    ADD COLUMN `country_code` VARCHAR(8) DEFAULT '+86' COMMENT '区号' AFTER `phone`,
    ADD COLUMN `phone_bind_at` DATETIME DEFAULT NULL COMMENT '手机号绑定时间' AFTER `country_code`,
    ADD KEY `idx_phone` (`phone`);
