package com.wardrobe.wardrobe.service;

import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wardrobe.common.UserContext;
import com.wardrobe.common.dto.PageResult;
import com.wardrobe.common.exception.BusinessException;
import com.wardrobe.wardrobe.entity.Category;
import com.wardrobe.wardrobe.entity.TagDictionary;
import com.wardrobe.wardrobe.entity.WardrobeItem;
import com.wardrobe.wardrobe.mapper.CategoryMapper;
import com.wardrobe.wardrobe.mapper.TagDictionaryMapper;
import com.wardrobe.wardrobe.mapper.WardrobeItemMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WardrobeService {

    private final WardrobeItemMapper itemMapper;
    private final CategoryMapper categoryMapper;
    private final TagDictionaryMapper tagMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 创建衣物
     */
    @Transactional
    public Map<String, Object> createItem(Map<String, Object> body) {
        Long userId = getCurrentUserId();

        String imageFileId = (String) body.get("imageFileId");
        Integer categoryId = body.get("categoryId") != null ?
                ((Number) body.get("categoryId")).intValue() : null;

        if (imageFileId == null || imageFileId.isEmpty()) {
            throw BusinessException.badRequest("缺少 imageFileId");
        }
        if (categoryId == null) {
            throw BusinessException.badRequest("缺少 categoryId");
        }

        // 校验品类
        Category cat = categoryMapper.selectById(categoryId);
        if (cat == null || cat.getLevel() != 2) {
            throw BusinessException.badRequest("无效的品类ID");
        }

        // 校验颜色
        String primaryColor = (String) body.get("primaryColor");
        if (primaryColor != null && !colorExists(primaryColor)) {
            throw BusinessException.badRequest("颜色\"" + primaryColor + "\"不在标签字典中");
        }

        WardrobeItem item = new WardrobeItem();
        item.setUserId(userId);
        item.setCategoryId(categoryId.longValue());
        item.setImageUrl(imageFileId);
        item.setThumbnailUrl((String) body.get("thumbnailFileId"));
        item.setPrimaryColor(primaryColor);
        item.setSecondaryColors(jsonStr(body.get("secondaryColors")));
        item.setPattern((String) body.get("pattern"));
        item.setThickness((String) body.get("thickness"));
        item.setSeasons(jsonStr(body.get("seasons")));
        item.setScenarios(jsonStr(body.get("scenarios")));
        item.setStyles(jsonStr(body.get("styles")));
        item.setTemperatureMin(body.get("temperatureMin") != null ?
                ((Number) body.get("temperatureMin")).intValue() : null);
        item.setTemperatureMax(body.get("temperatureMax") != null ?
                ((Number) body.get("temperatureMax")).intValue() : null);
        item.setFabric((String) body.get("fabric"));
        item.setBrand((String) body.get("brand"));
        item.setNote((String) body.get("note"));
        item.setStatus("正常");
        item.setIsFavorite(0);
        item.setManualEdited(0);
        item.setWearCount(0);
        item.setIsDeleted(0);
        item.setCreatedAt(LocalDateTime.now());
        item.setUpdatedAt(LocalDateTime.now());

        itemMapper.insert(item);

        // 失效缓存
        evictUserCache(userId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", item.getId());
        result.put("imageFileId", imageFileId);
        result.put("categoryId", categoryId);
        result.put("primaryColor", primaryColor);
        result.put("createdAt", item.getCreatedAt().toString());
        return result;
    }

    /**
     * 衣橱列表 - 分页+筛选
     */
    public PageResult<Map<String, Object>> listItems(Map<String, String[]> params) {
        Long userId = getCurrentUserId();
        int page = Math.max(1, intParam(params, "page", 1));
        int pageSize = Math.min(50, Math.max(1, intParam(params, "pageSize", 20)));

        LambdaQueryWrapper<WardrobeItem> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(WardrobeItem::getUserId, userId)
                .eq(WardrobeItem::getIsDeleted, 0);

        String categoryId = strParam(params, "categoryId");
        if (categoryId != null) wrapper.eq(WardrobeItem::getCategoryId, Long.valueOf(categoryId));
        String primaryColor = strParam(params, "primaryColor");
        if (primaryColor != null) wrapper.eq(WardrobeItem::getPrimaryColor, primaryColor);
        String status = strParam(params, "status");
        if (status != null) wrapper.eq(WardrobeItem::getStatus, status);
        String favoriteOnly = strParam(params, "favoriteOnly");
        if ("true".equals(favoriteOnly)) wrapper.eq(WardrobeItem::getIsFavorite, 1);

        String sortBy = Objects.requireNonNullElse(strParam(params, "sortBy"), "createdAt");
        String sortOrder = "asc".equals(strParam(params, "sortOrder")) ? "asc" : "desc";

        switch (sortBy) {
            case "wearCount" -> wrapper.orderBy(true, "asc".equals(sortOrder),
                    WardrobeItem::getWearCount);
            case "updatedAt" -> wrapper.orderBy(true, "asc".equals(sortOrder),
                    WardrobeItem::getUpdatedAt);
            default -> wrapper.orderBy(true, "asc".equals(sortOrder),
                    WardrobeItem::getCreatedAt);
        }

        Page<WardrobeItem> result = itemMapper.selectPage(
                new Page<>(page, pageSize), wrapper);

        // 获取品类名称
        Map<Long, Category> catMap = new CategoryService(categoryMapper, redisTemplate).getNameMap();

        List<Map<String, Object>> list = result.getRecords().stream()
                .map(item -> toItemVO(item, catMap))
                .collect(Collectors.toList());

        // 前端筛选（JSON数组字段）
        String season = strParam(params, "season");
        if (season != null) {
            list = list.stream().filter(i -> {
                Object s = i.get("seasons");
                return s instanceof List && ((List<?>) s).contains(season);
            }).collect(Collectors.toList());
        }
        String scenario = strParam(params, "scenario");
        if (scenario != null) {
            list = list.stream().filter(i -> {
                Object s = i.get("scenarios");
                return s instanceof List && ((List<?>) s).contains(scenario);
            }).collect(Collectors.toList());
        }
        String style = strParam(params, "style");
        if (style != null) {
            list = list.stream().filter(i -> {
                Object s = i.get("styles");
                return s instanceof List && ((List<?>) s).contains(style);
            }).collect(Collectors.toList());
        }
        String search = strParam(params, "search");
        if (search != null) {
            final String kw = search.toLowerCase();
            list = list.stream().filter(i -> {
                Map<?, ?> cat = (Map<?, ?>) i.get("category");
                return (cat != null && cat.get("name") != null &&
                        cat.get("name").toString().toLowerCase().contains(kw));
            }).collect(Collectors.toList());
        }

        return PageResult.of(list, page, pageSize, result.getTotal());
    }

    /**
     * 衣物详情
     */
    public Map<String, Object> getItemDetail(Long itemId) {
        Long userId = getCurrentUserId();
        WardrobeItem item = itemMapper.selectOne(
                new LambdaQueryWrapper<WardrobeItem>()
                        .eq(WardrobeItem::getId, itemId)
                        .eq(WardrobeItem::getUserId, userId)
                        .eq(WardrobeItem::getIsDeleted, 0));

        if (item == null) throw BusinessException.notFound("衣物不存在");

        Map<Long, Category> catMap = new CategoryService(categoryMapper, redisTemplate).getNameMap();
        Map<String, Object> vo = toItemVO(item, catMap);

        // 添加详情专属字段
        Category cat = catMap.get(item.getCategoryId());
        if (cat != null) {
            Map<String, Object> catInfo = (Map<String, Object>) vo.get("category");
            catInfo.put("parentId", cat.getParentId());
            Category parentCat = catMap.get(cat.getParentId());
            if (parentCat != null) catInfo.put("parentName", parentCat.getName());
        }

        vo.put("aiTags", item.getAiTags() != null ? JSONUtil.parseObj(item.getAiTags()) : null);
        vo.put("manualEdited", item.getManualEdited() == 1);
        vo.put("compressedUrl", item.getCompressedUrl());
        vo.put("fabric", item.getFabric());
        vo.put("temperatureMin", item.getTemperatureMin());
        vo.put("temperatureMax", item.getTemperatureMax());
        vo.put("brand", item.getBrand());
        vo.put("note", item.getNote());
        vo.put("wearCount", item.getWearCount());
        vo.put("lastWornAt", item.getLastWornAt());
        vo.put("updatedAt", item.getUpdatedAt() != null ? item.getUpdatedAt().toString() : null);

        return vo;
    }

    /**
     * 编辑衣物
     */
    @Transactional
    public Map<String, Object> updateItem(Long itemId, Map<String, Object> body) {
        Long userId = getCurrentUserId();
        if (body == null || body.isEmpty()) throw BusinessException.badRequest("请求体为空");

        WardrobeItem item = itemMapper.selectOne(
                new LambdaQueryWrapper<WardrobeItem>()
                        .eq(WardrobeItem::getId, itemId)
                        .eq(WardrobeItem::getUserId, userId)
                        .eq(WardrobeItem::getIsDeleted, 0));

        if (item == null) throw BusinessException.notFound("衣物不存在");

        // 乐观锁检查
        Object expectedVersion = body.get("expectedVersion");
        if (expectedVersion != null && item.getUpdatedAt() != null &&
                !item.getUpdatedAt().toString().equals(expectedVersion.toString())) {
            throw BusinessException.conflict("数据已被其他人修改，请刷新后重试");
        }

        // 更新字段
        copyIfPresent(body, "categoryId", v -> item.setCategoryId(((Number) v).longValue()));
        copyIfPresent(body, "primaryColor", v -> item.setPrimaryColor((String) v));
        copyIfPresent(body, "secondaryColors", v -> item.setSecondaryColors(jsonStr(v)));
        copyIfPresent(body, "pattern", v -> item.setPattern((String) v));
        copyIfPresent(body, "thickness", v -> item.setThickness((String) v));
        copyIfPresent(body, "seasons", v -> item.setSeasons(jsonStr(v)));
        copyIfPresent(body, "scenarios", v -> item.setScenarios(jsonStr(v)));
        copyIfPresent(body, "styles", v -> item.setStyles(jsonStr(v)));
        copyIfPresent(body, "fabric", v -> item.setFabric((String) v));
        copyIfPresent(body, "brand", v -> item.setBrand((String) v));
        copyIfPresent(body, "note", v -> item.setNote((String) v));
        copyIfPresent(body, "status", v -> item.setStatus((String) v));
        copyIfPresent(body, "isFavorite", v -> item.setIsFavorite(toInt(v)));

        item.setManualEdited(1);
        item.setUpdatedAt(LocalDateTime.now());
        itemMapper.updateById(item);

        evictUserCache(userId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", itemId);
        result.put("updatedAt", item.getUpdatedAt().toString());
        return result;
    }

    /**
     * 删除衣物（软删除）
     */
    @Transactional
    public Map<String, Object> deleteItem(Long itemId) {
        Long userId = getCurrentUserId();
        WardrobeItem item = new WardrobeItem();
        item.setId(itemId);
        item.setIsDeleted(1);
        item.setDeletedAt(LocalDateTime.now());
        item.setUpdatedAt(LocalDateTime.now());

        int updated = itemMapper.update(item,
                new LambdaQueryWrapper<WardrobeItem>()
                        .eq(WardrobeItem::getId, itemId)
                        .eq(WardrobeItem::getUserId, userId)
                        .eq(WardrobeItem::getIsDeleted, 0));

        if (updated == 0) throw BusinessException.notFound("衣物不存在");

        evictUserCache(userId);
        return Map.of("deleted", true);
    }

    /**
     * 批量删除
     */
    @Transactional
    public Map<String, Object> batchDelete(List<Long> ids) {
        Long userId = getCurrentUserId();
        if (ids == null || ids.isEmpty()) throw BusinessException.badRequest("缺少 ids");
        if (ids.size() > 50) throw BusinessException.badRequest("单次最多删除50件");

        LocalDateTime now = LocalDateTime.now();
        int deleted = 0;
        List<Long> failedIds = new ArrayList<>();

        for (Long id : ids) {
            try {
                WardrobeItem item = new WardrobeItem();
                item.setIsDeleted(1);
                item.setDeletedAt(now);
                item.setUpdatedAt(now);
                int n = itemMapper.update(item,
                        new LambdaQueryWrapper<WardrobeItem>()
                                .eq(WardrobeItem::getId, id)
                                .eq(WardrobeItem::getUserId, userId)
                                .eq(WardrobeItem::getIsDeleted, 0));
                if (n > 0) deleted++;
                else failedIds.add(id);
            } catch (Exception e) {
                failedIds.add(id);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("deletedCount", deleted);
        result.put("failedIds", failedIds);
        return result;
    }

    // ========== 辅助方法 ==========

    private Long getCurrentUserId() {
        String uid = UserContext.getUserId();
        if (uid == null) throw BusinessException.unauthorized("未登录");
        return Long.valueOf(uid);
    }

    private boolean colorExists(String color) {
        return tagMapper.selectCount(
                new LambdaQueryWrapper<TagDictionary>()
                        .eq(TagDictionary::getTagType, "color")
                        .eq(TagDictionary::getNormalizedName, color)) > 0;
    }

    private Map<String, Object> toItemVO(WardrobeItem item, Map<Long, Category> catMap) {
        Map<String, Object> vo = new LinkedHashMap<>();
        vo.put("id", item.getId());
        vo.put("imageUrl", item.getImageUrl());
        vo.put("thumbnailUrl", item.getThumbnailUrl());

        Category cat = catMap.get(item.getCategoryId());
        if (cat != null) {
            vo.put("category", Map.of(
                    "id", cat.getId(),
                    "name", cat.getName()
            ));
        }
        vo.put("primaryColor", item.getPrimaryColor());
        vo.put("secondaryColors", item.getSecondaryColors() != null ?
                JSONUtil.parseArray(item.getSecondaryColors()) : Collections.emptyList());
        vo.put("pattern", item.getPattern());
        vo.put("thickness", item.getThickness());
        vo.put("seasons", item.getSeasons() != null ?
                JSONUtil.parseArray(item.getSeasons()) : Collections.emptyList());
        vo.put("scenarios", item.getScenarios() != null ?
                JSONUtil.parseArray(item.getScenarios()) : Collections.emptyList());
        vo.put("styles", item.getStyles() != null ?
                JSONUtil.parseArray(item.getStyles()) : Collections.emptyList());
        vo.put("status", item.getStatus());
        vo.put("isFavorite", item.getIsFavorite() == 1);
        vo.put("createdAt", item.getCreatedAt() != null ? item.getCreatedAt().toString() : null);
        return vo;
    }

    private void evictUserCache(Long userId) {
        redisTemplate.delete("wardrobe:user:" + userId);
    }

    // ========== Static helpers ==========

    private static String jsonStr(Object obj) {
        if (obj == null) return null;
        if (obj instanceof String s) return s;
        return JSONUtil.toJsonStr(obj);
    }

    private static String strParam(Map<String, String[]> params, String key) {
        String[] vals = params.get(key);
        return vals != null && vals.length > 0 ? vals[0] : null;
    }

    private static int intParam(Map<String, String[]> params, String key, int defaultVal) {
        String v = strParam(params, key);
        try { return v != null ? Integer.parseInt(v) : defaultVal; }
        catch (NumberFormatException e) { return defaultVal; }
    }

    @SuppressWarnings("unchecked")
    private static <T> void copyIfPresent(Map<String, Object> map, String key,
                                           java.util.function.Consumer<Object> setter) {
        Object v = map.get(key);
        if (v != null) setter.accept(v);
    }

    private static int toInt(Object v) {
        if (v instanceof Boolean b) return b ? 1 : 0;
        if (v instanceof Number n) return n.intValue();
        return 0;
    }
}
