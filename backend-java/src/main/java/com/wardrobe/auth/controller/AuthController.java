package com.wardrobe.auth.controller;

import com.wardrobe.auth.service.AuthService;
import com.wardrobe.common.dto.ApiResponse;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request.getCode(), request.getUserInfo()));
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "缺少微信登录code")
        private String code;
        private UserInfoDTO userInfo;
    }

    @Data
    public static class UserInfoDTO {
        private String nickname;
        private String avatarUrl;
    }
}
