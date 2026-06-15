package com.wardrobe.common.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PageResult<T> {
    private List<T> list;
    private long page;
    private long pageSize;
    private long total;
    private long totalPages;

    public static <T> PageResult<T> of(List<T> list, long page, long pageSize, long total) {
        return new PageResult<>(
            list, page, pageSize, total,
            total == 0 ? 0 : (total + pageSize - 1) / pageSize
        );
    }
}
