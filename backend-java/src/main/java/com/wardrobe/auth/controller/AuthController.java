package com.wardrobe.auth.controller;

import com.wardrobe.auth.service.AuthService;
import com.wardrobe.common.UserContext;
import com.wardrobe.common.dto.ApiResponse;
import com.wardrobe.common.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 认证模块
 * - POST /api/v1/auth/login   微信code换token
 * - POST /api/v1/auth/phone   绑定手机号
 * - GET  /api/v1/auth/profile 获取当前用户信息
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody @Valid LoginRequest request) {
        return ApiResponse.success(authService.login(request.getCode(), request.getUserInfo()));
    }

    /**
     * 微信小程序手机号授权 - 需先登录(JWT校验)
     * 入参 code: getPhoneNumber 返回的 dynamic code
     */
    @PostMapping("/phone")
    public ApiResponse<Map<String, Object>> bindPhone(@RequestBody @Valid PhoneRequest request) {
        Long userId = currentUserId();
        return ApiResponse.success(authService.bindPhone(userId, request.getCode()));
    }

    /**
     * 获取当前用户信息 - 需登录
     */
    @GetMapping("/profile")
    public ApiResponse<Map<String, Object>> profile() {
        Long userId = currentUserId();
        return ApiResponse.success(authService.getProfile(userId));
    }

    private Long currentUserId() {
        String uid = UserContext.getUserId();
        if (uid == null) throw BusinessException.unauthorized("未登录");
        return Long.valueOf(uid);
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "缺少微信登录code")
        private String code;
        private UserInfoDTO userInfo;
    }

    @Data
    public static class PhoneRequest {
        @NotBlank(message = "缺少手机号授权code")
        private String code;
    }

    @Data
    public static class UserInfoDTO {
        private String nickname;
        private String avatarUrl;
    }
}
