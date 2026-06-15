package com.wardrobe.auth.service;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.wardrobe.auth.controller.AuthController;
import com.wardrobe.common.config.WechatConfig;
import com.wardrobe.common.exception.BusinessException;
import com.wardrobe.common.utils.JwtUtils;
import com.wardrobe.wardrobe.entity.User;
import com.wardrobe.wardrobe.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final JwtUtils jwtUtils;
    private final WechatConfig wechatConfig;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String WX_CODE2SESSION_URL =
            "https://api.weixin.qq.com/sns/jscode2session" +
                    "?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code";

    private static final String WX_ACCESS_TOKEN_URL =
            "https://api.weixin.qq.com/cgi-bin/token" +
                    "?grant_type=client_credential&appid=%s&secret=%s";

    private static final String WX_PHONE_NUMBER_URL =
            "https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=%s";

    private static final String ACCESS_TOKEN_CACHE_KEY = "wechat:access_token";

    /**
     * 微信登录 - 用code换取openid，签发JWT
     */
    public Map<String, Object> login(String code, AuthController.UserInfoDTO userInfo) {
        String url = String.format(WX_CODE2SESSION_URL,
                wechatConfig.getAppId(), wechatConfig.getAppSecret(), code);
        String resp;
        try {
            resp = restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            log.error("微信登录接口调用失败", e);
            throw new BusinessException(2003, "微信登录失败，请稍后重试");
        }

        JSONObject wxResult = JSONUtil.parseObj(resp);
        if (wxResult.containsKey("errcode") && wxResult.getInt("errcode") != 0) {
            log.error("微信登录失败: errcode={}, errmsg={}",
                    wxResult.getInt("errcode"), wxResult.getStr("errmsg"));
            throw new BusinessException(2003, "微信登录失败: " + wxResult.getStr("errmsg"));
        }

        String openid = wxResult.getStr("openid");
        if (openid == null || openid.isEmpty()) {
            throw new BusinessException(2003, "微信登录失败：openid为空");
        }
        String unionid = wxResult.getStr("unionid");

        // 幂等：openid 唯一，已存在则更新
        User user = userMapper.selectByOpenid(openid);
        boolean isNewUser = false;

        if (user == null) {
            user = new User();
            user.setOpenid(openid);
            user.setUnionid(unionid);
            user.setNickname(userInfo != null ? userInfo.getNickname() : null);
            user.setAvatarUrl(userInfo != null ? userInfo.getAvatarUrl() : null);
            user.setStylePreferences("[]");
            user.setCommonScenarios("[]");
            user.setStatus(1);
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            userMapper.insert(user);
            isNewUser = true;
        } else {
            if (userInfo != null) {
                if (userInfo.getNickname() != null) user.setNickname(userInfo.getNickname());
                if (userInfo.getAvatarUrl() != null) user.setAvatarUrl(userInfo.getAvatarUrl());
            }
            if (unionid != null) user.setUnionid(unionid);
            user.setUpdatedAt(LocalDateTime.now());
            userMapper.updateById(user);
        }

        String userId = user.getId().toString();

        String token = jwtUtils.generateToken(userId, openid);
        String refreshToken = jwtUtils.generateRefreshToken(userId, openid);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", token);
        result.put("refreshToken", refreshToken);
        result.put("expiresIn", 604800);
        result.put("user", buildUserVO(user, isNewUser));
        return result;
    }

    /**
     * 绑定手机号 - 用 getPhoneNumber 返回的 code 换取手机号并写入用户
     */
    public Map<String, Object> bindPhone(Long userId, String code) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() == null || user.getStatus() != 1) {
            throw BusinessException.unauthorized("用户不存在或已禁用");
        }

        String accessToken = getAccessToken();

        Map<String, String> body = new HashMap<>();
        body.put("code", code);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> req = new HttpEntity<>(body, headers);

        String resp;
        try {
            resp = restTemplate.postForObject(
                    String.format(WX_PHONE_NUMBER_URL, accessToken), req, String.class);
        } catch (Exception e) {
            log.error("微信手机号接口调用失败", e);
            throw new BusinessException(2003, "手机号获取失败，请稍后重试");
        }

        JSONObject result = JSONUtil.parseObj(resp);
        Integer errcode = result.getInt("errcode", -1);
        if (errcode == null || errcode != 0) {
            String errmsg = result.getStr("errmsg");
            log.error("手机号获取失败: errcode={}, errmsg={}", errcode, errmsg);
            // access_token 失效需要重新拉取
            if (errcode != null && (errcode == 40001 || errcode == 42001 || errcode == 40014)) {
                redisTemplate.delete(ACCESS_TOKEN_CACHE_KEY);
            }
            throw new BusinessException(2003, "手机号获取失败: " + errmsg);
        }

        JSONObject phoneInfo = result.getJSONObject("phone_info");
        if (phoneInfo == null) {
            throw new BusinessException(2003, "手机号获取失败：phone_info为空");
        }
        String purePhoneNumber = phoneInfo.getStr("purePhoneNumber");
        String countryCode = phoneInfo.getStr("countryCode");
        if (purePhoneNumber == null || purePhoneNumber.isEmpty()) {
            throw new BusinessException(2003, "手机号获取失败：phoneNumber为空");
        }

        user.setPhone(purePhoneNumber);
        user.setCountryCode(countryCode != null ? "+" + countryCode : "+86");
        user.setPhoneBindAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);

        Map<String, Object> ret = new LinkedHashMap<>();
        ret.put("phone", purePhoneNumber);
        ret.put("countryCode", user.getCountryCode());
        ret.put("user", buildUserVO(user, false));
        return ret;
    }

    /**
     * 获取当前用户Profile
     */
    public Map<String, Object> getProfile(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() == null || user.getStatus() != 1) {
            throw BusinessException.unauthorized("用户不存在或已禁用");
        }
        return buildUserVO(user, false);
    }

    // ========== 内部 ==========

    private Map<String, Object> buildUserVO(User user, boolean isNewUser) {
        Map<String, Object> userMap = new LinkedHashMap<>();
        userMap.put("id", user.getId());
        userMap.put("nickname", user.getNickname());
        userMap.put("avatarUrl", user.getAvatarUrl());
        userMap.put("phone", maskPhone(user.getPhone()));
        userMap.put("hasPhone", user.getPhone() != null && !user.getPhone().isEmpty());
        userMap.put("stylePreferences", user.getStylePreferences());
        userMap.put("commonScenarios", user.getCommonScenarios());
        userMap.put("city", user.getCity());
        userMap.put("isNewUser", isNewUser);
        return userMap;
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    /**
     * 获取微信 access_token，缓存7000秒（官方有效期7200秒）
     */
    private String getAccessToken() {
        Object cached = redisTemplate.opsForValue().get(ACCESS_TOKEN_CACHE_KEY);
        if (cached instanceof String s && !s.isEmpty()) return s;

        String url = String.format(WX_ACCESS_TOKEN_URL,
                wechatConfig.getAppId(), wechatConfig.getAppSecret());
        String resp;
        try {
            resp = restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            log.error("拉取微信access_token失败", e);
            throw new BusinessException(2003, "微信服务暂不可用");
        }

        JSONObject obj = JSONUtil.parseObj(resp);
        String token = obj.getStr("access_token");
        if (token == null || token.isEmpty()) {
            log.error("微信access_token为空: {}", resp);
            throw new BusinessException(2003, "微信服务暂不可用");
        }
        redisTemplate.opsForValue().set(ACCESS_TOKEN_CACHE_KEY, token, 7000, TimeUnit.SECONDS);
        return token;
    }
}
