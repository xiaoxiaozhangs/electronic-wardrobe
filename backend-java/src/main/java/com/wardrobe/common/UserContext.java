package com.wardrobe.common;

/**
 * 请求上下文 - 存储当前请求用户信息（ThreadLocal）
 */
public class UserContext {
    private static final ThreadLocal<String> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> OPENID = new ThreadLocal<>();

    public static void set(String userId, String openid) {
        USER_ID.set(userId);
        OPENID.set(openid);
    }

    public static String getUserId() {
        return USER_ID.get();
    }

    public static String getOpenid() {
        return OPENID.get();
    }

    public static void clear() {
        USER_ID.remove();
        OPENID.remove();
    }
}
