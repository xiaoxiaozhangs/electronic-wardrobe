package com.wardrobe.outfit.controller;

import com.wardrobe.common.dto.ApiResponse;
import com.wardrobe.common.dto.PageResult;
import com.wardrobe.outfit.service.OutfitService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/outfits")
@RequiredArgsConstructor
public class OutfitController {

    private final OutfitService outfitService;

    /** 生成搭配 */
    @PostMapping("/generate")
    public ApiResponse<Map<String, Object>> generate(@RequestBody Map<String, Object> body) {
        return ApiResponse.success(outfitService.generate(body));
    }

    /** 轮询搭配结果 */
    @GetMapping("/generate/{taskId}")
    public ApiResponse<Map<String, Object>> getResult(@PathVariable String taskId) {
        return ApiResponse.success(outfitService.getResult(taskId));
    }

    /** 搭配列表 */
    @GetMapping
    public ApiResponse<PageResult<Map<String, Object>>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(defaultValue = "false") boolean favoriteOnly,
            @RequestParam(required = false) String scenario) {
        return ApiResponse.success(outfitService.list(page, pageSize, favoriteOnly, scenario));
    }

    /** 搭配详情 */
    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@PathVariable Long id) {
        return ApiResponse.success(outfitService.detail(id));
    }

    /** 搭配反馈 */
    @PostMapping("/{id}/feedback")
    public ApiResponse<Map<String, Object>> feedback(@PathVariable Long id,
                                                      @RequestBody Map<String, Object> body) {
        return ApiResponse.success(outfitService.feedback(id, body));
    }
}
