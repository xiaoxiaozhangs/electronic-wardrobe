package com.wardrobe.outfit.service;

import cn.hutool.json.JSONUtil;
import com.wardrobe.wardrobe.entity.WardrobeItem;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * 搭配规则引擎 - Java 版
 * 端口自 wardrobe-engine.js
 *
 * 三层策略：
 *   Layer 1: 硬规则过滤 — 排除不可用衣物
 *   Layer 2: 搭配规则生成候选 — 品类组合 + 颜色搭配 + 风格一致性
 *   Layer 3: 规则评分排序
 */
@Component
public class OutfitEngine {

    // ===== 品类常量 =====
    private static final String CAT_TOP = "上衣";
    private static final String CAT_BOTTOM = "下装";
    private static final String CAT_DRESS = "连衣裙";
    private static final String CAT_OUTERWEAR = "外套";
    private static final String CAT_SHOES = "鞋";
    private static final String CAT_BAG = "包";
    private static final String CAT_ACCESSORY = "配饰";

    // ===== 搭配模板 =====
    private static final List<OutfitTemplate> TEMPLATES = List.of(
        new OutfitTemplate("日常基础搭配", List.of(CAT_TOP, CAT_BOTTOM, CAT_SHOES),
            List.of(CAT_OUTERWEAR, CAT_BAG, CAT_ACCESSORY), 1.0),
        new OutfitTemplate("连衣裙搭配", List.of(CAT_DRESS, CAT_SHOES),
            List.of(CAT_OUTERWEAR, CAT_BAG, CAT_ACCESSORY), 1.0),
        new OutfitTemplate("外套叠穿搭配", List.of(CAT_OUTERWEAR, CAT_TOP, CAT_BOTTOM, CAT_SHOES),
            List.of(CAT_BAG, CAT_ACCESSORY), 1.2),
        new OutfitTemplate("完整搭配", List.of(CAT_TOP, CAT_BOTTOM, CAT_OUTERWEAR, CAT_SHOES),
            List.of(CAT_BAG, CAT_ACCESSORY), 1.1),
        new OutfitTemplate("轻便搭配", List.of(CAT_DRESS, CAT_SHOES, CAT_BAG),
            List.of(CAT_ACCESSORY), 0.9)
    );

    // ===== 色系 =====
    private static final Set<String> BASIC_COLORS = Set.of(
            "黑色", "白色", "灰色", "米色", "卡其色", "藏青色", "深蓝", "浅灰", "银灰");
    private static final Set<String> WARM_COLORS = Set.of(
            "红色", "橙色", "黄色", "粉色", "玫红", "酒红", "砖红", "桃红", "珊瑚色");
    private static final Set<String> COOL_COLORS = Set.of(
            "蓝色", "绿色", "紫色", "青色", "湖蓝", "墨绿", "浅蓝", "天蓝");
    private static final Set<String> NEUTRAL_COLORS = Set.of(
            "棕色", "咖啡色", "驼色", "杏色", "燕麦色");

    // ===== 颜色冲突 =====
    private static final List<ColorClash> COLOR_CLASHES = List.of(
        new ColorClash("红色", "绿色", 0.3),
        new ColorClash("蓝色", "橙色", 0.2),
        new ColorClash("紫色", "黄色", 0.2),
        new ColorClash("粉色", "红色", 0.1),
        new ColorClash("玫红", "橙色", 0.15)
    );

    // ===== 风格冲突 =====
    private static final List<StyleClash> STYLE_CLASHES = List.of(
        new StyleClash("运动", "正式", 0.5),
        new StyleClash("街头", "正式", 0.4),
        new StyleClash("甜美", "街头", 0.15),
        new StyleClash("运动", "法式", 0.3),
        new StyleClash("街头", "法式", 0.25)
    );

    // ===== 场景 -> 推荐风格 =====
    private static final Map<String, List<String>> SCENARIO_STYLE_MAP = Map.of(
        "通勤", List.of("通勤", "简约", "韩系", "法式"),
        "约会", List.of("甜美", "韩系", "法式", "复古"),
        "运动", List.of("运动", "休闲"),
        "正式", List.of("正式", "简约", "通勤"),
        "休闲", List.of("休闲", "街头", "韩系", "简约"),
        "聚会", List.of("街头", "韩系", "法式", "复古"),
        "旅行", List.of("休闲", "运动", "街头")
    );

    private static final double TONAL_BONUS = 0.3;
    private static final double ADJACENT_COLOR_BONUS = 0.15;
    private static final double BASIC_COLOR_BONUS = 0.2;
    private static final double STYLE_MATCH_BONUS = 0.25;
    private static final int MAX_CANDIDATES = 200;

    /**
     * 主入口：生成搭配推荐
     */
    public OutfitResult recommend(List<WardrobeItem> wardrobe, RecommendRequest request,
                                   Map<Long, String> categoryNameMap) {
        // Layer 1: 硬规则过滤
        List<WardrobeItem> filtered = hardFilter(wardrobe, request);
        if (filtered.isEmpty()) {
            return new OutfitResult(Collections.emptyList(), 0, 0, "没有满足条件的可搭配衣物");
        }

        // 按品类分组
        Map<String, List<WardrobeItem>> byCategory = groupByCategory(filtered, categoryNameMap);

        // Layer 2: 搭配模板生成候选
        List<OutfitCandidate> candidates = generateCandidates(byCategory, request, categoryNameMap);
        if (candidates.isEmpty()) {
            return new OutfitResult(Collections.emptyList(), 0, filtered.size(),
                    "当前衣物无法组成完整搭配，请补充衣橱");
        }

        // Layer 3: 评分排序
        List<ScoredOutfit> scored = candidates.stream()
                .map(c -> scoreOutfit(c, request))
                .sorted((a, b) -> Double.compare(b.score, a.score))
                .collect(Collectors.toList());

        // 去重
        List<ScoredOutfit> deduped = dedupOutfits(scored);

        // 取前N
        int max = Math.min(deduped.size(),
                request.count != null ? Math.min(request.count, 5) : 4);
        List<ScoredOutfit> top = deduped.subList(0, Math.max(1, max));

        return new OutfitResult(top, candidates.size(), filtered.size(), null);
    }

    // ===== Layer 1: 硬规则过滤 =====
    private List<WardrobeItem> hardFilter(List<WardrobeItem> items, RecommendRequest request) {
        List<WardrobeItem> result = new ArrayList<>(items);

        // 状态过滤
        result.removeIf(item -> !"正常".equals(item.getStatus()));

        // 季节过滤
        if (request.season != null) {
            result.removeIf(item -> {
                List<String> seasons = parseJsonArray(item.getSeasons());
                return !seasons.isEmpty() && !seasons.contains(request.season);
            });
        }

        // 场景过滤
        if (request.scenario != null) {
            result.removeIf(item -> {
                List<String> scenarios = parseJsonArray(item.getScenarios());
                return !scenarios.isEmpty() && !scenarios.contains(request.scenario);
            });
        }

        // 排除指定ID
        if (request.excludeItemIds != null && !request.excludeItemIds.isEmpty()) {
            Set<Long> excludeSet = new HashSet<>(request.excludeItemIds);
            result.removeIf(item -> excludeSet.contains(item.getId()));
        }

        return result;
    }

    // ===== Layer 2: 候选生成 =====
    private List<OutfitCandidate> generateCandidates(Map<String, List<WardrobeItem>> byCategory,
                                                      RecommendRequest request,
                                                      Map<Long, String> catNameMap) {
        List<OutfitCandidate> candidates = new ArrayList<>();

        for (OutfitTemplate template : TEMPLATES) {
            // 检查必要品类
            boolean missingRequired = template.required.stream()
                    .anyMatch(cat -> !byCategory.containsKey(cat) || byCategory.get(cat).isEmpty());
            if (missingRequired) continue;

            List<List<WardrobeItem>> combos = cartesianProduct(
                    template.required.stream().map(byCategory::get).collect(Collectors.toList()),
                    20);

            for (List<WardrobeItem> combo : combos) {
                // mustInclude检查
                if (request.mustIncludeItemId != null &&
                    combo.stream().noneMatch(i -> i.getId().equals(request.mustIncludeItemId))) {
                    continue;
                }

                Set<String> seenCategories = new HashSet<>();
                List<WardrobeItem> finalItems = new ArrayList<>();

                for (WardrobeItem item : combo) {
                    String catName = catNameMap.getOrDefault(item.getCategoryId(), "其他");
                    if (!seenCategories.contains(catName)) {
                        seenCategories.add(catName);
                        finalItems.add(item);
                    }
                }

                // 可选品类
                for (String optCat : template.optional) {
                    if (byCategory.containsKey(optCat) && !seenCategories.contains(optCat)) {
                        List<WardrobeItem> opts = byCategory.get(optCat);
                        if (!opts.isEmpty()) {
                            // 优先风格匹配
                            WardrobeItem pick = opts.get(0);
                            if (request.style != null) {
                                pick = opts.stream()
                                        .filter(i -> {
                                            List<String> styles = parseJsonArray(i.getStyles());
                                            return styles.contains(request.style);
                                        })
                                        .findFirst().orElse(opts.get(0));
                            }
                            finalItems.add(pick);
                            seenCategories.add(optCat);
                        }
                    }
                }

                if (finalItems.size() >= template.required.size()) {
                    candidates.add(new OutfitCandidate(finalItems, template));
                }
            }

            if (candidates.size() >= MAX_CANDIDATES) break;
        }

        return candidates;
    }

    // ===== Layer 3: 评分 =====
    private ScoredOutfit scoreOutfit(OutfitCandidate candidate, RecommendRequest request) {
        double completeness = scoreCompleteness(candidate.items, candidate.template);
        double colorHarmony = scoreColorHarmony(candidate.items);
        double styleConsistency = scoreStyleConsistency(candidate.items);
        double scenarioFit = scoreScenarioFit(candidate.items, request);

        double total = completeness * 0.3 + colorHarmony * 0.3 +
                       styleConsistency * 0.2 + scenarioFit * 0.2;

        // 风格匹配加分
        if (request.style != null) {
            long matchCount = candidate.items.stream()
                .filter(i -> {
                    List<String> styles = parseJsonArray(i.getStyles());
                    return styles.contains(request.style);
                }).count();
            total += matchCount * 0.05;
        }
        // 收藏加分
        long favCount = candidate.items.stream()
                .filter(i -> i.getIsFavorite() == 1).count();
        total += favCount * 0.03;

        // 生成理由
        List<String> reasons = buildReasons(candidate.items, colorHarmony, styleConsistency,
                scenarioFit, request);

        return new ScoredOutfit(candidate.items, Math.round(total * 100.0) / 100.0, reasons,
                candidate.template.name);
    }

    private double scoreCompleteness(List<WardrobeItem> items, OutfitTemplate template) {
        Set<String> cats = items.stream()
                .map(i -> i.getCategoryId().toString()).collect(Collectors.toSet());
        double score = 0.5;
        if (cats.contains("1") || cats.contains("3") || cats.contains("4")) score += 0.15; // 上衣/连衣裙/外套
        if (cats.contains("2") || cats.contains("3")) score += 0.15; // 下装/连衣裙
        score += Math.min(0.2, (double) (template.optional.stream()
                .filter(cats::contains).count()) * 0.05);
        return Math.min(1.0, score);
    }

    private double scoreColorHarmony(List<WardrobeItem> items) {
        double score = 0.5;
        List<String> allColors = new ArrayList<>();
        List<String> colorFamilies = new ArrayList<>();

        for (WardrobeItem item : items) {
            if (item.getPrimaryColor() != null) {
                allColors.add(item.getPrimaryColor());
                colorFamilies.add(getColorFamily(item.getPrimaryColor()));
            }
        }

        if (allColors.size() <= 1) return Math.min(1.0, score + 0.3);

        // 主色数量检查
        Set<String> primaryColors = items.stream()
                .map(WardrobeItem::getPrimaryColor).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (primaryColors.size() > 3) score -= 0.05 * (primaryColors.size() - 3);

        // 基础色平衡
        if (allColors.stream().anyMatch(BASIC_COLORS::contains)) {
            score += BASIC_COLOR_BONUS;
        }

        // 同色系加分
        Map<String, Long> familyCounts = colorFamilies.stream()
                .filter(f -> !"basic".equals(f))
                .collect(Collectors.groupingBy(f -> f, Collectors.counting()));
        for (long count : familyCounts.values()) {
            if (count >= 2) score += TONAL_BONUS;
        }

        // 邻近色
        boolean hasWarm = colorFamilies.contains("warm");
        boolean hasCool = colorFamilies.contains("cool");
        if (hasWarm && !hasCool && colorFamilies.stream().filter(f -> "warm".equals(f)).count() >= 2)
            score += ADJACENT_COLOR_BONUS;
        if (hasCool && !hasWarm && colorFamilies.stream().filter(f -> "cool".equals(f)).count() >= 2)
            score += ADJACENT_COLOR_BONUS;

        // 冲突色
        for (ColorClash clash : COLOR_CLASHES) {
            if (allColors.contains(clash.a) && allColors.contains(clash.b)) {
                score -= clash.penalty;
            }
        }

        // 花纹检查
        long patterned = items.stream()
                .filter(i -> i.getPattern() != null && !"纯色".equals(i.getPattern()) && !"素色".equals(i.getPattern()))
                .count();
        if (patterned > 1) score -= 0.1 * (patterned - 1);

        return Math.max(0, Math.min(1.0, score));
    }

    private double scoreStyleConsistency(List<WardrobeItem> items) {
        double score = 0.5;
        List<WardrobeItem> styledItems = items.stream()
                .filter(i -> parseJsonArray(i.getStyles()).size() > 0)
                .collect(Collectors.toList());
        if (styledItems.size() <= 1) return 0.5;

        // 同风格加分
        Map<String, Long> styleCounts = new HashMap<>();
        for (WardrobeItem item : styledItems) {
            for (String style : parseJsonArray(item.getStyles())) {
                styleCounts.merge(style, 1L, Long::sum);
            }
        }
        for (long count : styleCounts.values()) {
            if (count >= 2) score += STYLE_MATCH_BONUS * ((double) count / styledItems.size());
        }

        // 风格冲突
        for (StyleClash clash : STYLE_CLASHES) {
            boolean hasA = false, hasB = false;
            for (WardrobeItem item : styledItems) {
                List<String> styles = parseJsonArray(item.getStyles());
                if (styles.contains(clash.a)) hasA = true;
                if (styles.contains(clash.b)) hasB = true;
            }
            if (hasA && hasB) score -= clash.penalty;
        }

        return Math.max(0, Math.min(1.0, score));
    }

    private double scoreScenarioFit(List<WardrobeItem> items, RecommendRequest request) {
        if (request.scenario == null) return 0.5;
        double score = 0.5;
        List<String> recommendStyles = SCENARIO_STYLE_MAP.getOrDefault(
                request.scenario, Collections.emptyList());

        for (WardrobeItem item : items) {
            List<String> styles = parseJsonArray(item.getStyles());
            long matchCount = styles.stream().filter(recommendStyles::contains).count();
            score += matchCount * 0.05;
        }

        return Math.min(1.0, score);
    }

    private List<String> buildReasons(List<WardrobeItem> items, double colorHarmony,
                                       double styleConsistency, double scenarioFit,
                                       RecommendRequest request) {
        List<String> reasons = new ArrayList<>();
        String cats = items.stream()
                .map(i -> i.getCategoryId().toString())
                .collect(Collectors.joining("+"));
        reasons.add("品类组合：" + cats);

        List<String> colors = items.stream()
                .map(WardrobeItem::getPrimaryColor).filter(Objects::nonNull)
                .distinct().collect(Collectors.toList());
        if (!colors.isEmpty()) reasons.add("配色：" + String.join("、", colors));
        if (colorHarmony >= 0.8) reasons.add("颜色搭配协调");
        if (styleConsistency >= 0.75) reasons.add("风格统一");
        if (request.scenario != null && scenarioFit >= 0.7)
            reasons.add("适合" + request.scenario + "场景");

        return reasons;
    }

    // ===== 去重 =====
    private List<ScoredOutfit> dedupOutfits(List<ScoredOutfit> outfits) {
        if (outfits.size() <= 1) return outfits;
        List<ScoredOutfit> result = new ArrayList<>();

        for (ScoredOutfit outfit : outfits) {
            Set<Long> ids = outfit.items.stream().map(WardrobeItem::getId).collect(Collectors.toSet());
            boolean isDuplicate = false;
            for (ScoredOutfit existing : result) {
                Set<Long> existingIds = existing.items.stream()
                        .map(WardrobeItem::getId).collect(Collectors.toSet());
                long intersection = ids.stream().filter(existingIds::contains).count();
                double overlap = (double) intersection / Math.min(ids.size(), existingIds.size());
                if (overlap >= 0.7) { isDuplicate = true; break; }
            }
            if (!isDuplicate) result.add(outfit);
        }

        return result;
    }

    // ===== 组合生成 =====
    private List<List<WardrobeItem>> cartesianProduct(List<List<WardrobeItem>> groups, int maxResults) {
        if (groups.isEmpty()) return List.of(Collections.emptyList());
        List<List<WardrobeItem>> results = new ArrayList<>();
        results.add(new ArrayList<>());

        for (List<WardrobeItem> group : groups) {
            if (group.isEmpty()) continue;
            List<List<WardrobeItem>> next = new ArrayList<>();
            for (List<WardrobeItem> current : results) {
                for (WardrobeItem item : group) {
                    if (current.stream().anyMatch(c -> c.getId().equals(item.getId()))) continue;
                    List<WardrobeItem> extended = new ArrayList<>(current);
                    extended.add(item);
                    next.add(extended);
                    if (next.size() >= maxResults) break;
                }
                if (next.size() >= maxResults) break;
            }
            results = next;
            if (results.size() >= maxResults) break;
        }

        return results;
    }

    // ===== 辅助 =====
    private Map<String, List<WardrobeItem>> groupByCategory(List<WardrobeItem> items,
                                                             Map<Long, String> catNameMap) {
        Map<String, List<WardrobeItem>> map = new LinkedHashMap<>();
        for (WardrobeItem item : items) {
            String catName = catNameMap.getOrDefault(item.getCategoryId(), "其他");
            map.computeIfAbsent(catName, k -> new ArrayList<>()).add(item);
        }
        return map;
    }

    private String getColorFamily(String color) {
        if (BASIC_COLORS.contains(color)) return "basic";
        if (WARM_COLORS.contains(color)) return "warm";
        if (COOL_COLORS.contains(color)) return "cool";
        if (NEUTRAL_COLORS.contains(color)) return "neutral";
        return "unknown";
    }

    private static List<String> parseJsonArray(String json) {
        if (json == null || json.isEmpty()) return Collections.emptyList();
        try {
            return JSONUtil.parseArray(json).toList(String.class);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    // ===== 内部类 =====
    record OutfitTemplate(String name, List<String> required, List<String> optional, double weight) {}
    record ColorClash(String a, String b, double penalty) {}
    record StyleClash(String a, String b, double penalty) {}
    record OutfitCandidate(List<WardrobeItem> items, OutfitTemplate template) {}

    public record ScoredOutfit(List<WardrobeItem> items, double score, List<String> reasons,
                                String templateName) {}

    public record RecommendRequest(String scenario, String season, String style,
                                    Integer temperature, String weather,
                                    Long mustIncludeItemId, List<Long> excludeItemIds,
                                    Integer count) {}

    public record OutfitResult(List<ScoredOutfit> outfits, int totalCandidates,
                                int filteredCount, String message) {}
}
