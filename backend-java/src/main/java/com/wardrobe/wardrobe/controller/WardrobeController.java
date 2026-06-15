package com.wardrobe.wardrobe.controller;

import com.wardrobe.common.dto.ApiResponse;
import com.wardrobe.common.dto.PageResult;
import com.wardrobe.wardrobe.service.WardrobeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/wardrobe")
@RequiredArgsConstructor
public class WardrobeController {

    private final WardrobeService wardrobeService;

    /** 创建衣物 */
    @PostMapping
    public ApiResponse<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        return ApiResponse.success(wardrobeService.createItem(body));
    }

    /** 上传图片 */
    @PostMapping("/upload")
    public ApiResponse<Map<String, Object>> upload(@RequestParam("file") MultipartFile file) {
        // 简化版：生成上传路径
        return ApiResponse.success(Map.of(
                "cloudPath", "wardrobe-images/" + System.currentTimeMillis() + "_" + file.getOriginalFilename(),
                "fileName", file.getOriginalFilename(),
                "note", "使用云存储SDK直传"
        ));
    }

    /** 衣橱列表 */
    @GetMapping
    public ApiResponse<PageResult<Map<String, Object>>> list(@RequestParam Map<String, String[]> params) {
        return ApiResponse.success(wardrobeService.listItems(params));
    }

    /** 衣物详情 */
    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@PathVariable Long id) {
        return ApiResponse.success(wardrobeService.getItemDetail(id));
    }

    /** 编辑衣物 */
    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> update(@PathVariable Long id,
                                                    @RequestBody Map<String, Object> body) {
        return ApiResponse.success(wardrobeService.updateItem(id, body));
    }

    /** 删除衣物 */
    @DeleteMapping("/{id}")
    public ApiResponse<Map<String, Object>> delete(@PathVariable Long id) {
        return ApiResponse.success(wardrobeService.deleteItem(id));
    }

    /** 批量删除 */
    @PostMapping("/batch-delete")
    public ApiResponse<Map<String, Object>> batchDelete(@RequestBody Map<String, List<Long>> body) {
        return ApiResponse.success(wardrobeService.batchDelete(body.get("ids")));
    }
}
