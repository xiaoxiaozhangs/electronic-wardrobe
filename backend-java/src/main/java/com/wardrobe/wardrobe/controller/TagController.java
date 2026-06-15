package com.wardrobe.wardrobe.controller;

import com.wardrobe.common.dto.ApiResponse;
import com.wardrobe.wardrobe.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ApiResponse<Map<String, List<Map<String, Object>>>> getTags(
            @RequestParam(required = false) String type) {
        return ApiResponse.success(tagService.getTagsGrouped(type));
    }
}
