package com.wardrobe.common.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public static BusinessException badRequest(String msg) {
        return new BusinessException(1001, msg);
    }

    public static BusinessException unauthorized(String msg) {
        return new BusinessException(1002, msg);
    }

    public static BusinessException forbidden(String msg) {
        return new BusinessException(1003, msg);
    }

    public static BusinessException notFound(String msg) {
        return new BusinessException(1004, msg);
    }

    public static BusinessException conflict(String msg) {
        return new BusinessException(1005, msg);
    }

    public static BusinessException rateLimited(String msg) {
        return new BusinessException(1006, msg);
    }

    public static BusinessException serverError(String msg) {
        return new BusinessException(2001, msg);
    }
}
