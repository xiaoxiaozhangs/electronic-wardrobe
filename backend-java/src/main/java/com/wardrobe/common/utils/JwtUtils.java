package com.wardrobe.common.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtils {

    private final SecretKey key;
    private final long expiration;
    private final long refreshExpiration;

    public JwtUtils(
            @Value("${jwt.secret:electronic-wardrobe-jwt-secret-2026-min-len-32!!}") String secret,
            @Value("${jwt.expiration:604800}") long expiration,
            @Value("${jwt.refresh-expiration:2592000}") long refreshExpiration) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(
                java.util.Base64.getEncoder().encodeToString(secret.getBytes())));
        this.expiration = expiration;
        this.refreshExpiration = refreshExpiration;
    }

    public String generateToken(String userId, String openid) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("openid", openid);
        return createToken(claims, expiration);
    }

    public String generateRefreshToken(String userId, String openid) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("openid", openid);
        claims.put("type", "refresh");
        return createToken(claims, refreshExpiration);
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getUserId(String token) {
        return parseToken(token).get("userId", String.class);
    }

    public String getOpenid(String token) {
        return parseToken(token).get("openid", String.class);
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String createToken(Map<String, Object> claims, long expireSeconds) {
        Date now = new Date();
        return Jwts.builder()
                .claims(claims)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expireSeconds * 1000))
                .signWith(key)
                .compact();
    }
}
