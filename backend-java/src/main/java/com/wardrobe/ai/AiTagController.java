package com.wardrobe.ai;

import com.wardrobe.common.UserContext;
import com.wardrobe.common.dto.ApiResponse;
import com.wardrobe.common.exception.BusinessException;
import com.wardrobe.wardrobe.entity.WardrobeItem;
import com.wardrobe.wardrobe.mapper.WardrobeItemMapper;
import com.wardrobe.wardrobe.mapper.CategoryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * AI标签识别 - MVP预留接口
 * 后续接入百度AI/腾讯云图像识别
 */
@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiTagController {

    private final WardrobeItemMapper itemMapper;
    private final CategoryMapper categoryMapper;

    @PostMapping("/tag-item")
    public ApiResponse<Map<String, Object>> tagItem(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(UserContext.getUserId());
        Object itemIdObj = body.get("itemId");
        if (itemIdObj == null) throw BusinessException.badRequest("缺少 itemId");
        Long itemId = ((Number) itemIdObj).longValue();

        // 校验衣物存在
        WardrobeItem item = itemMapper.selectById(itemId);
        if (item == null || !item.getUserId().equals(userId) || item.getIsDeleted() == 1) {
            throw BusinessException.notFound("衣物不存在");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("itemId", itemId);
        result.put("taskId", UUID.randomUUID().toString());
        result.put("status", "pending");
        result.put("note", "AI 识别暂未接入，当前版本请手动填写标签");

        Map<String, Object> suggestions = new LinkedHashMap<>();
        suggestions.put("category", item.getCategoryId());
        suggestions.put("colors", List.of("黑色", "白色"));
        suggestions.put("scenarios", List.of("通勤", "休闲"));
        suggestions.put("styles", List.of("简约"));
        result.put("suggestions", suggestions);

        return ApiResponse.success(result);
    }
}
