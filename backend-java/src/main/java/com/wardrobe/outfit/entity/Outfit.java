package com.wardrobe.wardrobe.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("outfits")
public class Outfit {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String name;
    private String items;
    private String scenario;
    private String season;
    private String style;
    private String weatherCondition;
    private String llmExplanation;
    private String coverImageUrl;
    private Integer score;
    private String source;
    private Integer isFavorite;
    private String feedback;
    private LocalDateTime createdAt;
}
