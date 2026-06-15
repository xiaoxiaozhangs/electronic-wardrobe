package com.wardrobe.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "wechat.miniapp")
public class WechatConfig {
    private String appId;
    private String appSecret;
}
