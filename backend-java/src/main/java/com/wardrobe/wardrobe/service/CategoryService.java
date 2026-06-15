package com.wardrobe.wardrobe.service;

import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wardrobe.wardrobe.entity.Category;
import com.wardrobe.wardrobe.mapper.CategoryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryMapper categoryMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_KEY = "categories:tree";

    /**
     * 获取品类树（一级 -> 二级），缓存24小时
     */
    public List<Map<String, Object>> getCategoryTree() {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> cached = (List<Map<String, Object>>) redisTemplate.opsForValue().get(CACHE_KEY);
        if (cached != null) return cached;

        List<Category> all = categoryMapper.selectList(
                new LambdaQueryWrapper<Category>().orderByAsc(Category::getSortOrder));

        // 一级品类
        List<Category> parents = all.stream()
                .filter(c -> c.getParentId() == null || c.getParentId() == 0)
                .collect(Collectors.toList());

        // 二级品类
        Map<Long, List<Category>> childrenMap = all.stream()
                .filter(c -> c.getParentId() != null && c.getParentId() > 0)
                .collect(Collectors.groupingBy(Category::getParentId));

        List<Map<String, Object>> tree = parents.stream().map(p -> {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("id", p.getId());
            node.put("name", p.getName());
            node.put("level", p.getLevel());
            node.put("seasonSuitability", p.getSeasonSuitability() != null ?
                    JSONUtil.parseArray(p.getSeasonSuitability()) : Collections.emptyList());
            node.put("weatherSuitability", p.getWeatherSuitability() != null ?
                    JSONUtil.parseObj(p.getWeatherSuitability()) : Collections.emptyMap());

            List<Category> children = childrenMap.getOrDefault(p.getId(), Collections.emptyList());
            node.put("children", children.stream().map(c -> {
                Map<String, Object> child = new LinkedHashMap<>();
                child.put("id", c.getId());
                child.put("name", c.getName());
                child.put("parentId", c.getParentId());
                child.put("level", c.getLevel());
                child.put("seasonSuitability", c.getSeasonSuitability() != null ?
                        JSONUtil.parseArray(c.getSeasonSuitability()) : Collections.emptyList());
                return child;
            }).collect(Collectors.toList()));

            return node;
        }).collect(Collectors.toList());

        redisTemplate.opsForValue().set(CACHE_KEY, tree, 24, TimeUnit.HOURS);
        return tree;
    }

    /**
     * 获取所有品类 (用于内部查询)
     */
    public List<Category> getAll() {
        return categoryMapper.selectList(null);
    }

    /**
     * 获取品类名称映射
     */
    public Map<Long, Category> getNameMap() {
        return getAll().stream().collect(Collectors.toMap(Category::getId, c -> c));
    }

    /**
     * 失效缓存
     */
    public void evictCache() {
        redisTemplate.delete(CACHE_KEY);
    }
}
