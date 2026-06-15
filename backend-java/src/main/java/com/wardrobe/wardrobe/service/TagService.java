package com.wardrobe.wardrobe.service;

import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wardrobe.wardrobe.entity.TagDictionary;
import com.wardrobe.wardrobe.mapper.TagDictionaryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagDictionaryMapper tagMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_KEY = "tags:all";

    /**
     * 获取标签字典，按类型分组，缓存1小时
     */
    public Map<String, List<Map<String, Object>>> getTagsGrouped(String types) {
        // 从缓存获取全部
        @SuppressWarnings("unchecked")
        Map<String, List<Map<String, Object>>> cached =
                (Map<String, List<Map<String, Object>>>) redisTemplate.opsForValue().get(CACHE_KEY);
        if (cached == null) {
            cached = loadAndCache();
        }

        // 按类型筛选
        if (!StringUtils.hasText(types)) return cached;

        Set<String> typeSet = Arrays.stream(types.split(","))
                .map(String::trim).collect(Collectors.toSet());

        Map<String, List<Map<String, Object>>> filtered = new LinkedHashMap<>();
        typeSet.forEach(t -> {
            if (cached.containsKey(t)) filtered.put(t, cached.get(t));
        });
        return filtered;
    }

    private Map<String, List<Map<String, Object>>> loadAndCache() {
        List<TagDictionary> all = tagMapper.selectList(
                new LambdaQueryWrapper<TagDictionary>().orderByAsc(TagDictionary::getSortOrder));

        Map<String, List<Map<String, Object>>> grouped = new LinkedHashMap<>();
        for (TagDictionary t : all) {
            grouped.computeIfAbsent(t.getTagType(), k -> new ArrayList<>())
                    .add(Map.of(
                            "id", t.getId(),
                            "name", t.getTagName(),
                            "aliases", t.getAliases() != null ?
                                    JSONUtil.parseArray(t.getAliases()) : Collections.emptyList(),
                            "normalizedName", t.getNormalizedName()
                    ));
        }

        redisTemplate.opsForValue().set(CACHE_KEY, grouped, 1, TimeUnit.HOURS);
        return grouped;
    }
}
