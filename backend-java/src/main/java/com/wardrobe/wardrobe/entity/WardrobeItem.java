package com.wardrobe.wardrobe.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("wardrobe_items")
public class WardrobeItem {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long categoryId;
    private String imageUrl;
    private String thumbnailUrl;
    private String compressedUrl;
    private String primaryColor;
    private String secondaryColors;
    private String pattern;
    private String fabric;
    private String thickness;
    private String seasons;
    private String scenarios;
    private String styles;
    private Integer temperatureMin;
    private Integer temperatureMax;
    private String aiTags;
    private Integer manualEdited;
    private String brand;
    private LocalDate purchaseDate;
    private String note;
    private String status;
    private Integer isFavorite;
    private Integer wearCount;
    private LocalDateTime lastWornAt;
    @TableLogic(value = "0", delval = "1")
    private Integer isDeleted;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
