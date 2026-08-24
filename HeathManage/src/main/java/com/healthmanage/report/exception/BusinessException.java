package com.healthmanage.report.exception;

import org.springframework.http.HttpStatus;

/** 业务异常：携带 HTTP 状态码，由全局异常处理器统一转换为错误响应。 */
public class BusinessException extends RuntimeException {

    private final HttpStatus status;

    public BusinessException(String message) {
        this(message, HttpStatus.BAD_REQUEST);
    }

    public BusinessException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
