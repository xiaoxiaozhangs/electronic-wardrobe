package com.wardrobe.wardrobe.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("users")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String openid;
    private String unionid;
    private String nickname;
    private String avatarUrl;
    /** 手机号(微信授权获取) */
    private String phone;
    /** 区号 */
    private String countryCode;
    /** 手机号绑定时间 */
    private LocalDateTime phoneBindAt;
    private String stylePreferences;
    private String commonScenarios;
    private String city;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
