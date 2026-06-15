package com.wardrobe.auth.interceptor;

import com.wardrobe.common.UserContext;
import com.wardrobe.common.exception.BusinessException;
import com.wardrobe.common.utils.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

@Slf4j
@Component
public class JwtInterceptor implements HandlerInterceptor {

    private final JwtUtils jwtUtils;

    public JwtInterceptor(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String auth = request.getHeader("Authorization");
        if (!StringUtils.hasText(auth) || !auth.startsWith("Bearer ")) {
            throw new BusinessException(1002, "未登录或Token已过期");
        }

        String token = auth.substring(7);
        if (!jwtUtils.validateToken(token)) {
            throw new BusinessException(1002, "未登录或Token已过期");
        }

        String userId = jwtUtils.getUserId(token);
        String openid = jwtUtils.getOpenid(token);
        UserContext.set(userId, openid);

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        UserContext.clear();
    }
}
