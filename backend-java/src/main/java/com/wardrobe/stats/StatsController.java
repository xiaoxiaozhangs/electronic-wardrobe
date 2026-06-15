package com.wardrobe.stats;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wardrobe.common.UserContext;
import com.wardrobe.common.dto.ApiResponse;
import com.wardrobe.common.exception.BusinessException;
import com.wardrobe.outfit.mapper.OutfitMapper;
import com.wardrobe.wardrobe.entity.*;
import com.wardrobe.wardrobe.mapper.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/stats")
@RequiredArgsConstructor
public class StatsController {

    private final WardrobeItemMapper itemMapper;
    private final CategoryMapper categoryMapper;
    private final OutfitMapper outfitMapper;

    @GetMapping("/wardrobe")
    public ApiResponse<Map<String, Object>> stats() {
        Long userId = getCurrentUserId();

        // 衣物统计
        List<WardrobeItem> allItems = itemMapper.selectList(
                new LambdaQueryWrapper<WardrobeItem>()
                        .eq(WardrobeItem::getUserId, userId)
                        .eq(WardrobeItem::getIsDeleted, 0));

        long totalItems = allItems.size();
        long activeItems = allItems.stream().filter(i -> "正常".equals(i.getStatus())).count();

        // 品类统计
        Map<Long, Category> catMap = categoryMapper.selectList(null).stream()
                .collect(Collectors.toMap(Category::getId, c -> c, (a, b) -> a));

        Map<Long, Long> byCategory = allItems.stream()
                .collect(Collectors.groupingBy(WardrobeItem::getCategoryId, Collectors.counting()));
        List<Map<String, Object>> categoryStats = byCategory.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> {
                    Category cat = catMap.get(e.getKey());
                    return Map.of("categoryId", e.getKey(),
                            "categoryName", (Object) (cat != null ? cat.getName() : "未知"),
                            "count", e.getValue());
                }).collect(Collectors.toList());

        // 颜色统计
        Map<String, Long> byColor = allItems.stream()
                .map(WardrobeItem::getPrimaryColor)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));
        List<Map<String, Object>> colorStats = byColor.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> Map.of("color", (Object) e.getKey(), "count", e.getValue()))
                .collect(Collectors.toList());

        // 状态统计
        Map<String, Long> byStatus = allItems.stream()
                .collect(Collectors.groupingBy(WardrobeItem::getStatus, Collectors.counting()));
        List<Map<String, Object>> statusStats = byStatus.entrySet().stream()
                .map(e -> Map.of("status", (Object) e.getKey(), "count", e.getValue()))
                .collect(Collectors.toList());

        // 最常穿
        List<WardrobeItem> mostWorn = itemMapper.selectList(
                new LambdaQueryWrapper<WardrobeItem>()
                        .eq(WardrobeItem::getUserId, userId)
                        .eq(WardrobeItem::getIsDeleted, 0)
                        .eq(WardrobeItem::getStatus, "正常")
                        .orderByDesc(WardrobeItem::getWearCount)
                        .last("LIMIT 5"));

        List<Map<String, Object>> mostWornVOs = mostWorn.stream().map(item -> {
            Category cat = catMap.get(item.getCategoryId());
            return Map.of("itemId", item.getId(),
                    "categoryName", (Object) (cat != null ? cat.getName() : "未知"),
                    "primaryColor", Objects.requireNonNullElse(item.getPrimaryColor(), ""),
                    "wearCount", item.getWearCount());
        }).collect(Collectors.toList());

        // 最少穿
        List<WardrobeItem> leastWorn = itemMapper.selectList(
                new LambdaQueryWrapper<WardrobeItem>()
                        .eq(WardrobeItem::getUserId, userId)
                        .eq(WardrobeItem::getIsDeleted, 0)
                        .eq(WardrobeItem::getStatus, "正常")
                        .orderByAsc(WardrobeItem::getWearCount)
                        .last("LIMIT 5"));
        List<Map<String, Object>> leastWornVOs = leastWorn.stream().map(item -> {
            Category cat = catMap.get(item.getCategoryId());
            return Map.of("itemId", item.getId(),
                    "categoryName", (Object) (cat != null ? cat.getName() : "未知"),
                    "primaryColor", Objects.requireNonNullElse(item.getPrimaryColor(), ""),
                    "wearCount", item.getWearCount());
        }).collect(Collectors.toList());

        // 搭配统计
        Long totalOutfits = outfitMapper.selectCount(
                new LambdaQueryWrapper<Outfit>().eq(Outfit::getUserId, userId));
        Long favoriteOutfits = outfitMapper.selectCount(
                new LambdaQueryWrapper<Outfit>().eq(Outfit::getUserId, userId).eq(Outfit::getIsFavorite, 1));
        Long feedbackLike = outfitMapper.selectCount(
                new LambdaQueryWrapper<Outfit>().eq(Outfit::getUserId, userId).eq(Outfit::getFeedback, "喜欢"));
        Long feedbackDislike = outfitMapper.selectCount(
                new LambdaQueryWrapper<Outfit>().eq(Outfit::getUserId, userId).eq(Outfit::getFeedback, "不合适"));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalItems", totalItems);
        data.put("activeItems", activeItems);
        data.put("byCategory", categoryStats);
        data.put("byColor", colorStats);
        data.put("byStatus", statusStats);
        data.put("mostWorn", mostWornVOs);
        data.put("leastWorn", leastWornVOs);
        data.put("outfitStats", Map.of(
                "totalOutfits", totalOutfits,
                "favoriteOutfits", favoriteOutfits,
                "feedbackLike", feedbackLike,
                "feedbackDislike", feedbackDislike
        ));

        return ApiResponse.success(data);
    }

    private Long getCurrentUserId() {
        String uid = UserContext.getUserId();
        if (uid == null) throw BusinessException.unauthorized("未登录");
        return Long.valueOf(uid);
    }
}
