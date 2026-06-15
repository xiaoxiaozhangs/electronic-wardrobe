package com.wardrobe.outfit.service;

import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wardrobe.common.UserContext;
import com.wardrobe.common.dto.PageResult;
import com.wardrobe.common.exception.BusinessException;
import com.wardrobe.outfit.mapper.OutfitMapper;
import com.wardrobe.wardrobe.entity.*;
import com.wardrobe.wardrobe.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutfitService {

    private final OutfitMapper outfitMapper;
    private final WardrobeItemMapper itemMapper;
    private final CategoryMapper categoryMapper;
    private final RecommendationLogMapper logMapper;
    private final OutfitEngine outfitEngine;

    private static final int DAILY_GENERATE_LIMIT = 30;

    /**
     * 生成搭配（异步模式，但MVP阶段同步执行）
     */
    @Transactional
    public Map<String, Object> generate(Map<String, Object> body) {
        Long userId = getCurrentUserId();

        String scenario = (String) body.get("scenario");
        if (scenario == null || scenario.isEmpty()) throw BusinessException.badRequest("缺少 scenario");

        // 日限额检查
        LocalDateTime today = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        Long todayCount = logMapper.selectCount(
                new LambdaQueryWrapper<RecommendationLog>()
                        .eq(RecommendationLog::getUserId, userId)
                        .ge(RecommendationLog::getCreatedAt, today));
        if (todayCount >= DAILY_GENERATE_LIMIT) {
            throw BusinessException.rateLimited("每日搭配生成次数已达上限（" + DAILY_GENERATE_LIMIT + "次）");
        }

        String taskId = UUID.randomUUID().toString();

        // 构建请求参数
        OutfitEngine.RecommendRequest request = new OutfitEngine.RecommendRequest(
                scenario,
                (String) body.get("season"),
                (String) body.get("style"),
                body.get("temperature") != null ? ((Number) body.get("temperature")).intValue() : null,
                (String) body.get("weather"),
                body.get("mustIncludeItemId") != null ?
                        ((Number) body.get("mustIncludeItemId")).longValue() : null,
                castToLongList(body.get("excludeItemIds")),
                Math.min(body.get("count") != null ? ((Number) body.get("count")).intValue() : 4, 5)
        );

        // 写入日志
        RecommendationLog logEntry = new RecommendationLog();
        logEntry.setUserId(userId);
        logEntry.setTaskId(taskId);
        logEntry.setRequestParams(JSONUtil.toJsonStr(request));
        logEntry.setStatus("pending");
        logEntry.setCreatedAt(LocalDateTime.now());
        logMapper.insert(logEntry);

        // 执行搭配生成
        long startTime = System.currentTimeMillis();
        try {
            logEntry.setStatus("processing");
            logMapper.updateById(logEntry);

            // 获取用户所有可用衣物
            List<WardrobeItem> allItems = itemMapper.selectList(
                    new LambdaQueryWrapper<WardrobeItem>()
                            .eq(WardrobeItem::getUserId, userId)
                            .eq(WardrobeItem::getIsDeleted, 0)
                            .eq(WardrobeItem::getStatus, "正常"));

            // 品类名称映射
            Map<Long, String> catNameMap = getAll().stream()
                    .collect(Collectors.toMap(Category::getId, Category::getName));

            // 执行引擎
            OutfitEngine.OutfitResult engineResult = outfitEngine.recommend(allItems, request, catNameMap);

            // 保存搭配结果
            List<Map<String, Object>> savedOutfits = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();

            for (OutfitEngine.ScoredOutfit scored : engineResult.outfits()) {
                List<Map<String, Object>> itemList = scored.items().stream().map(item -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("item_id", item.getId());
                    m.put("category_id", item.getCategoryId());
                    m.put("category_name", catNameMap.getOrDefault(item.getCategoryId(), ""));
                    m.put("position", catNameMap.getOrDefault(item.getCategoryId(), ""));
                    m.put("primary_color", item.getPrimaryColor());
                    m.put("thumbnail_url", item.getThumbnailUrl());
                    return m;
                }).collect(Collectors.toList());

                Outfit outfit = new Outfit();
                outfit.setUserId(userId);
                outfit.setName(buildOutfitName(scenario, request.style, savedOutfits.size() + 1));
                outfit.setItems(JSONUtil.toJsonStr(itemList));
                outfit.setScenario(scenario);
                outfit.setSeason(request.season);
                outfit.setStyle(request.style);
                outfit.setWeatherCondition(request.temperature != null ?
                        JSONUtil.toJsonStr(Map.of("temperature", request.temperature, "weather",
                                request.weather != null ? request.weather : "")) : null);
                outfit.setLlmExplanation(String.join("。", scored.reasons()));
                outfit.setCoverImageUrl(itemList.size() > 0 ?
                        (String) itemList.get(0).get("thumbnail_url") : null);
                outfit.setScore((int) (scored.score() * 100));
                outfit.setSource("rule");
                outfit.setIsFavorite(0);
                outfit.setCreatedAt(now);

                outfitMapper.insert(outfit);

                Map<String, Object> vo = new LinkedHashMap<>();
                vo.put("id", outfit.getId());
                vo.put("name", outfit.getName());
                vo.put("items", itemList);
                vo.put("score", scored.score());
                vo.put("reason", outfit.getLlmExplanation());
                vo.put("scenario", scenario);
                vo.put("season", request.season);
                vo.put("style", request.style);
                savedOutfits.add(vo);
            }

            int latencyMs = (int) (System.currentTimeMillis() - startTime);

            // 更新日志
            logEntry.setStatus("completed");
            logEntry.setResultOutfitIds(JSONUtil.toJsonStr(
                    savedOutfits.stream().map(o -> o.get("id")).collect(Collectors.toList())));
            logEntry.setLatencyMs(latencyMs);
            logEntry.setModel("rule-engine-v1");
            logEntry.setCost(BigDecimal.ZERO);
            logMapper.updateById(logEntry);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("taskId", taskId);
            result.put("status", "pending");
            result.put("estimatedSeconds", 5);
            return result;

        } catch (Exception e) {
            log.error("搭配生成失败", e);
            logEntry.setStatus("failed");
            logEntry.setErrorMessage(e.getMessage());
            logEntry.setLatencyMs((int) (System.currentTimeMillis() - startTime));
            logMapper.updateById(logEntry);
            throw e;
        }
    }

    /**
     * 轮询搭配结果
     */
    public Map<String, Object> getResult(String taskId) {
        Long userId = getCurrentUserId();
        RecommendationLog logEntry = logMapper.selectOne(
                new LambdaQueryWrapper<RecommendationLog>()
                        .eq(RecommendationLog::getTaskId, taskId)
                        .eq(RecommendationLog::getUserId, userId));

        if (logEntry == null) throw BusinessException.notFound("任务不存在");

        if ("pending".equals(logEntry.getStatus()) || "processing".equals(logEntry.getStatus())) {
            return Map.of("taskId", taskId, "status", logEntry.getStatus());
        }

        if ("failed".equals(logEntry.getStatus())) {
            return Map.of("taskId", taskId, "status", "failed",
                    "errorMessage", Objects.requireNonNullElse(logEntry.getErrorMessage(), "搭配生成失败"));
        }

        // 加载搭配
        String outfitIdsJson = logEntry.getResultOutfitIds();
        List<Long> outfitIds = JSONUtil.parseArray(outfitIdsJson).toList(Long.class);

        List<Outfit> outfits = outfitMapper.selectList(
                new LambdaQueryWrapper<Outfit>()
                        .in(Outfit::getId, outfitIds)
                        .eq(Outfit::getUserId, userId));

        List<Map<String, Object>> outfitVOs = outfits.stream().map(o -> {
            Map<String, Object> vo = new LinkedHashMap<>();
            vo.put("id", o.getId());
            vo.put("name", o.getName());
            vo.put("items", JSONUtil.parseArray(o.getItems()));
            vo.put("score", o.getScore());
            vo.put("reason", o.getLlmExplanation());
            vo.put("scenario", o.getScenario());
            vo.put("season", o.getSeason());
            vo.put("style", o.getStyle());
            return vo;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("taskId", taskId);
        result.put("status", "completed");
        result.put("outfits", outfitVOs);
        result.put("processingTimeMs", logEntry.getLatencyMs());
        return result;
    }

    /**
     * 搭配列表
     */
    public PageResult<Map<String, Object>> list(int page, int pageSize, boolean favoriteOnly, String scenario) {
        Long userId = getCurrentUserId();
        page = Math.max(1, page);
        pageSize = Math.min(20, Math.max(1, pageSize));

        LambdaQueryWrapper<Outfit> wrapper = new LambdaQueryWrapper<Outfit>()
                .eq(Outfit::getUserId, userId);
        if (favoriteOnly) wrapper.eq(Outfit::getIsFavorite, 1);
        if (scenario != null && !scenario.isEmpty()) wrapper.eq(Outfit::getScenario, scenario);
        wrapper.orderByDesc(Outfit::getCreatedAt);

        Page<Outfit> result = outfitMapper.selectPage(new Page<>(page, pageSize), wrapper);

        List<Map<String, Object>> list = result.getRecords().stream().map(o -> {
            Map<String, Object> vo = new LinkedHashMap<>();
            vo.put("id", o.getId());
            vo.put("name", o.getName());
            vo.put("itemCount", o.getItems() != null ?
                    JSONUtil.parseArray(o.getItems()).size() : 0);
            vo.put("coverImageUrl", o.getCoverImageUrl());
            vo.put("scenario", o.getScenario());
            vo.put("season", o.getSeason());
            vo.put("style", o.getStyle());
            vo.put("isFavorite", o.getIsFavorite() == 1);
            vo.put("feedback", o.getFeedback());
            vo.put("source", o.getSource());
            vo.put("score", o.getScore());
            vo.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
            return vo;
        }).collect(Collectors.toList());

        return PageResult.of(list, page, pageSize, result.getTotal());
    }

    /**
     * 搭配详情
     */
    public Map<String, Object> detail(Long outfitId) {
        Long userId = getCurrentUserId();
        Outfit outfit = outfitMapper.selectOne(
                new LambdaQueryWrapper<Outfit>()
                        .eq(Outfit::getId, outfitId)
                        .eq(Outfit::getUserId, userId));

        if (outfit == null) throw BusinessException.notFound("搭配不存在");

        Map<String, Object> vo = new LinkedHashMap<>();
        vo.put("id", outfit.getId());
        vo.put("name", outfit.getName());
        vo.put("items", outfit.getItems() != null ? JSONUtil.parseArray(outfit.getItems()) : Collections.emptyList());
        vo.put("scenario", outfit.getScenario());
        vo.put("season", outfit.getSeason());
        vo.put("style", outfit.getStyle());
        vo.put("score", outfit.getScore());
        vo.put("reason", outfit.getLlmExplanation());
        vo.put("weatherCondition", outfit.getWeatherCondition() != null ?
                JSONUtil.parseObj(outfit.getWeatherCondition()) : null);
        vo.put("source", outfit.getSource());
        vo.put("isFavorite", outfit.getIsFavorite() == 1);
        vo.put("feedback", outfit.getFeedback());
        vo.put("createdAt", outfit.getCreatedAt() != null ? outfit.getCreatedAt().toString() : null);
        return vo;
    }

    /**
     * 搭配反馈
     */
    @Transactional
    public Map<String, Object> feedback(Long outfitId, Map<String, Object> body) {
        Long userId = getCurrentUserId();
        String feedback = (String) body.get("feedback");
        Boolean isFavorite = body.get("isFavorite") != null ?
                (body.get("isFavorite") instanceof Boolean b ? b : "true".equals(body.get("isFavorite").toString())) : null;

        if (feedback == null && isFavorite == null) {
            throw BusinessException.badRequest("缺少 feedback 或 isFavorite");
        }
        if (feedback != null && !List.of("喜欢", "一般", "不合适").contains(feedback)) {
            throw BusinessException.badRequest("feedback 必须为 喜欢/一般/不合适");
        }

        Outfit update = new Outfit();
        update.setId(outfitId);
        if (feedback != null) update.setFeedback(feedback);
        if (isFavorite != null) update.setIsFavorite(isFavorite ? 1 : 0);

        int n = outfitMapper.update(update,
                new LambdaQueryWrapper<Outfit>()
                        .eq(Outfit::getId, outfitId)
                        .eq(Outfit::getUserId, userId));

        if (n == 0) throw BusinessException.notFound("搭配不存在");

        return Map.of("updated", true);
    }

    // ===== 辅助 =====
    private Long getCurrentUserId() {
        String uid = UserContext.getUserId();
        if (uid == null) throw BusinessException.unauthorized("未登录");
        return Long.valueOf(uid);
    }

    private List<Category> getAll() {
        return categoryMapper.selectList(null);
    }

    @SuppressWarnings("unchecked")
    private List<Long> castToLongList(Object obj) {
        if (obj instanceof List<?> list) {
            return list.stream()
                    .filter(Number.class::isInstance)
                    .map(o -> ((Number) o).longValue())
                    .collect(Collectors.toList());
        }
        return Collections.emptyList();
    }

    private String buildOutfitName(String scenario, String style, int index) {
        Map<String, String> prefixMap = Map.of(
                "通勤", "职场", "休闲", "日常", "运动", "活力",
                "正式", "正式", "约会", "浪漫", "聚会", "吸睛", "旅行", "舒适"
        );
        String prefix = prefixMap.getOrDefault(scenario, "");
        return (prefix + (style != null ? style : "") + "搭配" + index);
    }
}
