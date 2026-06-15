package com.wardrobe.wardrobe.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("tag_dictionary")
public class TagDictionary {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String tagType;
    private String tagName;
    private String normalizedName;
    private String aliases;
    private Integer sortOrder;
    private LocalDateTime createdAt;
}
