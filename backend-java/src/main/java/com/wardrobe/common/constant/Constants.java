package com.wardrobe.common.constant;

/**
 * 系统常量
 */
public final class Constants {
    private Constants() {}

    /** JWT Token 前缀 */
    public static final String TOKEN_PREFIX = "Bearer ";

    /** 用户ID请求头 */
    public static final String HEADER_USER_ID = "X-User-Id";

    /** 品类 - 一级 */
    public static final String CAT_TOP = "上衣";
    public static final String CAT_BOTTOM = "下装";
    public static final String CAT_DRESS = "连衣裙";
    public static final String CAT_OUTERWEAR = "外套";
    public static final String CAT_SHOES = "鞋";
    public static final String CAT_BAG = "包";
    public static final String CAT_ACCESSORY = "配饰";

    /** 场景 */
    public static final String[] SCENARIOS = {"通勤", "约会", "运动", "正式", "休闲", "聚会", "旅行"};

    /** 状态 */
    public static final String STATUS_NORMAL = "正常";
    public static final String STATUS_WASHING = "洗涤中";
    public static final String STATUS_IDLE = "闲置";
    public static final String STATUS_DISCARD = "淘汰";

    /** 反馈 */
    public static final String FEEDBACK_LIKE = "喜欢";
    public static final String FEEDBACK_NEUTRAL = "一般";
    public static final String FEEDBACK_DISLIKE = "不合适";

    /** 缓存 Key */
    public static final String CACHE_CATEGORIES = "categories:tree";
    public static final String CACHE_TAGS = "tags:all";
    public static final String CACHE_USER_WARDROBE = "wardrobe:user:%s";
    public static final String CACHE_OUTFIT_RESULT = "outfit:task:%s";
    public static final String CACHE_USER_STATS = "stats:user:%s";

    /** 限流 */
    public static final int RATE_LIMIT_LOGIN_PER_MIN = 10;
    public static final int RATE_LIMIT_UPLOAD_PER_DAY = 30;
    public static final int RATE_LIMIT_GENERATE_PER_DAY = 30;
}
