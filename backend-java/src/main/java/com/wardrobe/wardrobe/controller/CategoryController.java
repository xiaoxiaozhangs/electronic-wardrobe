package com.wardrobe.wardrobe.controller;

import com.wardrobe.common.dto.ApiResponse;
import com.wardrobe.wardrobe.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ApiResponse<Map<String, Object>> getCategories() {
        return ApiResponse.success(Map.of("categories", categoryService.getCategoryTree()));
    }
}
