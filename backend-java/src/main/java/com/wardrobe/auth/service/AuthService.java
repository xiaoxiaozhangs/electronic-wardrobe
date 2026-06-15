package com.wardrobe.auth.service;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.wardrobe.common.config.WechatConfig;
import com.wardrobe.common.exception.BusinessException;
import com.wardrobe.common.utils.JwtUtils;
import com.wardrobe.wardrobe.entity.User;
import com.wardrobe.wardrobe.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final JwtUtils jwtUtils;
    private final WechatConfig wechatConfig;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String WX_CODE2SESSION_URL =
            "https://api.weixin.qq.com/sns/jscode2session" +
            "?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code";

    /**
     * 微信登录 - 用code换取openid，签发JWT
     */
    public Map<String, Object> login(String code, AuthController.UserInfoDTO userInfo) {
        // 1. 调用微信接口换取openid
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
        String unionid = wxResult.getStr("unionid");

        // 2. 查用户表
        User user = userMapper.selectByOpenid(openid);
        boolean isNewUser = false;

        if (user == null) {
            // 新用户
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
            // 老用户更新资料
            if (userInfo != null) {
                if (userInfo.getNickname() != null) user.setNickname(userInfo.getNickname());
                if (userInfo.getAvatarUrl() != null) user.setAvatarUrl(userInfo.getAvatarUrl());
            }
            if (unionid != null) user.setUnionid(unionid);
            user.setUpdatedAt(LocalDateTime.now());
            userMapper.updateById(user);
        }

        String userId = user.getId().toString();

        // 3. 签发JWT
        String token = jwtUtils.generateToken(userId, openid);
        String refreshToken = jwtUtils.generateRefreshToken(userId, openid);

        // 4. 组装返回
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("refreshToken", refreshToken);
        result.put("expiresIn", 604800);

        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("nickname", user.getNickname());
        userMap.put("avatarUrl", user.getAvatarUrl());
        userMap.put("stylePreferences", user.getStylePreferences());
        userMap.put("commonScenarios", user.getCommonScenarios());
        userMap.put("isNewUser", isNewUser);
        result.put("user", userMap);

        return result;
    }
}
