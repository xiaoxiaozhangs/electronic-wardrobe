package com.wardrobe.wardrobe.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("recommendation_logs")
public class RecommendationLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String taskId;
    private String requestParams;
    private String status;
    private String candidateItemIds;
    private String resultOutfitIds;
    private String model;
    private BigDecimal cost;
    private Integer latencyMs;
    private String errorMessage;
    private LocalDateTime createdAt;
}
