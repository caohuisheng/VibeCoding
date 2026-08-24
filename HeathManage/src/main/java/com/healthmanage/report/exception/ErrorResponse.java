package com.healthmanage.report.exception;

import java.time.Instant;

/** 统一错误响应体。 */
public class ErrorResponse {

    private final int code;
    private final String message;
    private final String path;
    private final Instant timestamp;

    public ErrorResponse(int code, String message, String path, Instant timestamp) {
        this.code = code;
        this.message = message;
        this.path = path;
        this.timestamp = timestamp;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public String getPath() {
        return path;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
